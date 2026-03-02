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

// -- Granular permission keys and categories --

const PERMISSIONS = {
  manage_questions: 'Add, edit, delete, import questions',
  manage_tags: 'Add and remove question tags',
  manage_templates: 'Create and delete question templates',
  manage_media: 'Upload and delete media library items',
  request_ai_generation: 'Submit AI question generation requests',
  manage_announcements: 'Create, edit, pin, delete announcements',
  manage_events: 'Create, edit, delete community events',
  manage_content: 'Manage content blocks',
  moderate_chat: 'Delete chat messages',
  view_members: 'See member list',
  manage_members: 'Remove members from community',
  assign_roles: 'Change member roles',
  invite_members: 'Send email invitations',
  manage_settings: 'Edit community settings',
  manage_embed: 'Configure embed widget and themes',
  manage_subscribers: 'View and manage email subscribers',
  manage_forms: 'View and manage form submissions',
  manage_tiers: 'Change community tier',
  regenerate_invite: 'Reset invite code',
  view_analytics: 'View community analytics',
  view_site_analytics: 'View page view analytics',
  manage_webhooks: 'Configure webhook URLs',
  manage_roles: 'Create, edit, delete custom roles',
  transfer_ownership: 'Transfer community ownership',
  delete_community: 'Delete the community',
  manage_pages: 'Create and edit community pages',
  manage_danger_zone: 'Access danger zone settings',
};

const PERMISSION_CATEGORIES = {
  'Content': ['manage_questions', 'manage_tags', 'manage_templates', 'manage_media', 'request_ai_generation'],
  'Community': ['manage_announcements', 'manage_events', 'manage_content', 'moderate_chat'],
  'Members': ['view_members', 'manage_members', 'assign_roles', 'invite_members'],
  'Administration': ['manage_settings', 'manage_embed', 'manage_subscribers', 'manage_forms', 'manage_tiers', 'regenerate_invite', 'view_analytics', 'view_site_analytics', 'manage_webhooks'],
  'Owner': ['manage_roles', 'transfer_ownership', 'delete_community', 'manage_pages', 'manage_danger_zone'],
};

/**
 * Check a single permission against role permissions + user overrides.
 * Used by PermissionContext and anywhere merged permission data is available.
 */
function hasPermissionFromData(rolePermissions, userOverrides, key) {
  const override = userOverrides?.find(o => o.permission_key === key);
  if (override) return override.granted;
  return rolePermissions?.[key] === true;
}

/** Can manage roles (owner only) */
function canManageRoles(role) {
  return hasCommunityRole(role, 'owner');
}

/** Can view roles (commissioner+) */
function canViewRoles(role) {
  return hasCommunityRole(role, 'commissioner');
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
  PERMISSIONS,
  PERMISSION_CATEGORIES,
  hasPermissionFromData,
  canManageRoles,
  canViewRoles,
};
