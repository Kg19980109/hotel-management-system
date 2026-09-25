"use client";

// ============================================================
// STAYHUB AI BUSINESS BUDDY UI (Phase 20)
// Native Hospitality Intelligence Interface
// ============================================================

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import {
  sendAIMessageAction,
  getAISuggestedPromptsAction,
  getAIConfigStatusAction,
} from "@/lib/ai/actions";
import type { ChatMessage, SuggestedPrompt } from "@/lib/ai/types";
import {
  Sparkles,
  Bot,
  User,
  Send,
  Loader2,
  BedDouble,
  DoorOpen,
  DollarSign,
  UtensilsCrossed,
  RotateCcw,
  ShieldCheck,
  Building2,
  ChevronRight,
  Info,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function AIBusinessBuddyPage() {
  const { currentProperty } = useAuth();
  const propertyId = currentProperty?.property_id || "demo-property";
  const propertyName = currentProperty?.property_name || "StayHub Grand Hotel";

  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [loadingStep, setLoadingStep] = React.useState<string>("");
  const [suggestedPrompts, setSuggestedPrompts] = React.useState<SuggestedPrompt[]>([]);
  const [providerStatus, setProviderStatus] = React.useState<{
    provider: string;
    model: string;
    hasApiKey: boolean;
    isReady: boolean;
  } | null>(null);
  const [errorBanner, setErrorBanner] = React.useState<string | null>(null);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Load configuration & suggested prompts
  React.useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const [configRes, promptsRes] = await Promise.all([
          getAIConfigStatusAction(),
          getAISuggestedPromptsAction(propertyId),
        ]);
        if (isMounted) {
          setProviderStatus(configRes);
          if (promptsRes.prompts) {
            setSuggestedPrompts(promptsRes.prompts);
          }
        }
      } catch (err) {
        console.error("Failed to load AI Buddy config:", err);
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, [propertyId]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    setErrorBanner(null);
    const userMessage: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue("");
    setIsLoading(true);
    setLoadingStep("Analyzing query & evaluating business tools...");

    try {
      // Step simulator for UI feedback
      const timer = setTimeout(() => {
        setLoadingStep("Querying authoritative StayHub reports...");
      }, 400);

      const res = await sendAIMessageAction(propertyId, newMessages);
      clearTimeout(timer);

      if (res.error) {
        setErrorBanner(res.error);
        const errorMsg: ChatMessage = {
          id: `err_${Date.now()}`,
          role: "assistant",
          content: `⚠️ **Error**: ${res.error}`,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } else if (res.response) {
        setMessages((prev) => [...prev, res.response!.message]);
      }
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : "Failed to connect to AI Business Buddy.";
      setErrorBanner(errMessage);
    } finally {
      setIsLoading(false);
      setLoadingStep("");
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setErrorBanner(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-var(--topbar-height)-2rem)] max-h-[1200px] overflow-hidden rounded-2xl bg-white border border-slate-200/80 shadow-sm">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-900/40">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white">
                StayHub Business Buddy
              </h1>
              <Badge className="bg-amber-400/20 text-amber-300 hover:bg-amber-400/30 text-[10px] border-amber-400/30">
                Phase 20 • Read-Only
              </Badge>
            </div>
            <p className="text-xs text-slate-300/80">
              Authenticated hospitality intelligence for{" "}
              <span className="font-semibold text-white">{propertyName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Strict RBAC Protected</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            disabled={messages.length === 0}
            className="text-slate-300 hover:text-white hover:bg-slate-800 h-8 text-xs gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear
          </Button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left / Conversation Area */}
        <div className="flex flex-col flex-1 min-w-0 bg-slate-50/50">
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[420px] max-w-2xl mx-auto text-center px-4 py-8">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
                  <Bot className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  How can I help you manage {propertyName} today?
                </h2>
                <p className="text-sm text-slate-500 mt-1.5 max-w-md">
                  Ask questions about occupancy, revenue, room turnover, dining sales, kitchen tickets, maintenance, and inventory.
                </p>

                {/* Quick Capability Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 w-full mt-6">
                  <button
                    onClick={() => handleSendMessage("What was our occupancy yesterday?")}
                    className="flex flex-col items-start p-3 bg-white hover:bg-indigo-50/40 border border-slate-200/80 hover:border-indigo-200 rounded-xl text-left transition-all group shadow-2xs"
                  >
                    <BedDouble className="w-4 h-4 text-indigo-600 mb-1.5 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-semibold text-slate-800">Occupancy</span>
                    <span className="text-[11px] text-slate-500 line-clamp-1">Yesterday&apos;s ADR & %</span>
                  </button>

                  <button
                    onClick={() => handleSendMessage("How much revenue did we generate this month?")}
                    className="flex flex-col items-start p-3 bg-white hover:bg-indigo-50/40 border border-slate-200/80 hover:border-indigo-200 rounded-xl text-left transition-all group shadow-2xs"
                  >
                    <DollarSign className="w-4 h-4 text-emerald-600 mb-1.5 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-semibold text-slate-800">Revenue</span>
                    <span className="text-[11px] text-slate-500 line-clamp-1">MTD room & food sales</span>
                  </button>

                  <button
                    onClick={() => handleSendMessage("How many rooms are dirty right now?")}
                    className="flex flex-col items-start p-3 bg-white hover:bg-indigo-50/40 border border-slate-200/80 hover:border-indigo-200 rounded-xl text-left transition-all group shadow-2xs"
                  >
                    <DoorOpen className="w-4 h-4 text-purple-600 mb-1.5 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-semibold text-slate-800">Housekeeping</span>
                    <span className="text-[11px] text-slate-500 line-clamp-1">Dirty vs clean rooms</span>
                  </button>

                  <button
                    onClick={() => handleSendMessage("What is happening in the restaurant and kitchen today?")}
                    className="flex flex-col items-start p-3 bg-white hover:bg-indigo-50/40 border border-slate-200/80 hover:border-indigo-200 rounded-xl text-left transition-all group shadow-2xs"
                  >
                    <UtensilsCrossed className="w-4 h-4 text-amber-600 mb-1.5 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-semibold text-slate-800">Dining & Kitchen</span>
                    <span className="text-[11px] text-slate-500 line-clamp-1">POS & KDS orders</span>
                  </button>
                </div>

                {/* Suggested Prompts List */}
                {suggestedPrompts.length > 0 && (
                  <div className="w-full mt-6">
                    <p className="text-xs font-medium text-slate-400 mb-2.5 text-left">
                      Suggested for your role:
                    </p>
                    <div className="flex flex-wrap gap-1.5 justify-start">
                      {suggestedPrompts.slice(0, 6).map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleSendMessage(item.prompt)}
                          className="text-xs text-slate-700 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 shadow-2xs"
                        >
                          <Sparkles className="w-3 h-3 text-indigo-500" />
                          <span>{item.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 max-w-4xl mx-auto">
                {messages.map((msg) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      {!isUser && (
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      <div
                        className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${
                          isUser ? "items-end" : "items-start"
                        }`}
                      >
                        <div
                          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-2xs ${
                            isUser
                              ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-xs"
                              : "bg-white border border-slate-200/90 text-slate-800 rounded-bl-xs"
                          }`}
                        >
                          {/* Markdown rendering with clean typography */}
                          <div className="whitespace-pre-wrap font-sans">
                            {msg.content}
                          </div>
                        </div>

                        {/* Source Attribution Badge */}
                        {msg.sourceReport && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1 px-1">
                            <FileSpreadsheet className="w-3 h-3 text-indigo-500" />
                            <span>Source: {msg.sourceReport}</span>
                          </div>
                        )}
                      </div>

                      {isUser && (
                        <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-600 text-xs flex items-center gap-2 shadow-2xs">
                      <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                      <span>{loadingStep || "Consulting hotel intelligence..."}</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Error Banner */}
          {errorBanner && (
            <div className="mx-4 mb-2 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="flex-1">{errorBanner}</span>
            </div>
          )}

          {/* Chat Input Bar */}
          <div className="p-3 md:p-4 bg-white border-t border-slate-200">
            <div className="max-w-4xl mx-auto flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask StayHub Buddy about ${propertyName}... (e.g. "What was our ADR this week?")`}
                  disabled={isLoading}
                  className="flex-1 text-sm bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 rounded-xl h-10 px-3.5"
                />
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || isLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-4 gap-1.5 shadow-sm"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Ask</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  <span>Read-only analytics layer • Zero direct SQL exposure</span>
                </div>
                <span>Server Timezone: UTC</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right / Context Sidebar */}
        <div className="hidden lg:flex flex-col w-80 bg-white border-l border-slate-200 p-4 space-y-4 overflow-y-auto">
          {/* Property Context Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Current Property Context</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Property</span>
                <span className="font-medium text-slate-800">{propertyName}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Mode</span>
                <span className="font-medium text-emerald-600">Active / Read-Only</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Engine</span>
                <span className="font-medium text-slate-700">
                  {providerStatus?.provider === "gemini" ? "Google Gemini" : "StayHub Core"}
                </span>
              </div>
            </div>
          </div>

          {/* Suggested Questions Section */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Quick Intelligence Queries
            </h3>
            <div className="space-y-1.5">
              {suggestedPrompts.slice(0, 7).map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSendMessage(item.prompt)}
                  className="w-full text-left p-2.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-50 hover:bg-indigo-50/70 border border-slate-200/60 hover:border-indigo-200 transition-all flex items-center justify-between group"
                >
                  <span className="line-clamp-1">{item.title}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                </button>
              ))}
            </div>
          </div>

          {/* Safety & Compliance Badge */}
          <div className="mt-auto p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-900 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-indigo-950">
              <Info className="w-3.5 h-3.5 text-indigo-600" />
              <span>Hospitality AI Guardrails</span>
            </div>
            <p className="text-[11px] text-indigo-700/90 leading-tight">
              AI Business Buddy uses 17 controlled business tools with strict multi-tenant boundaries. Write actions are restricted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
