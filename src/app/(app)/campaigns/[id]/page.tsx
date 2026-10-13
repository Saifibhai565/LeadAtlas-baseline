import { CampaignRunner } from "@/components/campaign-runner";

export const metadata = { title: "Campaign" };

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CampaignRunner id={id} />;
}
