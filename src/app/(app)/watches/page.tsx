import { PageTitle } from "@/components/page-title";
import { WatchesView } from "@/components/watches-view";

export const metadata = { title: "Watches" };

export default function WatchesPage() {
  return (
    <>
      <PageTitle tkey="page.watches"
        title="Watches" description="Get told when new businesses open in the areas you sell to." />
      <WatchesView />
    </>
  );
}
