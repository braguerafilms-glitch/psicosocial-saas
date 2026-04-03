import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MobileNav } from "@/components/dashboard/MobileNav";

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
      {/* Sidebar: desktop only */}
      <div className="hidden md:flex">
        <DashboardSidebar
          engineerName={engineer?.name ?? null}
          companyName={engineer?.company_name ?? null}
          avatarUrl={engineer?.avatar_url ?? engineer?.logo_url ?? null}
        />
      </div>

      <div className="flex min-h-screen flex-1 flex-col overflow-hidden">
        <DashboardHeader companyName={engineer?.company_name ?? "Consultoria"} />
        {/* pb-20 on mobile gives space above the bottom nav */}
        <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">{children}</main>
      </div>

      {/* Bottom nav: mobile only */}
      <MobileNav />
    </div>
  );
}
