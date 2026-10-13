import { Suspense } from "react";
import { PageTitle } from "@/components/page-title";
import { SitesView } from "@/components/sites-view";

export const metadata = { title: "Websites" };

export default function SitesPage() {
  return (
    <>
      <PageTitle title="Websites" description="Turn a demo into a live website for your client, edit it with AI, and host it on their domain." />
      <Suspense>
        <SitesView />
      </Suspense>
    </>
  );
}
