import { AutopilotView } from "@/components/autopilot-view";
import { PageTitle } from "@/components/page-title";

export const metadata = { title: "AI Autopilot" };

export default function AutopilotPage() {
  return (
    <>
      <PageTitle tkey="page.autopilot" title="AI Autopilot" description="Let AI find fresh leads for you every day." />
      <AutopilotView />
    </>
  );
}
