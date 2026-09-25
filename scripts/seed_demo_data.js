/**
 * STAYHUB COMPREHENSIVE DEMO DATA SEED SCRIPT
 * 
 * Populates a realistic multi-tenant hotel scenario across all 22 phases:
 * - Organizations & Properties (Grand Azure Luxury Resort & Spa)
 * - Floors, Room Types & Physical Rooms
 * - VIP Guests, CRM Profiles, Preferences & Notes
 * - Active Reservations & In-House Stays
 * - Guest Folios, Charges, Payments & Invoices
 * - Housekeeping Tasks & Inspection Records
 * - Maintenance Assets & Work Orders
 * - Restaurant POS Tables, Menu Categories, Dishes & Active Orders
 * - Kitchen Display System (KDS) Stations & Live Kitchen Tickets
 * - In-Room QR Portal Sessions & Guest Service Requests
 * - Inventory Suppliers, Storage Locations, Stock Balances & Batches
 * - Staff Departments, Team Members & Today Attendance
 * - Notifications, Preferences & Online Booking Engine Settings
 */

const { Client } = require('pg');
const crypto = require('crypto');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:Koushik%400109@db.tfnusdxtwqzrzblujaju.supabase.co:5432/postgres';

async function seed() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  console.log('===========================================================');
  console.log('STAYHUB: POPULATING REALISTIC ENTERPRISE DEMO DATA');
  console.log('===========================================================\n');

  try {
    await client.query('BEGIN');

    // 1. ORGANIZATION
    console.log('1. Seeding Organization...');
    const orgRes = await client.query(`
      INSERT INTO organizations (name, slug, legal_name, email, phone, status)
      VALUES ('Azure Hospitality Group', 'azure-hospitality', 'Azure Hospitality Group LLC', 'contact@azurehospitality.com', '+1-800-555-AZURE', 'active')
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email
      RETURNING id, name, slug;
    `);
    const orgId = orgRes.rows[0].id;
    console.log(`   ✓ Organization: ${orgRes.rows[0].name} (${orgId})`);

    // 2. PROPERTIES
    console.log('2. Seeding Hotel Properties...');
    const propRes = await client.query(`
      INSERT INTO properties (
        organization_id, name, slug, property_code, description,
        address_line_1, city, state, postal_code, country,
        phone, email, timezone, currency, check_in_time, check_out_time, status,
        public_name, public_description, wifi_ssid, wifi_password, front_desk_phone
      )
      VALUES 
        (
          '${orgId}', 'Grand Azure Luxury Resort & Spa', 'grand-azure-resort', 'GA-RESORT',
          '5-Star Oceanfront Luxury Resort with world-class dining, infinity pools, and holistic wellness spa.',
          '100 Oceanfront Blvd, Marina Bay', 'Goa', 'Goa', '403001', 'India',
          '+91-832-555-0100', 'stay@grandazureresort.com', 'Asia/Kolkata', 'USD', '14:00', '11:00', 'active',
          'Grand Azure Luxury Resort & Spa', 'Experience unmatched coastal serenity and 5-star hospitality.',
          'GrandAzure_Guest_5G', 'AzureLuxury2026', '+91-832-555-0199'
        ),
        (
          '${orgId}', 'Urban Azure Boutique Hotel', 'urban-azure-hotel', 'UA-HOTEL',
          'Modern boutique urban hotel designed for high-performing business executives and discerning travelers.',
          '45 Central Financial Avenue', 'Mumbai', 'Maharashtra', '400051', 'India',
          '+91-22-555-0200', 'info@urbanazurehotel.com', 'Asia/Kolkata', 'USD', '14:00', '11:00', 'active',
          'Urban Azure Boutique Hotel', 'Contemporary comfort in the heart of Mumbai financial district.',
          'UrbanAzure_Guest', 'UrbanSpeed2026', '+91-22-555-0299'
        )
      ON CONFLICT (organization_id, slug) DO UPDATE 
      SET name = EXCLUDED.name, property_code = EXCLUDED.property_code, currency = EXCLUDED.currency
      RETURNING id, name, slug, property_code;
    `);
    const propId = propRes.rows[0].id;
    const prop2Id = propRes.rows[1] ? propRes.rows[1].id : propId;
    console.log(`   ✓ Main Property: ${propRes.rows[0].name} (${propId})`);
    console.log(`   ✓ Secondary Property: ${propRes.rows[1]?.name || 'N/A'} (${prop2Id})`);

    // 3. FLOORS
    console.log('3. Seeding Floors...');
    const floorsToSeed = [
      { num: 1, name: '1st Floor - Ocean Wing', sort: 1 },
      { num: 2, name: '2nd Floor - Garden Wing', sort: 2 },
      { num: 3, name: '3rd Floor - Executive Level', sort: 3 },
      { num: 4, name: '4th Floor - Penthouse Suite Level', sort: 4 }
    ];
    const floorMap = {};
    for (const f of floorsToSeed) {
      const res = await client.query(`
        INSERT INTO floors (property_id, floor_number, name, sort_order, status)
        VALUES ('${propId}', ${f.num}, '${f.name}', ${f.sort}, 'active')
        ON CONFLICT (property_id, name) DO UPDATE SET floor_number = EXCLUDED.floor_number
        RETURNING id, floor_number;
      `);
      floorMap[f.num] = res.rows[0].id;
    }
    console.log(`   ✓ 4 Floors configured`);

    // 4. ROOM TYPES
    console.log('4. Seeding Room Types & Rates...');
    const roomTypesToSeed = [
      { code: 'STD-QN', name: 'Standard Queen Room', desc: 'Cozy queen bed with courtyard views and modern amenities.', rate: 150.00, occ: 2, bed: '1 Queen Bed', amenities: JSON.stringify(['High-Speed WiFi', 'Smart TV', 'Espresso Machine', 'Courtyard View']) },
      { code: 'DLX-OCN', name: 'Deluxe Ocean View Room', desc: 'Spacious room with king bed, private balcony, and panoramic ocean views.', rate: 240.00, occ: 3, bed: '1 King Bed', amenities: JSON.stringify(['High-Speed WiFi', 'Ocean View Balcony', 'Mini Bar', 'Rain Shower', 'Smart TV']) },
      { code: 'EXEC-STE', name: 'Executive King Suite', desc: 'Luxury suite with dedicated lounge area, executive workspace, espresso bar, and marble bath.', rate: 380.00, occ: 4, bed: '1 King Bed + Sofa Bed', amenities: JSON.stringify(['Executive Lounge Access', 'Butler Service', 'Walk-in Closet', 'Soaking Tub', 'Panoramic Balcony']) },
      { code: 'PRES-PNT', name: 'Presidential Penthouse', desc: 'Top-floor panoramic penthouse with private wrap-around terrace, private jacuzzi, and dedicated concierge.', rate: 750.00, occ: 6, bed: '2 King Beds', amenities: JSON.stringify(['Private Jacuzzi', 'Wrap-around Ocean Terrace', 'Dedicated Chauffeur', 'Private Dining Kitchen', '24/7 Butler']) }
    ];

    const rtMap = {};
    for (const rt of roomTypesToSeed) {
      const res = await client.query(`
        INSERT INTO room_types (property_id, code, name, description, base_rate, max_occupancy, currency, bed_configuration, amenities, is_active)
        VALUES ('${propId}', '${rt.code}', '${rt.name}', '${rt.desc}', ${rt.rate}, ${rt.occ}, 'USD', '${rt.bed}', '${rt.amenities}'::jsonb, true)
        ON CONFLICT (property_id, code) DO UPDATE SET base_rate = EXCLUDED.base_rate, name = EXCLUDED.name
        RETURNING id, code, name;
      `);
      rtMap[rt.code] = res.rows[0].id;
    }
    console.log(`   ✓ 4 Room Types seeded with base pricing`);

    // 5. ROOMS
    console.log('5. Seeding Physical Hotel Rooms (16 Rooms)...');
    const roomsToSeed = [
      { num: '101', floor: floorMap[1], rt: rtMap['STD-QN'], status: 'OCCUPIED', hk: 'CLEAN', name: 'Ocean Wing 101' },
      { num: '102', floor: floorMap[1], rt: rtMap['STD-QN'], status: 'AVAILABLE', hk: 'CLEAN', name: 'Ocean Wing 102' },
      { num: '103', floor: floorMap[1], rt: rtMap['DLX-OCN'], status: 'OCCUPIED', hk: 'CLEAN', name: 'Ocean Deluxe 103' },
      { num: '104', floor: floorMap[1], rt: rtMap['DLX-OCN'], status: 'AVAILABLE', hk: 'DIRTY', name: 'Ocean Deluxe 104' },
      { num: '201', floor: floorMap[2], rt: rtMap['DLX-OCN'], status: 'AVAILABLE', hk: 'CLEAN', name: 'Garden Deluxe 201' },
      { num: '202', floor: floorMap[2], rt: rtMap['DLX-OCN'], status: 'AVAILABLE', hk: 'CLEAN', name: 'Garden Deluxe 202' },
      { num: '203', floor: floorMap[2], rt: rtMap['EXEC-STE'], status: 'AVAILABLE', hk: 'INSPECTED', name: 'Executive Suite 203' },
      { num: '204', floor: floorMap[2], rt: rtMap['EXEC-STE'], status: 'AVAILABLE', hk: 'INSPECTED', name: 'Executive Suite 204' },
      { num: '301', floor: floorMap[3], rt: rtMap['EXEC-STE'], status: 'AVAILABLE', hk: 'CLEAN', name: 'Executive Suite 301' },
      { num: '302', floor: floorMap[3], rt: rtMap['EXEC-STE'], status: 'AVAILABLE', hk: 'CLEAN', name: 'Executive Suite 302' },
      { num: '303', floor: floorMap[3], rt: rtMap['EXEC-STE'], status: 'MAINTENANCE', hk: 'CLEAN', name: 'Executive Suite 303' },
      { num: '304', floor: floorMap[3], rt: rtMap['PRES-PNT'], status: 'AVAILABLE', hk: 'CLEAN', name: 'Azure Vista Suite 304' },
      { num: '401', floor: floorMap[4], rt: rtMap['PRES-PNT'], status: 'OCCUPIED', hk: 'CLEAN', name: 'Presidential Penthouse 401' },
      { num: '402', floor: floorMap[4], rt: rtMap['PRES-PNT'], status: 'AVAILABLE', hk: 'INSPECTED', name: 'Presidential Penthouse 402' },
      { num: '403', floor: floorMap[4], rt: rtMap['PRES-PNT'], status: 'OUT_OF_ORDER', hk: 'CLEAN', name: 'Royal Horizon Suite 403' },
      { num: '404', floor: floorMap[4], rt: rtMap['PRES-PNT'], status: 'AVAILABLE', hk: 'CLEAN', name: 'Imperial Sky Villa 404' }
    ];

    const roomMap = {};
    for (const r of roomsToSeed) {
      const res = await client.query(`
        INSERT INTO rooms (property_id, floor_id, room_type_id, room_number, room_name, status, housekeeping_status, availability_status)
        VALUES ('${propId}', '${r.floor}', '${r.rt}', '${r.num}', '${r.name}', '${r.status}', '${r.hk}', '${r.status === 'OCCUPIED' ? 'RESERVED' : 'AVAILABLE'}')
        ON CONFLICT (property_id, room_number) DO UPDATE 
        SET status = EXCLUDED.status, housekeeping_status = EXCLUDED.housekeeping_status, room_type_id = EXCLUDED.room_type_id
        RETURNING id, room_number;
      `);
      roomMap[r.num] = res.rows[0].id;
    }
    console.log(`   ✓ 16 Hotel Rooms seeded across 4 floors`);

    // 6. GUEST CRM PROFILES & PREFERENCES
    console.log('6. Seeding Guest CRM Profiles & VIP Preferences...');
    const guestsToSeed = [
      { first: 'Alexander', last: 'Wright', email: 'alex.wright@techventures.io', phone: '+14155550192', city: 'San Francisco', country: 'United States', company: 'TechVentures Capital', notes: 'VIP Platinum guest. Prefers high floors and sparkling mineral water. Late checkout requested.' },
      { first: 'Sophia', last: 'Chen', email: 'sophia.chen@globalfinance.com', phone: '+12125550144', city: 'New York', country: 'United States', company: 'Global Finance Partners', notes: 'VIP Gold guest. Allergic to feather pillows (foam pillows only). Frequent business traveler.' },
      { first: 'Marcus', last: 'Vanderbilt', email: 'marcus@vanderbilt-holdings.com', phone: '+442079460912', city: 'London', country: 'United Kingdom', company: 'Vanderbilt Holdings', notes: 'VIP Black Tier. Always stays in Presidential Penthouse. Requires private airport limousine.' },
      { first: 'Elena', last: 'Rostova', email: 'elena.rostova@designstudio.de', phone: '+49305550188', city: 'Berlin', country: 'Germany', company: 'Studio Rostova Architecture', notes: 'Honeymoon anniversary celebration. Requested welcome champagne & fresh orchids in room.' },
      { first: 'David', last: 'Miller', email: 'david.miller@acme-corp.com', phone: '+13125550177', city: 'Chicago', country: 'United States', company: 'Acme International', notes: 'Corporate group attendee. Requested quiet working desk setup.' },
      { first: 'Priya', last: 'Sharma', email: 'priya.sharma@innovate-tech.in', phone: '+919820055521', city: 'Mumbai', country: 'India', company: 'Innovate AI Labs', notes: 'VIP Gold guest. Strict vegetarian breakfast preference.' }
    ];

    const guestMap = {};
    for (const g of guestsToSeed) {
      const res = await client.query(`
        INSERT INTO guests (
          property_id, first_name, last_name, email, phone, 
          city, country, company_name, notes, status, marketing_consent
        )
        VALUES (
          '${propId}', '${g.first}', '${g.last}', '${g.email}', '${g.phone}',
          '${g.city}', '${g.country}', '${g.company}', '${g.notes}', 'ACTIVE', true
        )
        RETURNING id, first_name, last_name;
      `);
      guestMap[g.first] = res.rows[0].id;
    }

    // Guest Preferences
    await client.query(`
      INSERT INTO guest_preferences (property_id, guest_id, preference_type, preference_value, notes)
      VALUES 
        ('${propId}', '${guestMap['Alexander']}', 'FLOOR', 'High Floor', 'Prefers 3rd or 4th floor quiet rooms'),
        ('${propId}', '${guestMap['Alexander']}', 'DIETARY', 'Sparkling Water', 'San Pellegrino in minibar upon arrival'),
        ('${propId}', '${guestMap['Sophia']}', 'PILLOW', 'Foam Hypoallergenic', 'Strictly no down/feather pillows'),
        ('${propId}', '${guestMap['Marcus']}', 'ROOM', 'Presidential Penthouse', 'Requires top floor suite with panoramic sea view'),
        ('${propId}', '${guestMap['Priya']}', 'DIETARY', 'Pure Vegetarian', 'Prefers Jain/Pure Vegetarian dining options')
      ON CONFLICT DO NOTHING;
    `);
    console.log(`   ✓ 6 VIP Guest CRM Profiles & Preferences created`);

    // Clean existing reservations for this property to allow clean re-runs
    await client.query(`DELETE FROM reservations WHERE property_id = '${propId}';`);

    // Res 1: Alexander Wright in Room 101 (Checked-in)
    const res1 = await client.query(`
      INSERT INTO reservations (
        property_id, confirmation_number, status, booking_source,
        check_in_date, check_out_date, adults, children,
        primary_guest_id, total_amount, currency, special_requests
      )
      VALUES (
        '${propId}', 'GA-26-100101', 'CONFIRMED', 'DIRECT',
        CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '3 days', 2, 0,
        '${guestMap['Alexander']}', 600.00, 'USD', 'High floor requested, late checkout at 1:00 PM.'
      )
      ON CONFLICT (property_id, confirmation_number) DO UPDATE SET status = EXCLUDED.status
      RETURNING id;
    `);
    const res1Id = res1.rows[0].id;

    const resRoom1 = await client.query(`
      INSERT INTO reservation_rooms (reservation_id, property_id, room_type_id, room_id, check_in_date, check_out_date, nightly_rate, total_amount, currency)
      VALUES ('${res1Id}', '${propId}', '${rtMap['STD-QN']}', '${roomMap['101']}', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '3 days', 150.00, 600.00, 'USD')
      RETURNING id;
    `);

    const stay1 = await client.query(`
      INSERT INTO stays (
        property_id, reservation_id, reservation_room_id, guest_id, room_id,
        status, actual_check_in_at, expected_check_out_date, adults, children, notes
      )
      VALUES (
        '${propId}', '${res1Id}', '${resRoom1.rows[0].id}', '${guestMap['Alexander']}', '${roomMap['101']}',
        'CHECKED_IN', now() - INTERVAL '1 day', CURRENT_DATE + INTERVAL '3 days', 2, 0, 'VIP Platinum In-House Guest'
      )
      RETURNING id;
    `);
    const stay1Id = stay1.rows[0].id;

    // Res 2: Sophia Chen in Room 103 (Checked-in)
    const res2 = await client.query(`
      INSERT INTO reservations (
        property_id, confirmation_number, status, booking_source,
        check_in_date, check_out_date, adults, children,
        primary_guest_id, total_amount, currency, special_requests
      )
      VALUES (
        '${propId}', 'GA-26-100103', 'CONFIRMED', 'WEBSITE',
        CURRENT_DATE, CURRENT_DATE + INTERVAL '2 days', 1, 0,
        '${guestMap['Sophia']}', 480.00, 'USD', 'Foam pillows placed in room. Ocean view requested.'
      )
      ON CONFLICT (property_id, confirmation_number) DO UPDATE SET status = EXCLUDED.status
      RETURNING id;
    `);
    const res2Id = res2.rows[0].id;

    const resRoom2 = await client.query(`
      INSERT INTO reservation_rooms (reservation_id, property_id, room_type_id, room_id, check_in_date, check_out_date, nightly_rate, total_amount, currency)
      VALUES ('${res2Id}', '${propId}', '${rtMap['DLX-OCN']}', '${roomMap['103']}', CURRENT_DATE, CURRENT_DATE + INTERVAL '2 days', 240.00, 480.00, 'USD')
      RETURNING id;
    `);

    const stay2 = await client.query(`
      INSERT INTO stays (
        property_id, reservation_id, reservation_room_id, guest_id, room_id,
        status, actual_check_in_at, expected_check_out_date, adults, children, notes
      )
      VALUES (
        '${propId}', '${res2Id}', '${resRoom2.rows[0].id}', '${guestMap['Sophia']}', '${roomMap['103']}',
        'CHECKED_IN', now(), CURRENT_DATE + INTERVAL '2 days', 1, 0, 'Checked In today via QR front desk express'
      )
      RETURNING id;
    `);
    const stay2Id = stay2.rows[0].id;

    // Res 3: Marcus Vanderbilt in Room 401 (Presidential Penthouse - Checked-in)
    const res3 = await client.query(`
      INSERT INTO reservations (
        property_id, confirmation_number, status, booking_source,
        check_in_date, check_out_date, adults, children,
        primary_guest_id, total_amount, currency, special_requests
      )
      VALUES (
        '${propId}', 'GA-26-100401', 'CONFIRMED', 'DIRECT',
        CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '5 days', 2, 1,
        '${guestMap['Marcus']}', 5250.00, 'USD', 'Presidential Penthouse VIP Black setup. Private chef & limousine on call.'
      )
      ON CONFLICT (property_id, confirmation_number) DO UPDATE SET status = EXCLUDED.status
      RETURNING id;
    `);
    const res3Id = res3.rows[0].id;

    const resRoom3 = await client.query(`
      INSERT INTO reservation_rooms (reservation_id, property_id, room_type_id, room_id, check_in_date, check_out_date, nightly_rate, total_amount, currency)
      VALUES ('${res3Id}', '${propId}', '${rtMap['PRES-PNT']}', '${roomMap['401']}', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '5 days', 750.00, 5250.00, 'USD')
      RETURNING id;
    `);

    const stay3 = await client.query(`
      INSERT INTO stays (
        property_id, reservation_id, reservation_room_id, guest_id, room_id,
        status, actual_check_in_at, expected_check_out_date, adults, children, notes
      )
      VALUES (
        '${propId}', '${res3Id}', '${resRoom3.rows[0].id}', '${guestMap['Marcus']}', '${roomMap['401']}',
        'CHECKED_IN', now() - INTERVAL '2 days', CURRENT_DATE + INTERVAL '5 days', 2, 1, 'VIP Black Presidential Occupancy'
      )
      RETURNING id;
    `);
    const stay3Id = stay3.rows[0].id;

    // Res 4: Elena Rostova (Upcoming Arrival Tomorrow in Room 203)
    const res4 = await client.query(`
      INSERT INTO reservations (
        property_id, confirmation_number, status, booking_source,
        check_in_date, check_out_date, adults, children,
        primary_guest_id, total_amount, currency, special_requests
      )
      VALUES (
        '${propId}', 'GA-26-100203', 'CONFIRMED', 'WEBSITE',
        CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '4 days', 2, 0,
        '${guestMap['Elena']}', 1140.00, 'USD', 'Anniversary romance package. Champagne in suite on arrival.'
      )
      ON CONFLICT (property_id, confirmation_number) DO UPDATE SET status = EXCLUDED.status
      RETURNING id;
    `);
    await client.query(`
      INSERT INTO reservation_rooms (reservation_id, property_id, room_type_id, room_id, check_in_date, check_out_date, nightly_rate, total_amount, currency)
      VALUES ('${res4.rows[0].id}', '${propId}', '${rtMap['EXEC-STE']}', '${roomMap['203']}', CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '4 days', 380.00, 1140.00, 'USD');
    `);

    // Res 5: Priya Sharma (Upcoming Arrival Next Week)
    const res5 = await client.query(`
      INSERT INTO reservations (
        property_id, confirmation_number, status, booking_source,
        check_in_date, check_out_date, adults, children,
        primary_guest_id, total_amount, currency, special_requests
      )
      VALUES (
        '${propId}', 'GA-26-100304', 'CONFIRMED', 'WEBSITE',
        CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '8 days', 2, 0,
        '${guestMap['Priya']}', 2250.00, 'USD', 'Vegetarian breakfast package included.'
      )
      ON CONFLICT (property_id, confirmation_number) DO UPDATE SET status = EXCLUDED.status
      RETURNING id;
    `);
    await client.query(`
      INSERT INTO reservation_rooms (reservation_id, property_id, room_type_id, room_id, check_in_date, check_out_date, nightly_rate, total_amount, currency)
      VALUES ('${res5.rows[0].id}', '${propId}', '${rtMap['PRES-PNT']}', '${roomMap['304']}', CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '8 days', 750.00, 2250.00, 'USD');
    `);

    console.log(`   ✓ 3 In-House Stays & 2 Upcoming Confirmed Reservations seeded`);

    // 8. GUEST FOLIOS, ITEM CHARGES & PAYMENTS (PHASE 16)
    console.log('8. Seeding Guest Financial Folios & Itemized Charges...');

    // Folio for Alexander Wright (Stay 1)
    const fol1 = await client.query(`
      INSERT INTO guest_folios (property_id, stay_id, guest_id, reservation_id, folio_number, status, currency)
      VALUES ('${propId}', '${stay1Id}', '${guestMap['Alexander']}', '${res1Id}', 'FOL-26-001001', 'OPEN', 'USD')
      RETURNING id;
    `);
    const fol1Id = fol1.rows[0].id;

    await client.query(`
      INSERT INTO folio_charges (
        property_id, folio_id, stay_id, guest_id, charge_type, source_type,
        description, quantity, unit_price, subtotal, tax_amount, total_amount, currency, charge_date
      )
      VALUES 
        ('${propId}', '${fol1Id}', '${stay1Id}', '${guestMap['Alexander']}', 'ROOM', 'STAY', 'Standard Queen Room Nightly Rate (Night 1)', 1, 150.00, 150.00, 27.00, 177.00, 'USD', CURRENT_DATE - INTERVAL '1 day'),
        ('${propId}', '${fol1Id}', '${stay1Id}', '${guestMap['Alexander']}', 'RESTAURANT', 'RESTAURANT_ORDER', 'The Azure Bistro & Grill Dinner', 1, 85.00, 85.00, 15.30, 100.30, 'USD', CURRENT_DATE - INTERVAL '1 day'),
        ('${propId}', '${fol1Id}', '${stay1Id}', '${guestMap['Alexander']}', 'OTHER', 'MANUAL', 'Minibar - San Pellegrino Sparkling Water & Cashews', 2, 12.00, 24.00, 4.32, 28.32, 'USD', CURRENT_DATE);
    `);

    await client.query(`
      INSERT INTO folio_payments (
        property_id, folio_id, stay_id, guest_id, payment_method,
        payment_reference, amount, currency, status, paid_at
      )
      VALUES 
        ('${propId}', '${fol1Id}', '${stay1Id}', '${guestMap['Alexander']}', 'CARD', 'PAY-26-001001', 150.00, 'USD', 'COMPLETED', now() - INTERVAL '1 day');
    `);

    // Folio for Marcus Vanderbilt (Stay 3 - Penthouse VIP)
    const fol3 = await client.query(`
      INSERT INTO guest_folios (property_id, stay_id, guest_id, reservation_id, folio_number, status, currency)
      VALUES ('${propId}', '${stay3Id}', '${guestMap['Marcus']}', '${res3Id}', 'FOL-26-001003', 'OPEN', 'USD')
      RETURNING id;
    `);
    const fol3Id = fol3.rows[0].id;

    await client.query(`
      INSERT INTO folio_charges (
        property_id, folio_id, stay_id, guest_id, charge_type, source_type,
        description, quantity, unit_price, subtotal, tax_amount, total_amount, currency, charge_date
      )
      VALUES 
        ('${propId}', '${fol3Id}', '${stay3Id}', '${guestMap['Marcus']}', 'ROOM', 'STAY', 'Presidential Penthouse Suite (Night 1 & 2)', 2, 750.00, 1500.00, 270.00, 1770.00, 'USD', CURRENT_DATE - INTERVAL '2 days'),
        ('${propId}', '${fol3Id}', '${stay3Id}', '${guestMap['Marcus']}', 'SERVICE', 'GUEST_SERVICE_REQUEST', 'Couples Signature Swedish Massage (Azure Spa)', 1, 450.00, 450.00, 81.00, 531.00, 'USD', CURRENT_DATE - INTERVAL '1 day'),
        ('${propId}', '${fol3Id}', '${stay3Id}', '${guestMap['Marcus']}', 'ROOM_SERVICE', 'RESTAURANT_ORDER', 'In-Suite Gourmet Caviar & Dom Pérignon Service', 1, 380.00, 380.00, 68.40, 448.40, 'USD', CURRENT_DATE);
    `);

    await client.query(`
      INSERT INTO folio_payments (
        property_id, folio_id, stay_id, guest_id, payment_method,
        payment_reference, amount, currency, status, paid_at
      )
      VALUES 
        ('${propId}', '${fol3Id}', '${stay3Id}', '${guestMap['Marcus']}', 'CARD', 'PAY-26-001003', 2500.00, 'USD', 'COMPLETED', now() - INTERVAL '1 day');
    `);

    console.log(`   ✓ Guest Folios, Room Charges & Settled Payments recorded`);

    // 9. HOUSEKEEPING TASKS & INSPECTIONS
    console.log('9. Seeding Housekeeping Tasks & Turndown Records...');
    await client.query(`DELETE FROM housekeeping_tasks WHERE property_id = '${propId}';`);
    await client.query(`
      INSERT INTO housekeeping_tasks (property_id, room_id, task_type, status, priority, scheduled_for, notes)
      VALUES 
        ('${propId}', '${roomMap['104']}', 'CLEANING', 'IN_PROGRESS', 'HIGH', CURRENT_DATE, 'Checkout turnover clean for incoming arrival.'),
        ('${propId}', '${roomMap['202']}', 'TURNDOWN', 'COMPLETED', 'NORMAL', CURRENT_DATE, 'Evening turndown service completed with lavender mist.'),
        ('${propId}', '${roomMap['303']}', 'DEEP_CLEAN', 'PENDING', 'URGENT', CURRENT_DATE, 'Post-maintenance HVAC deep sanitation.'),
        ('${propId}', '${roomMap['402']}', 'INSPECTION', 'INSPECTION_PENDING', 'HIGH', CURRENT_DATE, 'Supervisor inspection prior to VIP Penthouse check-in.')
      ON CONFLICT DO NOTHING;
    `);
    console.log(`   ✓ Housekeeping Cleaning, Turndown & Inspection tasks active`);

    // 10. MAINTENANCE ASSETS & WORK ORDERS
    console.log('10. Seeding Maintenance Assets & Work Orders...');
    await client.query(`DELETE FROM maintenance_work_orders WHERE property_id = '${propId}';`);
    const assetRes = await client.query(`
      INSERT INTO maintenance_assets (property_id, name, asset_type, serial_number, status, notes)
      VALUES 
        ('${propId}', 'Carrier Chiller Unit A', 'HVAC', 'CAR-HVAC-9901', 'OPERATIONAL', 'Main rooftop central chiller system'),
        ('${propId}', 'HydroMax Water Filtration Pump', 'PLUMBING', 'HYD-PUMP-204', 'OPERATIONAL', 'Basement main water filtration pump'),
        ('${propId}', 'Otis High-Speed Guest Elevator 1', 'MECHANICAL', 'OTIS-ELEV-01', 'OPERATIONAL', 'Lobby tower primary guest elevator')
      RETURNING id, name;
    `);
    const asset1Id = assetRes.rows[0].id;

    await client.query(`
      INSERT INTO maintenance_work_orders (
        property_id, room_id, asset_id, title, description,
        category, priority, status, reported_at
      )
      VALUES 
        ('${propId}', '${roomMap['303']}', '${asset1Id}', 'AC Thermostat Calibration', 'Thermostat sensor fluctuating by 3 degrees. Calibrating digital controller.', 'HVAC', 'HIGH', 'IN_PROGRESS', now() - INTERVAL '2 hours'),
        ('${propId}', '${roomMap['403']}', NULL, 'Balcony Jacuzzi Jet Pressure Check', 'Scheduled quarterly filter replacement and jet pressure check.', 'PLUMBING', 'NORMAL', 'OPEN', now() - INTERVAL '5 hours');
    `);
    console.log(`   ✓ Maintenance Assets & Work Orders active`);

    // 11. RESTAURANT POS, MENU & ORDERS (PHASE 12)
    console.log('11. Seeding Restaurant Outlets, POS Tables, Menus & Active Orders...');
    await client.query(`DELETE FROM restaurant_orders WHERE property_id = '${propId}';`);
    const restRes = await client.query(`
      INSERT INTO restaurants (property_id, name, code, description, currency, timezone, is_active)
      VALUES 
        ('${propId}', 'The Azure Bistro & Grill', 'AZ-BISTRO', 'Fine dining restaurant specializing in coastal Mediterranean seafood and dry-aged steaks.', 'USD', 'Asia/Kolkata', true),
        ('${propId}', 'Sunset Poolside Lounge', 'SUNSET-BAR', 'Relaxed open-air bar serving artisanal cocktails, craft beers, and gourmet light bites.', 'USD', 'Asia/Kolkata', true)
      ON CONFLICT (property_id, code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, code, name;
    `);
    const rest1Id = restRes.rows[0].id;
    const rest2Id = restRes.rows[1] ? restRes.rows[1].id : rest1Id;

    // Restaurant Areas
    const areaRes = await client.query(`
      INSERT INTO restaurant_areas (restaurant_id, name, description, display_order)
      VALUES 
        ('${rest1Id}', 'Main Oceanfront Dining Room', 'Indoor dining with panoramic glass ocean view', 1),
        ('${rest1Id}', 'Outdoor Garden Terrace', 'Romantic outdoor seating surrounded by tropical flora', 2),
        ('${rest2Id}', 'Poolside Cabana Deck', 'Private cabana seating by infinity pool', 1)
      ON CONFLICT (restaurant_id, name) DO UPDATE SET description = EXCLUDED.description
      RETURNING id, name;
    `);
    const area1Id = areaRes.rows[0].id;
    const area2Id = areaRes.rows[1].id;

    // Restaurant Tables
    const tableRes = await client.query(`
      INSERT INTO restaurant_tables (restaurant_id, area_id, table_number, display_name, capacity, status)
      VALUES 
        ('${rest1Id}', '${area1Id}', 'T-01', 'Table 1 (Ocean Front)', 2, 'OCCUPIED'),
        ('${rest1Id}', '${area1Id}', 'T-02', 'Table 2 (Center Dining)', 4, 'OCCUPIED'),
        ('${rest1Id}', '${area1Id}', 'T-03', 'Table 3 (Window Booth)', 4, 'AVAILABLE'),
        ('${rest1Id}', '${area2Id}', 'T-04', 'Terrace Table 4', 6, 'RESERVED'),
        ('${rest1Id}', '${area2Id}', 'T-05', 'Terrace Table 5', 8, 'AVAILABLE'),
        ('${rest2Id}', NULL, 'BAR-01', 'Poolside Bar Stool 1', 2, 'OCCUPIED'),
        ('${rest2Id}', NULL, 'BAR-02', 'Poolside Bar Stool 2', 2, 'AVAILABLE')
      ON CONFLICT (restaurant_id, table_number) DO UPDATE SET status = EXCLUDED.status
      RETURNING id, table_number;
    `);
    const tableMap = {};
    for (const t of tableRes.rows) {
      tableMap[t.table_number] = t.id;
    }

    // Menu Categories
    const catRes = await client.query(`
      INSERT INTO menu_categories (restaurant_id, name, description, display_order)
      VALUES 
        ('${rest1Id}', 'Starters & Appetizers', 'Artisanal bites and coastal appetizers', 1),
        ('${rest1Id}', 'Chef Signature Mains', 'Prime meats and freshly caught seafood', 2),
        ('${rest1Id}', 'Artisanal Desserts', 'Handcrafted desserts and patisserie', 3),
        ('${rest2Id}', 'Signature Cocktails', 'Craft cocktails by our master mixologist', 1),
        ('${rest2Id}', 'Gourmet Tapas', 'Sharing platters and gourmet poolside snacks', 2)
      ON CONFLICT (restaurant_id, name) DO UPDATE SET description = EXCLUDED.description
      RETURNING id, name;
    `);
    const catStarters = catRes.rows[0].id;
    const catMains = catRes.rows[1].id;
    const catDesserts = catRes.rows[2].id;
    const catCocktails = catRes.rows[3]?.id || catStarters;

    // Menu Items
    const itemRes = await client.query(`
      INSERT INTO menu_items (restaurant_id, category_id, name, short_name, price, currency, is_available, is_active)
      VALUES 
        ('${rest1Id}', '${catStarters}', 'Pan-Seared Hokkaido Scallops', 'Scallops', 24.00, 'USD', true, true),
        ('${rest1Id}', '${catStarters}', 'Heirloom Burrata & Roasted Figs', 'Burrata', 18.00, 'USD', true, true),
        ('${rest1Id}', '${catMains}', 'Pan-Seared Chilean Sea Bass', 'Sea Bass', 48.00, 'USD', true, true),
        ('${rest1Id}', '${catMains}', 'Prime Wagyu Ribeye Steak 10oz', 'Wagyu Ribeye', 68.00, 'USD', true, true),
        ('${rest1Id}', '${catMains}', 'Black Truffle & Wild Mushroom Risotto', 'Truffle Risotto', 36.00, 'USD', true, true),
        ('${rest1Id}', '${catDesserts}', 'Valrhona Dark Chocolate Fondant', 'Choc Fondant', 16.00, 'USD', true, true),
        ('${rest2Id}', '${catCocktails}', 'Azure Mist Signature Smoked Martini', 'Azure Mist', 22.00, 'USD', true, true),
        ('${rest2Id}', '${catCocktails}', 'Passionfruit & Basil Coastal Spritz', 'Coastal Spritz', 18.00, 'USD', true, true)
      RETURNING id, name, price;
    `);
    const itemMap = {};
    for (const item of itemRes.rows) {
      itemMap[item.name] = item;
    }

    // Live Restaurant POS Order: Table T-01
    const order1 = await client.query(`
      INSERT INTO restaurant_orders (
        property_id, restaurant_id, table_id, order_number, order_type,
        status, guest_id, stay_id, subtotal, tax_amount, total_amount, currency, notes
      )
      VALUES (
        '${propId}', '${rest1Id}', '${tableMap['T-01']}', 'POS-26-001001', 'DINE_IN',
        'PREPARING', '${guestMap['Alexander']}', '${stay1Id}', 72.00, 12.96, 84.96, 'USD', 'Table 1 Oceanfront romantic dinner'
      )
      RETURNING id;
    `);
    const order1Id = order1.rows[0].id;

    await client.query(`
      INSERT INTO restaurant_order_items (
        order_id, menu_item_id, item_name, unit_price, quantity,
        tax_amount, line_total, notes, status
      )
      VALUES 
        ('${order1Id}', '${itemMap['Pan-Seared Hokkaido Scallops'].id}', 'Pan-Seared Hokkaido Scallops', 24.00, 1, 4.32, 28.32, 'Extra citrus foam', 'CONFIRMED'),
        ('${order1Id}', '${itemMap['Pan-Seared Chilean Sea Bass'].id}', 'Pan-Seared Chilean Sea Bass', 48.00, 1, 8.64, 56.64, 'Gluten free side asparagus', 'CONFIRMED');
    `);

    // Live Room Service Order: Room 401 (Marcus Vanderbilt)
    const order2 = await client.query(`
      INSERT INTO restaurant_orders (
        property_id, restaurant_id, room_id, order_number, order_type,
        status, guest_id, stay_id, subtotal, tax_amount, total_amount, currency, notes
      )
      VALUES (
        '${propId}', '${rest1Id}', '${roomMap['401']}', 'POS-26-001002', 'ROOM_SERVICE',
        'CONFIRMED', '${guestMap['Marcus']}', '${stay3Id}', 104.00, 18.72, 122.72, 'USD', 'Deliver to Presidential Penthouse 401'
      )
      RETURNING id;
    `);
    const order2Id = order2.rows[0].id;

    await client.query(`
      INSERT INTO restaurant_order_items (
        order_id, menu_item_id, item_name, unit_price, quantity,
        tax_amount, line_total, notes, status
      )
      VALUES 
        ('${order2Id}', '${itemMap['Prime Wagyu Ribeye Steak 10oz'].id}', 'Prime Wagyu Ribeye Steak 10oz', 68.00, 1, 12.24, 80.24, 'Medium rare with truffle jus', 'CONFIRMED'),
        ('${order2Id}', '${itemMap['Black Truffle & Wild Mushroom Risotto'].id}', 'Black Truffle & Wild Mushroom Risotto', 36.00, 1, 6.48, 42.48, 'Extra freshly shaved black truffle', 'CONFIRMED');
    `);

    console.log(`   ✓ 2 Outlets, 7 Tables, 8 Menu Items & 2 Live POS Orders active`);

    // 12. KITCHEN DISPLAY SYSTEM (KDS) & PRODUCTION STATIONS (PHASE 13)
    console.log('12. Seeding Kitchen Stations & Live KDS Production Tickets...');
    const stationRes = await client.query(`
      INSERT INTO kitchen_stations (restaurant_id, name, code, description, display_order, is_active)
      VALUES 
        ('${rest1Id}', 'Grill & Hot Line Station', 'GRILL', 'Main hot cooking line for steaks, seafood and entrees', 1, true),
        ('${rest1Id}', 'Pantry & Appetizer Station', 'PANTRY', 'Cold starters, salads, and delicate appetizer plating', 2, true),
        ('${rest1Id}', 'Pastry & Dessert Station', 'PASTRY', 'Dessert line and confectionery preparations', 3, true),
        ('${rest2Id}', 'Beverage & Cocktail Bar', 'BAR', 'Mixology and cocktail station', 1, true)
      ON CONFLICT (restaurant_id, code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, code, name;
    `);
    const stationGrill = stationRes.rows[0].id;
    const stationPantry = stationRes.rows[1].id;

    // Route items to stations
    await client.query(`
      INSERT INTO menu_item_kitchen_stations (menu_item_id, kitchen_station_id, is_primary)
      VALUES 
        ('${itemMap['Pan-Seared Hokkaido Scallops'].id}', '${stationPantry}', true),
        ('${itemMap['Pan-Seared Chilean Sea Bass'].id}', '${stationGrill}', true),
        ('${itemMap['Prime Wagyu Ribeye Steak 10oz'].id}', '${stationGrill}', true),
        ('${itemMap['Black Truffle & Wild Mushroom Risotto'].id}', '${stationGrill}', true)
      ON CONFLICT DO NOTHING;
    `);

    console.log(`   ✓ Kitchen Display System stations & live routing configured`);

    // 13. GUEST QR PORTAL & SERVICE REQUESTS (PHASES 14 & 15)
    console.log('13. Seeding Guest QR Codes & In-House Concierge Service Requests...');
    
    // Clear existing QR codes for clean deterministic seed
    await client.query(`DELETE FROM guest_qr_codes WHERE property_id = '${propId}';`);

    const qrDefinitions = [
      { type: 'HOTEL_GENERAL', room: null, name: 'Lobby & Public Directory Portal QR', token: 'hotel-general-token' },
      { type: 'ROOM', room: roomMap['101'], name: 'Room 101 In-Room Portal QR', token: 'room-101-portal-token' },
      { type: 'ROOM', room: roomMap['103'], name: 'Room 103 In-Room Portal QR', token: 'room-103-portal-token' },
      { type: 'ROOM', room: roomMap['401'], name: 'Penthouse 401 VIP Portal QR', token: 'room-401-portal-token' },
      { type: 'ROOM', room: roomMap['201'], name: 'Room 201 In-Room Portal QR', token: 'room-201-portal-token' }
    ];

    for (const qr of qrDefinitions) {
      const hash = crypto.createHash('sha256').update(qr.token).digest('hex');
      await client.query(`
        INSERT INTO guest_qr_codes (property_id, qr_type, room_id, name, token_hash, raw_token, is_active)
        VALUES ('${propId}', '${qr.type}', ${qr.room ? `'${qr.room}'` : 'NULL'}, '${qr.name}', '${hash}', '${qr.token}', true)
        ON CONFLICT (token_hash) DO UPDATE SET raw_token = EXCLUDED.raw_token, is_active = true;
      `);
    }

    // Guest Service Requests
    await client.query(`DELETE FROM guest_service_requests WHERE property_id = '${propId}';`);
    await client.query(`
      INSERT INTO guest_service_requests (
        property_id, guest_id, stay_id, room_id, category,
        request_type, title, description, priority, status, requested_at
      )
      VALUES 
        (
          '${propId}', '${guestMap['Sophia']}', '${stay2Id}', '${roomMap['103']}', 'HOUSEKEEPING',
          'PILLOW_CHANGE', 'Extra Hypoallergenic Foam Pillows', 'Guest is allergic to feathers. Requested 2 extra firm foam pillows.', 'HIGH', 'IN_PROGRESS', now() - INTERVAL '45 minutes'
        ),
        (
          '${propId}', '${guestMap['Marcus']}', '${stay3Id}', '${roomMap['401']}', 'CONCIERGE',
          'CHAUFFEUR_SERVICE', 'Private Airport Limousine Booking', 'Chauffeur service requested for departure to Goa International Airport.', 'HIGH', 'ACKNOWLEDGED', now() - INTERVAL '1 hour'
        ),
        (
          '${propId}', '${guestMap['Alexander']}', '${stay1Id}', '${roomMap['101']}', 'ROOM_SERVICE',
          'ICE_BUCKET', 'Ice Bucket & Wine Glasses', 'Requested crystal wine glasses and fresh crushed ice bucket in room.', 'MEDIUM', 'COMPLETED', now() - INTERVAL '3 hours'
        );
    `);
    console.log(`   ✓ In-Room QR Codes & 3 Guest Service Requests active`);

    // 14. INVENTORY, SUPPLIERS & STOCK (PHASE 17)
    console.log('14. Seeding Inventory Suppliers, Storage Locations & Stock Items...');
    const supRes = await client.query(`
      INSERT INTO suppliers (
        property_id, supplier_code, name, contact_person, email, phone, city, payment_terms, is_active
      )
      VALUES 
        ('${propId}', 'SUP-SEA-01', 'Pacific Coast Gourmet Seafoods', 'Captain David Miller', 'orders@pacificseafoods.com', '+1-800-555-FISH', 'Seattle', 'Net 30 Days', true),
        ('${propId}', 'SUP-WAG-02', 'Kobe & Australian Prime Meats', 'Arthur Pendelton', 'supply@primemeats.com', '+1-800-555-BEEF', 'Chicago', 'Net 15 Days', true),
        ('${propId}', 'SUP-LIN-03', 'Riviera Luxury Linens & Textiles', 'Helena Dubois', 'service@rivieralinens.fr', '+33-1-555-0921', 'Paris', 'Net 30 Days', true)
      ON CONFLICT (property_id, supplier_code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, supplier_code, name;
    `);
    const supFish = supRes.rows[0].id;
    const supMeat = supRes.rows[1].id;
    const supLinen = supRes.rows[2].id;

    // Inventory Categories
    const invCatRes = await client.query(`
      INSERT INTO inventory_categories (property_id, name, description, is_active)
      VALUES 
        ('${propId}', 'Fresh Seafood & Proteins', 'Fresh fish, shellfish, and chilled poultry', true),
        ('${propId}', 'Prime Beef & Meats', 'Dry-aged beef, wagyu cuts, and lamb', true),
        ('${propId}', 'Housekeeping Bed & Bath Linens', 'Egyptian cotton sheets, duvets, and plush bath sheets', true),
        ('${propId}', 'Guest Room Luxury Toiletries', 'Organic shampoo, body wash, dental kits', true)
      ON CONFLICT (property_id, name) DO UPDATE SET description = EXCLUDED.description
      RETURNING id, name;
    `);
    const catFish = invCatRes.rows[0].id;
    const catMeat = invCatRes.rows[1].id;
    const catLinen = invCatRes.rows[2].id;

    // Inventory Locations
    const locRes = await client.query(`
      INSERT INTO inventory_locations (property_id, name, location_type, description, is_active)
      VALUES 
        ('${propId}', 'Central Cold Storage Walk-in', 'COLD_STORAGE', 'Main kitchen walk-in freezer (-18C)', true),
        ('${propId}', 'Dry Pantry Central Store', 'DRY_STORAGE', 'Main basement storage room', true),
        ('${propId}', 'Linen Storage Room 2nd Floor', 'LINEN_ROOM', 'Housekeeping supply hub for floors 1-2', true)
      ON CONFLICT (property_id, name) DO UPDATE SET description = EXCLUDED.description
      RETURNING id, name;
    `);

    // Inventory Items
    const invItemRes = await client.query(`
      INSERT INTO inventory_items (
        property_id, category_id, sku, name, description, item_type,
        unit_of_measure, reorder_level, par_level, is_perishable, is_active
      )
      VALUES 
        ('${propId}', '${catFish}', 'SKU-SEABASS-KG', 'Chilean Sea Bass Fillets (Fresh Chilled)', 'Portion cut sea bass skin-on', 'RAW_FOOD', 'KG', 15.00, 40.00, true, true),
        ('${propId}', '${catMeat}', 'SKU-WAGYU-RIBEYE', 'Wagyu Beef Ribeye BMS 7+ (Chilled)', 'Australian Wagyu whole ribeye slabs', 'RAW_FOOD', 'KG', 10.00, 30.00, true, true),
        ('${propId}', '${catLinen}', 'SKU-TOWEL-BATH-XL', 'Egyptian Cotton Bath Sheet 800 GSM', 'Plush white oversized bath sheet', 'OPERATING_SUPPLY', 'PIECES', 50.00, 200.00, false, true),
        ('${propId}', '${catLinen}', 'SKU-SHEET-KING-600', '600 Thread Count King Flat Sheet', 'Silky sateen weave crisp white king sheet', 'OPERATING_SUPPLY', 'PIECES', 40.00, 150.00, false, true)
      ON CONFLICT (property_id, sku) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, sku, name;
    `);

    // Stock Batches
    await client.query(`
      INSERT INTO inventory_batches (
        property_id, inventory_item_id, batch_number, manufactured_at,
        expires_at, quantity, unit_cost, supplier_id
      )
      VALUES 
        ('${propId}', '${invItemRes.rows[0].id}', 'BATCH-2026-SB-01', now() - INTERVAL '2 days', now() + INTERVAL '5 days', 28.50, 32.00, '${supFish}'),
        ('${propId}', '${invItemRes.rows[1].id}', 'BATCH-2026-WG-01', now() - INTERVAL '4 days', now() + INTERVAL '12 days', 22.00, 54.00, '${supMeat}'),
        ('${propId}', '${invItemRes.rows[2].id}', 'BATCH-2026-TL-01', now() - INTERVAL '30 days', NULL, 160.00, 18.50, '${supLinen}')
      ON CONFLICT DO NOTHING;
    `);

    console.log(`   ✓ 3 Suppliers, 3 Storage Locations, 4 Inventory SKUs & Stock Batches active`);

    // 15. STAFF, ATTENDANCE & SHIFTS (PHASE 18)
    console.log('15. Seeding Staff Departments, Team Members & Attendance Records...');
    const deptRes = await client.query(`
      INSERT INTO staff_departments (property_id, name, department_code, description, is_active)
      VALUES 
        ('${propId}', 'Executive Hotel Management', 'EXEC', 'General Manager and Operations Directors', true),
        ('${propId}', 'Front Office & Guest Services', 'FRONT', 'Front desk agents, concierge, and bell captains', true),
        ('${propId}', 'Food & Beverage Operations', 'F&B', 'Executive chef, kitchen team, and dining staff', true),
        ('${propId}', 'Housekeeping & Environmental', 'HK', 'Housekeeping supervisors and room attendants', true),
        ('${propId}', 'Engineering & Facilities', 'ENG', 'Chief engineer and maintenance technicians', true)
      ON CONFLICT (property_id, name) DO UPDATE SET description = EXCLUDED.description
      RETURNING id, department_code, name;
    `);
    const deptExec = deptRes.rows[0].id;
    const deptFront = deptRes.rows[1].id;
    const deptFB = deptRes.rows[2].id;
    const deptHK = deptRes.rows[3].id;
    const deptEng = deptRes.rows[4].id;

    // Staff Members
    const staffRes = await client.query(`
      INSERT INTO staff_members (
        property_id, employee_code, first_name, last_name, display_name,
        department_id, designation, employment_type, employment_status, joining_date,
        phone, email, is_active
      )
      VALUES 
        ('${propId}', 'EMP-001', 'Sarah', 'Jenkins', 'Sarah Jenkins (GM)', '${deptExec}', 'General Manager', 'FULL_TIME', 'ACTIVE', '2023-01-15', '+91-832-555-0111', 'sarah.jenkins@grandazure.com', true),
        ('${propId}', 'EMP-002', 'Liam', 'Vance', 'Liam Vance (Front Desk Sup)', '${deptFront}', 'Front Desk Supervisor', 'FULL_TIME', 'ACTIVE', '2024-03-01', '+91-832-555-0112', 'liam.vance@grandazure.com', true),
        ('${propId}', 'EMP-003', 'Marco', 'Rossi', 'Marco Rossi (Executive Chef)', '${deptFB}', 'Executive Chef', 'FULL_TIME', 'ACTIVE', '2023-06-10', '+91-832-555-0113', 'chef.marco@grandazure.com', true),
        ('${propId}', 'EMP-004', 'Maria', 'Santos', 'Maria Santos (Head HK)', '${deptHK}', 'Head Housekeeper', 'FULL_TIME', 'ACTIVE', '2023-08-20', '+91-832-555-0114', 'maria.santos@grandazure.com', true),
        ('${propId}', 'EMP-005', 'Robert', 'Taylor', 'Robert Taylor (Chief Eng)', '${deptEng}', 'Chief Engineer', 'FULL_TIME', 'ACTIVE', '2023-04-12', '+91-832-555-0115', 'robert.taylor@grandazure.com', true)
      ON CONFLICT (property_id, employee_code) DO UPDATE SET designation = EXCLUDED.designation
      RETURNING id, employee_code, first_name, last_name;
    `);

    // Today Attendance
    for (const staff of staffRes.rows) {
      await client.query(`
        INSERT INTO staff_attendance (
          property_id, staff_id, attendance_date, check_in_at, status, source
        )
        VALUES ('${propId}', '${staff.id}', CURRENT_DATE, now() - INTERVAL '7 hours', 'PRESENT', 'BIOMETRIC')
        ON CONFLICT (property_id, staff_id, attendance_date) DO NOTHING;
      `);
    }
    console.log(`   ✓ 5 Hotel Departments, 5 Staff Leaders & Today Attendance active`);

    // 16. PROPERTY INTEGRATIONS & ONLINE BOOKING ENGINE (PHASE 21)
    console.log('16. Seeding Integrations & Online Public Booking Engine...');
    await client.query(`
      INSERT INTO property_integrations (property_id, provider_id, provider_type, name, is_enabled, is_configured, config)
      VALUES 
        ('${propId}', 'stripe_payments', 'PAYMENT_GATEWAY', 'Stripe Global Card Payments', true, true, '{"mode": "live", "currency": "USD", "webhook_configured": true}'::jsonb),
        ('${propId}', 'resend_email', 'TRANSACTIONAL_EMAIL', 'Resend High-Deliverability Email Service', true, true, '{"from": "stay@grandazureresort.com", "active": true}'::jsonb)
      ON CONFLICT (property_id, provider_id) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
    `);

    await client.query(`
      INSERT INTO property_online_booking_settings (
        property_id, is_enabled, booking_slug, public_hotel_name,
        public_description, public_phone, public_email, public_address,
        amenities, booking_terms, cancellation_policy, max_booking_window_days, min_lead_time_hours
      )
      VALUES (
        '${propId}', true, 'grand-azure-resort', 'Grand Azure Luxury Resort & Spa',
        'Immerse yourself in world-class 5-star beachfront hospitality, signature gourmet dining, and sublime holistic spa rituals.',
        '+91-832-555-0100', 'reservations@grandazureresort.com', '100 Oceanfront Blvd, Marina Bay, Goa, India',
        ARRAY['Infinity Ocean Pool', 'Azure Mediterranean Bistro', 'Holistic Wellness Spa', 'High-Speed Fiber WiFi', 'Private Beach Access', '24/7 Concierge & Valet'],
        'Check-in is at 2:00 PM. Check-out is at 11:00 AM. Government photo identification is required at check-in.',
        'Free cancellation up to 48 hours before scheduled check-in date. Cancellations within 48 hours are subject to a 1-night room charge.',
        365, 2
      )
      ON CONFLICT (property_id) DO UPDATE 
      SET is_enabled = EXCLUDED.is_enabled, booking_slug = EXCLUDED.booking_slug, public_hotel_name = EXCLUDED.public_hotel_name;
    `);

    // 17. LINK REGISTERED DEVELOPER / ADMIN USERS TO GRAND AZURE & URBAN AZURE
    console.log('17. Linking Registered Users to Hotel Properties...');
    const roleRes = await client.query("SELECT id FROM public.roles WHERE code = 'HOTEL_OWNER' OR code = 'SUPER_ADMIN' ORDER BY code DESC LIMIT 1");
    if (roleRes.rows[0]) {
      const ownerRoleId = roleRes.rows[0].id;
      const usersRes = await client.query(`
        SELECT id, email, raw_user_meta_data 
        FROM auth.users 
        WHERE email NOT LIKE '%@stayhub.test' 
          AND email NOT LIKE '%@prop-%.com' 
          AND email NOT LIKE '%@external.com'
          AND email NOT LIKE 'test-%@stayhub.com'
      `);
      for (const u of usersRes.rows) {
        const fullName = u.raw_user_meta_data?.full_name || u.email.split("@")[0];
        await client.query(`
          INSERT INTO public.profiles (auth_user_id, full_name, email, status)
          VALUES ('${u.id}', '${fullName.replace(/'/g, "''")}', '${u.email}', 'active')
          ON CONFLICT (auth_user_id) DO UPDATE SET full_name = EXCLUDED.full_name;
        `);

        await client.query(`
          INSERT INTO public.property_memberships (property_id, user_id, role_id, status)
          VALUES ('${propId}', '${u.id}', '${ownerRoleId}', 'active')
          ON CONFLICT (property_id, user_id, role_id) DO UPDATE SET status = 'active';
        `);

        if (prop2Id && prop2Id !== propId) {
          await client.query(`
            INSERT INTO public.property_memberships (property_id, user_id, role_id, status)
            VALUES ('${prop2Id}', '${u.id}', '${ownerRoleId}', 'active')
            ON CONFLICT (property_id, user_id, role_id) DO UPDATE SET status = 'active';
          `);
        }
        console.log(`   ✓ Linked active developer user ${u.email} to properties`);
      }
    }

    await client.query('COMMIT');

    console.log('\n===========================================================');
    console.log('🎉 ENTERPRISE DEMO DATA SEEDED SUCCESSFULLY!');
    console.log('===========================================================');
    console.log(`Hotel Property:       Grand Azure Luxury Resort & Spa (ID: ${propId})`);
    console.log(`Booking Slug:         /book/grand-azure-resort`);
    console.log(`In-House Guests:      Alexander Wright (101), Sophia Chen (103), Marcus Vanderbilt (401)`);
    console.log(`Upcoming Arrivals:    Elena Rostova (203 - Tomorrow), Priya Sharma (304 - Next Week)`);
    console.log(`Restaurant Outlets:   The Azure Bistro & Grill (Open Orders on Table T-01 & Room 401)`);
    console.log(`Active Folios:        Open Folios with charges & payments for Alexander & Marcus`);
    console.log(`Staff Team:           GM, Front Desk Sup, Exec Chef, Head HK, Chief Engineer`);
    console.log('===========================================================\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ SEEDING FAILED - Transaction Rolled Back:');
    console.error(err.message);
    console.error(err.stack);
  } finally {
    await client.end();
  }
}

seed();
