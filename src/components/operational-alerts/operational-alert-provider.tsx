"use client";

// ============================================================
// STAYHUB OPERATIONAL ALERT PROVIDER
// Real-time Supabase subscription, alert queue state & audio orchestration
// ============================================================

import * as React from "react";
import { useAuth } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/client";
import {
  operationalAlertManager,
  OperationalAlert,
  AlertPriority,
} from "@/lib/alerts/operational-alert-manager";
import {
  isRequestRelevantForRole,
  getDepartmentForCategory,
} from "@/lib/alerts/routing";
import { staffAcknowledgeGuestRequestAction } from "@/lib/guest-services/actions";

export type ConnectionStatus = "CONNECTED" | "RECONNECTING" | "DISCONNECTED";

interface OperationalAlertContextType {
  alerts: OperationalAlert[];
  isBuzzing: boolean;
  connectionStatus: ConnectionStatus;
  soundEnabled: boolean;
  audioUnlocked: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  unlockAudio: () => Promise<boolean>;
  acknowledgeAlert: (requestId: string) => Promise<boolean>;
  playTestSound: () => void;
  activeAlert: OperationalAlert | null;
  dismissCurrentModal: () => void;
  isModalMinimized: boolean;
  setIsModalMinimized: (val: boolean) => void;
}

const OperationalAlertContext = React.createContext<OperationalAlertContextType>({
  alerts: [],
  isBuzzing: false,
  connectionStatus: "DISCONNECTED",
  soundEnabled: true,
  audioUnlocked: false,
  setSoundEnabled: () => {},
  unlockAudio: async () => false,
  acknowledgeAlert: async () => false,
  playTestSound: () => {},
  activeAlert: null,
  dismissCurrentModal: () => {},
  isModalMinimized: false,
  setIsModalMinimized: () => {},
});

export function useOperationalAlerts() {
  return React.useContext(OperationalAlertContext);
}

