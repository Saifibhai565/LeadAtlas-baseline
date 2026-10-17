import { AnalyticsView } from "@/components/analytics-view";
import { PageTitle } from "@/components/page-title";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const user = await requireUser();
  return (
    <>
      <PageTitle
        tkey="page.analytics"
        title="Analytics" description="Your funnel, replies, best sending times and return on the tool." />
      <AnalyticsView isAdmin={user.isAdmin} />
    </>
  );
}
