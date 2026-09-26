import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/lib/auth/context";

// ============================================================
// FONTS — next/font
// Inter for crisp modern UI, Playfair Display for 5-star luxury titles
// ============================================================
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "StayHub — Luxury Hospitality Management OS",
    template: "%s | StayHub",
  },
  description:
    "StayHub is a complete Hotel Management, Operations, Guest Experience, QR Ordering, and AI Business Intelligence SaaS platform.",
  keywords: ["hotel management", "property management system", "PMS", "StayHub"],
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${playfair.variable}`}>
      <body className="antialiased">
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
