import { Suspense } from "react";
import { LeadsView } from "@/components/leads-view";
import { PageTitle } from "@/components/page-title";

export const metadata = { title: "Leads" };

export default function LeadsPage() {
  return (
    <>
      <PageTitle
        tkey="page.leads"
        title="Leads"
        description="Every business your searches have found. Filter them, track who you've contacted, and export."
      />
      <Suspense>
        <LeadsView />
      </Suspense>
    </>
  );
}
