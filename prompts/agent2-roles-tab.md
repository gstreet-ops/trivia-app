# Agent 2: Roles Tab UI for Granular Permissions

You are working on the GStreet trivia platform at `~/trivia-app`. React + Supabase. Georgetown colors: navy #041E42, gray #54585A.

## Prerequisites
Agent 1 has already created:
- `supabase/migrations/20260302_granular_permissions.sql` — DB schema (community_roles, permission_overrides, permission_audit_log)
- `src/utils/permissions.js` — updated with PERMISSIONS, PERMISSION_CATEGORIES, hasPermissionFromData, canManageRoles, canViewRoles
- `src/contexts/PermissionContext.js` — React context for permission fetching

The migration has been run. Tables exist in Supabase.

## Task 1: Create `src/components/RolesTab.js`

A self-contained component for managing community roles and permissions. Target ~500-700 lines.

**Props:** `{ communityId, currentUserId, userRole, showToast }`

**Imports needed:**
```js
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { PERMISSIONS, PERMISSION_CATEGORIES, hasCommunityRole, canManageRoles } from '../utils/permissions';
import { ShieldIcon } from './Icons';
import './RolesTab.css';
```

### Section 1: Role List (left panel)

- Fetch `community_roles` for communityId, sorted by hierarchy_level DESC
- Also fetch member counts per role: `SELECT role_id, count(*) FROM community_members WHERE community_id = ? GROUP BY role_id`
- Display each role as a card: colored left border (role.color), name, "(System)" badge if is_system, member count, description
- Selected role highlighted with navy background
- "Create Custom Role" button at bottom (only if `canManageRoles(userRole)`)
- Click a role → select it, show its permissions in the grid

### Section 2: Permission Grid (main panel)

When a role is selected, show a permission checkbox grid grouped by PERMISSION_CATEGORIES.

For each category:
- Category header (bold, navy text, top border divider)
- For each permission in that category:
  - Row: checkbox + permission key (formatted nicely: manage_questions → "Manage Questions") + description from PERMISSIONS constant
  - Checkbox state from role.permissions[key] === true

**Editability rules:**
- Owner role (hierarchy_level 100): all checked, all disabled (read-only)
- Other roles: checkboxes enabled only if `canManageRoles(userRole)` (i.e., current user is owner)
- Permissions in the "Owner" category should only be editable for custom roles, never for system roles
- A user cannot grant permissions at or above their own role's hierarchy level (guard in UI)

**Save button:** When permissions are changed, show a "Save Changes" button. On click:
- `supabase.from('community_roles').update({ permissions: newPermissions, updated_at: new Date().toISOString() }).eq('id', roleId)`
- Insert into `permission_audit_log`: action='role_updated', target_role_id, details = { before, after }
- Show toast on success

### Section 3: Role Editor Modal

Triggered by "Create Custom Role" button or "Edit" button on a non-system role.

