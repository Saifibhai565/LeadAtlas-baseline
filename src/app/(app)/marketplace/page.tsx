import { MarketplaceView } from "@/components/marketplace-view";
import { PageTitle } from "@/components/page-title";

export const metadata = { title: "Template marketplace" };

export default function MarketplacePage() {
  return (
    <>
      <PageTitle tkey="page.marketplace" title="Template marketplace" description="Ready-made WhatsApp, SMS and email templates. Add any to your own with one tap." />
      <MarketplaceView />
    </>
  );
}
