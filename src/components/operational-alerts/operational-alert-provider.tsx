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
import {
  staffAcknowledgeGuestRequestAction,
  staffAcceptOperationalAlertAction,
} from "@/lib/guest-services/actions";

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
  acceptAlert: (id: string) => Promise<boolean>;
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
  acceptAlert: async () => false,
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

  // Initial fetch of active unacknowledged requests & food orders
  const syncOpenRequests = React.useCallback(async (propId: string, role: string | null) => {
    try {
      const supabase = createClient();

      // 1. Fetch Guest Service Requests
      const { data: serviceRequests } = await supabase
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

      if (serviceRequests) {
        for (const item of serviceRequests) {
          if (operationalAlertManager.isAlertDismissed(item.id)) continue;
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
      }
    } catch (e) {
      console.error("Failed to sync open guest requests:", e);
    }
  }, []);

  // Supabase Realtime Subscription scoped by property_id
  React.useEffect(() => {
    if (!propertyId) {
      operationalAlertManager.clearAll();
      return;
    }

    const supabase = createClient();

    // Ensure Realtime WebSocket connection is authenticated with user's JWT
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }
    });

    // Initial sync
    void syncOpenRequests(propertyId, currentRole);

    // Fast 2.5s heartbeat backup guarantees zero-latency alert popup on hotel screen
    const heartbeatInterval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void syncOpenRequests(propertyId, currentRole);
    }, 2500);

    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        void syncOpenRequests(propertyId, currentRole);
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    // Stable channel dedicated to this property's operational events
    const channelName = `stayhub:operational-alerts:${propertyId}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { ack: false, self: false },
      },
    });

    // 0. Listen for Instant Real-Time Broadcasts (< 50ms direct socket dispatch)
    channel.on(
      "broadcast",
      { event: "OPERATIONAL_ALERT" },
      (payload) => {
        const alert = payload?.payload as OperationalAlert;
        if (alert && alert.propertyId === propertyId) {
          if (!operationalAlertManager.isAlertDismissed(alert.id) && isRequestRelevantForRole(currentRole, alert.category)) {
            operationalAlertManager.addOrUpdateAlert(alert);
            setIsModalMinimized(false);
          }
        }
      }
    );

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

        if (newRec?.property_id && newRec.property_id !== propertyId) {
          return;
        }

        if (eventType === "INSERT") {
          // New service request arrived
          if (
            newRec.status === "SUBMITTED" &&
            !operationalAlertManager.isAlertDismissed(newRec.id) &&
            isRequestRelevantForRole(currentRole, newRec.category)
          ) {
            // 1. INSTANT ZERO-LATENCY DISPATCH: Fire popup & audio buzzer immediately with 0ms delay
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
            setIsModalMinimized(false);

            // 2. ASYNC BACKGROUND ENRICHMENT: Fetch room and guest name in background without blocking alert
            void (async () => {
              try {
                if (operationalAlertManager.isAlertDismissed(newRec.id)) return;
                const { data: detail } = await supabase
                  .from("guest_service_requests")
                  .select("room:rooms(room_number), guest:guests(first_name, last_name)")
                  .eq("id", newRec.id)
                  .single();

                if (detail && !operationalAlertManager.isAlertDismissed(newRec.id)) {
                  let roomNumber = "—";
                  let guestName = "Guest";
                  const r = detail.room as unknown as { room_number?: string };
                  if (r?.room_number) roomNumber = r.room_number;
                  const g = detail.guest as unknown as { first_name?: string; last_name?: string };
                  if (g) guestName = `${g.first_name || ""} ${g.last_name || ""}`.trim();

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
                }
              } catch {
                // fallback remains intact
              }
            })();
          }
        } else if (eventType === "UPDATE") {
          if (
            newRec.status === "ACKNOWLEDGED" ||
            newRec.status === "ASSIGNED" ||
            newRec.status === "IN_PROGRESS" ||
            newRec.status === "COMPLETED" ||
            newRec.status === "CANCELLED" ||
            newRec.status === "REJECTED"
          ) {
            operationalAlertManager.removeAlert(newRec.id, true);
          } else {
            if (!operationalAlertManager.isAlertDismissed(newRec.id)) {
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
          }
        } else if (eventType === "DELETE") {
          operationalAlertManager.removeAlert(payload.old?.id, true);
        }
      }
    );

    // Channel subscription lifecycle
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setInternalStatus("CONNECTED");
        void syncOpenRequests(propertyId, currentRole);
      } else if (status === "TIMED_OUT" || status === "CHANNEL_ERROR") {
        setInternalStatus("RECONNECTING");
      } else if (status === "CLOSED") {
        setInternalStatus("DISCONNECTED");
      }
    });

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
      void supabase.removeChannel(channel);
      operationalAlertManager.clearAll(false);
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

  const handleAcceptAlert = async (alertId: string): Promise<boolean> => {
    if (!propertyId || !alertId) return false;

    // Immediately stop buzzer locally & mark alert as acknowledged/dismissed
    const targetAlert = alerts.find((a) => a.id === alertId);
    operationalAlertManager.removeAlert(alertId, true);
    setIsModalMinimized(true);

    try {
      const res = await staffAcceptOperationalAlertAction(
        propertyId,
        alertId,
        targetAlert?.type
      );
      return res.success;
    } catch (err) {
      console.error("Failed to accept alert:", err);
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
        acknowledgeAlert: handleAcceptAlert,
        acceptAlert: handleAcceptAlert,
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
