/* ============================================================================
   arcade-score.js — the Supernova Arcade plays itself.

   A playful generative AMBIENT score that sonifies the arcade hub's OWN onchain
   activity. It RIDES the feed the hub already polls for the odometer: every ~2s
   the hub reads each cabinet's getGlobalActions / getGlobalTaps and hands the
   numbers here via feed(); this module diffs them into per-cabinet DELTAS (new
   actions since the last read) and turns those into music. No new chain polling.

   Each cabinet is its own recognizable VOICE; its delta fires that voice's
   notes. The GLOBAL delta sets intensity (bed brightness, tempo, reverb bloom).
   Odometer milestones (round-number crossings) fire a short celebratory MOMENT.
   When nothing is happening it settles into a calm ambient bed — never silence.

   PALETTE: warm, melodic, gallery-safe. A major-pentatonic scale (it can't
   sound wrong), soft synths/chimes/bleeps, a glue compressor + brickwall limiter
   on the master so it won't clip or fatigue over a long gallery run. Deliberately
   NOT a club kick / dub-techno — this is an arcade, it should feel friendly.

   UX: MUTED BY DEFAULT. Tone.js is not even downloaded until the user opts in via
   the speaker toggle (autoplay policy + courtesy). start() runs inside that click
   (the user gesture browsers require for audio).

   MIXER: dial it live from the console (window.arcadeScore.setLevel(...), .getMix())
   then bake the values into DEFAULT_MIX below — that baked preset IS the shipped
   "signed default mix". Nothing loops or repeats; the chain writes the score.

   MINT HOOK: captureMoment() returns a frozen, serializable snapshot of the
   current arcade state, and opts.onMoment(snapshot) fires on every milestone.
   That is the clean seam for a future "capture this moment" (mint). Minting is
   intentionally NOT built here.

   Architecture (master bus + limiter, per-voice strips with reverb/delay sends,
   intensity arranger, milestone detector, signed default mix + live mixer) is
   adapted from the patterns in Lukas's Strata Explorer audio engine — patterns
   only, reference read-only; none of its Solana data layer or dub palette.
   ============================================================================ */

const TONE_URL = "https://esm.sh/tone@15.0.4";

/* ---------- the palette: a warm major pentatonic (no wrong notes) ----------
   Root D3. Pentatonic degrees as semitone offsets; degToFreq() walks octaves so
   a "degree" can run past the 5 notes and just climbs into the next octave. */
const ROOT_MIDI = 50; // D3
const SCALE = [0, 2, 4, 7, 9]; // D  E  F#  A  B  (major pentatonic)
const DELTA_SANITY_CAP = 5000; // a single 2s delta above this = re-baseline, not play

function midiToFreq(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}
function degToFreq(deg, octaveOffset) {
  const len = SCALE.length;
  const idx = ((deg % len) + len) % len;
  const oct = Math.floor(deg / len) + octaveOffset;
  return midiToFreq(ROOT_MIDI + SCALE[idx] + 12 * oct);
}
function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/* ============================================================================
   THE SIGNED DEFAULT MIX — Arcade Mix v1 (Lukas-tunable).

   per voice: level (fader 0..1), reverb (send 0..1), delay (send 0..1).
   Tuned for restraint: Sprint sits forward (it's the busiest), the Button's bass
   stays low and round, Canvas chimes ride on reverb/air, Degen Dash blips stay
   dry and punchy, the idle bed is barely-there. Dial live, then paste here.
   ============================================================================ */
export const DEFAULT_MIX = {
  name: "Arcade Mix v1",
  master: { level: 0.82 },
  voices: {
    sprint:    { level: 0.50, reverb: 0.22, delay: 0.30 }, // bright arps, forward
    tugofwar:  { level: 0.46, reverb: 0.30, delay: 0.12 }, // round, panned motif
    canvas:    { level: 0.40, reverb: 0.55, delay: 0.28 }, // glassy chimes, airy
    button:    { level: 0.62, reverb: 0.16, delay: 0.00 }, // soft low pulse
    clawback:  { level: 0.44, reverb: 0.34, delay: 0.18 }, // tense -> resolved
    degendash: { level: 0.40, reverb: 0.12, delay: 0.22 }, // 8-bit bleeps, dry
    bed:       { level: 0.30, reverb: 0.50, delay: 0.10 }, // ambient pad bed
    flourish:  { level: 0.70, reverb: 0.60, delay: 0.40 }, // milestone moment
  },
};

