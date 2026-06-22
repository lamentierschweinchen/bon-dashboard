/* ============================================================================
   arcade-score.js — the Supernova Arcade plays itself.  (v2: "Mario in space")

   A generative CHIPTUNE score that sonifies the arcade hub's OWN onchain
   activity. It RIDES the feed the hub already polls for the odometer: every ~2s
   the hub reads each cabinet's getGlobalActions / getGlobalTaps and hands the
   numbers here via feed(); this module diffs them into per-cabinet DELTAS (new
   actions since the last read) and turns those into music. No new chain polling.

   THE FEEL — a living arcade, not a lounge.
   - Idle is NOT silence and not just a pad: a melodic SPACE DRONE + a funky
     ambient bassline noodling in the dark, like an arcade in attract mode.
   - As people play, the global delta raises ENERGY and the arrangement ESCALATES
     through tiers — DORMANT -> LOBBY -> WARMUP -> GROOVE -> FRENZY — switching on
     a beat, a tighter bass, fast pulse arps, and a bright lead. Busy arcade =
     full chiptune banger; quiet arcade = it drifts back down to the drone.
   - Each cabinet is still its own VOICE that pops on top when that game is played.
   - The harmony MOVES (a 4-chord progression) and the KEY changes on milestones
     and on big escalations (a "level up" lift), so it never sits still or loops.

   PALETTE: original chiptune (pulse/square leads, triangle bass, noise drums)
   over a warm detuned space pad. Bright major pentatonic when busy, a cooler
   mode when idle. Glue compressor + brickwall limiter master so it stays
   gallery-safe (won't clip or fatigue). "Mario in space" is a VIBE — all music
   here is original, nothing is copied.

   UX: MUTED BY DEFAULT. Tone.js is not even downloaded until the user opts in
   via the speaker toggle. start() runs inside that click (the user gesture
   browsers require for audio).

   STUDIO: arcade-studio.html drives this through a wide control surface
   (per-voice strips, energy/tempo override, key + modulation, palette presets,
   activity driver, getState() meters). Tune by ear, then bake the result into
   DEFAULT_MIX — that baked preset is the shipped "signed default mix".

   MINT HOOK: captureMoment() returns a frozen, serializable snapshot of the
   arcade state, and opts.onMoment(snapshot) fires on every milestone. That is
   the clean seam for a future "capture this moment" (mint). No minting is built.

   Architecture (master bus + limiter, per-voice strips with sends, energy
   arranger, key/chord engine, milestone detector, signed mix + live mixer)
   adapts patterns from Lukas's Strata Explorer engine — patterns only,
   reference read-only; none of its data layer or its dub-techno palette.
   ============================================================================ */

const TONE_URL = "https://esm.sh/tone@15.0.4";

/* ---------------------------------------------------------------- music theory */
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
function noteToMidi(name, octave) { return 12 * (octave + 1) + NOTE_NAMES.indexOf(name); }

// Scale modes (semitone offsets). Pentatonics = "can't sound wrong"; Dorian adds color.
const MODES = {
  bright: [0, 2, 4, 7, 9],       // major pentatonic — happy, Mario-bright (busy tiers)
  spacey: [0, 3, 5, 7, 10],      // minor pentatonic — cool, floaty (idle/lobby)
  dorian: [0, 2, 3, 5, 7, 9, 10],// dorian — funky, jazzy (optional)
};
// A 4-chord arcade progression as semitone roots from the key (I - V - vi - IV vibe).
const PROGRESSION = [0, 7, 9, 5];
const DELTA_SANITY_CAP = 5000; // a single 2s delta above this = re-baseline, not play

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function smooth01(v) { v = clamp01(v); return v * v * (3 - 2 * v); } // smoothstep

/* ============================================================================
   THE SIGNED DEFAULT MIX — "Arcade Mix v2" (Lukas-tunable in the studio).
   per voice: level (fader 0..1), reverb (send 0..1), delay (send 0..1).
   The bed layers (pad/bass/drums/arp/lead) are the ESCALATING arrangement; the
   game voices are the per-cabinet accents. energyGate (set by the arranger) is
   multiplied on top of `level` for the bed layers, so they fade in as it builds.
   ============================================================================ */
