import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/lib/auth/context";

// ============================================================
// FONT — next/font (Phase 3 migration from CSS @import)
// Replaces the Google Fonts @import in globals.css.
// next/font preloads and self-hosts the font for better LCP.
// ============================================================
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "StayHub — Hotel Management Platform",
    template: "%s | StayHub",
  },
  description:
    "StayHub is a complete Hotel Management, Operations, Guest Experience, QR Ordering, and AI Business Intelligence SaaS platform.",
  keywords: ["hotel management", "property management system", "PMS", "StayHub"],
  robots: { index: false, follow: false }, // Keep private during development
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
