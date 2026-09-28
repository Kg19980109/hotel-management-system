"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  BedDouble,
  UserPlus,
  Calendar,
  DollarSign,
  Users,
  CheckCircle2,
  Search,
  Sparkles,
  Phone,
  Mail,
  FileText,
  Clock,
  X,
  Loader2,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  assignRoomAndCheckInGuestAction,
  getDirectAssignmentOptionsAction,
  DirectAssignmentRoomOption,
  DirectAssignmentGuestOption,
} from "@/lib/front-desk/actions";

interface DirectRoomAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  defaultGuestId?: string;
  defaultRoomId?: string;
  onSuccess?: (result: {
    stayId: string;
    roomNumber: string;
    guestName: string;
    folioNumber: string;
  }) => void;
}

export function DirectRoomAssignmentModal({
  isOpen,
  onClose,
  propertyId,
  defaultGuestId,
  defaultRoomId,
  onSuccess,
}: DirectRoomAssignmentModalProps) {
  const { success, error: toastError } = useToast();

  const [loadingInitial, setLoadingInitial] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rooms, setRooms] = useState<DirectAssignmentRoomOption[]>([]);
  const [guests, setGuests] = useState<DirectAssignmentGuestOption[]>([]);

  // Form Mode: "EXISTING_GUEST" | "NEW_GUEST"
  const [guestMode, setGuestMode] = useState<"EXISTING_GUEST" | "NEW_GUEST">(
    defaultGuestId ? "EXISTING_GUEST" : "NEW_GUEST"
  );

  // Selected or New Guest Details
  const [selectedGuestId, setSelectedGuestId] = useState<string>(defaultGuestId || "");
  const [guestSearch, setGuestSearch] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [idDocType, setIdDocType] = useState("NATIONAL_ID");
  const [idDocNumber, setIdDocNumber] = useState("");

  // Room & Stay Details
  const [selectedRoomId, setSelectedRoomId] = useState<string>(defaultRoomId || "");
  const [checkInDate, setCheckInDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [checkOutDate, setCheckOutDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [ratePerNight, setRatePerNight] = useState<number>(0);
  const [adults, setAdults] = useState<number>(1);
  const [children, setChildren] = useState<number>(0);
  const [notes, setNotes] = useState("");

  // Success State
  const [successResult, setSuccessResult] = useState<{
    stayId: string;
    roomNumber: string;
    guestName: string;
    folioNumber: string;
  } | null>(null);

  // Load Rooms & Guests
  useEffect(() => {
    if (!isOpen || !propertyId) return;

    async function loadData() {
      setLoadingInitial(true);
      try {
        const res = await getDirectAssignmentOptionsAction(propertyId);
        if (res.success && res.data) {
          setRooms(res.data.rooms);
          setGuests(res.data.guests);

          if (defaultRoomId) {
            setSelectedRoomId(defaultRoomId);
            const found = res.data.rooms.find((r) => r.id === defaultRoomId);
            if (found?.room_type?.base_rate) {
              setRatePerNight(Number(found.room_type.base_rate));
            }
          }

          if (defaultGuestId) {
            setSelectedGuestId(defaultGuestId);
            setGuestMode("EXISTING_GUEST");
          }
        } else if (res.error) {
          toastError("Failed to Load Rooms", res.error);
        }
      } catch (err) {
        console.error("Failed to load modal data:", err);
      } finally {
        setLoadingInitial(false);
      }
    }

    void loadData();
  }, [isOpen, propertyId, defaultGuestId, defaultRoomId]);

  // When room is changed, pre-fill base rate
  const handleRoomChange = (roomId: string) => {
    setSelectedRoomId(roomId);
    const found = rooms.find((r) => r.id === roomId);
    if (found?.room_type?.base_rate) {
      setRatePerNight(Number(found.room_type.base_rate));
    }
  };

  const filteredGuests = React.useMemo(() => {
    if (!guestSearch.trim()) return guests;
    const q = guestSearch.toLowerCase();
    return guests.filter((g) => {
      const fullName = `${g.first_name} ${g.last_name || ""}`.toLowerCase();
      return fullName.includes(q) || g.phone?.includes(q) || g.email?.toLowerCase().includes(q);
    });
  }, [guests, guestSearch]);

  const availableRooms = React.useMemo(() => {
    return rooms.filter(
      (r) => r.status === "AVAILABLE" || r.status === "CLEAN" || r.id === defaultRoomId
    );
  }, [rooms, defaultRoomId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRoomId) {
      toastError("Room Required", "Please select an available room to assign.");
      return;
    }

    if (guestMode === "EXISTING_GUEST" && !selectedGuestId) {
      toastError("Guest Required", "Please select an existing guest profile.");
      return;
    }

    if (guestMode === "NEW_GUEST" && !firstName.trim()) {
      toastError("Guest Name Required", "Please enter the guest's first name.");
      return;
    }

    try {
      setSubmitting(true);

      const res = await assignRoomAndCheckInGuestAction({
        propertyId,
        roomId: selectedRoomId,
        guestId: guestMode === "EXISTING_GUEST" ? selectedGuestId : undefined,
        firstName: guestMode === "NEW_GUEST" ? firstName.trim() : undefined,
        lastName: guestMode === "NEW_GUEST" ? lastName.trim() : undefined,
        phone: guestMode === "NEW_GUEST" ? phone.trim() : undefined,
        email: guestMode === "NEW_GUEST" ? email.trim() : undefined,
        idDocumentType: guestMode === "NEW_GUEST" ? idDocType : undefined,
        idDocumentNumber: guestMode === "NEW_GUEST" ? idDocNumber.trim() : undefined,
        checkInDate,
        checkOutDate,
        ratePerNight: Number(ratePerNight) || 0,
        adults: Number(adults) || 1,
        children: Number(children) || 0,
        notes: notes.trim() || undefined,
      });

      if (!res.success || !res.data) {
        toastError("Check-In Failed", res.error || "Unable to assign room and check in guest.");
        return;
      }

      const result = {
        stayId: res.data.stay_id,
        roomNumber: res.data.room_number,
        guestName: res.data.guest_name,
        folioNumber: res.data.folio_number,
      };

      setSuccessResult(result);
      success(
        "Room Assigned & Checked In!",
        `Guest ${result.guestName} is now active in Room ${result.roomNumber}. Folio #${result.folioNumber} generated.`
      );

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err: unknown) {
      toastError("Error", err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSuccessResult(null);
    setSelectedGuestId("");
    setSelectedRoomId("");
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setNotes("");
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onClose={handleResetAndClose}
      title="Assign Room & Guest Check-In"
      description="Instantly assign a room to an existing or new guest, initialize their room folio, and activate their QR portal."
      size="lg"
    >
      {successResult ? (
        <div className="py-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-black text-foreground">
              Guest Successfully Checked In!
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Room <span className="font-bold text-amber-500">{successResult.roomNumber}</span> is now active for{" "}
              <span className="font-bold text-foreground">{successResult.guestName}</span>.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-muted/50 border border-border max-w-sm mx-auto text-left space-y-2 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Assigned Room:</span>
              <span className="font-bold text-foreground">Room {successResult.roomNumber}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Guest Name:</span>
              <span className="font-bold text-foreground">{successResult.guestName}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Folio Number:</span>
              <span className="font-mono font-bold text-amber-500">{successResult.folioNumber}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>QR Scanning:</span>
              <span className="text-emerald-500 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Live & Greet Ready
              </span>
            </div>
          </div>

          <div className="pt-2">
            <Button onClick={handleResetAndClose} className="px-8 font-bold text-xs h-10">
              Done & Close
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Guest Mode Selector */}
          <div className="grid grid-cols-2 gap-2 p-1.5 rounded-xl bg-muted/60 border border-border">
            <button
              type="button"
              onClick={() => setGuestMode("NEW_GUEST")}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                guestMode === "NEW_GUEST"
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              New Guest / Walk-In
            </button>

            <button
              type="button"
              onClick={() => setGuestMode("EXISTING_GUEST")}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                guestMode === "EXISTING_GUEST"
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Existing CRM Guest
            </button>
          </div>

          {/* Guest Details Section */}
          {guestMode === "NEW_GUEST" ? (
            <div className="space-y-3 p-4 rounded-2xl bg-card border border-border">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-amber-500" />
                Guest Profile Information
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    Last Name
                  </label>
                  <Input
                    placeholder="e.g. Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    Phone Number
                  </label>
                  <Input
                    placeholder="e.g. +91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="e.g. john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    ID Document Type
                  </label>
                  <select
                    value={idDocType}
                    onChange={(e) => setIdDocType(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="NATIONAL_ID">Aadhaar / National ID</option>
                    <option value="PASSPORT">Passport</option>
                    <option value="DRIVERS_LICENSE">Driving License</option>
                    <option value="OTHER">Voter ID / Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    ID Document Number
                  </label>
                  <Input
                    placeholder="e.g. XXXX-XXXX-XXXX"
                    value={idDocNumber}
                    onChange={(e) => setIdDocNumber(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-4 rounded-2xl bg-card border border-border">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-500" />
                Select Existing Guest Profile
              </h4>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by guest name, phone, or email..."
                  value={guestSearch}
                  onChange={(e) => setGuestSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1.5 rounded-xl border border-border/60 p-1.5 bg-muted/20 scrollbar-thin">
                {filteredGuests.length === 0 ? (
                  <p className="text-center py-4 text-xs text-muted-foreground">
                    No matching guest profiles found.
                  </p>
                ) : (
                  filteredGuests.map((g) => {
                    const isSelected = selectedGuestId === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setSelectedGuestId(g.id)}
                        className={`w-full text-left p-2.5 rounded-lg text-xs transition flex items-center justify-between ${
                          isSelected
                            ? "bg-amber-500/15 border border-amber-500/30 text-amber-500 font-bold"
                            : "hover:bg-muted/60 text-foreground"
                        }`}
                      >
                        <div>
                          <p className="font-bold">{g.first_name} {g.last_name || ""}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {g.phone || g.email || "No contact info"}
                          </p>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-500" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Room Selection & Dates */}
          <div className="space-y-3 p-4 rounded-2xl bg-card border border-border">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <BedDouble className="w-4 h-4 text-amber-500" />
              Room Assignment & Dates
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Room Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Select Room <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    disabled={loadingInitial}
                    value={selectedRoomId}
                    onChange={(e) => handleRoomChange(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-bold disabled:opacity-60"
                  >
                    <option value="">
                      {loadingInitial ? "-- Loading Property Rooms... --" : "-- Choose Available Room --"}
                    </option>
                    {rooms.map((r) => {
                      const isOccupied = r.is_occupied || r.status === "OCCUPIED";
                      const isDirty = r.housekeeping_status === "DIRTY" || r.status === "DIRTY";
                      const isOutOfOrder = r.status === "OUT_OF_ORDER" || r.status === "OUT_OF_SERVICE";

                      let statusBadge = r.status;
                      if (isOccupied) {
                        statusBadge = `Occupied (${r.active_guest_name || "Guest in-house"})`;
                      } else if (isOutOfOrder) {
                        statusBadge = "Out of Order";
                      } else if (isDirty) {
                        statusBadge = "Available (Cleaning Pending)";
                      } else {
                        statusBadge = "Available / Clean";
                      }

                      const rateStr = r.room_type?.base_rate ? ` • ₹${r.room_type.base_rate}/night` : "";

                      return (
                        <option
                          key={r.id}
                          value={r.id}
                          disabled={isOccupied || isOutOfOrder}
                          className={isOccupied || isOutOfOrder ? "text-muted-foreground" : "text-foreground font-bold"}
                        >
                          Room {r.room_number} {r.room_type?.name ? `(${r.room_type.name})` : ""} — {statusBadge}{rateStr}
                        </option>
                      );
                    })}
                  </select>
                  {loadingInitial && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>

              {/* Nightly Tariff */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-emerald-500" />
                  Nightly Tariff (₹)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="50"
                  placeholder="0.00"
                  value={ratePerNight || ""}
                  onChange={(e) => setRatePerNight(Number(e.target.value))}
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>

              {/* Check-In Date */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Check-In Date
                </label>
                <Input
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              {/* Check-Out Date */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Expected Check-Out Date
                </label>
                <Input
                  type="date"
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              {/* Adults */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Adults
                </label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={adults}
                  onChange={(e) => setAdults(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>

              {/* Children */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Children
                </label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={children}
                  onChange={(e) => setChildren(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <label className="text-[11px] font-semibold text-muted-foreground">
                Special Notes / Remarks
              </label>
              <Input
                placeholder="e.g. VIP guest, extra pillows requested, early arrival"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetAndClose}
              disabled={submitting}
              className="text-xs"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={submitting || !selectedRoomId || (guestMode === "EXISTING_GUEST" && !selectedGuestId) || (guestMode === "NEW_GUEST" && !firstName.trim())}
              className="text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Assigning & Checking In...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Assign Room & Check In
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
