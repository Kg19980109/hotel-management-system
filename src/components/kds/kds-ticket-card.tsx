"use client";

// ============================================================
// STAYHUB KDS TICKET CARD COMPONENT (Phase 13)
// ============================================================

import * as React from "react";
import {
  Clock,
  Play,
  Check,
  CheckCircle2,
  RotateCcw,
  Flame,
  Utensils,
  ShoppingBag,
  BedDouble,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  KitchenTicket,
  KitchenTicketItem,
  KitchenPriority,
} from "@/lib/kds/types";

interface KdsTicketCardProps {
  ticket: KitchenTicket;
  onStartItem: (itemId: string) => void;
  onReadyItem: (itemId: string) => void;
  onCompleteItem: (itemId: string) => void;
  onRequeueItem: (itemId: string) => void;
  onRemakeItem: (item: KitchenTicketItem) => void;
  onChangePriority: (ticketId: string, priority: KitchenPriority) => void;
  disabled?: boolean;
}

export function KdsTicketCard({
  ticket,
  onStartItem,
  onReadyItem,
  onCompleteItem,
  onRemakeItem,
  onChangePriority,
  disabled = false,
}: KdsTicketCardProps) {
  // Compute timer display
  const waitingMins = Math.floor((ticket.waiting_seconds || 0) / 60);
  const waitingSecs = (ticket.waiting_seconds || 0) % 60;
  const timeFormatted = `${waitingMins}:${waitingSecs < 10 ? "0" : ""}${waitingSecs}`;

  const isDelayed = ticket.is_delayed || waitingMins >= 15;

  // Header style based on priority & status
  let headerBg = "bg-slate-800 text-white";
  if (ticket.status === "READY") {
    headerBg = "bg-emerald-600 text-white";
  } else if (ticket.priority === "URGENT" || isDelayed) {
    headerBg = "bg-rose-600 text-white animate-pulse";
  } else if (ticket.priority === "HIGH") {
    headerBg = "bg-amber-600 text-white";
  } else if (ticket.status === "IN_PROGRESS") {
    headerBg = "bg-indigo-700 text-white";
  }

  // All items quick actions check
  const allQueued = ticket.items?.every((i) => i.status === "QUEUED");

  return (
    <Card
      className={`flex flex-col rounded-xl overflow-hidden border-2 shadow-md transition-all ${
        ticket.status === "READY"
          ? "border-emerald-500/80 bg-emerald-950/10"
          : isDelayed || ticket.priority === "URGENT"
          ? "border-rose-500 bg-rose-950/10"
          : "border-border bg-card"
      }`}
    >
      {/* CARD HEADER */}
      <div className={`p-3 flex items-center justify-between ${headerBg}`}>
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-sm tracking-wide">
            {ticket.ticket_number}
          </span>
          {ticket.order_number && (
            <span className="text-[11px] opacity-80 font-mono">
              ({ticket.order_number})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* Waiting Timer */}
          <div
            className={`flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-full text-[11px] ${
              isDelayed ? "bg-white text-rose-700 font-extrabold" : "bg-black/30 text-white"
            }`}
          >
            <Clock className="h-3 w-3" />
            <span>{timeFormatted}</span>
          </div>

          {/* Priority Tag */}
          <select
            value={ticket.priority}
            onChange={(e) => onChangePriority(ticket.id, e.target.value as KitchenPriority)}
            disabled={disabled}
            className="bg-black/40 text-white text-[10px] font-bold rounded px-1.5 py-0.5 border-0 focus:ring-1 focus:ring-white outline-none cursor-pointer"
          >
            <option value="LOW" className="text-black">LOW</option>
            <option value="NORMAL" className="text-black">NORMAL</option>
            <option value="HIGH" className="text-black">HIGH</option>
            <option value="URGENT" className="text-black">URGENT</option>
          </select>
        </div>
      </div>

      {/* METADATA BAR */}
      <div className="px-3 py-1.5 bg-muted/60 border-b border-border flex items-center justify-between text-xs font-medium text-muted-foreground">
        <div className="flex items-center gap-2">
          {ticket.order_type === "ROOM_SERVICE" ? (
            <div className="flex items-center gap-1 font-bold text-amber-500">
              <BedDouble className="h-3.5 w-3.5" />
              <span>Room Service</span>
            </div>
          ) : ticket.order_type === "DINE_IN" ? (
            <div className="flex items-center gap-1 font-bold text-foreground">
              <Utensils className="h-3.5 w-3.5 text-primary" />
              <span>{ticket.table_number ? `Table ${ticket.table_number}` : "Dine In"}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Takeaway</span>
            </div>
          )}
        </div>

        <div className="text-[11px]">
          Status:{" "}
          <span className="font-bold text-foreground">{ticket.status}</span>
        </div>
      </div>

      {/* ORDER LEVEL NOTES */}
      {ticket.order_notes && (
        <div className="px-3 py-1 bg-amber-500/10 border-b border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400 font-semibold italic">
          Note: {ticket.order_notes}
        </div>
      )}

      {/* LINE ITEMS LIST */}
      <div className="p-3 flex-1 space-y-2.5 overflow-y-auto max-h-[360px]">
        {(ticket.items || []).map((item) => {
          const isItemQueued = item.status === "QUEUED";
          const isItemInProgress = item.status === "IN_PROGRESS";
          const isItemReady = item.status === "READY";
          const isItemCompleted = item.status === "COMPLETED";
          const isItemRemake = item.status === "REMAKE";

          return (
            <div
              key={item.id}
              className={`p-2.5 rounded-lg border text-xs transition-colors ${
                isItemReady
                  ? "bg-emerald-500/10 border-emerald-500/30 text-foreground"
                  : isItemInProgress
                  ? "bg-indigo-500/10 border-indigo-500/30 text-foreground"
                  : isItemRemake
                  ? "bg-rose-500/10 border-rose-500/30 text-foreground"
                  : isItemCompleted
                  ? "bg-muted/40 border-border text-muted-foreground line-through opacity-70"
                  : "bg-background border-border text-foreground"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[11px] shrink-0">
                      {item.quantity}×
                    </span>
                    <span className="font-bold text-[13px] leading-snug">
                      {item.item_name}
                    </span>
                  </div>

                  {/* Station Badge */}
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    {item.station_name ? (
                      <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 bg-muted rounded text-muted-foreground">
                        {item.station_name}
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 bg-rose-500/20 text-rose-600 rounded">
                        Unrouted
                      </span>
                    )}

                    {item.remake_count > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-rose-500 text-white rounded flex items-center gap-0.5">
                        <Flame className="h-2.5 w-2.5" /> Remake #{item.remake_count}
                      </span>
                    )}
                  </div>

                  {/* Item Notes */}
                  {item.notes && (
                    <div className="mt-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      ⚠️ {item.notes}
                    </div>
                  )}

                  {/* Remake Reason */}
                  {item.remake_reason && (
                    <div className="mt-1 text-[10px] text-rose-600 dark:text-rose-400 italic">
                      Reason: {item.remake_reason}
                    </div>
                  )}
                </div>

                {/* ITEM ACTIONS */}
                <div className="flex items-center gap-1 shrink-0">
                  {isItemQueued && (
                    <Button
                      size="sm"
                      onClick={() => onStartItem(item.id)}
                      disabled={disabled}
                      className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2.5"
                    >
                      <Play className="h-3 w-3 mr-1" /> Start
                    </Button>
                  )}

                  {isItemInProgress && (
                    <Button
                      size="sm"
                      onClick={() => onReadyItem(item.id)}
                      disabled={disabled}
                      className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5"
                    >
                      <Check className="h-3 w-3 mr-1" /> Ready
                    </Button>
                  )}

                  {isItemReady && (
                    <Button
                      size="sm"
                      onClick={() => onCompleteItem(item.id)}
                      disabled={disabled}
                      className="h-7 text-xs bg-slate-700 hover:bg-slate-800 text-white px-2"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Serve
                    </Button>
                  )}

                  {isItemRemake && (
                    <Button
                      size="sm"
                      onClick={() => onStartItem(item.id)}
                      disabled={disabled}
                      className="h-7 text-xs bg-rose-600 hover:bg-rose-700 text-white px-2"
                    >
                      <Play className="h-3 w-3 mr-1" /> Re-cook
                    </Button>
                  )}

                  {/* Re-fire button for ready / served items */}
                  {(isItemReady || isItemCompleted) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemakeItem(item)}
                      disabled={disabled}
                      title="Request Re-fire / Remake"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CARD FOOTER - BATCH ACTIONS */}
      <div className="p-2.5 bg-muted/40 border-t border-border flex items-center justify-between text-xs">
        <span className="text-[11px] text-muted-foreground font-medium">
          {ticket.items?.filter((i) => i.status === "READY").length || 0} / {ticket.items?.length || 0} Ready
        </span>

        <div className="flex items-center gap-1.5">
          {allQueued && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                ticket.items?.forEach((i) => {
                  if (i.status === "QUEUED") onStartItem(i.id);
                });
              }}
              disabled={disabled}
              className="h-6 text-[11px] px-2 text-indigo-600 hover:bg-indigo-50"
            >
              Start All
            </Button>
          )}

          {ticket.status === "READY" && (
            <Button
              size="sm"
              onClick={() => {
                ticket.items?.forEach((i) => {
                  if (i.status === "READY") onCompleteItem(i.id);
                });
              }}
              disabled={disabled}
              className="h-6 text-[11px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Serve Ticket
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
