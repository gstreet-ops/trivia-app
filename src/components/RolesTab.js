import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { PERMISSIONS, PERMISSION_CATEGORIES, hasCommunityRole, canManageRoles } from '../utils/permissions';
import { ShieldIcon } from './Icons';
import './RolesTab.css';

const COLOR_PRESETS = ['#041E42', '#2E86AB', '#A23B72', '#2CA58D', '#F18F01', '#C41E3A'];

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function formatPermName(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function RolesTab({ communityId, currentUserId, userRole, showToast }) {
  const [roles, setRoles] = useState([]);
  const [memberCounts, setMemberCounts] = useState({});
  const [selectedRole, setSelectedRole] = useState(null);
  const [editedPermissions, setEditedPermissions] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Role editor modal
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState('create'); // 'create' | 'edit'
  const [editorData, setEditorData] = useState({ name: '', slug: '', description: '', color: '#041E42', hierarchy_level: 10, permissions: {} });

  // Overrides
  const [overridesExpanded, setOverridesExpanded] = useState(false);
  const [overrides, setOverrides] = useState([]);
  const [overrideProfiles, setOverrideProfiles] = useState({});
  const [overrideModalUser, setOverrideModalUser] = useState(null);
  const [overrideEdits, setOverrideEdits] = useState({});
  const [overrideReason, setOverrideReason] = useState('');

  // Audit log
  const [auditExpanded, setAuditExpanded] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const [auditProfiles, setAuditProfiles] = useState({});

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const isOwner = canManageRoles(userRole);

  // ─── Data fetching ───────────────────────────────────────

  const fetchRoles = useCallback(async () => {
    if (!communityId) return;
    const { data } = await supabase
      .from('community_roles')
      .select('*')
      .eq('community_id', communityId)
      .order('hierarchy_level', { ascending: false });
    setRoles(data || []);
    if (data?.length && !selectedRole) setSelectedRole(data[0]);
  }, [communityId, selectedRole]);

  const fetchMemberCounts = useCallback(async () => {
    if (!communityId) return;
    const { data } = await supabase
      .from('community_members')
      .select('role_id')
      .eq('community_id', communityId);
    const counts = {};
    (data || []).forEach(m => { counts[m.role_id] = (counts[m.role_id] || 0) + 1; });
    setMemberCounts(counts);
  }, [communityId]);

  const fetchOverrides = useCallback(async () => {
    if (!communityId) return;
    const { data } = await supabase
      .from('permission_overrides')
      .select('*')
      .eq('community_id', communityId);
    setOverrides(data || []);
    // Fetch profiles for unique user_ids
    const userIds = [...new Set((data || []).map(o => o.user_id))];
    if (userIds.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .in('id', userIds);
      const map = {};
      (profiles || []).forEach(p => { map[p.id] = p; });
      setOverrideProfiles(map);
    }
  }, [communityId]);

  const fetchAuditLog = useCallback(async () => {
    if (!communityId) return;
    const { data } = await supabase
      .from('permission_audit_log')
      .select('*')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
      .limit(50);
    setAuditLog(data || []);
    // Fetch actor profiles
    const actorIds = [...new Set((data || []).map(e => e.actor_id).filter(Boolean))];
    const targetIds = [...new Set((data || []).map(e => e.target_user_id).filter(Boolean))];
    const allIds = [...new Set([...actorIds, ...targetIds])];
    if (allIds.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .in('id', allIds);
      const map = {};
      (profiles || []).forEach(p => { map[p.id] = p; });
      setAuditProfiles(map);
    }
  }, [communityId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchRoles(), fetchMemberCounts()]).finally(() => setLoading(false));
  }, [fetchRoles, fetchMemberCounts]);

  // ─── Permission grid ────────────────────────────────────

  useEffect(() => {
    if (selectedRole) {
      setEditedPermissions({ ...selectedRole.permissions });
      setHasChanges(false);
    }
  }, [selectedRole]);

  function togglePermission(key) {
    setEditedPermissions(prev => {
      const next = { ...prev, [key]: !prev[key] };
      setHasChanges(JSON.stringify(next) !== JSON.stringify(selectedRole.permissions));
      return next;
    });
  }

  async function savePermissions() {
    if (!selectedRole || !editedPermissions) return;
    setSaving(true);
    try {
      const before = selectedRole.permissions;
      const { error } = await supabase
        .from('community_roles')
        .update({ permissions: editedPermissions, updated_at: new Date().toISOString() })
        .eq('id', selectedRole.id);
      if (error) throw error;

      await supabase.from('permission_audit_log').insert({
        community_id: communityId,
        actor_id: currentUserId,
        action: 'role_updated',
        target_role_id: selectedRole.id,
        details: { before, after: editedPermissions, role_name: selectedRole.name },
      });

      showToast('Permissions saved', 'success');
      setHasChanges(false);
      await fetchRoles();
      // Re-select the updated role
      setSelectedRole(prev => {
        const updated = roles.find(r => r.id === prev?.id);
        return updated ? { ...updated, permissions: editedPermissions } : prev;
      });
    } catch (err) {
      showToast('Failed to save: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  // ─── Role editor ────────────────────────────────────────

  function openCreateRole() {
    setEditorMode('create');
    setEditorData({ name: '', slug: '', description: '', color: '#041E42', hierarchy_level: 10, permissions: {} });
    setEditorOpen(true);
  }

  function openEditRole(role) {
    setEditorMode('edit');
    setEditorData({
      id: role.id,
      name: role.name,
      slug: role.slug,
      description: role.description || '',
      color: role.color || '#041E42',
      hierarchy_level: role.hierarchy_level,
      permissions: { ...role.permissions },
    });
    setEditorOpen(true);
  }

  async function saveEditorRole() {
    const { name, slug, description, color, hierarchy_level, permissions } = editorData;
    if (!name.trim()) { showToast('Name is required', 'error'); return; }

    setSaving(true);
    try {
      if (editorMode === 'create') {
        const { error } = await supabase.from('community_roles').insert({
          community_id: communityId,
          name: name.trim(),
          slug: slugify(name.trim()),
          description: description.trim(),
          color,
          hierarchy_level: Math.min(Math.max(parseInt(hierarchy_level) || 1, 1), 99),
          is_system: false,
          permissions,
        });
        if (error) throw error;
        await supabase.from('permission_audit_log').insert({
          community_id: communityId,
          actor_id: currentUserId,
          action: 'role_created',
          details: { role_name: name.trim() },
        });
        showToast('Role created', 'success');
      } else {
        const { error } = await supabase.from('community_roles')
          .update({ name: name.trim(), description: description.trim(), color, hierarchy_level: Math.min(Math.max(parseInt(hierarchy_level) || 1, 1), 99), permissions, updated_at: new Date().toISOString() })
          .eq('id', editorData.id);
        if (error) throw error;
        await supabase.from('permission_audit_log').insert({
          community_id: communityId,
          actor_id: currentUserId,
          action: 'role_updated',
          target_role_id: editorData.id,
          details: { role_name: name.trim() },
        });
        showToast('Role updated', 'success');
      }
      setEditorOpen(false);
      await fetchRoles();
    } catch (err) {
      showToast('Failed to save: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function deleteRole(roleId, roleName) {
    setSaving(true);
    try {
      // Find the system 'member' role for reassignment
      const memberRole = roles.find(r => r.slug === 'member' && r.is_system);
      if (memberRole) {
        await supabase.from('community_members')
          .update({ role_id: memberRole.id, role: 'member' })
          .eq('role_id', roleId);
      }
      const { error } = await supabase.from('community_roles').delete().eq('id', roleId);
      if (error) throw error;
      await supabase.from('permission_audit_log').insert({
        community_id: communityId,
        actor_id: currentUserId,
        action: 'role_deleted',
        details: { role_name: roleName },
      });
      showToast('Role deleted', 'success');
      setDeleteConfirm(null);
      setEditorOpen(false);
      setSelectedRole(null);
      await Promise.all([fetchRoles(), fetchMemberCounts()]);
    } catch (err) {
      showToast('Failed to delete: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  // ─── Override editing ───────────────────────────────────

  function openOverrideModal(userId) {
    const userOverrides = overrides.filter(o => o.user_id === userId);
    const edits = {};
    Object.keys(PERMISSIONS).forEach(key => {
      const existing = userOverrides.find(o => o.permission_key === key);
      edits[key] = existing ? (existing.granted ? 'grant' : 'deny') : 'inherit';
    });
    setOverrideEdits(edits);
    setOverrideReason('');
    setOverrideModalUser(userId);
  }

  async function saveOverrides() {
    if (!overrideModalUser) return;
    setSaving(true);
    try {
      const userId = overrideModalUser;
      // Delete all existing overrides for this user in this community
      await supabase.from('permission_overrides')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', userId);

      // Insert new overrides (skip 'inherit')
      const inserts = Object.entries(overrideEdits)
        .filter(([, v]) => v !== 'inherit')
        .map(([key, val]) => ({
          community_id: communityId,
          user_id: userId,
          permission_key: key,
          granted: val === 'grant',
          granted_by: currentUserId,
          reason: overrideReason || null,
        }));
      if (inserts.length) {
        const { error } = await supabase.from('permission_overrides').insert(inserts);
        if (error) throw error;
      }

      await supabase.from('permission_audit_log').insert({
        community_id: communityId,
        actor_id: currentUserId,
        action: 'overrides_updated',
        target_user_id: userId,
        details: { overrides: overrideEdits, reason: overrideReason || null },
      });

      showToast('Overrides saved', 'success');
      setOverrideModalUser(null);
      await fetchOverrides();
    } catch (err) {
      showToast('Failed to save overrides: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  // ─── Render helpers ─────────────────────────────────────

  function renderPermissionGrid(perms, setPerms, opts = {}) {
    const { readOnly = false, isOwnerRole = false, isSystemRole = false } = opts;
    return (
      <div className="permission-grid">
        {Object.entries(PERMISSION_CATEGORIES).map(([category, keys]) => (
          <div key={category}>
            <div className="permission-category-header">{category}</div>
            {keys.map(key => {
              const checked = perms[key] === true;
              const isOwnerPerm = category === 'Owner';
              const disabled = readOnly || isOwnerRole || (isOwnerPerm && isSystemRole) || !isOwner;
              return (
                <div className="permission-row" key={key}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => {
                      if (setPerms && !disabled) {
                        setPerms(prev => ({ ...prev, [key]: !prev[key] }));
                      }
                    }}
                    id={`perm-${key}`}
                  />
                  <label htmlFor={`perm-${key}`}>
                    <span className="perm-name">{formatPermName(key)}</span>
                    <span className="perm-desc">{PERMISSIONS[key]}</span>
                  </label>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  // ─── Main render ────────────────────────────────────────

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#54585A' }}>Loading roles...</div>;
  }

  return (
    <div className="roles-container">
      {/* ── Left sidebar: Role list ── */}
      <div className="roles-sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <ShieldIcon size={20} />
          <h3 style={{ margin: 0, color: '#041E42' }}>Roles</h3>
        </div>
        {roles.map(role => (
          <div
            key={role.id}
            className={`role-card ${selectedRole?.id === role.id ? 'selected' : ''}`}
            style={{ borderLeftColor: role.color || '#041E42' }}
            onClick={() => setSelectedRole(role)}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="role-name">{role.name}</span>
                {role.is_system && <span className="system-badge">System</span>}
              </div>
              {!role.is_system && isOwner && (
                <button
                  className="role-edit-btn"
                  onClick={e => { e.stopPropagation(); openEditRole(role); }}
                  title="Edit role"
                >
                  Edit
                </button>
              )}
            </div>
            <div className="role-meta">
              {memberCounts[role.id] || 0} member{(memberCounts[role.id] || 0) !== 1 ? 's' : ''}
              {role.description && ` · ${role.description}`}
            </div>
          </div>
        ))}
        {isOwner && (
          <button className="create-role-btn" onClick={openCreateRole}>
            + Create Custom Role
          </button>
        )}
      </div>

      {/* ── Main panel ── */}
      <div className="roles-main">
        {selectedRole ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, color: '#041E42' }}>{selectedRole.name} Permissions</h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#54585A' }}>
                  Level {selectedRole.hierarchy_level} · {selectedRole.is_system ? 'System role' : 'Custom role'}
                </p>
              </div>
              {!selectedRole.is_system && isOwner && (
                <button className="role-edit-btn" onClick={() => openEditRole(selectedRole)}>
                  Edit Role
                </button>
              )}
            </div>

            {renderPermissionGrid(
              editedPermissions || selectedRole.permissions,
              (fn) => {
                setEditedPermissions(prev => {
                  const next = typeof fn === 'function' ? fn(prev) : fn;
                  setHasChanges(JSON.stringify(next) !== JSON.stringify(selectedRole.permissions));
                  return next;
                });
              },
              {
                readOnly: !isOwner,
                isOwnerRole: selectedRole.hierarchy_level === 100,
                isSystemRole: selectedRole.is_system,
              }
            )}

            {hasChanges && (
              <div className="save-bar">
                <button className="btn-cancel" onClick={() => { setEditedPermissions({ ...selectedRole.permissions }); setHasChanges(false); }}>
                  Cancel
                </button>
                <button className="btn-save" disabled={saving} onClick={savePermissions}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}

            {/* ── Member Overrides ── */}
            {isOwner && (
              <div className="collapsible-section" style={{ marginTop: 24 }}>
                <button
                  className="collapsible-header"
                  onClick={() => { setOverridesExpanded(!overridesExpanded); if (!overridesExpanded) fetchOverrides(); }}
                >
                  <span>Member Overrides</span>
                  <span style={{ transform: overridesExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
                </button>
                {overridesExpanded && (
                  <div className="collapsible-body">
                    {(() => {
                      const grouped = {};
                      overrides.forEach(o => {
                        if (!grouped[o.user_id]) grouped[o.user_id] = [];
                        grouped[o.user_id].push(o);
                      });
                      const userIds = Object.keys(grouped);
                      if (!userIds.length) return <p style={{ color: '#54585A', fontSize: 13 }}>No member overrides configured.</p>;
                      return (
                        <table className="overrides-table">
                          <thead>
                            <tr><th>Member</th><th>Overrides</th><th>Actions</th></tr>
                          </thead>
                          <tbody>
                            {userIds.map(uid => {
                              const profile = overrideProfiles[uid];
                              const count = grouped[uid].length;
                              return (
                                <tr key={uid}>
                                  <td>{profile?.display_name || profile?.username || uid.slice(0, 8)}</td>
                                  <td>{count} override{count !== 1 ? 's' : ''}</td>
                                  <td>
                                    <button className="role-edit-btn" onClick={() => openOverrideModal(uid)}>Edit Overrides</button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* ── Audit Log ── */}
            <div className="collapsible-section" style={{ marginTop: 16 }}>
              <button
                className="collapsible-header"
                onClick={() => { setAuditExpanded(!auditExpanded); if (!auditExpanded) fetchAuditLog(); }}
              >
                <span>Audit Log</span>
                <span style={{ transform: auditExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
              </button>
              {auditExpanded && (
                <div className="collapsible-body">
                  {!auditLog.length ? (
                    <p style={{ color: '#54585A', fontSize: 13 }}>No audit entries yet.</p>
                  ) : (
                    auditLog.map(entry => {
                      const actor = auditProfiles[entry.actor_id];
                      const target = entry.target_user_id ? auditProfiles[entry.target_user_id] : null;
                      const actionClass = entry.action.includes('created') ? 'created'
                        : entry.action.includes('deleted') ? 'deleted'
                        : entry.action.includes('assigned') || entry.action.includes('override') ? 'assigned'
                        : 'updated';
                      return (
                        <div className="audit-entry" key={entry.id}>
                          <span className="audit-time">{timeAgo(entry.created_at)}</span>
                          <span className={`audit-action ${actionClass}`}>{entry.action.replace(/_/g, ' ')}</span>
                          <span className="audit-detail">
                            {actor?.display_name || actor?.username || 'Unknown'}
                            {target && ` → ${target.display_name || target.username}`}
                            {entry.details?.role_name && ` · ${entry.details.role_name}`}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: '#54585A' }}>
            <ShieldIcon size={48} />
            <p>Select a role to view its permissions</p>
          </div>
        )}
      </div>

      {/* ── Role Editor Modal ── */}
      {editorOpen && (
        <div className="role-modal-overlay" onClick={() => setEditorOpen(false)}>
          <div className="role-modal" onClick={e => e.stopPropagation()}>
            <h2>{editorMode === 'create' ? 'Create Custom Role' : `Edit: ${editorData.name}`}</h2>

            <div className="modal-field">
              <label>Name</label>
              <input
                type="text"
                value={editorData.name}
                onChange={e => setEditorData(prev => ({ ...prev, name: e.target.value, slug: slugify(e.target.value) }))}
                placeholder="e.g., Event Manager"
              />
            </div>

            <div className="modal-field">
              <label>Slug</label>
              <input type="text" value={editorData.slug || slugify(editorData.name)} readOnly className="slug-input" />
            </div>

            <div className="modal-field">
              <label>Description</label>
              <textarea
                value={editorData.description}
                onChange={e => setEditorData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="What can this role do?"
                rows={2}
              />
            </div>

            <div className="modal-field">
              <label>Color</label>
              <div className="color-chips">
                {COLOR_PRESETS.map(c => (
                  <div
                    key={c}
                    className={`color-chip ${editorData.color === c ? 'selected' : ''}`}
                    style={{ background: c }}
                    onClick={() => setEditorData(prev => ({ ...prev, color: c }))}
                  />
                ))}
                <input
                  type="text"
                  value={editorData.color}
                  onChange={e => setEditorData(prev => ({ ...prev, color: e.target.value }))}
                  placeholder="#hex"
                  style={{ width: 80, fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid #ddd' }}
                />
              </div>
            </div>

            <div className="modal-field">
              <label>Hierarchy Level (1-99)</label>
              <input
                type="number"
                min={1}
                max={99}
                value={editorData.hierarchy_level}
                onChange={e => setEditorData(prev => ({ ...prev, hierarchy_level: e.target.value }))}
              />
              <span className="field-hint">Higher = more privilege. Cannot exceed your own role's level.</span>
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Permissions</label>
              {renderPermissionGrid(
                editorData.permissions,
                (fn) => setEditorData(prev => ({
                  ...prev,
                  permissions: typeof fn === 'function' ? fn(prev.permissions) : fn,
                })),
                { readOnly: false, isOwnerRole: false, isSystemRole: false }
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
              <div>
                {editorMode === 'edit' && (
                  <button
                    className="btn-delete"
                    onClick={() => setDeleteConfirm({ id: editorData.id, name: editorData.name })}
                  >
                    Delete Role
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-cancel" onClick={() => setEditorOpen(false)}>Cancel</button>
                <button className="btn-save" disabled={saving} onClick={saveEditorRole}>
                  {saving ? 'Saving...' : editorMode === 'create' ? 'Create Role' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <div className="role-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="role-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h2 style={{ color: '#C41E3A' }}>Delete Role</h2>
            <p>Delete role <strong>{deleteConfirm.name}</strong>? Members with this role will be reassigned to Member.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn-delete" disabled={saving} onClick={() => deleteRole(deleteConfirm.id, deleteConfirm.name)}>
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Override Modal ── */}
      {overrideModalUser && (
        <div className="role-modal-overlay" onClick={() => setOverrideModalUser(null)}>
          <div className="role-modal" onClick={e => e.stopPropagation()}>
            <h2>
              Edit Overrides: {overrideProfiles[overrideModalUser]?.display_name || overrideProfiles[overrideModalUser]?.username || 'Member'}
            </h2>
            <p style={{ fontSize: 13, color: '#54585A', marginBottom: 16 }}>
              Override individual permissions. "Inherit" uses the member's role default.
            </p>

            {Object.entries(PERMISSION_CATEGORIES).map(([category, keys]) => (
              <div key={category}>
                <div className="permission-category-header">{category}</div>
                {keys.map(key => (
                  <div className="override-row" key={key}>
                    <div style={{ flex: 1 }}>
                      <span className="perm-name">{formatPermName(key)}</span>
                    </div>
                    <div className="override-toggle">
                      <button
                        className={`grant ${overrideEdits[key] === 'grant' ? 'active' : ''}`}
                        onClick={() => setOverrideEdits(prev => ({ ...prev, [key]: 'grant' }))}
                      >
                        ✓ Grant
                      </button>
                      <button
                        className={`deny ${overrideEdits[key] === 'deny' ? 'active' : ''}`}
                        onClick={() => setOverrideEdits(prev => ({ ...prev, [key]: 'deny' }))}
                      >
                        ✗ Deny
                      </button>
                      <button
                        className={`inherit ${overrideEdits[key] === 'inherit' ? 'active' : ''}`}
                        onClick={() => setOverrideEdits(prev => ({ ...prev, [key]: 'inherit' }))}
                      >
                        — Inherit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            <div className="modal-field" style={{ marginTop: 16 }}>
              <label>Reason (optional)</label>
              <input
                type="text"
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                placeholder="Why are these overrides being set?"
              />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn-cancel" onClick={() => setOverrideModalUser(null)}>Cancel</button>
              <button className="btn-save" disabled={saving} onClick={saveOverrides}>
                {saving ? 'Saving...' : 'Save Overrides'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
