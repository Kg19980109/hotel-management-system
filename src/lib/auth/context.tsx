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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [properties, setProperties] = React.useState<UserPropertyMembership[]>([]);
  const [currentProperty, setCurrentProperty] = React.useState<UserPropertyMembership | null>(null);
  const [loading, setLoading] = React.useState(true);

  const supabase = React.useMemo(() => createClient(), []);

  const fetchAuthData = React.useCallback(async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      setUser(authUser);

      if (!authUser) {
        setProfile(null);
        setProperties([]);
        setCurrentProperty(null);
        setLoading(false);
        return;
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("auth_user_id", authUser.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData as UserProfile);
      } else {
        // Fallback profile from user metadata if not yet created in table
        setProfile({
          id: authUser.id,
          auth_user_id: authUser.id,
          full_name: authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "User",
          email: authUser.email || "",
          status: "active",
        });
      }

      // Fetch property memberships with joined property and role
      const { data: memberData } = await supabase
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
        .eq("status", "active");

      const mapped: UserPropertyMembership[] = [];
      if (memberData && Array.isArray(memberData)) {
        for (const item of memberData) {
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

      // Select active property (from cookie or first available)
      if (mapped.length > 0) {
        // Read active property from cookie if set
        const match = document.cookie.match(/stayhub_active_property_id=([^;]+)/);
        const cookiePropId = match ? match[1] : null;
        const matchedProp = mapped.find((p) => p.property_id === cookiePropId);

        setCurrentProperty(matchedProp || mapped[0]);
      } else {
        setCurrentProperty(null);
      }
    } catch (err) {
      console.error("Error loading authenticated session:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  React.useEffect(() => {
    let isMounted = true;

    // Asynchronously synchronize session
    void Promise.resolve().then(() => {
      if (isMounted) {
        fetchAuthData();
      }
    });

    // Listen for auth state changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      if (isMounted) {
        fetchAuthData();
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
