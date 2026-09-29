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
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('Testing login for koushikghosh6088@gmail.com with password StayHub@2026...');
  const supabase = createClient(supabaseUrl, anonKey);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'koushikghosh6088@gmail.com',
    password: 'StayHub@2026',
  });

  if (error) {
    console.error('Login failed:', error);
    process.exit(1);
  }

  console.log('✓ Login SUCCESSFUL!');
  console.log('User ID:', data.user.id);
  console.log('Email:', data.user.email);

  // Check profile and property membership
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', data.user.id)
    .single();

  console.log('Profile:', profile ? `${profile.full_name} (${profile.email})` : 'None');

  const { data: membership } = await supabase
    .from('property_memberships')
    .select('*, role:roles(code, name), property:properties(name)')
    .eq('user_id', data.user.id)
    .maybeSingle();

  console.log('Membership:', membership ? `${membership.property?.name} -> Role: ${membership.role?.name} (${membership.role?.code})` : 'None');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
