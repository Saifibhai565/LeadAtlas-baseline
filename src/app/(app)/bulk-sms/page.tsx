import { BulkSmsView } from "@/components/bulk-sms-view";
import { PageTitle } from "@/components/page-title";

export const metadata = { title: "Bulk SMS" };

export default function BulkSmsPage() {
  return (
    <>
      <PageTitle
        tkey="page.bulkSms"
        title="Bulk SMS" description="Paste a list of numbers, write once, and send through your SMS provider with live counts." />
      <BulkSmsView />
    </>
  );
}
