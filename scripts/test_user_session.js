const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function getEnv() {
  const envPath = path.resolve(__dirname, '../.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      env[key] = val;
    }
  }
  return env;
}

async function main() {
  const env = getEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  const { data: authData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: 'koushikghosh6088@gmail.com',
    password: 'StayHub@2026',
  });

  if (loginErr) {
    console.error('Login error:', loginErr);
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log('Logged in as user:', userId, authData.user.email);

  const memberRes = await supabase
    .from("property_memberships")
    .select(`
      id,
      property_id,
      status,
      properties:property_id (
        id,
        name,
        slug
      ),
      roles:role_id (
        code,
        name
      )
    `)
    .eq("user_id", userId)
    .eq("status", "active");

  console.log('Member query result:', JSON.stringify(memberRes, null, 2));

  // Also check RPC
  const permRes = await supabase.rpc("get_user_effective_permissions", {
    p_property_id: memberRes.data?.[0]?.property_id
  });
  console.log('Permissions count:', permRes.data?.length, permRes.error);
}

main().catch(console.error);