export const DEFAULT_MIX = {
  name: "Arcade Mix v2",
  master: { level: 0.80 },
  voices: {
    // --- the escalating bed (arrangement) ---
    pad:       { level: 0.34, reverb: 0.55, delay: 0.12 }, // warm space drone
    bass:      { level: 0.62, reverb: 0.08, delay: 0.00 }, // funky triangle bass
    kick:      { level: 0.70, reverb: 0.05, delay: 0.00 }, // soft round kick
    hat:       { level: 0.34, reverb: 0.06, delay: 0.10 }, // noise hat
    snare:     { level: 0.42, reverb: 0.18, delay: 0.08 }, // noise snare/clap
    arp:       { level: 0.40, reverb: 0.22, delay: 0.34 }, // fast pulse arp
    lead:      { level: 0.46, reverb: 0.26, delay: 0.40 }, // generative chiptune lead
    // --- per-cabinet accents (play when that game is played) ---
    sprint:    { level: 0.48, reverb: 0.18, delay: 0.30 }, // bright pulse arps
    tugofwar:  { level: 0.44, reverb: 0.26, delay: 0.12 }, // panned back-and-forth
    canvas:    { level: 0.40, reverb: 0.50, delay: 0.28 }, // glassy FM chimes
    button:    { level: 0.58, reverb: 0.14, delay: 0.00 }, // deep sub thump
    clawback:  { level: 0.44, reverb: 0.30, delay: 0.18 }, // tense -> resolved
    degendash: { level: 0.42, reverb: 0.10, delay: 0.22 }, // 8-bit bleeps
    // --- event SFX ---
    blip:      { level: 0.66, reverb: 0.30, delay: 0.30 }, // jingles / stingers
  },
};

// bed layers driven by the energy arranger (each gets an energyGate)
const BED_LAYERS = ["pad", "bass", "kick", "hat", "snare", "arp", "lead"];
// per-cabinet accent voices (keys MUST match the hub CABINETS ids)
const GAME_VOICES = ["sprint", "tugofwar", "canvas", "button", "clawback", "degendash"];

// energy tier names (for studio readouts) by energy 0..1
function tierName(e) {
  if (e < 0.10) return "DORMANT";
  if (e < 0.28) return "LOBBY";
  if (e < 0.52) return "WARMUP";
  if (e < 0.80) return "GROOVE";
  return "FRENZY";
}

/* ============================================================================
   createArcadeScore(opts)
     onMoment(snapshot)  fired on each milestone crossing (the MINT seam)
     onBeat(info)        fired on the downbeat while playing (subtle UI pulse)
     momentStep          round-number total that = a milestone (default 25000)
     debug               console logging
   ============================================================================ */
