import { CompetitorsView } from "@/components/competitors-view";
import { PageTitle } from "@/components/page-title";

export const metadata = { title: "Competitor watch" };

export default function CompetitorsPage() {
  return (
    <>
      <PageTitle title="Competitor watch" description="Keep an eye on rivals' pages and hear about new offers the moment they appear." />
      <CompetitorsView />
    </>
  );
}
