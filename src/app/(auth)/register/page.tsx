"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { supabaseErrorMessage } from "@/lib/supabase-errors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

const schema = z.object({
  name: z.string().min(3, "Informe seu nome completo"),
  document_type: z.enum(["cpf", "cnpj"]),
  document: z.string().min(11, "Informe CPF ou CNPJ"),
  crea: z.string().min(4, "Informe o CREA"),
  company_name: z.string().min(2, "Informe o nome da consultoria"),
  email: z.string().email("Informe um e-mail válido"),
  password: z.string().min(6, "Mínimo de 6 caracteres"),
});

type Form = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [docLookupLoading, setDocLookupLoading] = useState(false);
  const [docMsg, setDocMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { document_type: "cnpj" },
  });

  const docType = watch("document_type");

  async function lookupCnpj(raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length !== 14) return;
    setDocLookupLoading(true);
    setDocMsg(null);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (!res.ok) { setDocMsg("CNPJ não encontrado."); return; }
      const data = await res.json() as {
        razao_social?: string;
        nome_fantasia?: string;
        qsa?: { nome_socio?: string }[];
        email?: string;
      };
      if (data.razao_social) setValue("company_name", data.razao_social);
      if (data.qsa?.[0]?.nome_socio) setValue("name", data.qsa[0].nome_socio);
      if (data.email) setValue("email", data.email.toLowerCase());
      setDocMsg("Dados preenchidos ✓");
    } catch {
      setDocMsg("Erro ao consultar CNPJ.");
    } finally {
      setDocLookupLoading(false);
    }
  }

  async function onSubmit(values: Form) {
    setError(null);
    setInfo(null);
    const supabase = createClient();
    const { data, error: signError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
    });
    if (signError) {
      setError(supabaseErrorMessage(signError, "Falha ao cadastrar"));
      return;
    }
    const userId = data.user?.id;
    if (!userId || !data.session) {
      setInfo("Cadastro recebido. Verifique seu e-mail para confirmar a conta antes de entrar.");
      return;
    }
    const { error: engError } = await supabase.from("sst_engineers").insert({
      user_id: userId,
      name: values.name,
      crea: values.crea,
      company_name: values.company_name,
      email: values.email,
    });
    if (engError) {
      setError(supabaseErrorMessage(engError, "Conta criada, mas falhou ao salvar perfil"));
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md border-border bg-card p-8">
      <div className="mb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent/70">HSE Core</p>
        <h1 className="mt-1 text-xl font-semibold text-foreground">Criar conta</h1>
        <p className="mt-1 text-sm text-muted">Avalie. Analise. Aja.</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        {/* CPF ou CNPJ toggle */}
        <div>
          <label className="mb-1.5 block text-sm text-muted">Tipo de cadastro</label>
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["cnpj", "cpf"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setValue("document_type", t); setDocMsg(null); }}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  docType === t
                    ? "bg-accent text-background"
                    : "bg-surface text-muted hover:text-foreground"
                }`}
              >
                {t === "cnpj" ? "Empresa (CNPJ)" : "Pessoa Física (CPF)"}
              </button>
            ))}
          </div>
        </div>

        {/* Documento com busca */}
        <div className="space-y-1">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                label={docType === "cnpj" ? "CNPJ" : "CPF"}
                placeholder={docType === "cnpj" ? "00.000.000/0000-00" : "000.000.000-00"}
                error={errors.document?.message}
                {...register("document")}
              />
            </div>
            {docType === "cnpj" ? (
              <Button
                type="button"
                variant="secondary"
                loading={docLookupLoading}
                onClick={() => {
                  const el = document.querySelector<HTMLInputElement>('input[name="document"]');
                  if (el) void lookupCnpj(el.value);
                }}
              >
                Buscar
              </Button>
            ) : null}
          </div>
          {docMsg ? (
            <p className={`text-xs ${docMsg.includes("✓") ? "text-green-400" : "text-red-400"}`}>
              {docMsg}
            </p>
          ) : docType === "cnpj" ? (
            <p className="text-xs text-muted">Busque pelo CNPJ para preencher automaticamente.</p>
          ) : null}
        </div>

        <Input label="Nome completo" autoComplete="name" error={errors.name?.message} {...register("name")} />
        <Input label="Empresa / consultoria" error={errors.company_name?.message} {...register("company_name")} />
        <Input label="CREA / registro profissional" error={errors.crea?.message} {...register("crea")} />
        <Input label="E-mail" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
        <Input label="Senha" type="password" autoComplete="new-password" error={errors.password?.message} {...register("password")} />

        {error ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
        ) : null}
        {info ? (
          <p className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-foreground">{info}</p>
        ) : null}

        <Button type="submit" className="w-full" loading={isSubmitting}>Cadastrar</Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link href="/login" className="text-accent hover:underline">Entrar</Link>
      </p>
    </Card>
  );
}
