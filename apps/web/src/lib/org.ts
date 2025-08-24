import { supabaseServer } from "./supabase";
import { requireUserId } from "./auth";
import type { Member, Role } from "@hustledesk/shared";

/**
 * Get member record for current user in organization
 * Throws error if user is not a member
 */
export async function requireMember(orgId: string): Promise<Member> {
  const userId = requireUserId();
  const supabase = supabaseServer();
  
  const { data: member, error } = await supabase
    .from("members")
    .select("*")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .single();
    
  if (error || !member) {
    throw new Error("FORBIDDEN");
  }
  
  return member;
}

/**
 * Check if user has specific role in organization
 */
export async function hasRole(orgId: string, role: Role): Promise<boolean> {
  try {
    const member = await requireMember(orgId);
    return member.role === role;
  } catch {
    return false;
  }
}

/**
 * Check if user is owner of organization
 */
export async function isOwner(orgId: string): Promise<boolean> {
  return hasRole(orgId, "OWNER");
}

/**
 * Check if user is manager or owner of organization
 */
export async function isManagerOrOwner(orgId: string): Promise<boolean> {
  try {
    const member = await requireMember(orgId);
    return member.role === "OWNER" || member.role === "MANAGER";
  } catch {
    return false;
  }
}

/**
 * Check if user has access to specific outlet
 */
export async function hasOutletAccess(orgId: string, outletId: string): Promise<boolean> {
  try {
    const member = await requireMember(orgId);
    
    // Owners and managers have access to all outlets
    if (member.role === "OWNER" || member.role === "MANAGER") {
      return true;
    }
    
    // Staff only have access to allowed outlets
    return member.allowed_outlet_ids.includes(outletId);
  } catch {
    return false;
  }
}

/**
 * Get all organizations where user is a member
 */
export async function getUserOrganizations() {
  const userId = requireUserId();
  const supabase = supabaseServer();
  
  const { data: memberships, error } = await supabase
    .from("members")
    .select(`
      role,
      organizations (
        id,
        name,
        slug,
        country,
        currency,
        created_at
      )
    `)
    .eq("user_id", userId);
    
  if (error) {
    throw new Error("Failed to fetch organizations");
  }
  
  return memberships;
}
