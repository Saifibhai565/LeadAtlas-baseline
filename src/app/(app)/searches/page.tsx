import { PageTitle } from "@/components/page-title";
import { SearchesView } from "@/components/searches-view";

export const metadata = { title: "Searches" };

export default function SearchesPage() {
  return (
    <>
      <PageTitle
        tkey="page.searches"
        title="Searches"
        description="Search Google Maps for businesses. New ones are saved to your leads, and each new lead uses 1 credit."
      />
      <SearchesView />
    </>
  );
}
