import { BillingView } from "@/components/billing-view";
import { PageTitle } from "@/components/page-title";

export const metadata = { title: "Billing" };

export default function BillingPage() {
  return (
    <>
      <PageTitle title="Billing" description="Your plan, credits and payments." />
      <BillingView />
    </>
  );
}
