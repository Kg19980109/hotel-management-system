"use client";

import * as React from "react";
import { MyWorkWorkspace } from "@/components/staff/my-work-workspace";
import { RoutePermissionGuard } from "@/components/auth/route-permission-guard";

export default function MyWorkPage() {
  return <MyWorkWorkspace />;
}
