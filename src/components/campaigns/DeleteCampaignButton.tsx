"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DeleteCampaignButton({ campaignId }: { campaignId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Excluir esta campanha? Todas as respostas serão perdidas.")) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("campaigns").delete().eq("id", campaignId);
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => void handleDelete()}
      className="rounded p-1 text-muted transition-colors hover:text-red-400 disabled:opacity-40"
      title="Excluir campanha"
    >
      {loading ? (
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M3 7h18" />
        </svg>
      )}
    </button>
  );
}
