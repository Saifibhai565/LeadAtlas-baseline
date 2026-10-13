import { PageTitle } from "@/components/page-title";
import { TemplatesView } from "@/components/templates-view";

export const metadata = { title: "Templates" };

export default function TemplatesPage() {
  return (
    <>
      <PageTitle title="Message templates" description="Reusable WhatsApp and email messages. Details like the business name fill in for each lead." />
      <TemplatesView />
    </>
  );
}
