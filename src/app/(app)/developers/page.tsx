import { DevelopersView } from "@/components/developers-view";
import { PageTitle } from "@/components/page-title";

export const metadata = { title: "API and extension" };

export default function DevelopersPage() {
  return (
    <>
      <PageTitle title="API and extension" description="Connect other tools and save leads straight from your browser." />
      <DevelopersView />
    </>
  );
}
