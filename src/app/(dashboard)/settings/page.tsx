"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { supabaseErrorMessage } from "@/lib/supabase-errors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ImageCropModal } from "@/components/ui/ImageCropModal";
import Image from "next/image";

const schema = z.object({
  name: z.string().min(3, "Informe o nome"),
  crea: z.string().min(4, "Informe o CREA"),
  company_name: z.string().min(2, "Informe a empresa"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  website: z.string().optional(),
});

type Form = z.infer<typeof schema>;

export default function SettingsPage() {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [engineerId, setEngineerId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [logoMsg, setLogoMsg] = useState<string | null>(null);
  const [avatarMsg, setAvatarMsg] = useState<string | null>(null);

  // crop state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<"avatar" | "logo" | null>(null);

  const logoRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      const { data: eng, error: eErr } = await supabase
        .from("sst_engineers").select("*").eq("user_id", user.id).maybeSingle();
      if (eErr) { setError(supabaseErrorMessage(eErr, "Erro ao carregar perfil")); setLoading(false); return; }
      if (eng) {
        setEngineerId(eng.id);
        setLogoUrl(eng.logo_url ?? null);
        setAvatarUrl(eng.avatar_url ?? null);
        reset({
          name: eng.name, crea: eng.crea, company_name: eng.company_name,
          email: eng.email, phone: eng.phone ?? "", city: eng.city ?? "",
          state: eng.state ?? "", website: eng.website ?? "",
        });
      }
      setLoading(false);
    })();
  }, [reset]);

  function openFilePicker(target: "avatar" | "logo") {
    setCropTarget(target);
    if (target === "avatar") avatarRef.current?.click();
    else logoRef.current?.click();
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>, target: "avatar" | "logo") {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setCropSrc(reader.result as string); setCropTarget(target); };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function onCropDone(blob: Blob) {
    if (!cropTarget || !engineerId || !userId) { setCropSrc(null); return; }
    const target = cropTarget;
    setCropSrc(null);
    setCropTarget(null);

    const setUploading = target === "avatar" ? setUploadingAvatar : setUploadingLogo;
    const setMsg = target === "avatar" ? setAvatarMsg : setLogoMsg;
    const filename = target === "avatar" ? "avatar.jpg" : "logo.png";
    const field = target === "avatar" ? "avatar_url" : "logo_url";

    setUploading(true);
    setMsg(null);

    const supabase = createClient();
    const path = `${userId}/${engineerId}/${filename}`;
    const mime = target === "avatar" ? "image/jpeg" : "image/png";
    const file = new File([blob], filename, { type: mime });

    const { error: upErr } = await supabase.storage
      .from("logos")
      .upload(path, file, { upsert: true, contentType: mime });

    if (upErr) {
      setMsg(`Erro no upload: ${upErr.message}`);
      setUploading(false);
      return;
    }

    const { data: pub } = supabase.storage.from("logos").getPublicUrl(path);
    const urlWithBust = pub.publicUrl + `?t=${Date.now()}`;

    const { error: dbErr } = await supabase
      .from("sst_engineers").update({ [field]: urlWithBust }).eq("id", engineerId);

    if (dbErr) {
      setMsg(`Upload ok, mas falhou ao salvar: ${dbErr.message}`);
    } else {
      if (target === "avatar") setAvatarUrl(urlWithBust);
      else setLogoUrl(urlWithBust);
      setMsg(target === "avatar" ? "Foto atualizada ✓" : "Logo atualizado ✓");
    }
    setUploading(false);
  }

  async function onSubmit(values: Form) {
    setError(null);
    setSaved(false);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !engineerId) { setError("Sessão inválida."); return; }
    const { error: uErr } = await supabase.from("sst_engineers").update({
      name: values.name, crea: values.crea, company_name: values.company_name,
      email: values.email, phone: values.phone || null, city: values.city || null,
      state: values.state || null, website: values.website || null,
    }).eq("id", engineerId);
    if (uErr) { setError(supabaseErrorMessage(uErr, "Erro ao salvar")); return; }
    setSaved(true);
  }

  if (loading) return <p className="text-sm text-muted">Carregando...</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Crop modal */}
      {cropSrc && cropTarget ? (
        <ImageCropModal
          src={cropSrc}
          aspect={cropTarget === "avatar" ? 1 : 3}
          circular={cropTarget === "avatar"}
          onDone={(blob) => void onCropDone(blob)}
          onCancel={() => { setCropSrc(null); setCropTarget(null); }}
        />
      ) : null}

      <div>
        <h1 className="text-2xl font-semibold text-foreground">Configurações</h1>
        <p className="text-sm text-muted">Dados do engenheiro e consultoria</p>
      </div>

      {/* Foto de perfil */}
      <Card>
        <CardHeader><CardTitle>Foto de perfil</CardTitle></CardHeader>
        <div className="flex items-center gap-5">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-card">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="Avatar" fill className="object-cover" unoptimized />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-accent">?</div>
            )}
          </div>
          <div className="space-y-2">
            <Button type="button" variant="secondary" loading={uploadingAvatar} onClick={() => openFilePicker("avatar")}>
              {avatarUrl ? "Trocar foto" : "Enviar foto"}
            </Button>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => onFileSelected(e, "avatar")} />
            {avatarMsg ? (
              <p className={`text-xs ${avatarMsg.includes("✓") ? "text-green-400" : "text-red-400"}`}>{avatarMsg}</p>
            ) : (
              <p className="text-xs text-muted">JPG ou PNG. Você poderá recortar antes de salvar. Aparece na barra lateral.</p>
            )}
          </div>
        </div>
      </Card>

      {/* Logo da consultoria */}
      <Card>
        <CardHeader><CardTitle>Logo da consultoria</CardTitle></CardHeader>
        <div className="flex items-center gap-5">
          <div className="relative h-16 w-36 shrink-0 overflow-hidden rounded-lg border border-border bg-card">
            {logoUrl ? (
              <Image src={logoUrl} alt="Logo" fill className="object-contain p-2" unoptimized />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-muted">Sem logo</div>
            )}
          </div>
          <div className="space-y-2">
            <Button type="button" variant="secondary" loading={uploadingLogo} onClick={() => openFilePicker("logo")}>
              {logoUrl ? "Trocar logo" : "Enviar logo"}
            </Button>
            <input ref={logoRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => onFileSelected(e, "logo")} />
            {logoMsg ? (
              <p className={`text-xs ${logoMsg.includes("✓") ? "text-green-400" : "text-red-400"}`}>{logoMsg}</p>
            ) : (
              <p className="text-xs text-muted">Você poderá recortar antes de salvar. Aparece nos relatórios PDF.</p>
            )}
          </div>
        </div>
      </Card>

      {/* Dados do perfil */}
      <Card>
        <CardHeader><CardTitle>Dados do perfil</CardTitle></CardHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Input label="Nome completo" error={errors.name?.message} {...register("name")} />
          <Input label="CREA" error={errors.crea?.message} {...register("crea")} />
          <Input label="Empresa de consultoria" error={errors.company_name?.message} {...register("company_name")} />
          <Input label="E-mail" type="email" error={errors.email?.message} {...register("email")} />
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Telefone" error={errors.phone?.message} {...register("phone")} />
            <Input label="Site" error={errors.website?.message} {...register("website")} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Cidade" error={errors.city?.message} {...register("city")} />
            <Input label="UF" error={errors.state?.message} {...register("state")} />
          </div>
          {error ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
          ) : null}
          {saved ? (
            <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-400">Alterações salvas ✓</p>
          ) : null}
          <Button type="submit" loading={isSubmitting}>Salvar alterações</Button>
        </form>
      </Card>
    </div>
  );
}
