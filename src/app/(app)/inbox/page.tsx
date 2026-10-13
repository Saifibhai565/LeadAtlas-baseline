import { InboxView } from "@/components/inbox-view";
import { PageTitle } from "@/components/page-title";

export const metadata = { title: "WhatsApp inbox" };

export default function InboxPage() {
  return (
    <>
      <PageTitle title="WhatsApp inbox" description="Replies from your WhatsApp Business number, in one place for the whole team." />
      <InboxView />
    </>
  );
}
