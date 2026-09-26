"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// --- Avatar Root ---
interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  src?: string;
  name?: string;
  status?: "online" | "offline" | "busy" | "away";
}

const sizeMap = {
  xs: { container: "h-6 w-6", text: "text-[9px]", status: "h-2 w-2" },
  sm: { container: "h-8 w-8", text: "text-[11px]", status: "h-2.5 w-2.5" },
  md: { container: "h-9 w-9", text: "text-[13px]", status: "h-3 w-3" },
  lg: { container: "h-11 w-11", text: "text-[15px]", status: "h-3.5 w-3.5" },
  xl: { container: "h-14 w-14", text: "text-[18px]", status: "h-4 w-4" },
};

const statusColor = {
  online: "bg-green-500",
  offline: "bg-slate-400",
  busy: "bg-red-500",
  away: "bg-amber-500",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-[#5146E5]",   // brand indigo
    "bg-[#6C5CE7]",   // brand violet
    "bg-[#16A36A]",   // brand success green
    "bg-[#E7A51A]",   // brand warning amber
    "bg-[#3B82F6]",   // brand info blue
    "bg-[#E05252]",   // brand danger red
    "bg-[#D6A85A]",   // brand gold
    "bg-teal-600",
  ];
  const index =
    name
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
}


const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size = "md", src, name, status, ...props }, ref) => {
    const [imgError, setImgError] = React.useState(false);
    const sizes = sizeMap[size];

    return (
      <div
        ref={ref}
        className={cn("relative inline-flex shrink-0", className)}
        {...props}
      >
        <div
          className={cn(
            "rounded-full overflow-hidden flex items-center justify-center font-semibold text-white",
            sizes.container,
            (!src || imgError) && name ? getAvatarColor(name) : "bg-slate-300"
          )}
        >
          {src && !imgError ? (
            <img
              src={src}
              alt={name ?? "Avatar"}
              className="h-full w-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : name ? (
            <span className={cn("leading-none", sizes.text)}>
              {getInitials(name)}
            </span>
          ) : (
            <span className={cn("text-slate-400", sizes.text)}>?</span>
          )}
        </div>
        {status && (
          <span
            className={cn(
              "absolute bottom-0 right-0 rounded-full border-2 border-white",
              sizes.status,
              statusColor[status]
            )}
          />
        )}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";

// --- Avatar Group ---
interface AvatarGroupProps {
  avatars: Array<{ src?: string; name: string }>;
  max?: number;
  size?: "xs" | "sm" | "md";
}

const AvatarGroup = ({ avatars, max = 4, size = "sm" }: AvatarGroupProps) => {
  const visible = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <div className="flex -space-x-2">
      {visible.map((a, i) => (
        <Avatar
          key={i}
          src={a.src}
          name={a.name}
          size={size}
          className="ring-2 ring-white"
          title={a.name}
        />
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            "rounded-full bg-slate-200 text-slate-600 font-semibold ring-2 ring-white flex items-center justify-center",
            sizeMap[size].container,
            sizeMap[size].text
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
};

export { Avatar, AvatarGroup };
