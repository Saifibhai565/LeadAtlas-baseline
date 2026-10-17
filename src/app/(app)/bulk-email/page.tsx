import { BulkEmailView } from "@/components/bulk-email-view";
import { PageTitle } from "@/components/page-title";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Bulk email" };

export default async function BulkEmailPage() {
  const user = await requireUser();
  return (
    <>
      <PageTitle
        tkey="page.bulkEmail"
        title="Bulk email" description="Paste a list, write once, and watch it send with live counts." />
      <BulkEmailView isAdmin={user.isAdmin} />
    </>
  );
}
