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
          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-sm"
          : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-violet-400/30 shadow-md shadow-violet-950/30"
      }`}
      title="Copy Wi-Fi Password"
      aria-label="Copy Wi-Fi Password"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-300 font-medium">Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 text-violet-200" />
          <span className="font-medium">Copy Pass</span>
        </>
      )}
    </button>
  );
}
