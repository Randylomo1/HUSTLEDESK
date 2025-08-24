import { auth } from "@clerk/nextjs/server";

/**
 * Get the current user ID from Clerk auth
 * Throws error if user is not authenticated
 */
export function requireUserId() {
  const { userId } = auth();
  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }
  return userId;
}

/**
 * Get the current user ID from Clerk auth
 * Returns null if user is not authenticated
 */
export function getUserId() {
  const { userId } = auth();
  return userId;
}

/**
 * Get the current session claims
 */
export function getSessionClaims() {
  const { sessionClaims } = auth();
  return sessionClaims;
}
