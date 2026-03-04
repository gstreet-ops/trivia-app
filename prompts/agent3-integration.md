# Agent 3: Integration — Members Tab Role Assignment + Polish

You are working on the GStreet trivia platform at `~/trivia-app`. React + Supabase. Georgetown colors: navy #041E42, gray #54585A.

## Prerequisites
- Agent 1 created: migration SQL, updated permissions.js, PermissionContext.js
- Agent 2 created: RolesTab.js, RolesTab.css, wired Roles tab into CommissionerDashboard.js
- Migration has been run in Supabase

## Context
The Members tab in CommissionerDashboard.js (around lines 2614-2770) currently uses hardcoded role dropdowns:
```js
if (userCommunityRole === 'owner') {
  roleOptions = ['member', 'moderator', 'commissioner'];
} else if (userCommunityRole === 'commissioner') {
  roleOptions = ['member', 'moderator'];
}
```

And member role changes just update `community_members.role` (text column). We need to also update `role_id` and use dynamic roles from `community_roles`.

## Task 1: Add communityRoles state to CommissionerDashboard.js

### Add state variable (near other state declarations, around line 59):
```js
const [communityRoles, setCommunityRoles] = useState([]);
```

### Fetch community roles in the main data fetch (inside the fetchData function, around the Promise.all block):
Add to the existing Promise.all array:
```js
supabase.from('community_roles').select('*').eq('community_id', communityId).order('hierarchy_level', { ascending: false }),
```
And destructure the result, then: `setCommunityRoles(rolesData || []);`

## Task 2: Update Members tab role dropdown

Find the section where `roleOptions` is computed (around line 2652-2660). Replace the hardcoded logic with:

```js
let roleOptions = null;
if (!isSelf) {
  // Get current user's role hierarchy level
  const myRoleData = communityRoles.find(r => r.slug === userCommunityRole);
  const myLevel = myRoleData?.hierarchy_level || 0;
  // Get target member's role level
  const memberRoleData = communityRoles.find(r => r.id === member.role_id) || communityRoles.find(r => r.slug === member.role);
  const memberLevel = memberRoleData?.hierarchy_level || 0;
  
  // Can only assign roles below own level, and can only change members at or below own level
  if (myLevel > memberLevel) {
    roleOptions = communityRoles
      .filter(r => r.hierarchy_level < myLevel)
      .sort((a, b) => a.hierarchy_level - b.hierarchy_level);
  }
}
```

Then update the dropdown rendering to use role objects instead of strings:
```jsx
{roleOptions && (
  <select
    value={member.role_id || ''}
    onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
    className="role-select"
  >
    {roleOptions.map(r => (
      <option key={r.id} value={r.id}>{r.name}</option>
    ))}
  </select>
)}
```

## Task 3: Update the handleRoleChange function

Find `handleRoleChange` (or wherever role assignment happens in Members tab). Update it to:

1. Find the selected role object from communityRoles by id
2. Update community_members with BOTH `role` (text = slug) AND `role_id` (uuid)
3. Insert audit log entry
4. Refresh members list
5. Show toast

```js
const handleRoleChange = async (targetUserId, newRoleId) => {
  const roleObj = communityRoles.find(r => r.id === newRoleId);
  if (!roleObj) return;
  
  try {
    const { error } = await supabase
      .from('community_members')
      .update({ role: roleObj.slug, role_id: roleObj.id })
      .eq('community_id', communityId)
      .eq('user_id', targetUserId);
    
    if (error) throw error;
    
    // Audit log
    await supabase.from('permission_audit_log').insert({
      community_id: communityId,
      actor_id: currentUserId,
      action: 'role_assigned',
      target_user_id: targetUserId,
      target_role_id: newRoleId,
      details: { new_role: roleObj.slug }
    });
    
    // Refresh members
    const { data: updatedMembers } = await supabase
      .from('community_members')
      .select('*, profiles(username)')
      .eq('community_id', communityId)
      .order('joined_at', { ascending: true });
    setMembers(updatedMembers || []);
    
    showToast(`Role changed to ${roleObj.name}`);
  } catch (err) {
    showToast('Failed to change role: ' + err.message, 'error');
  }
};
```

## Task 4: Add role color badges in member list

In the Members tab member table rows, show a colored role badge next to the username. Find where member roles are displayed and add:

```jsx
<span 
  className="role-badge-pill" 
  style={{ 
    background: `${roleColor}20`, 
    color: roleColor, 
    padding: '2px 8px', 
    borderRadius: '12px', 
    fontSize: '11px', 
    fontWeight: 600 
  }}
>
  {displayRoleName}
</span>
```

Where `roleColor` comes from: `communityRoles.find(r => r.id === member.role_id)?.color || '#54585A'`
And `displayRoleName` from: `communityRoles.find(r => r.id === member.role_id)?.name || member.role || 'Member'`

## Task 5: Ensure members fetch includes role_id

In the main data fetch where members are loaded, make sure the select includes `role_id`:
```js
supabase.from('community_members').select('*, profiles(username), role_id').eq('community_id', communityId)
```

Actually, `role_id` should already be included by `*`, but double-check.

## Task 6: Print test checklist

After all edits, print:

```
✅ Granular Permissions — All 3 Agents Complete

Test checklist:
1. [ ] Run migration SQL in Supabase SQL Editor (supabase/migrations/20260302_granular_permissions.sql)
2. [ ] Verify: SELECT count(*) FROM community_roles; -- should be 4 × number_of_communities
3. [ ] Verify: SELECT count(*) FROM community_members WHERE role_id IS NOT NULL; -- should match total members
4. [ ] npm start — app loads without errors
5. [ ] Commissioner Dashboard → Roles tab visible in nav (commissioner+)
6. [ ] Roles tab shows 4 system roles with correct hierarchy
7. [ ] Click a role → permission grid shows checkboxes
8. [ ] Owner role: all checked, all disabled
9. [ ] As owner: can edit commissioner/moderator/member permissions
10. [ ] As owner: can create custom role with name, color, permissions
11. [ ] As owner: can delete custom role (members reassigned to Member)
12. [ ] Members tab: role dropdown shows all available roles (dynamic)
13. [ ] Members tab: role change updates both role text + role_id
14. [ ] Members tab: role badges show with correct colors
15. [ ] Per-user overrides: can set grant/deny/inherit per permission
16. [ ] Audit log: records all permission changes
17. [ ] Backward compatibility: existing tabs still gated correctly

Files changed:
- NEW: supabase/migrations/20260302_granular_permissions.sql
- NEW: src/contexts/PermissionContext.js
- NEW: src/components/RolesTab.js
- NEW: src/components/RolesTab.css
- MODIFIED: src/utils/permissions.js (added PERMISSIONS, PERMISSION_CATEGORIES, new exports)
- MODIFIED: src/components/CommissionerDashboard.js (Roles tab + dynamic role dropdown)
- MODIFIED: src/components/Icons.js (ShieldIcon)
```

## After all tasks

Commit: `git add -A && git commit -m "feat: integrate granular roles into Members tab + role badges (Phase 3)"`