**Fields:**
- Name (text input, required)
- Slug (auto-generated from name, shown as read-only)
- Description (textarea)
- Color (6 preset chips: #041E42, #2E86AB, #A23B72, #2CA58D, #F18F01, #C41E3A) + custom hex input
- Hierarchy Level (number input 1-99, with helper text "Higher = more privilege. Cannot exceed your own role's level.")
- Permission checkboxes (same grid as Section 2)

**On save (create):**
- Insert into community_roles
- Audit log: action='role_created'
- Refresh role list
- Toast: "Role created"

**On save (edit):**
- Update community_roles
- Audit log: action='role_updated'
- Refresh
- Toast: "Role updated"

**Delete button** (on edit modal, custom roles only):
- Confirm dialog: "Delete role [name]? Members with this role will be reassigned to Member."
- Before delete: UPDATE community_members SET role_id = (member system role), role = 'member' WHERE role_id = deletingRoleId
- Then DELETE FROM community_roles WHERE id = roleId
- Audit log: action='role_deleted'

### Section 4: Member Overrides

Below the permission grid, show a "Member Overrides" expandable section.

- Fetch `permission_overrides` for this community, grouped by user_id
- Join with profiles to get usernames
- Show a table: Username | Override Count | Actions
- Click "Edit Overrides" → Override Modal

**Override Modal:**
- Shows the member's name
- Lists all 27 permissions grouped by category
- Each permission has a 3-way toggle:
  - ✓ Grant (green) — explicitly grant
  - ✗ Deny (red) — explicitly deny  
  - — Inherit (gray) — use role default
- Current state loaded from existing overrides
- "Inherit" means delete the override row
- Reason text field (shared for this batch of changes)
- Save: upsert/delete permission_overrides rows, audit log entries

### Section 5: Audit Log

Collapsible section at bottom. Fetches last 50 entries from permission_audit_log.

Display: relative timestamp, actor username (fetched via join), action badge (color-coded: created=green, updated=blue, deleted=red, assigned=purple), description, target.

## Task 2: Create `src/components/RolesTab.css`

Georgetown-themed styling matching existing CommissionerDashboard patterns.

```css
.roles-container { display: flex; gap: 24px; min-height: 500px; }
.roles-sidebar { width: 280px; flex-shrink: 0; }
.roles-main { flex: 1; min-width: 0; }

/* Role list */
.role-card { padding: 12px 16px; border-radius: 8px; border-left: 4px solid; cursor: pointer; margin-bottom: 8px; background: #fff; transition: all 0.15s; }
.role-card:hover { background: #F8F9FA; }
.role-card.selected { background: #E8EDF2; border-color: #041E42; }
.role-card .role-name { font-weight: 600; font-size: 14px; }
.role-card .role-meta { font-size: 12px; color: #54585A; margin-top: 2px; }
.system-badge { font-size: 10px; background: #E8EDF2; color: #041E42; padding: 2px 6px; border-radius: 4px; margin-left: 6px; font-weight: 500; }

/* Permission grid */
.permission-grid { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.permission-category-header { font-size: 14px; font-weight: 700; color: #041E42; padding: 12px 0 8px; border-top: 2px solid #E8EDF2; margin-top: 8px; }
.permission-category-header:first-child { border-top: none; margin-top: 0; }
.permission-row { display: flex; align-items: center; padding: 6px 0; gap: 10px; }
.permission-row label { flex: 1; cursor: pointer; }
.permission-row .perm-name { font-weight: 500; font-size: 13px; }
.permission-row .perm-desc { font-size: 11px; color: #54585A; }
.permission-row input[type="checkbox"] { accent-color: #041E42; width: 16px; height: 16px; }

/* Role editor modal */
.role-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.role-modal { background: #fff; border-radius: 16px; padding: 28px; max-width: 640px; width: 90%; max-height: 80vh; overflow-y: auto; }
.role-modal h2 { margin: 0 0 20px; color: #041E42; }

/* Color picker */
.color-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.color-chip { width: 28px; height: 28px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; transition: border-color 0.15s; }
.color-chip.selected { border-color: #041E42; box-shadow: 0 0 0 2px #fff, 0 0 0 4px #041E42; }

/* Override toggle */
.override-toggle { display: inline-flex; border-radius: 6px; overflow: hidden; border: 1px solid #ddd; }
.override-toggle button { padding: 4px 10px; font-size: 12px; border: none; cursor: pointer; background: #fff; }
.override-toggle button.grant { }
.override-toggle button.grant.active { background: #2CA58D; color: #fff; }
.override-toggle button.deny.active { background: #C41E3A; color: #fff; }
.override-toggle button.inherit.active { background: #E8EDF2; color: #54585A; }

/* Audit log */
.audit-entry { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
.audit-action { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.audit-action.created { background: #E6F9F0; color: #2CA58D; }
.audit-action.updated { background: #E8EDF2; color: #2E86AB; }
.audit-action.deleted { background: #FDE8E8; color: #C41E3A; }
.audit-action.assigned { background: #F0E6F9; color: #A23B72; }

/* Save bar */
.save-bar { position: sticky; bottom: 0; background: #fff; padding: 12px 0; border-top: 2px solid #041E42; display: flex; justify-content: flex-end; gap: 12px; }
.save-bar .btn-save { background: #041E42; color: #fff; padding: 8px 24px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
.save-bar .btn-cancel { background: #f0f0f0; color: #333; padding: 8px 24px; border: none; border-radius: 8px; cursor: pointer; }

/* Responsive */
@media (max-width: 768px) {
  .roles-container { flex-direction: column; }
  .roles-sidebar { width: 100%; }
}
```

## Task 3: Wire into CommissionerDashboard.js

Make SURGICAL edits only. Do NOT rewrite large sections.

### Edit 1: Add imports (top of file)
Add these to the existing import block:
```js
import RolesTab from './RolesTab';
import { canManageRoles, canViewRoles } from '../utils/permissions';
```
Note: `canManageRoles` and `canViewRoles` are new exports from the updated permissions.js. The other permission imports already exist.

Also add ShieldIcon to the Icons import line if not already there.

### Edit 2: Add Roles tab to nav array (around line 1918-1924)
In the nav tabs array, add after the members tab entry:
```js
(canViewRoles(userCommunityRole) || canManageRoles(userCommunityRole)) && { id: 'roles', label: 'Roles', icon: <ShieldIcon size={16} /> },
```

### Edit 3: Add Roles tab pane (in the tab-content section, after members tab pane ~line 2764, before settings tab pane ~line 2766)
```js
{activeTab === 'roles' && (canViewRoles(userCommunityRole) || canManageRoles(userCommunityRole)) && (
  <RolesTab communityId={communityId} currentUserId={currentUserId} userRole={userCommunityRole} showToast={showToast} />
)}
```

## Task 4: Add ShieldIcon to `src/components/Icons.js`

If not already present, add:
```js
export function ShieldIcon({ size = 24 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}
```

## After all tasks

Commit: `git add -A && git commit -m "feat: Roles tab — permission grid, role editor, overrides, audit log (Phase 2)"`
