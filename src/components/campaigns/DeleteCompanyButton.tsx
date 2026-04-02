"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export function DeleteCompanyButton({ companyId }: { companyId: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("companies").delete().eq("id", companyId);
    setLoading(false);
    router.push("/companies");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded p-1 text-muted transition-colors hover:text-red-400"
        title="Excluir empresa"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M3 7h18" />
        </svg>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h2 className="text-base font-semibold text-foreground">Excluir empresa</h2>
            <p className="mt-2 text-sm text-muted">
              Esta ação é irreversível. Todas as campanhas e respostas associadas serão perdidas.
            </p>
            <p className="mt-4 text-sm text-muted">
              Digite <span className="font-semibold text-foreground">CONFIRMAR</span> para continuar:
            </p>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="CONFIRMAR"
              className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => { setOpen(false); setInput(""); }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                loading={loading}
                disabled={input !== "CONFIRMAR"}
                onClick={() => void handleDelete()}
                className="!bg-red-500 hover:!bg-red-600"
              >
                Excluir
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
