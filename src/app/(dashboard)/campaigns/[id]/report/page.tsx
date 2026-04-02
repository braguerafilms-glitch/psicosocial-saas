import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReportClient } from "./ReportClient";

export default async function ReportPage({
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

  return <ReportClient campaignId={params.id} />;
}
