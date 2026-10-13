import { ExtractView } from "@/components/extract-view";
import { PageTitle } from "@/components/page-title";

export const metadata = { title: "Web extractor" };

export default function ExtractPage() {
  return (
    <>
      <PageTitle
        title="Web extractor"
        description="Paste the address of any public listing page, such as a trade directory or association member list, and save the businesses on it as leads."
      />
      <ExtractView />
    </>
  );
}
