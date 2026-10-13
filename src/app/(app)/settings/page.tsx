import { PageTitle } from "@/components/page-title";
import { SettingsView } from "@/components/settings-view";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageTitle title="Settings" description="How you appear in messages, and what you offer." />
      <SettingsView />
    </>
  );
}
