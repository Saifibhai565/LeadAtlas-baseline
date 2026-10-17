import { BuyLeadsView } from "@/components/buy-leads-view";
import { PageTitle } from "@/components/page-title";

export const metadata = { title: "Buy leads" };

export default function BuyLeadsPage() {
  return (
    <>
      <PageTitle tkey="page.buyLeads" title="Buy leads" description="Ready business leads from our data bank, by city and category." />
      <BuyLeadsView />
    </>
  );
}
