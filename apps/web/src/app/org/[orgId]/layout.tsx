import { redirect } from "next/navigation";
import { requireMember } from "@/lib/org";
import { Sidebar } from "@/components/nav/sidebar";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { orgId: string };
}) {
  try {
    const member = await requireMember(params.orgId);
    
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar orgId={params.orgId} userRole={member.role} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    );
  } catch (error) {
    // User not authorized for this org
    redirect("/dashboard");
  }
}
