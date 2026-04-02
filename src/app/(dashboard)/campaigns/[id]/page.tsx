import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CampaignDetailClient } from "./CampaignDetailClient";

export default async function CampaignDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", params.id)
    .maybeSingle();

  if (!row) notFound();

  return <CampaignDetailClient campaignId={params.id} />;
}
