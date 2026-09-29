"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import { ExpenseManagerView } from "@/components/expenses/expense-manager-view";
import { LoadingState } from "@/components/ui/states";
import { RoutePermissionGuard } from "@/components/auth/route-permission-guard";

export default function ExpensesPage() {
  return (
    <RoutePermissionGuard permission="expenses.view" moduleName="Expenses & Outgoings">
      <ExpensesContent />
    </RoutePermissionGuard>
  );
}

function ExpensesContent() {
  const { currentProperty, loading } = useAuth();

  if (loading) {
    return <LoadingState message="Loading hotel expense manager..." />;
  }

  const propertyId = currentProperty?.property_id || "demo-property";
  const propertyName = currentProperty?.property_name || "StayHub Property";
  const currency = "INR";

  return (
    <ExpenseManagerView
      propertyId={propertyId}
      propertyName={propertyName}
      currency={currency}
    />
  );
}
