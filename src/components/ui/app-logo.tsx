import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  variant?: "full" | "mark" | "white" | "badge";
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
  showText?: boolean;
}

export function AppLogo({
  variant = "full",
  size = "md",
  href,
  className,
  showText = true,
}: AppLogoProps) {
  const sizeClasses = {
    sm: "h-7 w-auto",
    md: "h-8.5 w-auto",
    lg: "h-11 w-auto",
  };

  const logoSrc =
    variant === "white"
      ? "/images/logo-white.png"
      : variant === "badge"
      ? "/images/logo.png"
      : "/images/logo-brand.png";

  const content = (
    <div
      className={cn(
        "flex items-center gap-2.5 select-none transition-transform duration-150 group",
        className
      )}
    >
      {variant === "badge" ? (
        <div className="relative flex items-center justify-center bg-white/95 rounded-xl px-2.5 py-1 border border-white/20 shadow-md shadow-black/25">
          <Image
            src="/images/logo-brand.png"
            alt="ASSO Logo"
            width={160}
            height={50}
            className={cn("object-contain", sizeClasses[size])}
            priority
          />
        </div>
      ) : (
        <div className="relative flex items-center">
          <Image
            src={logoSrc}
            alt="ASSO Logo"
            width={180}
            height={55}
            className={cn("object-contain filter drop-shadow-sm", sizeClasses[size])}
            priority
          />
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-xl">
        {content}
      </Link>
    );
  }

  return content;
}
