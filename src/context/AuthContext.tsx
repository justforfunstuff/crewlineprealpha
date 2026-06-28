import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile, Tenant } from '../types';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  tenant: Tenant | null;
  loading: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, businessName: string) => Promise<{ error: Error | null; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (prof) {
      let profileData = prof as Profile;

      if (!profileData.tenant_id && profileData.role === 'business_owner') {
        const { data: userData } = await supabase.auth.getUser();
        const meta = userData?.user?.user_metadata;
        if (meta?.business_name && meta?.business_slug) {
          const newTenantId = crypto.randomUUID();
          const { error: tenantError } = await supabase
            .from('tenants')
            .insert({ id: newTenantId, name: meta.business_name, slug: meta.business_slug, owner_id: userId, email: profileData.email });

          if (!tenantError) {
            await supabase.from('profiles').update({ tenant_id: newTenantId }).eq('id', userId);
            profileData = { ...profileData, tenant_id: newTenantId };

            const { data: ten } = await supabase.from('tenants').select('*').eq('id', newTenantId).single();
            if (ten) setTenant(ten as Tenant);
          } else {
            console.error('Tenant creation on login failed:', tenantError);
          }
        }
      }

      setProfile(profileData);
      if (profileData.tenant_id && !tenant) {
        const { data: ten } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', profileData.tenant_id)
          .single();
        if (ten) setTenant(ten as Tenant);
      }
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id);
      } else {
        setProfile(null);
        setTenant(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string, businessName: string) => {
    const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: 'business_owner', business_name: businessName, business_slug: slug } },
    });

    if (error) return { error: error as Error };
    if (!data.user) return { error: new Error('Signup failed. Please try again.') };

    if (data.session) {
      const tenantId = crypto.randomUUID();
      const { error: tenantError } = await supabase
        .from('tenants')
        .insert({ id: tenantId, name: businessName, slug, owner_id: data.user.id, email });

      if (tenantError) return { error: new Error(`Account created, but business setup failed: ${tenantError.message}. Please contact support.`) };

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ tenant_id: tenantId })
        .eq('id', data.user.id);

      if (profileError) console.error('Profile link failed:', profileError);
    }

    return { error: null, needsConfirmation: !data.session };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setTenant(null);
  };

  const isAdmin = profile?.role === 'crewline_admin';
  const isOwner = profile?.role === 'business_owner';

  return (
    <AuthContext.Provider value={{ user, session, profile, tenant, loading, isAdmin, isOwner, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
