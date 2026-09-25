"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/ui/states";

export default function KitchenRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/restaurant/kds");
  }, [router]);

  return (
    <div className="p-6">
      <LoadingState message="Opening Kitchen Display System (KDS)..." />
    </div>
  );
}
