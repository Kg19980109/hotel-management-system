"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export interface AuthActionResult {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Sign In with email and password
 */
export async function signInAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirectTo") as string) || "/dashboard";

  if (!email || !password) {
    return { success: false, error: "Please provide both email and password." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Redirect to target path upon successful sign-in
  redirect(redirectTo);
}

/**
 * Sign Up with email, password, and full name
 */
export async function signUpAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const fullName = formData.get("fullName") as string;

  if (!email || !password || !fullName) {
    return { success: false, error: "Please fill in all required fields." };
  }

  if (password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters long." };
  }

  if (password !== confirmPassword) {
    return { success: false, error: "Passwords do not match." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // If user session exists immediately (email confirmation disabled), proceed to onboarding
  if (data.session) {
    redirect("/onboarding");
  }

  // If email confirmation is required:
  return {
    success: true,
    message: "Confirmation link sent! Please check your email to verify your account.",
  };
}

/**
 * Sign Out
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  
  // Clear active property cookie
  const cookieStore = await cookies();
  cookieStore.delete("stayhub_active_property_id");

  redirect("/login");
}

/**
 * Forgot Password - Send recovery email
 */
export async function forgotPasswordAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get("email") as string;

  if (!email) {
    return { success: false, error: "Please enter your email address." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    message: "Password reset link sent! Check your inbox to proceed.",
  };
}

/**
 * Reset Password - Update user password
 */
export async function resetPasswordAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return { success: false, error: "Please fill in all fields." };
  }

  if (password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters long." };
  }

  if (password !== confirmPassword) {
    return { success: false, error: "Passwords do not match." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  redirect("/dashboard");
}

/**
 * Switch Active Property Cookie
 */
export async function switchActivePropertyAction(propertyId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("stayhub_active_property_id", propertyId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
}
