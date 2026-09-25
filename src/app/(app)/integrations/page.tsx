"use client";

// ============================================================
// STAYHUB INTEGRATIONS MANAGEMENT (Phase 21)
// ============================================================

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import {
  fetchPropertyIntegrationsAction,
  savePropertyIntegrationAction,
} from "@/lib/integrations/actions";
import type { IntegrationDefinition, PropertyIntegrationConfig } from "@/lib/integrations/types";
import {
  CreditCard,
  Wallet,
  Mail,
  MessageSquare,
  Send,
  Globe,
  Receipt,
  Lock,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Settings2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export default function IntegrationsPage() {
  const { currentProperty } = useAuth();
  const propertyId = currentProperty?.property_id || "demo-property";
  const propertyName = currentProperty?.property_name || "StayHub Grand";

  const [catalog, setCatalog] = React.useState<IntegrationDefinition[]>([]);
  const [configurations, setConfigurations] = React.useState<Record<string, PropertyIntegrationConfig>>({});
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedIntegration, setSelectedIntegration] = React.useState<IntegrationDefinition | null>(null);
  const [formValues, setFormValues] = React.useState<Record<string, string>>({});
  const [isEnabledState, setIsEnabledState] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  const loadIntegrations = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchPropertyIntegrationsAction(propertyId);
      if (res.catalog) setCatalog(res.catalog);
      if (res.configurations) setConfigurations(res.configurations);
    } catch (err) {
      console.error("Failed to load integrations:", err);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId]);

  React.useEffect(() => {
    let active = true;
    fetchPropertyIntegrationsAction(propertyId)
      .then((res) => {
        if (!active) return;
        if (res.catalog) setCatalog(res.catalog);
        if (res.configurations) setConfigurations(res.configurations);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load integrations:", err);
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [propertyId]);

  const handleOpenConfig = (integration: IntegrationDefinition) => {
    setSelectedIntegration(integration);
    const existing = configurations[integration.id];
    setIsEnabledState(existing?.isEnabled || false);

    const initialVals: Record<string, string> = {};
    integration.fields.forEach((f) => {
      initialVals[f.key] = (existing?.config?.[f.key] as string) || "";
    });
    setFormValues(initialVals);
    setSaveSuccess(false);
  };

  const handleSaveConfig = async () => {
    if (!selectedIntegration) return;
    setIsSaving(true);
    try {
      const res = await savePropertyIntegrationAction(
        propertyId,
        selectedIntegration.id,
        isEnabledState,
        formValues
      );
      if (res.success) {
        setSaveSuccess(true);
        loadIntegrations();
        setTimeout(() => setSelectedIntegration(null), 1000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const getIntegrationIcon = (iconName: string) => {
    switch (iconName) {
      case "CreditCard":
        return <CreditCard className="w-5 h-5 text-indigo-600" />;
      case "Wallet":
        return <Wallet className="w-5 h-5 text-blue-600" />;
      case "Mail":
        return <Mail className="w-5 h-5 text-emerald-600" />;
      case "MessageSquare":
        return <MessageSquare className="w-5 h-5 text-purple-600" />;
      case "Send":
        return <Send className="w-5 h-5 text-green-600" />;
      case "Globe":
        return <Globe className="w-5 h-5 text-amber-600" />;
      case "Receipt":
        return <Receipt className="w-5 h-5 text-teal-600" />;
      case "Lock":
        return <Lock className="w-5 h-5 text-rose-600" />;
      default:
        return <Settings2 className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Integrations & Services
            </h1>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
              Server-Side Secured
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Connect payment gateways, communications, OTAs, accounting, and smart hardware for{" "}
            <span className="font-medium text-slate-800">{propertyName}</span>
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadIntegrations}
          disabled={isLoading}
          className="text-xs gap-1.5 h-9"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Security Banner */}
      <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-start gap-3 shadow-sm border border-slate-800">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">
            Enterprise Credential Isolation & Encryption
          </p>
          <p className="text-xs text-slate-300 leading-relaxed">
            All API keys, webhooks, and gateway tokens are encrypted and handled strictly inside server-only processes. Secrets are never exposed to browser client code, AI buddy, or exported logs.
          </p>
        </div>
      </div>

      {/* Integrations Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
          <p className="text-xs">Loading integration directory...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalog.map((item) => {
            const config = configurations[item.id];
            const isEnabled = config?.isEnabled;

            return (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0">
                      {getIntegrationIcon(item.icon)}
                    </div>
                    {isEnabled ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Active
                      </Badge>
                    ) : item.isAvailable ? (
                      <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[11px]">
                        Available
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[11px] gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Foundation
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900">{item.displayName}</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {item.category.replace(/_/g, " ")}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenConfig(item)}
                    className="text-xs h-8 px-3 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border-indigo-200"
                  >
                    Configure
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Configuration Modal / Drawer */}
      {selectedIntegration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                  {getIntegrationIcon(selectedIntegration.icon)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Configure {selectedIntegration.displayName}
                  </h3>
                  <p className="text-xs text-slate-500">{selectedIntegration.category.replace(/_/g, " ")}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIntegration(null)}
                className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
              >
                ✕
              </Button>
            </div>

            {/* Toggle Status */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div>
                <span className="text-xs font-bold text-slate-800">Enable Integration</span>
                <p className="text-[11px] text-slate-500">Allow StayHub to use this provider</p>
              </div>
              <Switch
                checked={isEnabledState}
                onCheckedChange={setIsEnabledState}
              />
            </div>

            {/* Fields Form */}
            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
              {selectedIntegration.fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>{field.label}</span>
                    {field.required && <span className="text-rose-500 text-[10px]">*Required</span>}
                  </label>
                  <Input
                    type={field.type === "password" ? "password" : "text"}
                    value={formValues[field.key] || ""}
                    onChange={(e) =>
                      setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                    className="text-xs bg-slate-50/50 rounded-xl h-9"
                  />
                  {field.description && (
                    <p className="text-[11px] text-slate-400">{field.description}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Success Message */}
            {saveSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Configuration saved and validated successfully.</span>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIntegration(null)}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="text-xs h-9 bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Save Configuration
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
