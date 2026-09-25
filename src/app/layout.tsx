import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: {
    default: "StayHub — Hotel Management Platform",
    template: "%s | StayHub",
  },
  description:
    "StayHub is a complete Hotel Management, Operations, Guest Experience, QR Ordering, and AI Business Intelligence SaaS platform.",
  keywords: ["hotel management", "property management system", "PMS", "StayHub"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
