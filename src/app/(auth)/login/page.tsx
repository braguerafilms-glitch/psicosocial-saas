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

const schema = z.object({
  email: z.string().email("Informe um e-mail válido"),
  password: z.string().min(6, "Mínimo de 6 caracteres"),
});

type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Form) {
    setError(null);
    const supabase = createClient();
    const { error: signError } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (signError) {
      setError(supabaseErrorMessage(signError, "Falha ao entrar"));
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card-lg">
      <div className="h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
      <div className="p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/20">
            <svg className="h-5 w-5 text-accent" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent/70">HSE Core</p>
          <h1 className="mt-1 text-xl font-semibold text-foreground">Acesse sua conta</h1>
          <p className="mt-1 text-sm text-muted">Avalie. Analise. Aja.</p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Input label="E-mail" type="email" autoComplete="email" placeholder="seu@email.com" error={errors.email?.message} {...register("email")} />
          <Input label="Senha" type="password" autoComplete="current-password" placeholder="••••••••" error={errors.password?.message} {...register("password")} />
          {error ? (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : null}
          <Button type="submit" className="mt-2 w-full" loading={isSubmitting}>Entrar</Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          Não tem conta?{" "}
          <Link href="/register" className="font-medium text-accent hover:underline">Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
}
