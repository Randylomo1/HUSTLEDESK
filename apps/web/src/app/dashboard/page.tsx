import { redirect } from "next/navigation";
import { getUserOrganizations } from "@/lib/org";

export default async function DashboardPage() {
  try {
    const organizations = await getUserOrganizations();
    
    // If user has no organizations, redirect to create one
    if (!organizations || organizations.length === 0) {
      redirect("/onboarding");
    }
    
    // If user has only one organization, redirect to it
    if (organizations.length === 1) {
      const orgId = organizations[0].organizations?.id;
      if (orgId) {
        redirect(`/org/${orgId}`);
      }
    }
    
    // Show organization picker for multiple orgs
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Select Organization</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((membership) => {
            const org = membership.organizations;
            if (!org) return null;
            
            return (
              <a
                key={org.id}
                href={`/org/${org.id}`}
                className="block rounded-lg border border-gray-200 p-6 hover:border-blue-500 hover:shadow-md"
              >
                <h3 className="mb-2 text-lg font-semibold">{org.name}</h3>
                <p className="text-sm text-gray-600">
                  Role: {membership.role}
                </p>
                <p className="text-sm text-gray-600">
                  Currency: {org.currency}
                </p>
              </a>
            );
          })}
        </div>
        
        <div className="mt-8">
          <a
            href="/onboarding"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Create New Organization
          </a>
        </div>
      </div>
    );
  } catch (error) {
    // User not authenticated or other error
    redirect("/");
  }
}
