import { AdminView } from "@/components/admin-view";
import { PageTitle } from "@/components/page-title";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Super Admin" };

export default async function AdminPage() {
  await requireAdmin();
  return (
    <>
      <PageTitle title="Super Admin" description="Full control: customers, payments, plans, features, leads and platform settings." />
      <AdminView />
    </>
  );
}