export function OperationalAlertProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentProperty, currentRole } = useAuth();
  const propertyId = currentProperty?.property_id;

  const [alerts, setAlerts] = React.useState<OperationalAlert[]>([]);
  const [isBuzzing, setIsBuzzing] = React.useState<boolean>(false);
  const [internalStatus, setInternalStatus] = React.useState<ConnectionStatus>("DISCONNECTED");
  const connectionStatus: ConnectionStatus = propertyId ? internalStatus : "DISCONNECTED";
  const [soundEnabled, setSoundEnabledState] = React.useState<boolean>(() => operationalAlertManager.isSoundEnabled());
  const [audioUnlocked, setAudioUnlocked] = React.useState<boolean>(() => operationalAlertManager.isAudioUnlocked());
  const [isModalMinimized, setIsModalMinimized] = React.useState<boolean>(false);

  // Sync with operationalAlertManager
  React.useEffect(() => {
    const unsubscribe = operationalAlertManager.subscribe((activeList, buzzing) => {
      setAlerts([...activeList]);
      setIsBuzzing(buzzing);
      setAudioUnlocked(operationalAlertManager.isAudioUnlocked());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Unlock audio on first global user interaction (pointerdown or keydown)
  React.useEffect(() => {
    const handleGesture = () => {
      void operationalAlertManager.unlockAudio().then((unlocked) => {
        if (unlocked) {
          setAudioUnlocked(true);
        }
      });
    };

    window.addEventListener("pointerdown", handleGesture, { once: true });
    window.addEventListener("keydown", handleGesture, { once: true });

    return () => {
      window.removeEventListener("pointerdown", handleGesture);
      window.removeEventListener("keydown", handleGesture);
    };
  }, []);

  // Initial fetch of active unacknowledged requests & bounded sync on reconnect
  const syncOpenRequests = React.useCallback(async (propId: string, role: string | null) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("guest_service_requests")
        .select(`
          id,
          property_id,
          category,
          request_type,
          title,
          description,
          priority,
          status,
          created_at,
          room:rooms(room_number),
          guest:guests(first_name, last_name)
        `)
        .eq("property_id", propId)
        .eq("status", "SUBMITTED")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error || !data) return;

      for (const item of data) {
        if (isRequestRelevantForRole(role, item.category)) {
          const roomNum = (item.room as unknown as { room_number?: string })?.room_number || "—";
          const guest = item.guest as unknown as { first_name?: string; last_name?: string };
          const guestName = guest ? `${guest.first_name || ""} ${guest.last_name || ""}`.trim() : "Guest";

          operationalAlertManager.addOrUpdateAlert({
            id: item.id,
            type: "SERVICE_REQUEST",
            category: item.category,
            department: getDepartmentForCategory(item.category),
            roomNumber: roomNum,
            guestName: guestName || "Guest",
            title: item.title,
            description: item.description,
            priority: (item.priority as AlertPriority) || "NORMAL",
            receivedAt: new Date(item.created_at).getTime(),
            propertyId: item.property_id,
            status: item.status,
          });
        }
      }
    } catch (e) {
      console.error("Failed to sync open requests:", e);
    }
  }, []);

  // Supabase Realtime Subscription scoped by property_id
  React.useEffect(() => {
    if (!propertyId) {
      operationalAlertManager.clearAll();
      return;
    }

    const supabase = createClient();

    // Initial sync
    void syncOpenRequests(propertyId, currentRole);

    // Channel dedicated to this property's operational events
    const channelName = `stayhub:operational-alerts:${propertyId}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { ack: true },
      },
    });

    // 1. Listen for changes on guest_service_requests
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "guest_service_requests",
        filter: `property_id=eq.${propertyId}`,
      },
      async (payload) => {
        const { eventType, new: newRec } = payload;

        if (eventType === "INSERT") {
          // New request arrived
          if (newRec.status === "SUBMITTED" && isRequestRelevantForRole(currentRole, newRec.category)) {
            // Fetch room & guest info for display
            let roomNumber = "—";
            let guestName = "Guest";
            try {
              const { data: detail } = await supabase
                .from("guest_service_requests")
                .select("room:rooms(room_number), guest:guests(first_name, last_name)")
                .eq("id", newRec.id)
                .single();

              if (detail) {
                const r = detail.room as unknown as { room_number?: string };
                if (r?.room_number) roomNumber = r.room_number;
                const g = detail.guest as unknown as { first_name?: string; last_name?: string };
                if (g) guestName = `${g.first_name || ""} ${g.last_name || ""}`.trim();
              }
            } catch {
              // fallback
            }

            operationalAlertManager.addOrUpdateAlert({
              id: newRec.id,
              type: "SERVICE_REQUEST",
              category: newRec.category,
              department: getDepartmentForCategory(newRec.category),
              roomNumber,
              guestName: guestName || "Guest",
              title: newRec.title,
              description: newRec.description,
              priority: (newRec.priority as AlertPriority) || "NORMAL",
              receivedAt: Date.now(),
              propertyId: newRec.property_id,
              status: newRec.status,
            });
            setIsModalMinimized(false);
          }
        } else if (eventType === "UPDATE") {
          // Status updated by this staff or ANY other staff device
          if (
            newRec.status === "ACKNOWLEDGED" ||
            newRec.status === "ASSIGNED" ||
            newRec.status === "IN_PROGRESS" ||
            newRec.status === "COMPLETED" ||
            newRec.status === "CANCELLED" ||
            newRec.status === "REJECTED"
          ) {
            // Stop buzzer and remove alert immediately across all devices!
            operationalAlertManager.removeAlert(newRec.id);
          } else {
            operationalAlertManager.addOrUpdateAlert({
              id: newRec.id,
              type: "SERVICE_REQUEST",
              category: newRec.category,
              department: getDepartmentForCategory(newRec.category),
              roomNumber: "—",
              guestName: "Guest",
              title: newRec.title,
              description: newRec.description,
              priority: (newRec.priority as AlertPriority) || "NORMAL",
              receivedAt: Date.now(),
              propertyId: newRec.property_id,
              status: newRec.status,
            });
          }
        } else if (eventType === "DELETE") {
          operationalAlertManager.removeAlert(payload.old?.id);
        }
      }
    );

    // 2. Listen for changes on restaurant_orders (for food & room service)
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "restaurant_orders",
        filter: `property_id=eq.${propertyId}`,
      },
      async (payload) => {
        const order = payload.new;
        if (order.status === "CONFIRMED" && isRequestRelevantForRole(currentRole, "ROOM_SERVICE")) {
          let roomNumber = "—";
          let guestName = "Guest";
          try {
            const { data: detail } = await supabase
              .from("restaurant_orders")
              .select("room:rooms(room_number), guest:guests(first_name, last_name)")
              .eq("id", order.id)
              .single();

            if (detail) {
              const r = detail.room as unknown as { room_number?: string };
              if (r?.room_number) roomNumber = r.room_number;
              const g = detail.guest as unknown as { first_name?: string; last_name?: string };
              if (g) guestName = `${g.first_name || ""} ${g.last_name || ""}`.trim();
            }
          } catch {
            // fallback
          }

          operationalAlertManager.addOrUpdateAlert({
            id: order.id,
            type: "FOOD_ORDER",
            category: "ROOM_SERVICE",
            department: "RESTAURANT",
            roomNumber,
            guestName: guestName || "Guest",
            title: `Room Service Order #${order.order_number}`,
            description: order.notes || `Total: ${order.currency} ${order.total_amount}`,
            priority: "NORMAL",
            receivedAt: Date.now(),
            propertyId: order.property_id,
            status: order.status,
          });
          setIsModalMinimized(false);
        }
      }
    );

    // Channel subscription lifecycle
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setInternalStatus("CONNECTED");
        // Bounded reconciliation on reconnect
        void syncOpenRequests(propertyId, currentRole);
      } else if (status === "TIMED_OUT" || status === "CHANNEL_ERROR") {
        setInternalStatus("RECONNECTING");
      } else if (status === "CLOSED") {
        setInternalStatus("DISCONNECTED");
      }
    });

    return () => {
      void supabase.removeChannel(channel);
      operationalAlertManager.clearAll();
      setInternalStatus("DISCONNECTED");
    };
  }, [propertyId, currentRole, syncOpenRequests]);

  const handleSetSoundEnabled = (enabled: boolean) => {
    operationalAlertManager.setSoundEnabled(enabled);
    setSoundEnabledState(enabled);
  };

  const handleUnlockAudio = async () => {
    const success = await operationalAlertManager.unlockAudio();
    if (success) {
      setAudioUnlocked(true);
      operationalAlertManager.playTone("NORMAL");
    }
    return success;
  };

  const handleAcknowledge = async (requestId: string): Promise<boolean> => {
    if (!propertyId) return false;

    // Immediately stop buzzer locally for responsiveness
    operationalAlertManager.removeAlert(requestId);

    try {
      const res = await staffAcknowledgeGuestRequestAction(propertyId, requestId);
      return res.success;
    } catch (err) {
      console.error("Failed to acknowledge request:", err);
      return false;
    }
  };

  const handlePlayTestSound = () => {
    operationalAlertManager.playTestSound();
  };

  const activeAlert = alerts.length > 0 ? alerts[0] : null;

  return (
    <OperationalAlertContext.Provider
      value={{
        alerts,
        isBuzzing,
        connectionStatus,
        soundEnabled,
        audioUnlocked,
        setSoundEnabled: handleSetSoundEnabled,
        unlockAudio: handleUnlockAudio,
        acknowledgeAlert: handleAcknowledge,
        playTestSound: handlePlayTestSound,
        activeAlert,
        dismissCurrentModal: () => setIsModalMinimized(true),
        isModalMinimized,
        setIsModalMinimized,
      }}
    >
      {children}
    </OperationalAlertContext.Provider>
  );
}
