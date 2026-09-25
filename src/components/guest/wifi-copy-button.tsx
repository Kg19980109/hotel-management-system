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
      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-amber-400 font-semibold flex items-center gap-1.5 transition active:scale-95 border border-slate-700/60"
      title="Copy Wi-Fi Password"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-400">Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          <span>Copy Pass</span>
        </>
      )}
    </button>
  );
}