export function createArcadeScore(opts = {}) {
  const momentStep = opts.momentStep || 25000;

  /* ---- live state ---- */
  let T = null, graph = null;
  let started = false, on = false, loading = null;

  const mix = JSON.parse(JSON.stringify(DEFAULT_MIX));
  const userLevel = {};                  // fader per voice (from mix)
  const energyGate = {};                 // arranger gate per bed layer (0..1)
  const muted = {}, soloed = {};
  const meter = {};                      // decaying activity meter per voice (studio)

  /* ---- feed / energy ---- */
  const lastVal = {}; let lastTotal = null, momentBucket = null;
  let intensity = 0;                     // smoothed global activity 0..1
  let energy = 0, energyTarget = 0, energyOverride = null; // arranger energy
  const voiceAvg = {};                   // EMA of each voice delta (surge detect)

  /* ---- key / harmony ---- */
  let keyRootMidi = noteToMidi("D", 3);  // current key root (D)
  let modeName = "spacey";               // current mode (idle starts cool)
  let chordIdx = 0, bar = 0, step = 0;   // sequencer position
  let modCount = 0;                      // modulations away from home
  const homeRootMidi = keyRootMidi;
  let autoKeyCycle = false;
  let tempoOverride = null;              // bpm override (studio) or null=auto
  let swing = 0.12;                      // groove swing 0..0.5

  /* ====================================================================== graph */
  function buildGraph() {
    const dest = T.getDestination();
    const limiter = new T.Limiter(-1).connect(dest);                 // brickwall, no clip
    const comp = new T.Compressor({ threshold: -16, ratio: 3, attack: 0.008, release: 0.18 }).connect(limiter);
    const eq = new T.EQ3({ low: -1, mid: 0, high: 2, lowFrequency: 220, highFrequency: 3600 }).connect(comp);
    const master = new T.Gain(0).connect(eq);                        // 0 == muted by default
    const reverb = new T.Reverb({ decay: 2.8, preDelay: 0.015, wet: 1 }).connect(master);
    const reverbBus = new T.Gain(1).connect(reverb);
    const delay = new T.FeedbackDelay({ delayTime: "8n.", feedback: 0.30, wet: 1 }).connect(master);
    const delayBus = new T.Gain(1).connect(delay);

    graph = { dest, limiter, comp, eq, master, reverb, reverbBus, delay, delayBus,
      strips: {}, synth: {}, disposables: [limiter, comp, eq, master, reverb, reverbBus, delay, delayBus] };

    function makeStrip(name) {
      const cfg = mix.voices[name] || { level: 0.5, reverb: 0.2, delay: 0.1 };
      userLevel[name] = cfg.level; muted[name] = false; soloed[name] = false; meter[name] = 0;
      if (BED_LAYERS.indexOf(name) >= 0) energyGate[name] = 0;       // bed starts faded out
      const level = new T.Gain(0).connect(master);                  // dry (ramped by gateValue)
      const rev = new T.Gain(cfg.reverb).connect(reverbBus);
      const del = new T.Gain(cfg.delay).connect(delayBus);
      level.connect(rev); level.connect(del);
      const strip = { level, rev, del };
      graph.strips[name] = strip; graph.disposables.push(level, rev, del);
      return strip;
    }

    buildVoices(makeStrip);
    buildSequences();
  }

  // effective gain for a strip: fader x energyGate x mute/solo
  function gateValue(name) {
    const anySolo = Object.keys(soloed).some((k) => soloed[k]);
    if (muted[name]) return 0;
    if (anySolo && !soloed[name]) return 0;
    const g = energyGate[name] == null ? 1 : energyGate[name];
    return userLevel[name] * g;
  }
  function setStripGain(name, ramp = 0.08) {
    const s = graph && graph.strips[name];
    if (s) s.level.gain.rampTo(gateValue(name), ramp);
  }
  function bumpMeter(name, v) { meter[name] = Math.max(meter[name] || 0, v); }

  function buildVoices(makeStrip) {
    const S = graph.synth;
    // pad — warm detuned space drone, through a brightness filter
    {
      const strip = makeStrip("pad");
      const filt = new T.Filter({ type: "lowpass", frequency: 500, Q: 0.8 }).connect(strip.level);
      const chorus = new T.Chorus({ frequency: 0.6, delayTime: 4, depth: 0.6, wet: 0.5 }).connect(filt).start();
      const pad = new T.PolySynth(T.Synth, { maxPolyphony: 10,
        oscillator: { type: "fatsawtooth", spread: 26, count: 3 },
        envelope: { attack: 1.8, decay: 1.4, sustain: 0.8, release: 3.2 } }).connect(chorus);
      pad.volume.value = -6;
      S.pad = pad; graph.padFilter = filt; graph.disposables.push(filt, chorus, pad);
    }
    // bass — funky NES triangle
    {
      const strip = makeStrip("bass");
      const bass = new T.MonoSynth({ oscillator: { type: "triangle" },
        filter: { Q: 2, type: "lowpass" }, filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.4, baseFrequency: 120, octaves: 2.5 },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.2 } }).connect(strip.level);
      S.bass = bass; graph.disposables.push(bass);
    }
    // kick — soft round membrane (not a club kick)
    {
      const strip = makeStrip("kick");
      const kick = new T.MembraneSynth({ pitchDecay: 0.045, octaves: 4,
        oscillator: { type: "sine" }, envelope: { attack: 0.001, decay: 0.32, sustain: 0, release: 0.3 } }).connect(strip.level);
      S.kick = kick; graph.disposables.push(kick);
    }
    // hat — noise tick
    {
      const strip = makeStrip("hat");
      const hp = new T.Filter({ type: "highpass", frequency: 7000 }).connect(strip.level);
      const hat = new T.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.03, sustain: 0 } }).connect(hp);
      S.hat = hat; graph.disposables.push(hp, hat);
    }
    // snare/clap — noise burst + body
    {
      const strip = makeStrip("snare");
      const bp = new T.Filter({ type: "bandpass", frequency: 1800, Q: 0.8 }).connect(strip.level);
      const snare = new T.NoiseSynth({ noise: { type: "pink" }, envelope: { attack: 0.001, decay: 0.16, sustain: 0 } }).connect(bp);
      S.snare = snare; graph.disposables.push(bp, snare);
    }
    // arp — fast pulse-wave chiptune arpeggio
    {
      const strip = makeStrip("arp");
      const arp = new T.PolySynth(T.Synth, { maxPolyphony: 6,
        oscillator: { type: "pulse", width: 0.35 },
        envelope: { attack: 0.002, decay: 0.1, sustain: 0, release: 0.08 } }).connect(strip.level);
      arp.volume.value = -4;
      S.arp = arp; graph.disposables.push(arp);
    }
    // lead — generative chiptune melody (square + a touch of vibrato)
    {
      const strip = makeStrip("lead");
      const vib = new T.Vibrato({ frequency: 5.5, depth: 0.06 }).connect(strip.level);
      const lead = new T.PolySynth(T.Synth, { maxPolyphony: 4,
        oscillator: { type: "square" },
        envelope: { attack: 0.004, decay: 0.18, sustain: 0.25, release: 0.2 } }).connect(vib);
      lead.volume.value = -6;
      S.lead = lead; graph.disposables.push(vib, lead);
    }

    /* ---- per-cabinet accent voices ---- */
    { const strip = makeStrip("sprint");
      const s = new T.PolySynth(T.Synth, { maxPolyphony: 10, oscillator: { type: "pulse", width: 0.5 },
        envelope: { attack: 0.003, decay: 0.12, sustain: 0, release: 0.1 } }).connect(strip.level);
      S.sprint = s; graph.disposables.push(s); }
    { const strip = makeStrip("tugofwar");
      const pan = new T.Panner(0).connect(strip.level);
      const s = new T.PolySynth(T.Synth, { maxPolyphony: 6, oscillator: { type: "triangle" },
        envelope: { attack: 0.01, decay: 0.26, sustain: 0.1, release: 0.3 } }).connect(pan);
      S.tugofwar = s; S.tugPan = pan; graph.disposables.push(pan, s); }
    { const strip = makeStrip("canvas");
      const s = new T.PolySynth(T.FMSynth, { maxPolyphony: 12, harmonicity: 3.01, modulationIndex: 8,
        oscillator: { type: "sine" }, envelope: { attack: 0.002, decay: 1.0, sustain: 0, release: 1.2 },
        modulation: { type: "sine" }, modulationEnvelope: { attack: 0.002, decay: 0.2, sustain: 0, release: 0.2 } }).connect(strip.level);
      S.canvas = s; graph.disposables.push(s); }
    { const strip = makeStrip("button");
      const s = new T.MembraneSynth({ pitchDecay: 0.08, octaves: 5, oscillator: { type: "sine" },
        envelope: { attack: 0.004, decay: 0.6, sustain: 0, release: 0.6 } }).connect(strip.level);
      S.button = s; graph.disposables.push(s); }
    { const strip = makeStrip("clawback");
      const s = new T.PolySynth(T.AMSynth, { maxPolyphony: 6, harmonicity: 2.2, oscillator: { type: "triangle" },
        envelope: { attack: 0.02, decay: 0.25, sustain: 0.18, release: 0.5 }, modulation: { type: "square" } }).connect(strip.level);
      S.clawback = s; graph.disposables.push(s); }
    { const strip = makeStrip("degendash");
      const s = new T.PolySynth(T.Synth, { maxPolyphony: 8, oscillator: { type: "square" },
        envelope: { attack: 0.002, decay: 0.08, sustain: 0, release: 0.05 } }).connect(strip.level);
      S.degendash = s; graph.disposables.push(s); }

    /* ---- event SFX (jingles / stingers / risers) ---- */
    { const strip = makeStrip("blip");
      const blip = new T.PolySynth(T.Synth, { maxPolyphony: 10, oscillator: { type: "pulse", width: 0.5 },
        envelope: { attack: 0.002, decay: 0.16, sustain: 0, release: 0.16 } }).connect(strip.level);
      const riserHP = new T.Filter({ type: "bandpass", frequency: 400, Q: 1.2 }).connect(strip.level);
      const riser = new T.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.6, decay: 0.4, sustain: 0 } }).connect(riserHP);
      S.blip = blip; S.riser = riser; S.riserHP = riserHP; graph.disposables.push(blip, riser, riserHP); }
  }

  /* ====================================================================== harmony */
  function chordRootSemis() { return PROGRESSION[chordIdx % PROGRESSION.length]; }
  function modeArr() { return MODES[modeName] || MODES.bright; }
  function thirdSemis() { return modeName === "spacey" ? 3 : 4; } // minor vs major third
  // a scale note of the current key (consonant over the whole progression)
  function scaleFreq(degree, octave) {
    const sc = modeArr(), len = sc.length;
    const idx = ((degree % len) + len) % len;
    const oct = Math.floor(degree / len) + octave;
    return midiToFreq(keyRootMidi + sc[idx] + 12 * oct);
  }
  // chord tones around the current chord root (for arp + bass)
  function chordFreq(toneIdx, octave) {
    const tones = [0, thirdSemis(), 7, 12];
    const t = tones[((toneIdx % tones.length) + tones.length) % tones.length];
    return midiToFreq(keyRootMidi + chordRootSemis() + t + 12 * octave);
  }

  function setKey(rootName, mode) {
    if (rootName != null) {
      // keep the octave near 3 for a stable bass register
      const pc = NOTE_NAMES.indexOf(rootName);
      if (pc >= 0) keyRootMidi = 12 * (3 + 1) + pc;
    }
    if (mode && MODES[mode]) modeName = mode;
    repad();
  }
  function modulate(semis) {
    keyRootMidi += semis;
    modCount += Math.sign(semis);
    triggerRiser();
    repad();
    if (opts.debug) console.log("[arcade-score] modulate", semis, "root", keyRootMidi);
  }
  function returnHome() { keyRootMidi = homeRootMidi; modCount = 0; repad(); }
  function repad() {
    if (!graph || !on) return;
    const t = T.now() + 0.02;
    if (heldPad) { try { graph.synth.pad.triggerRelease(heldPad, t); } catch (e) {} }
    heldPad = [chordFreq(0, 0), chordFreq(1, 0), chordFreq(2, 0)];
    graph.synth.pad.triggerAttackRelease(heldPad, "2m", t, 0.5);
    bumpMeter("pad", 0.5);
  }
  let heldPad = null;

  /* ====================================================================== sequencer */
  function buildSequences() {
    // ONE 16th-note clock drives drums + bass + arp + chord/bar advance.
    const stepLoop = new T.Loop((time) => {
      const s = step; step = (step + 1) % 16;
      // swing: push odd 16ths a touch late
      const sw = (s % 2 === 1) ? swing * (T.Time("16n").toSeconds()) : 0;
      const t = time + sw;

      // --- chord / bar advance at the top of each bar ---
      if (s === 0) {
        bar++;
        const barsPerChord = energy > 0.5 ? 1 : 2;
        if (bar % barsPerChord === 0) {
          chordIdx = (chordIdx + 1) % PROGRESSION.length;
          repadAt(time);
        }
        // mode brightens with energy (cool when idle, bright when busy)
        const wantMode = energy > 0.45 ? "bright" : "spacey";
        if (wantMode !== modeName) { modeName = wantMode; }
        // auto key-cycle: every 8 bars drift up a step, tour then home
        if (autoKeyCycle && bar % 8 === 0) {
          if (modCount >= 3) returnHome(); else modulate(2);
        }
      }

      // --- KICK ---
      if (energyGate.kick > 0.02) {
        const kickHit = (s === 0 || s === 8) || (energy > 0.6 && (s === 6 || s === 14));
        if (kickHit) { graph.synth.kick.triggerAttackRelease(scaleFreq(0, -2), "8n", t, 0.8); bumpMeter("kick", 0.9); }
      }
      // --- SNARE on 2 & 4 ---
      if (energyGate.snare > 0.02 && (s === 4 || s === 12)) {
        graph.synth.snare.triggerAttackRelease("16n", t, 0.7); bumpMeter("snare", 0.8);
      }
      // --- HATS: offbeats, denser as it builds ---
      if (energyGate.hat > 0.02) {
        const hatHit = energy > 0.55 ? (s % 2 === 0) : (s % 4 === 2);
        if (hatHit) { graph.synth.hat.triggerAttackRelease("32n", t, s % 4 === 2 ? 0.6 : 0.35); bumpMeter("hat", 0.5); }
      }
      // --- BASS: funky pattern locked to the chord ---
      if (energyGate.bass > 0.02) {
        const pat = energy > 0.5
          ? [1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1]   // busy funk
          : [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0];  // sparse noodle
        if (pat[s]) {
          const toneIdx = (s === 6 || s === 14) ? 2 : (s % 8 === 0 ? 0 : 1); // root/fifth/oct skips
          const oct = (s === 7 || s === 15) ? 0 : -1; // occasional octave pop
          graph.synth.bass.triggerAttackRelease(chordFreq(toneIdx, oct), "8n", t, 0.9);
          bumpMeter("bass", 0.8);
        }
      }
      // --- ARP: fast chiptune chord arpeggio ---
      if (energyGate.arp > 0.02) {
        const rate = energy > 0.7 ? 1 : 2; // 16ths when frenetic, 8ths otherwise
        if (s % rate === 0) {
          const toneIdx = Math.floor(s / rate);
          graph.synth.arp.triggerAttackRelease(chordFreq(toneIdx, 1), "16n", t, 0.5);
          bumpMeter("arp", 0.5);
        }
      }
    }, "16n").start(0);

    // LEAD: a separate, breathier 8th-note generative melody for the busy tiers.
    const leadLoop = new T.Loop((time) => {
      if (energyGate.lead <= 0.03) return;
      // phrase with rests; more notes + higher contour as energy climbs
      const density = 0.35 + energy * 0.45;
      if (Math.random() > density) return;
      const onChord = Math.random() < 0.6;
      let freq;
      if (onChord) freq = chordFreq(Math.floor(Math.random() * 3), 1);
      else freq = scaleFreq(Math.floor(Math.random() * 6), 1);
      const vel = 0.4 + Math.random() * 0.3;
      graph.synth.lead.triggerAttackRelease(freq, Math.random() < 0.3 ? "8n" : "16n", time, vel);
      bumpMeter("lead", 0.7);
    }, "8n").start("0:0:2");

    graph.disposables.push(stepLoop, leadLoop);
  }
  function repadAt(time) {
    if (heldPad) { try { graph.synth.pad.triggerRelease(heldPad, time); } catch (e) {} }
    heldPad = [chordFreq(0, 0), chordFreq(1, 0), chordFreq(2, 0)];
    graph.synth.pad.triggerAttackRelease(heldPad, "2m", time, 0.5);
    bumpMeter("pad", 0.5);
  }

  /* ====================================================================== energy */
  // map smoothed activity -> target energy; ease energy toward it; apply gates.
  function updateEnergy() {
    energyTarget = energyOverride != null ? energyOverride : clamp01(intensity * 1.15);
    energy += (energyTarget - energy) * (energyTarget > energy ? 0.25 : 0.04); // rise faster than fall
    // bed layer gates (smooth fade-ins as the arrangement escalates)
    energyGate.pad = clamp(0.95 - energy * 0.3, 0.5, 0.95);
    energyGate.bass = smooth01((energy - 0.08) / 0.22);
    energyGate.hat = smooth01((energy - 0.18) / 0.22);
    energyGate.kick = smooth01((energy - 0.24) / 0.2);
    energyGate.snare = smooth01((energy - 0.42) / 0.22);
    energyGate.arp = smooth01((energy - 0.46) / 0.26);
    energyGate.lead = smooth01((energy - 0.6) / 0.26);
    for (const l of BED_LAYERS) setStripGain(l, 0.4);
    // tempo + brightness ride energy
    const bpm = tempoOverride != null ? tempoOverride : Math.round(96 + energy * 52); // 96..148
    if (graph) {
      T.getTransport().bpm.rampTo(bpm, 1.5);
      graph.padFilter.frequency.rampTo(500 + energy * 3200, 1.2);
      graph.reverbBus.gain.rampTo(1.0 + energy * 0.25, 1.5);
    }
  }

  /* ====================================================================== feed */
  function feed(snapshot) {
    const per = snapshot && snapshot.perCabinet ? snapshot.perCabinet : {};
    if (!on || !started) { // track baselines even while muted
      for (const id in per) lastVal[id] = per[id];
      lastTotal = snapshot ? snapshot.total : lastTotal;
      return;
    }
    const t0 = T.now() + 0.05;
    let globalDelta = 0;
    for (const id of GAME_VOICES) {
      if (!(id in per)) continue;
      const v = per[id], prev = lastVal[id];
      lastVal[id] = v;
      if (prev == null) continue;
      const d = Math.max(0, v - prev);
      if (d <= 0 || d > DELTA_SANITY_CAP) continue;
      globalDelta += d;
      const avg = voiceAvg[id];
      voiceAvg[id] = avg == null ? d : avg + (d - avg) * 0.3;
      const surge = avg != null && avg > 0 && d > avg * 2.4 && d >= 4;
      playAccent(id, d, t0, surge);
    }
    // intensity (drives energy); rises fast, falls slow
    const target = clamp01(Math.log10(1 + globalDelta) / 2.2);
    intensity += (target - intensity) * (target > intensity ? 0.5 : 0.1);
    // milestone -> moment + key lift
    if (snapshot && typeof snapshot.total === "number") {
      const bucket = Math.floor(snapshot.total / momentStep);
      if (momentBucket != null && bucket > momentBucket) { triggerMoment(); if (modCount < 3) modulate(2); }
      else if (momentBucket == null) momentBucket = bucket;
      if (momentBucket != null && bucket > momentBucket) momentBucket = bucket;
      momentBucket = bucket;
      lastTotal = snapshot.total;
    }
    if (opts.debug) console.log("[arcade-score] feed", { globalDelta, intensity: +intensity.toFixed(2), energy: +energy.toFixed(2), tier: tierName(energy) });
  }

  // a cabinet's delta -> its accent voice, tuned to the current chord/scale
  function playAccent(id, delta, t0, surge) {
    const S = graph.synth; if (!S[id]) return;
    const cap = (id === "canvas" || id === "sprint") ? 8 : 6;
    let n = Math.min(cap, 1 + Math.floor(Math.log2(1 + delta)));
    if (surge) n = Math.min(cap + 2, n + 2);
    const vel = clamp(0.3 + Math.log10(1 + delta) * 0.18, 0.3, 0.85);
    const span = 1.7;
    bumpMeter(id, clamp(0.4 + n * 0.08, 0.4, 1));
    switch (id) {
      case "sprint": { // ascending pulse arp over the chord
        const step = Math.min(0.11, span / n);
        for (let i = 0; i < n; i++) S.sprint.triggerAttackRelease(chordFreq(i, 1), "16n", t0 + i * step, vel * (0.7 + 0.3 * Math.random()));
        break; }
      case "tugofwar": { // panned back-and-forth between two chord tones
        const step = Math.min(0.34, span / n);
        for (let i = 0; i < n; i++) { S.tugPan.pan.setValueAtTime(i % 2 ? 0.6 : -0.6, t0 + i * step);
          S.tugofwar.triggerAttackRelease(chordFreq(i % 2 ? 2 : 0, 0), "8n", t0 + i * step, vel); }
        break; }
      case "canvas": { // scattered glassy chimes from the scale, high
        for (let i = 0; i < n; i++) S.canvas.triggerAttackRelease(scaleFreq(Math.floor(Math.random() * 8), 2), "2n", t0 + Math.random() * span, vel * 0.85);
        break; }
      case "button": { // deep sub thumps (doubles the kick feel)
        const hits = Math.min(n, 3), step = Math.min(0.4, span / hits);
        for (let i = 0; i < hits; i++) S.button.triggerAttackRelease(chordFreq(0, -1), "8n", t0 + i * step, clamp(vel, 0.35, 0.75));
        break; }
      case "clawback": { // tension -> resolution gestures
        const g = Math.min(Math.ceil(n / 2), 3), step = Math.min(0.5, span / g);
        for (let i = 0; i < g; i++) { const t = t0 + i * step;
          S.clawback.triggerAttackRelease(scaleFreq(1, 0), "16n", t, vel * 0.7);
          S.clawback.triggerAttackRelease(chordFreq(1, 0), "8n", t + Math.min(0.16, step * 0.45), vel); }
        break; }
      case "degendash": { // hoppy 8-bit bleeps
        const step = Math.min(0.16, span / n);
        for (let i = 0; i < n; i++) S.degendash.triggerAttackRelease(scaleFreq([0, 2, 4, 3, 5][i % 5], 1), "16n", t0 + i * step, vel * 0.6);
        break; }
    }
  }

  /* ====================================================================== moments */
  function triggerMoment() {
    triggerJingle("levelup");
    if (typeof opts.onMoment === "function") { try { opts.onMoment(captureMoment()); } catch (e) {} }
  }
  // original chiptune stingers (coin-y / 1-up VIBE; not copied from anything)
  function triggerJingle(type) {
    if (!graph || !on) return;
    const S = graph.synth, t = T.now() + 0.03;
    if (type === "coin") {
      S.blip.triggerAttackRelease(scaleFreq(2, 2), "16n", t, 0.7);
      S.blip.triggerAttackRelease(scaleFreq(4, 2), "8n", t + 0.08, 0.7);
    } else if (type === "milestone" || type === "levelup") {
      for (let i = 0; i < 6; i++) S.blip.triggerAttackRelease(scaleFreq(i, 1), "16n", t + i * 0.07, 0.55 + 0.03 * i);
      S.blip.triggerAttackRelease([scaleFreq(0, 2), scaleFreq(2, 2), scaleFreq(4, 2)], "4n", t + 0.45, 0.6);
      graph.reverbBus.gain.rampTo(1.6, 0.3, t); graph.reverbBus.gain.rampTo(1.0 + energy * 0.25, 4, t + 1);
    }
    bumpMeter("blip", 1);
  }
  function triggerRiser() {
    if (!graph || !on) return;
    const t = T.now() + 0.02;
    try {
      graph.synth.riserHP.frequency.setValueAtTime(400, t);
      graph.synth.riserHP.frequency.rampTo(6000, 1.4, t);
      graph.synth.riser.triggerAttackRelease(1.2, t, 0.5);
    } catch (e) {}
    bumpMeter("blip", 0.6);
  }

  /* ---- the MINT hook (seam): freeze state; do NOT mint here ---- */
  function captureMoment() {
    return { ts: Date.now(), total: lastTotal, perCabinet: Object.assign({}, lastVal),
      intensity: +intensity.toFixed(3), energy: +energy.toFixed(3), tier: tierName(energy),
      key: { root: NOTE_NAMES[keyRootMidi % 12], mode: modeName }, bpm: graph ? Math.round(T.getTransport().bpm.value) : null,
      mix: JSON.parse(JSON.stringify(mix)) };
  }

  /* ====================================================================== lifecycle */
  function ensureAudio() {
    if (started) return Promise.resolve(true);
    if (loading) return loading;
    loading = (async () => {
      const mod = await import(TONE_URL);
      T = mod && mod.Synth ? mod : mod.default || mod;
      await T.start();
      buildGraph();
      const tr = T.getTransport();
      tr.bpm.value = 100; tr.swing = 0; tr.start();
      // arranger clock: re-evaluate energy a few times a second
      tr.scheduleRepeat(() => { if (on) updateEnergy(); }, "8n");
      if (typeof opts.onBeat === "function") {
        tr.scheduleRepeat((time) => { if (on) { try { T.getDraw().schedule(() => opts.onBeat({ energy, tier: tierName(energy) }), time); } catch (e) {} } }, "4n");
      }
      started = true;
      return true;
    })().catch((e) => { console.warn("[arcade-score] audio init failed:", e); loading = null; return false; });
    return loading;
  }
  function applyMasterLevel() { if (graph) graph.master.gain.rampTo(on ? mix.master.level : 0, 0.12); }
  async function setOn(next) {
    if (next) {
      const ok = await ensureAudio(); if (!ok) return false;
      on = true;
      if (momentBucket == null && lastTotal != null) momentBucket = Math.floor(lastTotal / momentStep);
      updateEnergy(); repad();
      T.getTransport().start(); applyMasterLevel();
    } else {
      on = false; applyMasterLevel();
      if (started) setTimeout(() => { if (!on && started) T.getTransport().pause(); }, 250);
    }
    return on;
  }

  /* ====================================================================== mixer + studio API */
  function setLevel(v, val) { if (mix.voices[v]) { mix.voices[v].level = val; userLevel[v] = val; setStripGain(v, 0.05); } }
  function setSend(v, kind, val) { if (!mix.voices[v]) return; mix.voices[v][kind] = val;
    const s = graph && graph.strips[v]; if (s) (kind === "reverb" ? s.rev : s.del).gain.rampTo(val, 0.05); }
  function setMaster(v) { mix.master.level = v; applyMasterLevel(); }
  function setMute(v, b) { muted[v] = !!b; setStripGain(v, 0.05); }
  function setSolo(v, b) { soloed[v] = !!b; for (const k in graph.strips) setStripGain(k, 0.05); }
  function applyMix(preset) { if (!preset) return;
    if (preset.master) setMaster(preset.master.level);
    if (preset.voices) for (const k in preset.voices) { const s = preset.voices[k];
      if (s.level != null) setLevel(k, s.level);
      if (s.reverb != null) setSend(k, "reverb", s.reverb);
      if (s.delay != null) setSend(k, "delay", s.delay); } }
  function getMix() { return JSON.parse(JSON.stringify(mix)); }

  function setEnergyOverride(v) { energyOverride = v; if (on) updateEnergy(); }
  function setTempoOverride(v) { tempoOverride = v; if (on) updateEnergy(); }
  function setSwing(v) { swing = clamp(v, 0, 0.5); if (graph) T.getTransport().swing = 0; } // we apply swing manually
  function setAutoKeyCycle(b) { autoKeyCycle = !!b; }

  // feel presets — quick palettes the studio can drop in
  const PRESETS = {
    Lobby:   { energy: 0.06 },
    Warmup:  { energy: 0.35 },
    Groove:  { energy: 0.66 },
    Frenzy:  { energy: 0.95 },
    Auto:    { energy: null },
  };
  function applyPreset(name) { const p = PRESETS[name]; if (p) setEnergyOverride(p.energy); }

  // decay the meters a touch each call so the studio shows live levels
  function getState() {
    const voices = {};
    for (const k in mix.voices) {
      meter[k] = (meter[k] || 0) * 0.78;
      voices[k] = { level: userLevel[k], reverb: mix.voices[k].reverb, delay: mix.voices[k].delay,
        muted: !!muted[k], soloed: !!soloed[k], gate: energyGate[k] == null ? 1 : +energyGate[k].toFixed(2),
        meter: +(meter[k] || 0).toFixed(3) };
    }
    return { on, started, intensity: +intensity.toFixed(3), energy: +energy.toFixed(3), tier: tierName(energy),
      energyOverride, bpm: graph ? Math.round(T.getTransport().bpm.value) : null, tempoOverride,
      key: { root: NOTE_NAMES[((keyRootMidi % 12) + 12) % 12], mode: modeName }, modCount, autoKeyCycle,
      chordIdx, bar, total: lastTotal, master: mix.master.level, voices };
  }

  function dispose() {
    on = false; if (!started || !graph) return;
    try { T.getTransport().stop(); } catch (e) {}
    for (const node of graph.disposables) { try { node.dispose(); } catch (e) {} }
    graph = null; started = false;
  }

  return {
    feed, setOn, toggle() { return setOn(!on); }, isOn() { return on; }, isStarted() { return started; },
    captureMoment, triggerMoment, triggerJingle,
    // mixer
    setLevel, setSend, setMaster, setMute, setSolo, applyMix, getMix,
    // arranger + harmony (studio)
    setEnergyOverride, setTempoOverride, setSwing, setKey, modulate, returnHome, setAutoKeyCycle, applyPreset,
    getState, presets: Object.keys(PRESETS),
    get intensity() { return intensity; }, get energy() { return energy; },
    dispose,
  };
}
