/**
 * permissions.js — Central permission utility for the Role System
 *
 * Platform roles: user < admin < super_admin
 * Community roles: member < moderator < commissioner < owner
 */

// -- Hierarchies (higher number = more privilege) --

const PLATFORM_HIERARCHY = {
  user: 0,
  admin: 1,
  super_admin: 2,
};

const COMMUNITY_HIERARCHY = {
  member: 0,
  moderator: 1,
  commissioner: 2,
  owner: 3,
};

// -- Platform role helpers --

/**
 * Check if a profile has at least the given platform role.
 * @param {object} profile - must have `platform_role` (or fallback to legacy fields)
 * @param {string} minimumRole - 'user' | 'admin' | 'super_admin'
 */
function hasPlatformRole(profile, minimumRole) {
  if (!profile) return false;
  const role = getPlatformRole(profile);
  return (PLATFORM_HIERARCHY[role] ?? 0) >= (PLATFORM_HIERARCHY[minimumRole] ?? 0);
}

/**
 * Resolve platform role from profile, supporting both new and legacy columns.
 */
function getPlatformRole(profile) {
  if (!profile) return 'user';
  if (profile.platform_role) return profile.platform_role;
  // Fallback to legacy columns
  if (profile.super_admin) return 'super_admin';
  if (profile.role === 'admin') return 'admin';
  return 'user';
}

function isPlatformAdmin(profile) {
  return hasPlatformRole(profile, 'admin');
}

function isSuperAdmin(profile) {
  return hasPlatformRole(profile, 'super_admin');
}

// -- Community role helpers --

/**
 * Check if a community member record has at least the given community role.
 * @param {string} role - the member's community role string
 * @param {string} minimumRole - 'member' | 'moderator' | 'commissioner' | 'owner'
 */
function hasCommunityRole(role, minimumRole) {
  if (!role) return false;
  return (COMMUNITY_HIERARCHY[role] ?? 0) >= (COMMUNITY_HIERARCHY[minimumRole] ?? 0);
}

// -- Permission check functions (take a community role string) --

/** Can manage community questions (add, edit, delete, import) */
function canManageQuestions(role) {
  return hasCommunityRole(role, 'moderator');
}

/** Can manage members (view member list, remove members, change roles) */
function canManageMembers(role) {
  return hasCommunityRole(role, 'commissioner');
}

/** Can manage community settings */
function canManageSettings(role) {
  return hasCommunityRole(role, 'commissioner');
}

/** Can view analytics */
function canViewAnalytics(role) {
  return hasCommunityRole(role, 'moderator');
}

/** Can promote someone to commissioner (owner only) */
function canPromoteToCommissioner(role) {
  return hasCommunityRole(role, 'owner');
}

/** Can delete the community (owner only) */
function canDeleteCommunity(role) {
  return hasCommunityRole(role, 'owner');
}

/** Can transfer ownership (owner only) */
function canTransferOwnership(role) {
  return hasCommunityRole(role, 'owner');
}

export {
  getPlatformRole,
  hasPlatformRole,
  hasCommunityRole,
  isPlatformAdmin,
  isSuperAdmin,
  canManageQuestions,
  canManageMembers,
  canManageSettings,
  canViewAnalytics,
  canPromoteToCommissioner,
  canDeleteCommunity,
  canTransferOwnership,
};
