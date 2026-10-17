import { EnrichView } from "@/components/enrich-view";
import { PageTitle } from "@/components/page-title";

export const metadata = { title: "Website checks" };

export default function EnrichPage() {
  return (
    <>
      <PageTitle
        tkey="page.enrich"
        title="Website checks"
        description="Fill in missing contact details from each business's own website, and find the ones whose website needs work."
      />
      <EnrichView />
    </>
  );
}
