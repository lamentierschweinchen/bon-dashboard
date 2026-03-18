import { notFound } from "next/navigation";
import { ChallengeBlueprintView } from "@/components/control-room/ChallengeBlueprintView";
import { ChallengeFourView } from "@/components/control-room/ChallengeFourView";
import { ChallengeFiveView } from "@/components/control-room/ChallengeFiveView";
import { ChallengeOneView } from "@/components/control-room/ChallengeOneView";
import { ChallengeThreeView } from "@/components/control-room/ChallengeThreeView";
import { ChallengeTwoView } from "@/components/control-room/ChallengeTwoView";
import { getChallenge1DashboardData } from "@/lib/control-room/challenge1";
import { getChallenge2DashboardData } from "@/lib/control-room/challenge2";
import { getChallenge3DashboardData } from "@/lib/control-room/challenge3";
import { getChallenge4DashboardData } from "@/lib/control-room/challenge4";
import { getChallenge5DashboardData } from "@/lib/control-room/challenge5";
import { getChallengeSpec } from "@/lib/control-room/specs";

export const dynamic = "force-dynamic";

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ challengeId: string }>;
}) {
  const { challengeId } = await params;
  const challenge = getChallengeSpec(challengeId);

  if (!challenge) {
    notFound();
  }

  switch (challenge.id) {
    case "challenge-1": {
      const data = await getChallenge1DashboardData();
      return <ChallengeOneView challenge={challenge} data={data} />;
    }
    case "challenge-2": {
      const data = await getChallenge2DashboardData();
      return <ChallengeTwoView challenge={challenge} data={data} />;
    }
    case "challenge-3": {
      const data = await getChallenge3DashboardData();
      return <ChallengeThreeView challenge={challenge} data={data} />;
    }
    case "challenge-4": {
      const data = await getChallenge4DashboardData();
      return <ChallengeFourView challenge={challenge} data={data} />;
    }
    case "challenge-5": {
      const data = await getChallenge5DashboardData();
      return <ChallengeFiveView challenge={challenge} data={data} />;
    }
    default:
      return <ChallengeBlueprintView challenge={challenge} />;
  }
}
