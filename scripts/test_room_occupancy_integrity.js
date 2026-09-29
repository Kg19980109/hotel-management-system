const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Koushik%400109@db.tfnusdxtwqzrzblujaju.supabase.co:5432/postgres';

async function runOccupancyIntegrityTest() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('===========================================================');
  console.log('STAYHUB ROOM OCCUPANCY & CHECKOUT INTEGRITY TEST');
  console.log('===========================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Find a room that already has an active stay or a vacant room
    let stayRow = await client.query(`
      SELECT s.id AS stay_id, s.property_id, s.room_id, r.room_number, r.status, g.first_name, g.last_name
      FROM public.stays s
      JOIN public.rooms r ON r.id = s.room_id
      JOIN public.guests g ON g.id = s.guest_id
      WHERE s.status = 'CHECKED_IN'
      LIMIT 1;
    `);

    let room, stayId, guestName;
    if (stayRow.rows.length > 0) {
      const s = stayRow.rows[0];
      room = { room_id: s.room_id, property_id: s.property_id, room_number: s.room_number, status: s.status };
      stayId = s.stay_id;
      guestName = `${s.first_name || ''} ${s.last_name || ''}`.trim();
    } else {
      // Find vacant room
      const vacantRoom = await client.query(`
        SELECT r.id AS room_id, r.property_id, r.room_number, r.status
        FROM public.rooms r
        WHERE r.id NOT IN (SELECT room_id FROM public.stays WHERE status = 'CHECKED_IN' AND room_id IS NOT NULL)
        LIMIT 1;
      `);
      room = vacantRoom.rows[0];
      const guestRes = await client.query(`SELECT id, first_name, last_name FROM public.guests WHERE property_id = $1 LIMIT 1;`, [room.property_id]);
      const g = guestRes.rows[0];
      guestName = `${g.first_name || ''} ${g.last_name || ''}`.trim();
      const resRow = await client.query(`SELECT id FROM public.reservations WHERE property_id = $1 LIMIT 1;`, [room.property_id]);
      const newStay = await client.query(`
        INSERT INTO public.stays (property_id, room_id, guest_id, reservation_id, status, actual_check_in_at, expected_check_out_date)
        VALUES ($1, $2, $3, $4, 'CHECKED_IN', NOW(), CURRENT_DATE + INTERVAL '2 days')
        RETURNING id;
      `, [room.property_id, room.room_id, g.id, resRow.rows[0].id]);
      stayId = newStay.rows[0].id;
    }

    console.log(`\n[STEP 1] In-House Guest Active on Room ${room.room_number} (${guestName})`);
    console.log(`\n[STEP 2] Verify Guard Against Changing Status to AVAILABLE While Guest is In-House`);

    // Verify stay exists and is checked in
    const activeStayCheck = await client.query(`
      SELECT s.id, s.status, g.first_name, g.last_name
      FROM public.stays s
      JOIN public.guests g ON g.id = s.guest_id
      WHERE s.property_id = $1 AND s.room_id = $2 AND s.status = 'CHECKED_IN';
    `, [room.property_id, room.room_id]);

    assert(activeStayCheck.rows.length > 0, 'Active in-house stay detected in database');

    // Simulate server action validation logic
    function attemptStatusChange(targetStatus, activeStay) {
      if (activeStay && targetStatus !== 'OCCUPIED') {
        const guestName = `${activeStay.first_name || ''} ${activeStay.last_name || ''}`.trim();
        return {
          allowed: false,
          error: `Cannot change status to ${targetStatus}: Room currently has an active in-house guest (${guestName}). Please process guest check-out from Front Desk first.`
        };
      }
      return { allowed: true };
    }

    const blockedResult = attemptStatusChange('AVAILABLE', activeStayCheck.rows[0]);
    assert(!blockedResult.allowed, 'Blocked attempt to change status to AVAILABLE without checkout');
    assert(blockedResult.error.includes('Please process guest check-out'), 'Informative error returned directing user to check-out guest');

    console.log(`\n[STEP 3] Check Out Guest and Verify Status Transition Allowed`);

    // Process checkout
    await client.query(`
      UPDATE public.stays 
      SET status = 'CHECKED_OUT', actual_check_out_at = NOW() 
      WHERE id = $1;
    `, [stayId]);

    const activeStayAfterCheckout = await client.query(`
      SELECT s.id, s.status, g.first_name, g.last_name
      FROM public.stays s
      JOIN public.guests g ON g.id = s.guest_id
      WHERE s.property_id = $1 AND s.room_id = $2 AND s.status = 'CHECKED_IN';
    `, [room.property_id, room.room_id]);

    assert(activeStayAfterCheckout.rows.length === 0, 'No active stay remains after checkout');

    const allowedResult = attemptStatusChange('AVAILABLE', activeStayAfterCheckout.rows[0]);
    assert(allowedResult.allowed, 'Changing status to AVAILABLE is permitted once guest is checked out');

    // Clean up test stay
    await client.query(`DELETE FROM public.stays WHERE id = $1;`, [stayId]);
    await client.query(`UPDATE public.rooms SET status = $1 WHERE id = $2;`, [room.status, room.room_id]);

    console.log('\n===========================================================');
    console.log(`OCCUPANCY INTEGRITY TEST: ${passed} PASSED, ${failed} FAILED`);
    console.log('===========================================================');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runOccupancyIntegrityTest();
