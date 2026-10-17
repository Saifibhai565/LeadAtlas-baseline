import { DeliverabilityView } from "@/components/deliverability-view";
import { PageTitle } from "@/components/page-title";

export const metadata = { title: "Deliverability" };

export default function DeliverabilityPage() {
  return (
    <>
      <PageTitle title="Email deliverability" description="Warm up your mailboxes, check your domain setup, and keep your emails out of spam." />
      <DeliverabilityView />
    </>
  );
}
