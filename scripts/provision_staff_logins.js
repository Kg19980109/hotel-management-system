const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tfnusdxtwqzrzblujaju.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmbnVzZHh0d3F6cnpibHVqYWp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDMxOTcyOSwiZXhwIjoyMTA1ODk1NzI5fQ.LNlM959Ngzs3ygKhmHcAXylftYQYxDHBiD9C77MsxzQ';
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.tfnusdxtwqzrzblujaju:Koushik%400109@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';

const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected to Postgres.');

  // Fetch all staff members
  const staffRes = await client.query(`
    SELECT sm.id, sm.property_id, sm.first_name, sm.last_name, sm.email, sm.department_id, sm.profile_id,
           sd.department_code
    FROM public.staff_members sm
    LEFT JOIN public.staff_departments sd ON sd.id = sm.department_id
    WHERE sm.email IS NOT NULL AND sm.is_active = true
  `);

  console.log(`Found ${staffRes.rows.length} active staff members with emails.`);

  // Get roles map
  const rolesRes = await client.query('SELECT id, code FROM public.roles');
  const roleMap = new Map();
  for (const r of rolesRes.rows) {
    roleMap.set(r.code, r.id);
  }

  for (const staff of staffRes.rows) {
    const email = staff.email.trim();
    const fullName = `${staff.first_name.trim()} ${staff.last_name.trim()}`;
    console.log(`Processing staff: ${fullName} (${email})...`);

    // 1. Check/create auth user
    const { data: uList } = await adminSupabase.auth.admin.listUsers();
    let authUser = uList?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

    if (!authUser) {
      console.log(`  Creating auth user for ${email}...`);
      const { data: newU, error: uErr } = await adminSupabase.auth.admin.createUser({
        email,
        password: 'StayHub@2026',
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (uErr) {
        console.error(`  Error creating auth user:`, uErr);
        continue;
      }
      authUser = newU.user;
    } else {
      // Ensure password is StayHub@2026 and confirmed
      await adminSupabase.auth.admin.updateUserById(authUser.id, {
        password: 'StayHub@2026',
        email_confirm: true,
      });
    }

    if (!authUser) continue;

    // 2. Ensure profile in public.profiles
    let profRes = await client.query('SELECT id FROM public.profiles WHERE auth_user_id = $1 OR email = $2', [authUser.id, email]);
    let profileId;
    if (profRes.rows.length === 0) {
      console.log(`  Creating profile for ${email}...`);
      const insP = await client.query(
        'INSERT INTO public.profiles (auth_user_id, full_name, email, status) VALUES ($1, $2, $3, $4) RETURNING id',
        [authUser.id, fullName, email, 'active']
      );
      profileId = insP.rows[0].id;
    } else {
      profileId = profRes.rows[0].id;
      await client.query('UPDATE public.profiles SET auth_user_id = $1, full_name = $2 WHERE id = $3', [authUser.id, fullName, profileId]);
    }

    // 3. Link staff_members.profile_id
    await client.query('UPDATE public.staff_members SET profile_id = $1 WHERE id = $2', [profileId, staff.id]);

    // 4. Determine role
    let roleCode = 'HOUSEKEEPING';
    const dept = (staff.department_code || '').toUpperCase();
    if (dept.includes('FRONT') || dept.includes('FD')) roleCode = 'FRONT_DESK';
    else if (dept.includes('MAINT') || dept.includes('ENG')) roleCode = 'MAINTENANCE';
    else if (dept.includes('KITCHEN') || dept.includes('CHEF')) roleCode = 'KITCHEN_STAFF';
    else if (dept.includes('REST') || dept.includes('F&B')) roleCode = 'RESTAURANT_STAFF';
    else if (dept.includes('MGMT') || dept.includes('EXEC')) roleCode = 'GENERAL_MANAGER';
    else if (dept.includes('HK') || dept.includes('HOUSE')) roleCode = 'HOUSEKEEPING';

    const roleId = roleMap.get(roleCode) || roleMap.get('HOUSEKEEPING') || rolesRes.rows[0].id;

    // 5. Ensure property membership
    const memRes = await client.query(
      'SELECT id FROM public.property_memberships WHERE property_id = $1 AND user_id = $2',
      [staff.property_id, authUser.id]
    );

    if (memRes.rows.length === 0) {
      await client.query(
        'INSERT INTO public.property_memberships (property_id, user_id, role_id, status) VALUES ($1, $2, $3, $4)',
        [staff.property_id, authUser.id, roleId, 'active']
      );
    } else {
      await client.query(
        'UPDATE public.property_memberships SET role_id = $1, status = $2 WHERE id = $3',
        [roleId, 'active', memRes.rows[0].id]
      );
    }

    console.log(`  ✓ Successfully provisioned ${fullName} (Role: ${roleCode})`);
  }

  console.log('All staff logins provisioned successfully!');
  await client.end();
}

main().catch(console.error);
