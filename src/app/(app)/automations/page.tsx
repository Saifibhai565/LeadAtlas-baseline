import { AutomationsView } from "@/components/automations-view";
import { PageTitle } from "@/components/page-title";

export const metadata = { title: "Automations" };

export default function AutomationsPage() {
  return (
    <>
      <PageTitle tkey="page.automations" title="Automations" description="Save time: when a lead reaches a stage, do something automatically." />
      <AutomationsView />
    </>
  );
}
