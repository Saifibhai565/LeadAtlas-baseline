import { MeetingView } from "@/components/meeting-view";
import { PageTitle } from "@/components/page-title";

export const metadata = { title: "Meeting booking" };

export default function MeetingPage() {
  return (
    <>
      <PageTitle tkey="page.meeting" title="Meeting booking" description="Give prospects a link to book a time with you, and see your upcoming meetings." />
      <MeetingView />
    </>
  );
}
