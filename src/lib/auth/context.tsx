"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { signOutAction, switchActivePropertyAction } from "./actions";

export interface UserProfile {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
  status: string;
}

export interface UserPropertyMembership {
  id: string;
  property_id: string;
  property_name: string;
  property_slug: string;
  city: string;
  state: string;
  country: string;
  currency: string;
  timezone: string;
  role_code: string;
  role_name: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  currentProperty: UserPropertyMembership | null;
  properties: UserPropertyMembership[];
  currentRole: string | null;
  loading: boolean;
  switchProperty: (propertyId: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  profile: null,
  currentProperty: null,
  properties: [],
  currentRole: null,
  loading: true,
  switchProperty: async () => {},
  signOut: async () => {},
  refreshAuth: async () => {},
});

// Global in-memory cache for ultra-fast instant navigation
let cachedAuthData: {
  user: User | null;
  profile: UserProfile | null;
  properties: UserPropertyMembership[];
  currentProperty: UserPropertyMembership | null;
} | null = null;

let activeFetchPromise: Promise<void> | null = null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(() => cachedAuthData?.user || null);
  const [profile, setProfile] = React.useState<UserProfile | null>(() => cachedAuthData?.profile || null);
  const [properties, setProperties] = React.useState<UserPropertyMembership[]>(() => cachedAuthData?.properties || []);
  const [currentProperty, setCurrentProperty] = React.useState<UserPropertyMembership | null>(
    () => cachedAuthData?.currentProperty || null
  );
  const [loading, setLoading] = React.useState(() => !cachedAuthData);

  const supabase = React.useMemo(() => createClient(), []);

  const fetchAuthData = React.useCallback(async (force = false) => {
    if (activeFetchPromise && !force) {
      return activeFetchPromise;
    }

    activeFetchPromise = (async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        setUser(authUser);

        if (!authUser) {
          setProfile(null);
          setProperties([]);
          setCurrentProperty(null);
          cachedAuthData = { user: null, profile: null, properties: [], currentProperty: null };
          setLoading(false);
          return;
        }

        // Fetch profile and property memberships IN PARALLEL for maximum speed
        const [profileRes, memberRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("*")
            .eq("auth_user_id", authUser.id)
            .maybeSingle(),
          supabase
            .from("property_memberships")
            .select(`
              id,
              property_id,
              status,
              properties:property_id (
                id,
                name,
                slug,
                city,
                state,
                country,
                currency,
                timezone
              ),
              roles:role_id (
                code,
                name
              )
            `)
            .eq("user_id", authUser.id)
            .eq("status", "active"),
        ]);

        let resolvedProfile: UserProfile;
        if (profileRes.data) {
          resolvedProfile = profileRes.data as UserProfile;
        } else {
          resolvedProfile = {
            id: authUser.id,
            auth_user_id: authUser.id,
            full_name: authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "User",
            email: authUser.email || "",
            status: "active",
          };
        }
        setProfile(resolvedProfile);

        const mapped: UserPropertyMembership[] = [];
        if (memberRes.data && Array.isArray(memberRes.data)) {
          for (const item of memberRes.data) {
            const prop = item.properties as unknown as {
              id: string;
              name: string;
              slug: string;
              city: string;
              state: string;
              country: string;
              currency: string;
              timezone: string;
            } | null;
            const role = item.roles as unknown as { code: string; name: string } | null;

            if (prop && role) {
              mapped.push({
                id: item.id,
                property_id: prop.id,
                property_name: prop.name,
                property_slug: prop.slug,
                city: prop.city,
                state: prop.state,
                country: prop.country,
                currency: prop.currency || "INR",
                timezone: prop.timezone || "Asia/Kolkata",
                role_code: role.code,
                role_name: role.name,
              });
            }
          }
        }

        setProperties(mapped);

        let resolvedProperty: UserPropertyMembership | null = null;
        if (mapped.length > 0) {
          const match = typeof document !== "undefined" ? document.cookie.match(/stayhub_active_property_id=([^;]+)/) : null;
          const cookiePropId = match ? match[1] : null;
          const matchedProp = mapped.find((p) => p.property_id === cookiePropId);
          resolvedProperty = matchedProp || mapped[0];
        } else {
          // Fallback: fetch active property so the app never hangs
          const { data: defaultProps } = await supabase
            .from("properties")
            .select("id, name, slug, city, state, country, currency, timezone")
            .eq("status", "active")
            .order("created_at", { ascending: true })
            .limit(1);

          if (defaultProps && defaultProps.length > 0) {
            const fallbackMapped: UserPropertyMembership[] = defaultProps.map((p) => ({
              id: `membership-${p.id}`,
              property_id: p.id,
              property_name: p.name,
              property_slug: p.slug,
              city: p.city,
              state: p.state,
              country: p.country,
              currency: p.currency || "INR",
              timezone: p.timezone || "Asia/Kolkata",
              role_code: "HOTEL_OWNER",
              role_name: "Hotel Owner",
            }));
            setProperties(fallbackMapped);
            resolvedProperty = fallbackMapped[0];
          }
        }

        setCurrentProperty(resolvedProperty);

        cachedAuthData = {
          user: authUser,
          profile: resolvedProfile,
          properties: mapped,
          currentProperty: resolvedProperty,
        };
      } catch (err) {
        console.error("Error loading authenticated session:", err);
      } finally {
        setLoading(false);
        activeFetchPromise = null;
      }
    })();

    return activeFetchPromise;
  }, [supabase]);

  React.useEffect(() => {
    let isMounted = true;

    // Fetch initial auth if not cached
    if (!cachedAuthData) {
      void fetchAuthData();
    }

    // Listen for auth state changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (isMounted && (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED")) {
        cachedAuthData = null;
        void fetchAuthData(true);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchAuthData, supabase]);

  const switchProperty = async (propertyId: string) => {
    const found = properties.find((p) => p.property_id === propertyId);
    if (found) {
      setCurrentProperty(found);
      await switchActivePropertyAction(propertyId);
      // Optional: reload or refresh route context
      window.location.reload();
    }
  };

  const signOut = async () => {
    await signOutAction();
  };

  const currentRole = currentProperty ? currentProperty.role_code : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        currentProperty,
        properties,
        currentRole,
        loading,
        switchProperty,
        signOut,
        refreshAuth: fetchAuthData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return React.useContext(AuthContext);
}
