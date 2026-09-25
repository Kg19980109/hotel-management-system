"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input, Textarea, FormGroup, SearchInput, Select } from "@/components/ui/input";
import { Avatar, AvatarGroup } from "@/components/ui/avatar";
import { Tabs } from "@/components/ui/tabs";
import { Modal, Drawer, ConfirmationDialog } from "@/components/ui/modal";
import { EmptyState, LoadingState, Skeleton, ErrorState } from "@/components/ui/states";
import { DataTable } from "@/components/ui/data-table";
import { KPIWidget, RoomCard, GuestCard, BookingCard } from "@/components/hotel/hotel-cards";
import { useToast } from "@/components/ui/toast";
import {
  BedDouble,
  DollarSign,
  CalendarCheck,
  Star,
  Plus,
  Trash2,
  Edit2,
  Search,
  Bell,
  Home,
} from "lucide-react";
import type { RoomStatus } from "@/types";

// ============================================================
// SECTION WRAPPER
// ============================================================

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="mb-12">
      <div className="mb-5 pb-3 border-b border-[var(--border)]">
        <h2 className="text-[20px] font-bold text-[var(--foreground)]">{title}</h2>
        {description && (
          <p className="text-[13px] text-[var(--foreground-muted)] mt-1">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div>
      {label && <p className="text-[12px] font-medium text-[var(--foreground-muted)] mb-2 uppercase tracking-wide">{label}</p>}
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

// ============================================================
// MOCK DATA
// ============================================================

const sampleRooms = [
  { id: "1", number: "101", type: "Deluxe Room", floor: 1, status: "available" as RoomStatus, rate: 4500 },
  { id: "2", number: "202", type: "Suite", floor: 2, status: "occupied" as RoomStatus, rate: 8500, guestName: "Arindam Sen", checkoutDate: "26 Sep" },
  { id: "3", number: "305", type: "Standard", floor: 3, status: "cleaning" as RoomStatus, rate: 2800 },
  { id: "4", number: "410", type: "Premium Suite", floor: 4, status: "maintenance" as RoomStatus, rate: 12000 },
];

const tableColumns = [
  { key: "bookingNo", header: "Booking #", sortable: true },
  { key: "guest", header: "Guest", sortable: true },
  { key: "room", header: "Room" },
  { key: "checkIn", header: "Check-in", sortable: true },
  { key: "checkOut", header: "Check-out" },
  {
    key: "status",
    header: "Status",
    render: (val: unknown) => <StatusBadge status={val as "confirmed"} />,
  },
  {
    key: "amount",
    header: "Amount",
    render: (val: unknown) => (
      <span className="font-semibold">₹{(val as number).toLocaleString()}</span>
    ),
  },
];

const tableData = [
  { id: "1", bookingNo: "BK-10041", guest: "Rohan Sharma", room: "102", checkIn: "25 Sep", checkOut: "27 Sep", status: "confirmed", amount: 9000 },
  { id: "2", bookingNo: "BK-10042", guest: "Priya Menon", room: "205", checkIn: "25 Sep", checkOut: "28 Sep", status: "checked_in", amount: 13500 },
  { id: "3", bookingNo: "BK-10043", guest: "Amit Gupta", room: "310", checkIn: "26 Sep", checkOut: "27 Sep", status: "pending", amount: 4500 },
  { id: "4", bookingNo: "BK-10044", guest: "Neha Kapoor", room: "101", checkIn: "25 Sep", checkOut: "26 Sep", status: "cancelled", amount: 4500 },
];

// ============================================================
// DESIGN SYSTEM PAGE
// ============================================================

export default function DesignSystemPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("components");
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tablePage, setTablePage] = useState(1);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-[12px] text-[var(--foreground-muted)] mb-2">
            <span>Design System</span>
            <span>/</span>
            <span className="text-[var(--foreground)]">Components</span>
          </div>
          <h1 className="text-page-heading text-[var(--foreground)]">StayHub Design System</h1>
          <p className="text-[var(--foreground-muted)] text-[14px] mt-1 max-w-2xl">
            Visual reference for all UI tokens, components, and patterns used across the StayHub platform.
            <span className="inline-flex items-center gap-1 ml-2 text-amber-600 font-medium text-[12px] bg-amber-50 px-2 py-0.5 rounded-full">
              ⚠ Dev Only
            </span>
          </p>
        </div>

        {/* Navigation Tabs */}
        <Tabs
          tabs={[
            { key: "components", label: "Components" },
            { key: "colors", label: "Colors & Tokens" },
            { key: "typography", label: "Typography" },
            { key: "hotel", label: "Hotel Components" },
          ]}
          activeKey={activeTab}
          onChange={setActiveTab}
          className="mb-8"
        />

        {/* ============================================================ */}
        {/* TAB: COLORS */}
        {/* ============================================================ */}
        {activeTab === "colors" && (
          <div>
            <Section title="Color Palette" description="StayHub design token colors">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: "Primary", bg: "bg-[var(--primary)]", value: "#4f46e5" },
                  { name: "Primary Light", bg: "bg-[var(--primary-light)]", value: "#e0e7ff", dark: true },
                  { name: "Success", bg: "bg-[var(--success)]", value: "#16a34a" },
                  { name: "Success Light", bg: "bg-[var(--success-light)]", value: "#dcfce7", dark: true },
                  { name: "Warning", bg: "bg-[var(--warning)]", value: "#d97706" },
                  { name: "Warning Light", bg: "bg-[var(--warning-light)]", value: "#fef3c7", dark: true },
                  { name: "Danger", bg: "bg-[var(--danger)]", value: "#dc2626" },
                  { name: "Danger Light", bg: "bg-[var(--danger-light)]", value: "#fee2e2", dark: true },
                  { name: "Info", bg: "bg-[var(--info)]", value: "#2563eb" },
                  { name: "Info Light", bg: "bg-[var(--info-light)]", value: "#dbeafe", dark: true },
                  { name: "Accent (Gold)", bg: "bg-[var(--accent)]", value: "#f59e0b" },
                  { name: "Purple", bg: "bg-[var(--purple)]", value: "#7c3aed" },
                  { name: "Sidebar BG", bg: "bg-[var(--sidebar-bg)]", value: "#0f172a" },
                  { name: "Background", bg: "bg-[var(--background)]", value: "#f0f2f8", dark: true },
                  { name: "Card", bg: "bg-[var(--card)]", value: "#ffffff", dark: true },
                  { name: "Muted", bg: "bg-[var(--muted)]", value: "#f8fafc", dark: true },
                ].map((color) => (
                  <div key={color.name} className="stayhub-card overflow-hidden">
                    <div className={`h-16 w-full ${color.bg}`} />
                    <div className="p-3">
                      <p className="text-[13px] font-medium text-[var(--foreground)]">{color.name}</p>
                      <p className="text-[11px] text-[var(--foreground-muted)] font-mono">{color.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Status Colors">
              <Row>
                <StatusBadge status="available" />
                <StatusBadge status="occupied" />
                <StatusBadge status="cleaning" />
                <StatusBadge status="maintenance" />
                <StatusBadge status="blocked" />
                <StatusBadge status="reserved" />
                <StatusBadge status="confirmed" />
                <StatusBadge status="pending" />
                <StatusBadge status="cancelled" />
                <StatusBadge status="checked_in" />
                <StatusBadge status="checked_out" />
                <StatusBadge status="paid" />
                <StatusBadge status="partial" />
                <StatusBadge status="refunded" />
                <StatusBadge status="due_out" />
              </Row>
            </Section>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB: TYPOGRAPHY */}
        {/* ============================================================ */}
        {activeTab === "typography" && (
          <div>
            <Section title="Typography Scale">
              <div className="space-y-6 stayhub-card p-8">
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-[var(--foreground-muted)] mb-1">Display — 36px / 700</p>
                  <p className="text-display">Welcome to StayHub</p>
                </div>
                <div className="border-t border-[var(--border)] pt-6">
                  <p className="text-[11px] uppercase tracking-widest text-[var(--foreground-muted)] mb-1">Page Heading — 28px / 700</p>
                  <p className="text-page-heading">Room Management</p>
                </div>
                <div className="border-t border-[var(--border)] pt-6">
                  <p className="text-[11px] uppercase tracking-widest text-[var(--foreground-muted)] mb-1">Section Heading — 18px / 600</p>
                  <p className="text-section-heading">Today&apos;s Arrivals</p>
                </div>
                <div className="border-t border-[var(--border)] pt-6">
                  <p className="text-[11px] uppercase tracking-widest text-[var(--foreground-muted)] mb-1">Card Heading — 15px / 600</p>
                  <p className="text-card-heading">Booking Summary</p>
                </div>
                <div className="border-t border-[var(--border)] pt-6">
                  <p className="text-[11px] uppercase tracking-widest text-[var(--foreground-muted)] mb-1">Body — 14px / 400</p>
                  <p className="text-body">Guest Arindam Sen checked in to Room 202 at 14:30. The suite is a premium ocean-view room on the second floor.</p>
                </div>
                <div className="border-t border-[var(--border)] pt-6">
                  <p className="text-[11px] uppercase tracking-widest text-[var(--foreground-muted)] mb-1">Small — 12px / 400</p>
                  <p className="text-small">Last updated 2 minutes ago · Booking #BK-10041</p>
                </div>
                <div className="border-t border-[var(--border)] pt-6">
                  <p className="text-[11px] uppercase tracking-widest text-[var(--foreground-muted)] mb-1">KPI Number — 32px / 700</p>
                  <p className="text-kpi text-[var(--foreground)]">₹2,45,800</p>
                </div>
              </div>
            </Section>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB: HOTEL COMPONENTS */}
        {/* ============================================================ */}
        {activeTab === "hotel" && (
          <div>
            <Section title="KPI Widgets" description="Key performance indicators for the hotel dashboard">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPIWidget
                  title="Occupancy Rate"
                  value="78%"
                  icon={<BedDouble style={{ width: 20, height: 20 }} />}
                  trend={12}
                  trendDirection="up"
                  trendLabel="vs last week"
                  color="primary"
                />
                <KPIWidget
                  title="Today's Check-ins"
                  value="14"
                  icon={<CalendarCheck style={{ width: 20, height: 20 }} />}
                  trend={3}
                  trendDirection="up"
                  trendLabel="vs yesterday"
                  color="success"
                />
                <KPIWidget
                  title="Today's Revenue"
                  value="₹1,24,500"
                  icon={<DollarSign style={{ width: 20, height: 20 }} />}
                  trend={8}
                  trendDirection="down"
                  trendLabel="vs yesterday"
                  color="warning"
                />
                <KPIWidget
                  title="Guest Satisfaction"
                  value="4.8 / 5"
                  icon={<Star style={{ width: 20, height: 20 }} />}
                  trend={2}
                  trendDirection="up"
                  trendLabel="vs last month"
                  color="accent"
                />
              </div>
            </Section>

            <Section title="Room Cards" description="Room status cards for room management view">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {sampleRooms.map((room) => (
                  <RoomCard key={room.id} {...room} onClick={() => {}} />
                ))}
              </div>
            </Section>

            <Section title="Room Cards — Compact">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {sampleRooms.map((room) => (
                  <RoomCard key={room.id} {...room} compact onClick={() => {}} />
                ))}
              </div>
            </Section>

            <Section title="Guest Cards">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <GuestCard name="Arindam Sen" email="arindam@example.com" phone="+91 98765 43210" roomNumber="202" bookingStatus="checked_in" isVip onClick={() => {}} />
                <GuestCard name="Priya Menon" email="priya@example.com" phone="+91 87654 32109" roomNumber="305" bookingStatus="confirmed" onClick={() => {}} />
                <GuestCard name="Rajesh Kumar" email="rajesh@example.com" phone="+91 76543 21098" bookingStatus="pending" onClick={() => {}} />
              </div>
            </Section>

            <Section title="Booking Cards">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <BookingCard
                  bookingNumber="BK-10041"
                  guestName="Arindam Sen"
                  roomNumber="202"
                  roomType="Suite"
                  checkIn="25 Sep"
                  checkOut="28 Sep"
                  nights={3}
                  adults={2}
                  status="confirmed"
                  paymentStatus="paid"
                  totalAmount={25500}
                  onClick={() => {}}
                />
                <BookingCard
                  bookingNumber="BK-10042"
                  guestName="Priya Menon"
                  roomNumber="305"
                  roomType="Deluxe"
                  checkIn="25 Sep"
                  checkOut="27 Sep"
                  nights={2}
                  adults={1}
                  childrenCount={1}
                  status="checked_in"
                  paymentStatus="partial"
                  totalAmount={9000}
                  onClick={() => {}}
                />
              </div>
            </Section>

            <Section title="Data Table" description="Reusable table for bookings, rooms, guests">
              <DataTable
                columns={tableColumns as never}
                data={tableData}
                getRowId={(row: typeof tableData[0]) => row.id}
                selectable
                pagination={{ page: tablePage, pageSize: 3, total: 12 }}
                onPageChange={setTablePage}
                onRowClick={() => {}}
              />
            </Section>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB: COMPONENTS */}
        {/* ============================================================ */}
        {activeTab === "components" && (
          <div>
            {/* BUTTONS */}
            <Section title="Buttons" description="All button variants, sizes, and states">
              <Row label="Variants">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="success">Success</Button>
              </Row>
              <Row label="Sizes">
                <Button size="xs">Extra Small</Button>
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
                <Button size="xl">Extra Large</Button>
              </Row>
              <Row label="With Icons">
                <Button leftIcon={<Plus style={{ width: 16, height: 16 }} />}>Add Booking</Button>
                <Button variant="outline" leftIcon={<Search style={{ width: 16, height: 16 }} />}>Search</Button>
                <Button variant="destructive" leftIcon={<Trash2 style={{ width: 14, height: 14 }} />} size="sm">Delete</Button>
                <Button variant="outline" rightIcon={<Edit2 style={{ width: 14, height: 14 }} />} size="sm">Edit</Button>
              </Row>
              <Row label="Icon Only">
                <Button size="icon" variant="primary"><Plus style={{ width: 18, height: 18 }} /></Button>
                <Button size="icon" variant="outline"><Bell style={{ width: 18, height: 18 }} /></Button>
                <Button size="icon" variant="ghost"><Home style={{ width: 18, height: 18 }} /></Button>
                <Button size="icon-sm" variant="destructive"><Trash2 style={{ width: 14, height: 14 }} /></Button>
              </Row>
              <Row label="States">
                <Button loading>Loading...</Button>
                <Button disabled>Disabled</Button>
                <Button fullWidth className="max-w-xs">Full Width</Button>
              </Row>
            </Section>

            {/* BADGES */}
            <Section title="Badges" description="Status and semantic badges">
              <Row label="Room Status">
                <StatusBadge status="available" />
                <StatusBadge status="occupied" />
                <StatusBadge status="cleaning" />
                <StatusBadge status="maintenance" />
                <StatusBadge status="blocked" />
                <StatusBadge status="reserved" />
              </Row>
              <Row label="Booking Status">
                <StatusBadge status="confirmed" />
                <StatusBadge status="pending" />
                <StatusBadge status="checked_in" />
                <StatusBadge status="checked_out" />
                <StatusBadge status="cancelled" />
                <StatusBadge status="no_show" />
                <StatusBadge status="due_out" />
              </Row>
              <Row label="Payment Status">
                <StatusBadge status="paid" />
                <StatusBadge status="partial" />
                <StatusBadge status="refunded" />
              </Row>
              <Row label="Semantic">
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="danger">Danger</Badge>
                <Badge variant="info">Info</Badge>
                <Badge variant="default">Default</Badge>
              </Row>
              <Row label="No Dot">
                <Badge variant="available" showDot={false}>Available</Badge>
                <Badge variant="occupied" showDot={false}>Occupied</Badge>
                <Badge variant="pending" showDot={false}>Pending</Badge>
              </Row>
              <Row label="Small Size">
                <StatusBadge status="available" size="sm" />
                <StatusBadge status="occupied" size="sm" />
                <StatusBadge status="cleaning" size="sm" />
                <StatusBadge status="confirmed" size="sm" />
              </Row>
            </Section>

            {/* AVATARS */}
            <Section title="Avatars" description="User and guest avatars with fallbacks">
              <Row label="Sizes">
                <Avatar name="Arindam Sen" size="xs" />
                <Avatar name="Priya Menon" size="sm" />
                <Avatar name="Rajesh Kumar" size="md" />
                <Avatar name="Neha Gupta" size="lg" />
                <Avatar name="Vikram Singh" size="xl" />
              </Row>
              <Row label="With Status">
                <Avatar name="Online User" size="md" status="online" />
                <Avatar name="Busy User" size="md" status="busy" />
                <Avatar name="Away User" size="md" status="away" />
                <Avatar name="Offline User" size="md" status="offline" />
              </Row>
              <Row label="Avatar Group">
                <AvatarGroup
                  avatars={[
                    { name: "Arindam Sen" },
                    { name: "Priya Menon" },
                    { name: "Rajesh Kumar" },
                    { name: "Neha Gupta" },
                    { name: "Vikram Singh" },
                    { name: "Ananya Roy" },
                  ]}
                  max={4}
                />
              </Row>
            </Section>

            {/* INPUTS */}
            <Section title="Inputs & Forms" description="Form controls and input variants">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                <FormGroup label="Guest Name" required>
                  <Input placeholder="Enter guest name" />
                </FormGroup>
                <FormGroup label="Email Address">
                  <Input type="email" placeholder="guest@example.com" />
                </FormGroup>
                <FormGroup label="Global Search">
                  <SearchInput placeholder="Search by guest, room, booking..." />
                </FormGroup>
                <FormGroup label="Room Type">
                  <Select>
                    <option value="">Select room type</option>
                    <option value="standard">Standard</option>
                    <option value="deluxe">Deluxe</option>
                    <option value="suite">Suite</option>
                  </Select>
                </FormGroup>
                <FormGroup label="With Error" error="This field is required">
                  <Input placeholder="Enter value" error />
                </FormGroup>
                <FormGroup label="With Hint" hint="Must be at least 8 characters">
                  <Input type="password" placeholder="Enter password" />
                </FormGroup>
                <FormGroup label="Special Requests" className="md:col-span-2">
                  <Textarea placeholder="Any special requirements or requests..." />
                </FormGroup>
              </div>
            </Section>

            {/* TABS */}
            <Section title="Tabs" description="Tab navigation with underline and pill variants">
              <div className="space-y-6">
                <div>
                  <p className="text-[12px] uppercase tracking-widest text-[var(--foreground-muted)] mb-3">Underline (default)</p>
                  <Tabs
                    tabs={[
                      { key: "all", label: "All Rooms", count: 120 },
                      { key: "available", label: "Available", count: 45 },
                      { key: "occupied", label: "Occupied", count: 62 },
                      { key: "cleaning", label: "Cleaning", count: 8 },
                      { key: "maintenance", label: "Maintenance", count: 5 },
                    ]}
                    activeKey="all"
                    onChange={() => {}}
                  />
                </div>
                <div>
                  <p className="text-[12px] uppercase tracking-widest text-[var(--foreground-muted)] mb-3">Pill</p>
                  <Tabs
                    variant="pill"
                    tabs={[
                      { key: "room", label: "Room Status" },
                      { key: "calendar", label: "Calendar View" },
                      { key: "floor", label: "Floor View" },
                    ]}
                    activeKey="room"
                    onChange={() => {}}
                  />
                </div>
              </div>
            </Section>

            {/* CARDS */}
            <Section title="Cards" description="Card layout system">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Card</CardTitle>
                    <CardDescription>Card description here</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[14px] text-[var(--foreground-muted)]">
                      White card with soft shadow and border. Used throughout the platform.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Card with Footer</CardTitle>
                    <CardDescription>Has a footer action</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[14px] text-[var(--foreground-muted)]">Cards can optionally include a footer section.</p>
                  </CardContent>
                  <CardFooter>
                    <Button size="sm" variant="outline">View Details</Button>
                  </CardFooter>
                </Card>
                <Card hoverable onClick={() => {}}>
                  <CardHeader>
                    <CardTitle>Hoverable Card</CardTitle>
                    <CardDescription>Click to interact</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[14px] text-[var(--foreground-muted)]">Hoverable cards show elevated shadow on hover.</p>
                  </CardContent>
                </Card>
              </div>
            </Section>

            {/* MODALS AND DRAWERS */}
            <Section title="Modals & Drawers" description="Overlays and panels">
              <Row>
                <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
                <Button variant="outline" onClick={() => setDrawerOpen(true)}>Open Drawer</Button>
                <Button variant="destructive" onClick={() => setConfirmOpen(true)}>Confirm Dialog</Button>
              </Row>

              <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Add New Booking"
                description="Fill in the details below to create a new reservation."
              >
                <div className="space-y-4">
                  <FormGroup label="Guest Name" required>
                    <Input placeholder="Enter guest name" />
                  </FormGroup>
                  <FormGroup label="Room Type">
                    <Select>
                      <option>Deluxe Room</option>
                      <option>Suite</option>
                    </Select>
                  </FormGroup>
                  <div className="flex gap-3 justify-end pt-4">
                    <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                    <Button>Create Booking</Button>
                  </div>
                </div>
              </Modal>

              <Drawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                title="Booking Details"
                description="Full details for Booking #BK-10041"
                footer={
                  <div className="flex gap-3">
                    <Button variant="outline" fullWidth onClick={() => setDrawerOpen(false)}>Close</Button>
                    <Button fullWidth>Update</Button>
                  </div>
                }
              >
                <div className="space-y-4">
                  <p className="text-[14px] text-[var(--foreground-muted)]">Booking details would appear here in a real module.</p>
                </div>
              </Drawer>

              <ConfirmationDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={() => { toast.success("Booking cancelled", "The booking has been cancelled."); setConfirmOpen(false); }}
                title="Cancel Booking"
                description="Are you sure you want to cancel this booking? This action cannot be undone."
                confirmLabel="Yes, Cancel"
                cancelLabel="Keep Booking"
              />
            </Section>

            {/* TOASTS */}
            <Section title="Toast Notifications" description="System feedback messages">
              <Row>
                <Button variant="success" onClick={() => toast.success("Booking created!", "Room 202 has been reserved for Arindam Sen.")}>
                  Success Toast
                </Button>
                <Button variant="destructive" onClick={() => toast.error("Error", "Failed to update room status. Please try again.")}>
                  Error Toast
                </Button>
                <Button variant="outline" onClick={() => toast.warning("Room almost full", "Only 3 rooms remaining for this date range.")}>
                  Warning Toast
                </Button>
                <Button variant="secondary" onClick={() => toast.info("Tip", "You can assign housekeeping from the room detail page.")}>
                  Info Toast
                </Button>
              </Row>
            </Section>

            {/* STATES */}
            <Section title="States" description="Loading, empty, and error states for data views">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <EmptyState
                    title="No bookings found"
                    description="There are no bookings matching your current filters."
                    action={{ label: "Add Booking", onClick: () => {} }}
                    icon={
                      <div className="h-14 w-14 rounded-full bg-indigo-50 flex items-center justify-center">
                        <CalendarCheck className="h-7 w-7 text-indigo-400" />
                      </div>
                    }
                  />
                </Card>
                <Card>
                  <LoadingState message="Loading rooms..." />
                </Card>
                <Card>
                  <ErrorState
                    title="Failed to load"
                    description="Could not connect to the server. Please check your connection."
                    onRetry={() => toast.info("Retrying...", "")}
                  />
                </Card>
              </div>
            </Section>

            {/* SKELETONS */}
            <Section title="Skeleton Loaders" description="Placeholder loading states for content">
              <Card>
                <CardContent>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <div className="grid grid-cols-4 gap-4 mt-6">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-20 w-full rounded-lg" />
                        <Skeleton className="h-3 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Section>

            {/* DATA TABLE PREVIEW */}
            <Section title="Data Table" description="Booking table preview">
              <DataTable
                columns={tableColumns as never}
                data={tableData}
                getRowId={(row: typeof tableData[0]) => row.id}
                selectable
                pagination={{ page: tablePage, pageSize: 3, total: 12 }}
                onPageChange={setTablePage}
                sortKey="bookingNo"
                sortDirection="asc"
                onSort={() => {}}
              />
            </Section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
