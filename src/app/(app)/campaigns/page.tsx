import { Suspense } from "react";
import { CampaignsView } from "@/components/campaigns-view";
import { PageTitle } from "@/components/page-title";

export const metadata = { title: "Campaigns" };

export default function CampaignsPage() {
  return (
    <>
      <PageTitle
        tkey="page.campaigns"
        title="WhatsApp and SMS campaigns"
        description="Go through a list of leads one by one. Each message opens ready on your phone or WhatsApp, and you press send."
      />
      <Suspense>
        <CampaignsView />
      </Suspense>
    </>
  );
}
