import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { hasPermissionFromData, isSuperAdmin } from '../utils/permissions';

const PermissionContext = createContext(null);

export function PermissionProvider({ userId, communityId, children }) {
  const [role, setRole] = useState(null);        // community_roles row
  const [rolePermissions, setRolePermissions] = useState({});
  const [overrides, setOverrides] = useState([]);  // permission_overrides rows
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const fetchPermissions = useCallback(async () => {
    if (!userId || !communityId) { setLoading(false); return; }
    try {
      const [{ data: profileData }, { data: memberData }, { data: overrideData }] = await Promise.all([
        supabase.from('profiles').select('platform_role, super_admin, role').eq('id', userId).single(),
        supabase.from('community_members').select('role, role_id, community_roles(*)').eq('community_id', communityId).eq('user_id', userId).single(),
        supabase.from('permission_overrides').select('*').eq('community_id', communityId).eq('user_id', userId),
      ]);
      setProfile(profileData);
      setRole(memberData?.community_roles || null);
      setRolePermissions(memberData?.community_roles?.permissions || {});
      setOverrides(overrideData || []);
    } catch (err) {
      console.error('Permission fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, communityId]);

  useEffect(() => { fetchPermissions(); }, [fetchPermissions]);

  const hasPermission = useCallback((key) => {
    if (isSuperAdmin(profile)) return true;
    return hasPermissionFromData(rolePermissions, overrides, key);
  }, [profile, rolePermissions, overrides]);

  const refresh = useCallback(() => { setLoading(true); fetchPermissions(); }, [fetchPermissions]);

  return (
    <PermissionContext.Provider value={{ role, rolePermissions, overrides, hasPermission, loading, refresh, profile }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error('usePermissions must be used within PermissionProvider');
  return ctx;
}