/* ----------------------------------------------------------------------------
   VOICE SPECS — register + per-fire musical behaviour for each cabinet.
   `octave` is the pentatonic-octave offset from the root register.
   `cap` bounds how many notes one ~2s delta can fire (no machine-gunning).
   `build(T, strip)` makes the synth(s); `play(...)` is filled in at build time.
   The keys MUST match the CABINETS ids on the hub (sprint/tugofwar/canvas/...).
   -------------------------------------------------------------------------- */
const VOICE_KEYS = ["sprint", "tugofwar", "canvas", "button", "clawback", "degendash"];

/* ============================================================================
   createArcadeScore(opts) — one score per hub.

   opts:
     onMoment(snapshot)  fired on each milestone crossing (the MINT seam).
     onBeat(intensity)   fired on the downbeat while playing (subtle UI pulse).
     momentStep          round-number total that defines a milestone (default 25000).
     debug               console.log scheduling (default false).
   ============================================================================ */
export function createArcadeScore(opts = {}) {
  const momentStep = opts.momentStep || 25000;

  /* live state */
  let T = null;                 // the Tone namespace, lazy-loaded on opt-in
  let graph = null;             // built audio graph (master chain + voices)
  let started = false;          // audio context up + graph built
  let on = false;               // user has the sound ON
  let loading = null;           // single-flight ensureAudio() promise

  const mix = JSON.parse(JSON.stringify(DEFAULT_MIX)); // working mix (mutable)

  /* feed/delta tracking — kept current even while muted so the first audible
     delta after opt-in is a real step, not a giant jump from zero. */
  const lastVal = {};           // last absolute count per cabinet id
  let lastTotal = null;
  let momentBucket = null;
  let intensity = 0;            // smoothed global activity 0..1 (the arranger)
  const voiceAvg = {};          // EMA of each voice's delta (for surge sparkles)

  /* ---------------------------------------------------------------- audio graph */
  function buildGraph() {
    const dest = T.getDestination();

    // master chain: glue compressor -> brickwall limiter -> out. Gallery-safe:
    // the limiter ceiling guarantees no clipping over a long unattended run.
    const limiter = new T.Limiter(-1).connect(dest);
    const comp = new T.Compressor({ threshold: -18, ratio: 3, attack: 0.012, release: 0.25 }).connect(limiter);
    const eq = new T.EQ3({ low: -1.5, mid: 0, high: 1.5, lowFrequency: 260, highFrequency: 3800 }).connect(comp);
    const master = new T.Gain(0).connect(eq); // starts at 0 == muted by default

    // shared sends (reverb + a dotted-eighth delay), each on its own bus gain so
    // intensity can bloom the room when the arcade is busy.
    const reverb = new T.Reverb({ decay: 3.6, preDelay: 0.02, wet: 1 }).connect(master);
    const reverbBus = new T.Gain(1).connect(reverb);
    const delay = new T.FeedbackDelay({ delayTime: "8n.", feedback: 0.26, wet: 1 }).connect(master);
    const delayBus = new T.Gain(1).connect(delay);

    graph = { dest, limiter, comp, eq, master, reverb, reverbBus, delay, delayBus, strips: {}, disposables: [limiter, comp, eq, master, reverb, reverbBus, delay, delayBus] };

    // a strip = the per-voice fader + reverb/delay send gains. A synth connects
    // into strip.level; the dry path goes straight to master, sends tap off it.
    function makeStrip(name) {
      const cfg = mix.voices[name] || { level: 0.5, reverb: 0.2, delay: 0.1 };
      const level = new T.Gain(cfg.level).connect(master); // dry
      const rev = new T.Gain(cfg.reverb).connect(reverbBus);
      const del = new T.Gain(cfg.delay).connect(delayBus);
      level.connect(rev);
      level.connect(del);
      const strip = { level, rev, del };
      graph.strips[name] = strip;
      graph.disposables.push(level, rev, del);
      return strip;
    }

    buildVoices(makeStrip);
  }

  /* each voice: a synth (or few) into its strip, plus a play() closure that owns
     that cabinet's signature gesture. n = note count, vel = velocity, t0 = start
     time, span = seconds to spread across, surge = unusually big delta this tick. */
  function buildVoices(makeStrip) {
    const V = {};

    // SPRINT — fast bright ascending arps (it's the busiest cabinet: taps).
    {
      const strip = makeStrip("sprint");
      const syn = new T.PolySynth(T.Synth, {
        maxPolyphony: 10,
        oscillator: { type: "triangle" },
        envelope: { attack: 0.004, decay: 0.16, sustain: 0, release: 0.12 },
      }).connect(strip.level);
      graph.disposables.push(syn);
      V.sprint = (n, vel, t0, span) => {
        const step = Math.min(0.11, span / Math.max(1, n)); // ~16ths, capped
        const base = Math.floor(Math.random() * 3); // start the run on a random degree
        for (let i = 0; i < n; i++) {
          syn.triggerAttackRelease(degToFreq(base + i, 1), "16n", t0 + i * step, vel * (0.7 + 0.3 * Math.random()));
        }
      };
    }

    // TUG-OF-WAR — a back-and-forth motif, two notes panned left/right (the rope).
    {
      const strip = makeStrip("tugofwar");
      const pan = new T.Panner(0).connect(strip.level);
      const syn = new T.PolySynth(T.Synth, {
        maxPolyphony: 6,
        oscillator: { type: "sine" },
        envelope: { attack: 0.012, decay: 0.3, sustain: 0.12, release: 0.4 },
      }).connect(pan);
      graph.disposables.push(syn, pan);
      const pair = [0, 2]; // root and the pentatonic third — a friendly two-step
      V.tugofwar = (n, vel, t0, span) => {
        const step = Math.min(0.34, span / Math.max(1, n));
        for (let i = 0; i < n; i++) {
          pan.pan.setValueAtTime(i % 2 ? 0.6 : -0.6, t0 + i * step); // tug L<->R
          syn.triggerAttackRelease(degToFreq(pair[i % 2], 0), "8n", t0 + i * step, vel);
        }
      };
    }

    // CANVAS — glassy FM chimes, one per pixel, scattered high and airy.
    {
      const strip = makeStrip("canvas");
      const syn = new T.PolySynth(T.FMSynth, {
        maxPolyphony: 12,
        harmonicity: 3.01,
        modulationIndex: 7,
        oscillator: { type: "sine" },
        envelope: { attack: 0.002, decay: 1.1, sustain: 0, release: 1.3 },
        modulation: { type: "sine" },
        modulationEnvelope: { attack: 0.002, decay: 0.2, sustain: 0, release: 0.2 },
      }).connect(strip.level);
      graph.disposables.push(syn);
      V.canvas = (n, vel, t0, span) => {
        for (let i = 0; i < n; i++) {
          const deg = Math.floor(Math.random() * 8); // two octaves of the pentatonic
          syn.triggerAttackRelease(degToFreq(deg, 2), "2n", t0 + Math.random() * span, vel * 0.85);
        }
      };
    }

    // THE BUTTON — a soft, round, low PULSE (not a club kick). One thud per press.
    {
      const strip = makeStrip("button");
      const syn = new T.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 3,
        oscillator: { type: "sine" },
        envelope: { attack: 0.004, decay: 0.45, sustain: 0, release: 0.5 },
      }).connect(strip.level);
      graph.disposables.push(syn);
      V.button = (n, vel, t0, span) => {
        // a few presses -> a few soft pulses, never a drum roll
        const hits = Math.min(n, 3);
        const step = Math.min(0.4, span / Math.max(1, hits));
        for (let i = 0; i < hits; i++) {
          syn.triggerAttackRelease(degToFreq(0, -1), "8n", t0 + i * step, clamp(vel, 0.3, 0.7));
        }
      };
    }

    // ETHperience (clawback) — a tense lean that RESOLVES up to a chord tone.
    {
      const strip = makeStrip("clawback");
      const syn = new T.PolySynth(T.AMSynth, {
        maxPolyphony: 6,
        harmonicity: 2.2,
        oscillator: { type: "triangle" },
        envelope: { attack: 0.02, decay: 0.25, sustain: 0.18, release: 0.5 },
        modulation: { type: "square" },
      }).connect(strip.level);
      graph.disposables.push(syn);
      V.clawback = (n, vel, t0, span) => {
        const gestures = Math.min(Math.ceil(n / 2), 3);
        const step = Math.min(0.5, span / Math.max(1, gestures));
        for (let i = 0; i < gestures; i++) {
          const t = t0 + i * step;
          // tension: a note a step under a chord tone, then resolve up onto it.
          syn.triggerAttackRelease(degToFreq(1, 0), "16n", t, vel * 0.7);
          syn.triggerAttackRelease(degToFreq(2, 0), "8n", t + Math.min(0.16, step * 0.45), vel);
        }
      };
    }

    // DEGEN DASH — bright 8-bit square bleeps, quick and playful (collects).
    {
      const strip = makeStrip("degendash");
      const syn = new T.PolySynth(T.Synth, {
        maxPolyphony: 8,
        oscillator: { type: "square" },
        envelope: { attack: 0.002, decay: 0.09, sustain: 0, release: 0.06 },
      }).connect(strip.level);
      graph.disposables.push(syn);
      V.degendash = (n, vel, t0, span) => {
        const step = Math.min(0.16, span / Math.max(1, n));
        for (let i = 0; i < n; i++) {
          const deg = [0, 2, 4, 3, 5][i % 5]; // a hoppy little pentatonic skip
          syn.triggerAttackRelease(degToFreq(deg, 1), "16n", t0 + i * step, vel * 0.6);
        }
      };
    }

    graph.voices = V;

    // FLOURISH — the milestone "moment": an ascending pentatonic run + a bell bloom.
    {
      const strip = makeStrip("flourish");
      const bell = new T.PolySynth(T.FMSynth, {
        maxPolyphony: 10,
        harmonicity: 2.0,
        modulationIndex: 4,
        oscillator: { type: "sine" },
        envelope: { attack: 0.003, decay: 1.6, sustain: 0, release: 2.0 },
      }).connect(strip.level);
      graph.disposables.push(bell);
      graph.flourish = (t0) => {
        for (let i = 0; i < 8; i++) {
          bell.triggerAttackRelease(degToFreq(i, 1), "2n", t0 + i * 0.09, 0.5 + 0.04 * i);
        }
        bell.triggerAttackRelease([degToFreq(0, 1), degToFreq(2, 1), degToFreq(4, 1)], "1n", t0 + 0.75, 0.6);
        // bloom the room, then settle back
        graph.reverbBus.gain.rampTo(1.6, 0.4, t0);
        graph.reverbBus.gain.rampTo(1.0 + intensity * 0.3, 5, t0 + 1.5);
      };
    }

    // THE BED — a calm ambient pad cycling through pentatonic voicings, plus
    // sparse idle twinkles, so it is never dead silent. Brightness rides intensity.
    {
      const strip = makeStrip("bed");
      const filter = new T.Filter({ type: "lowpass", frequency: 600, Q: 0.6 }).connect(strip.level);
      const pad = new T.PolySynth(T.Synth, {
        maxPolyphony: 8,
        oscillator: { type: "fatsine", spread: 14, count: 2 },
        envelope: { attack: 2.4, decay: 1.0, sustain: 0.8, release: 3.5 },
      }).connect(filter);
      const twinkle = new T.PolySynth(T.FMSynth, {
        maxPolyphony: 4,
        harmonicity: 3.01,
        modulationIndex: 5,
        envelope: { attack: 0.003, decay: 1.4, sustain: 0, release: 1.6 },
      }).connect(filter);
      graph.disposables.push(filter, pad, twinkle);
      graph.bedFilter = filter;

      let voicing = 0;
      let held = null;
      // a slow loop (two measures) — re-voice the pad; twinkle only when quiet.
      const loop = new T.Loop((time) => {
        const starts = [[0, 2, 4], [2, 4, 6], [4, 6, 8], [-2, 0, 2]][voicing % 4];
        voicing++;
        if (held) pad.triggerRelease(held, time);
        const chord = starts.map((d) => degToFreq(d, 0));
        pad.triggerAttackRelease(chord, "2m", time, 0.35);
        held = chord;
        if (intensity < 0.14 && Math.random() < 0.7) {
          // a single soft chime drifting over the quiet — keeps it alive
          twinkle.triggerAttackRelease(degToFreq(Math.floor(Math.random() * 6), 2), "2n", time + 0.5 + Math.random(), 0.3);
        }
      }, "2m").start(0);
      graph.disposables.push(loop);
    }
  }

  /* ------------------------------------------------------------- lifecycle */
  function ensureAudio() {
    if (started) return Promise.resolve(true);
    if (loading) return loading;
    loading = (async () => {
      const mod = await import(TONE_URL);
      T = mod && mod.Synth ? mod : mod.default || mod; // esm.sh namespace vs default
      await T.start(); // resumes the AudioContext (must be inside a user gesture)
      buildGraph();
      const tr = T.getTransport();
      tr.bpm.value = 84;
      tr.start();
      // subtle UI downbeat hook (the only visual concession): pulse the odometer.
      if (typeof opts.onBeat === "function") {
        tr.scheduleRepeat((time) => {
          if (on) T.getDraw().schedule(() => opts.onBeat(intensity), time);
        }, "4n");
      }
      started = true;
      return true;
    })().catch((e) => {
      console.warn("[arcade-score] audio init failed:", e);
      loading = null;
      return false;
    });
    return loading;
  }

  function applyMasterLevel() {
    if (!graph) return;
    graph.master.gain.rampTo(on ? mix.master.level : 0, 0.12); // 0.12s click-free fade
  }

  async function setOn(next) {
    if (next) {
      const ok = await ensureAudio();
      if (!ok) return false;
      on = true;
      if (momentBucket == null && lastTotal != null) momentBucket = Math.floor(lastTotal / momentStep);
      T.getTransport().start();
      applyMasterLevel();
    } else {
      on = false;
      applyMasterLevel();
      if (started) setTimeout(() => { if (!on && started) T.getTransport().pause(); }, 200);
    }
    return on;
  }

  /* ------------------------------------------------------------- the feed */
  // Called by the hub each ~2s with the freshly-read counts. We diff to deltas.
  // snapshot: { perCabinet: { id: absoluteCount, ... }, total }
  function feed(snapshot) {
    const per = snapshot && snapshot.perCabinet ? snapshot.perCabinet : {};

    // Always refresh baselines (even while muted) so opt-in deltas are honest.
    if (!on || !started) {
      for (const id in per) lastVal[id] = per[id];
      lastTotal = snapshot ? snapshot.total : lastTotal;
      return;
    }

    const t0 = T.now() + 0.05;
    let globalDelta = 0;
    for (const id of VOICE_KEYS) {
      if (!(id in per)) continue;
      const v = per[id];
      const prev = lastVal[id];
      lastVal[id] = v;
      if (prev == null) continue;          // first sighting = baseline only
      const d = Math.max(0, v - prev);
      if (d <= 0) continue;
      // sanity: a real 2s window is at most a few hundred actions. A delta this
      // big means a recovered failed read or a counter reset, not real play —
      // re-baseline silently instead of machine-gunning a huge burst.
      if (d > DELTA_SANITY_CAP) continue;
      globalDelta += d;
      // surge = a delta well above this voice's running average -> add a sparkle
      const avg = voiceAvg[id];
      voiceAvg[id] = avg == null ? d : avg + (d - avg) * 0.3;
      const surge = avg != null && avg > 0 && d > avg * 2.4 && d >= 4;
      scheduleVoice(id, d, t0, surge);
    }

    // intensity (the arranger): rises quickly, falls slowly — no flicker.
    const target = clamp(Math.log10(1 + globalDelta) / 2.2, 0, 1);
    intensity += (target - intensity) * (target > intensity ? 0.5 : 0.12);
    applyIntensity(t0);

    // milestone -> a moment (and the mint seam).
    if (snapshot && typeof snapshot.total === "number") {
      const bucket = Math.floor(snapshot.total / momentStep);
      if (momentBucket != null && bucket > momentBucket) triggerMoment();
      momentBucket = bucket;
      lastTotal = snapshot.total;
    }
    if (opts.debug) console.log("[arcade-score] feed", { globalDelta, intensity: +intensity.toFixed(2) });
  }

  function scheduleVoice(id, delta, t0, surge) {
    const play = graph.voices[id];
    if (!play) return;
    const cap = id === "canvas" || id === "sprint" ? 8 : 6;
    let n = Math.min(cap, 1 + Math.floor(Math.log2(1 + delta))); // gentle, sub-linear
    if (surge) n = Math.min(cap + 2, n + 2);
    const vel = clamp(0.28 + Math.log10(1 + delta) * 0.18, 0.28, 0.9);
    play(n, vel, t0, 1.7);
  }

  function applyIntensity(t0) {
    if (!graph) return;
    // brighter bed, faster tempo, slightly bigger room when the arcade is busy.
    graph.bedFilter.frequency.rampTo(550 + intensity * 2600, 1.2);
    graph.strips.bed.level.gain.rampTo(mix.voices.bed.level * (0.7 + intensity * 0.6), 1.2);
    graph.reverbBus.gain.rampTo(1.0 + intensity * 0.3, 1.5);
    const tr = T.getTransport();
    tr.bpm.rampTo(80 + intensity * 22, 2);
  }

  function triggerMoment() {
    if (graph && graph.flourish) graph.flourish(T.now() + 0.05);
    if (typeof opts.onMoment === "function") {
      try { opts.onMoment(captureMoment()); } catch (e) { /* host callback is not our problem */ }
    }
  }

  /* ----------------------------------------------------- the MINT hook (seam)
     A future "capture this moment" would freeze THIS object (post it to a mint
     endpoint / build NFT attributes). We only produce the snapshot + fire
     onMoment; we do NOT mint anything here. */
  function captureMoment() {
    return {
      ts: Date.now(),
      total: lastTotal,
      perCabinet: Object.assign({}, lastVal),
      intensity: +intensity.toFixed(3),
      mix: JSON.parse(JSON.stringify(mix)),
      scale: { rootMidi: ROOT_MIDI, scale: SCALE.slice() },
    };
  }

  /* --------------------------------------------------- the live mixer (tuning)
     Dial from the console, e.g.
        arcadeScore.setLevel('canvas', 0.55)
        arcadeScore.setSend('button','delay', 0.1)
        arcadeScore.setMaster(0.9)
        copy(JSON.stringify(arcadeScore.getMix(), null, 2))   // paste into DEFAULT_MIX
  */
  function setLevel(voice, v) {
    if (!mix.voices[voice]) return;
    mix.voices[voice].level = v;
    if (graph && graph.strips[voice]) {
      const g = voice === "bed" ? v * (0.7 + intensity * 0.6) : v;
      graph.strips[voice].level.gain.rampTo(g, 0.05);
    }
  }
  function setSend(voice, kind, v) {
    if (!mix.voices[voice]) return;
    mix.voices[voice][kind] = v;
    if (graph && graph.strips[voice]) {
      const node = kind === "reverb" ? graph.strips[voice].rev : graph.strips[voice].del;
      if (node) node.gain.rampTo(v, 0.05);
    }
  }
  function setMaster(v) {
    mix.master.level = v;
    applyMasterLevel();
  }
  function applyMix(preset) {
    if (!preset) return;
    if (preset.master) setMaster(preset.master.level);
    if (preset.voices) for (const k in preset.voices) {
      const s = preset.voices[k];
      if (s.level != null) setLevel(k, s.level);
      if (s.reverb != null) setSend(k, "reverb", s.reverb);
      if (s.delay != null) setSend(k, "delay", s.delay);
    }
  }
  function getMix() {
    return JSON.parse(JSON.stringify(mix));
  }

  function dispose() {
    on = false;
    if (!started || !graph) return;
    try { T.getTransport().stop(); } catch (e) {}
    for (const node of graph.disposables) { try { node.dispose(); } catch (e) {} }
    graph = null;
    started = false;
  }

  return {
    feed,
    setOn,
    toggle() { return setOn(!on); },
    isOn() { return on; },
    isStarted() { return started; },
    captureMoment,
    triggerMoment,     // exposed for testing the moment/mint seam
    // live mixer
    setLevel, setSend, setMaster, applyMix, getMix,
    get intensity() { return intensity; },
    dispose,
  };
}
