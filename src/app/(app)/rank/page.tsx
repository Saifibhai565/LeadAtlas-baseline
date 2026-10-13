import { Suspense } from "react";
import { PageTitle } from "@/components/page-title";
import { RankView } from "@/components/rank-view";

export const metadata = { title: "Rank tracker" };

export default function RankPage() {
  return (
    <>
      <PageTitle title="Google Maps rank tracker" description="See where a business ranks for a search, spot by spot across its neighbourhood." />
      <Suspense>
        <RankView />
      </Suspense>
    </>
  );
}
