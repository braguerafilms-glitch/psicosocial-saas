import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: engineer } = await supabase
    .from("sst_engineers")
    .select("name, company_name, logo_url, avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar
        engineerName={engineer?.name ?? null}
        companyName={engineer?.company_name ?? null}
        avatarUrl={engineer?.avatar_url ?? engineer?.logo_url ?? null}
      />
      <div className="flex min-h-screen flex-1 flex-col overflow-hidden">
        <DashboardHeader companyName={engineer?.company_name ?? "Consultoria"} />
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
