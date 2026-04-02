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
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";

const schema = z.object({
  name: z.string().min(2, "Informe a razão social"),
  trade_name: z.string().optional(),
  cnpj: z.string().min(8, "Informe o CNPJ"),
  industry: z.string().min(2, "Informe o setor"),
  city: z.string().min(2, "Informe a cidade"),
  state: z.string().length(2, "UF com 2 letras"),
  contact_name: z.string().min(2, "Informe o contato"),
  contact_email: z.string().email("E-mail inválido"),
  contact_phone: z.string().min(8, "Informe o telefone"),
  employee_count: z
    .number({ message: "Informe o número de funcionários" })
    .int()
    .min(1, "Informe o número de funcionários"),
});

type Form = z.infer<typeof schema>;

const ufs = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

function cleanCnpj(v: string) {
  return v.replace(/\D/g, "");
}

export default function NewCompanyPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjMsg, setCnpjMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  async function lookupCnpj(raw: string) {
    const digits = cleanCnpj(raw);
    if (digits.length !== 14) return;
    setCnpjLoading(true);
    setCnpjMsg(null);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (!res.ok) {
        setCnpjMsg("CNPJ não encontrado na Receita Federal.");
        return;
      }
      const data = await res.json() as {
        razao_social?: string;
        nome_fantasia?: string;
        cnae_fiscal_descricao?: string;
        municipio?: string;
        uf?: string;
        ddd_telefone_1?: string;
        email?: string;
        qsa?: { nome_socio?: string }[];
      };

      if (data.razao_social) setValue("name", data.razao_social);
      if (data.nome_fantasia) setValue("trade_name", data.nome_fantasia);
      if (data.cnae_fiscal_descricao) setValue("industry", data.cnae_fiscal_descricao);
      if (data.municipio) setValue("city", data.municipio);
      if (data.uf && ufs.includes(data.uf)) setValue("state", data.uf);
      if (data.ddd_telefone_1) setValue("contact_phone", data.ddd_telefone_1.replace(/\D/g, "").replace(/^(\d{2})(\d+)/, "($1) $2"));
      if (data.email) setValue("contact_email", data.email.toLowerCase());
      if (data.qsa?.[0]?.nome_socio) setValue("contact_name", data.qsa[0].nome_socio);

      setCnpjMsg("Dados preenchidos automaticamente ✓");
    } catch {
      setCnpjMsg("Erro ao consultar CNPJ.");
    } finally {
      setCnpjLoading(false);
    }
  }

  async function onSubmit(values: Form) {
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sessão expirada. Entre novamente.");
      return;
    }
    const { data: engineer, error: eErr } = await supabase
      .from("sst_engineers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (eErr || !engineer) {
      setError(supabaseErrorMessage(eErr, "Perfil não encontrado"));
      return;
    }
    const { error: insErr } = await supabase.from("companies").insert({
      engineer_id: engineer.id,
      name: values.name,
      trade_name: values.trade_name || null,
      cnpj: values.cnpj,
      industry: values.industry,
      city: values.city,
      state: values.state.toUpperCase(),
      contact_name: values.contact_name,
      contact_email: values.contact_email,
      contact_phone: values.contact_phone,
      employee_count: values.employee_count,
      status: "active",
    });
    if (insErr) {
      setError(supabaseErrorMessage(insErr, "Erro ao salvar empresa"));
      return;
    }
    router.push("/companies");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/companies" className="text-sm text-accent hover:underline">
          ← Voltar
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          Nova empresa
        </h1>
        <p className="text-sm text-muted">Cadastro de cliente</p>
      </div>

      <Card>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {/* CNPJ com busca automática */}
          <div className="space-y-1">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  label="CNPJ"
                  placeholder="00.000.000/0000-00"
                  error={errors.cnpj?.message}
                  {...register("cnpj")}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                loading={cnpjLoading}
                onClick={() => {
                  const el = document.querySelector<HTMLInputElement>('input[name="cnpj"]');
                  if (el) void lookupCnpj(el.value);
                }}
              >
                Buscar
              </Button>
            </div>
            {cnpjMsg ? (
              <p className={`text-xs ${cnpjMsg.includes("✓") ? "text-green-400" : "text-red-400"}`}>
                {cnpjMsg}
              </p>
            ) : (
              <p className="text-xs text-muted">Digite o CNPJ com 14 dígitos e clique em Buscar para preencher automaticamente.</p>
            )}
          </div>

          <Input
            label="Razão social"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            label="Nome fantasia"
            error={errors.trade_name?.message}
            {...register("trade_name")}
          />
          <Input
            label="Setor / ramo"
            error={errors.industry?.message}
            {...register("industry")}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Cidade"
              error={errors.city?.message}
              {...register("city")}
            />
            <Select label="UF" error={errors.state?.message} {...register("state")}>
              <option value="">Selecione</option>
              {ufs.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </div>
          <Input
            label="Nome do contato"
            error={errors.contact_name?.message}
            {...register("contact_name")}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="E-mail do contato"
              type="email"
              error={errors.contact_email?.message}
              {...register("contact_email")}
            />
            <Input
              label="Telefone"
              error={errors.contact_phone?.message}
              {...register("contact_phone")}
            />
          </div>
          <Input
            type="number"
            label="Número de funcionários"
            error={errors.employee_count?.message}
            {...register("employee_count", { valueAsNumber: true })}
          />
          {error ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          ) : null}
          <Button type="submit" loading={isSubmitting}>
            Salvar empresa
          </Button>
        </form>
      </Card>
    </div>
  );
}
