import { PageTitle } from "@/components/page-title";
import { TeamView } from "@/components/team-view";

export const metadata = { title: "Team" };

export default function TeamPage() {
  return (
    <>
      <PageTitle tkey="page.team"
        title="Team" description="Work on the same leads together." />
      <TeamView />
    </>
  );
}
