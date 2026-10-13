import { HelpCenter } from "@/components/help-center";
import { PageTitle } from "@/components/page-title";

export const metadata = { title: "Help center" };

export default function HelpPage() {
  return (
    <>
      <PageTitle title="Help center" description="Short guides for everything in the app." />
      <HelpCenter />
    </>
  );
}
