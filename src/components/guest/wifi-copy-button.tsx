"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";

interface WifiCopyButtonProps {
  ssid?: string;
  password?: string;
}

export function WifiCopyButton({ password }: WifiCopyButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy wifi password:", e);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 border ${
        copied
          ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-2xs"
          : "bg-[#0B1526] hover:bg-[#111D31] text-[#E4C980] border-[#D4AF37]/30 shadow-xs"
      }`}
      title="Copy Wi-Fi Password"
      aria-label="Copy Wi-Fi Password"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-emerald-700 font-medium">Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span className="font-medium">Copy Pass</span>
        </>
      )}
    </button>
  );
}
