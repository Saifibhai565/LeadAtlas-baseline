import { OutreachView } from "@/components/outreach-view";
import { PageTitle } from "@/components/page-title";

export const metadata = { title: "Email outreach" };

export default function OutreachPage() {
  return (
    <>
      <PageTitle title="Email outreach" description="Send from your own inbox, with follow-ups that stop when people reply." />
      <OutreachView />
    </>
  );
}
