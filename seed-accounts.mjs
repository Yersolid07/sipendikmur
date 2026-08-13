// seed-accounts.mjs
// Run with: node seed-accounts.mjs
// Creates initial accounts in Supabase

const SUPABASE_URL = 'https://rmxockjudzqpffrftzdd.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJteG9ja2p1ZHpxcGZmcmZ0emRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjYyOTAzMiwiZXhwIjoyMTAyMjA1MDMyfQ.4pzj4EFcSjdCv8UDkYwNVbxqoGJZd42Zaof3d4qfP8Y'

const accounts = [
  { nama: 'Super Admin GMIM',      email: 'superadmin@gmim.id',        password: 'SuperAdmin2026!',  role: 'superadmin' },
  { nama: 'Salem J. Turangan',     email: 'jeremiaturangan@gmail.com',  password: 'Yersolid07_!',     role: 'ip'         },
  { nama: 'Wenny Imon',            email: 'Imonwenny@gmail.com',        password: 'BUMOTIK 2026*',    role: 'juri'       },
  { nama: 'Juri 2',               email: 'juri2@gmim.id',              password: 'Juri2026!',        role: 'juri'       },
  { nama: 'Juri 3',               email: 'juri3@gmim.id',              password: 'Juri2026!',        role: 'juri'       },
  { nama: 'Operator Sesi',        email: 'opsesi@gmim.id',             password: 'OpSesi2026!',      role: 'op_sesi'    },
  { nama: 'Operator Registrasi',  email: 'opregis@gmim.id',            password: 'OpRegis2026!',     role: 'op_regis'   },
]

async function createUser(account) {
  // 1. Create auth user
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { nama: account.nama, role: account.role }
    })
  })
  
  const authData = await authRes.json()
  if (!authRes.ok) {
    console.error(`  ❌ Auth error for ${account.email}:`, authData.message || authData.error)
    return null
  }

  const userId = authData.id
  console.log(`  ✅ Auth user created: ${account.email} (${userId})`)

  // 2. Upsert profile
  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify({
      id: userId,
      nama: account.nama,
      email: account.email,
      role: account.role,
      is_active: true
    })
  })

  if (!profileRes.ok) {
    const profileErr = await profileRes.json()
    console.error(`  ❌ Profile error for ${account.email}:`, profileErr)
    return null
  }

  console.log(`  ✅ Profile created: ${account.nama} (${account.role})`)
  return userId
}

async function main() {
  console.log('🚀 Starting GMIM account seeding...\n')
  
  for (const account of accounts) {
    console.log(`\n📋 Creating: ${account.nama} [${account.role}]`)
    await createUser(account)
  }

  console.log('\n\n============================================')
  console.log('✅ SEED COMPLETE! Credential summary:')
  console.log('============================================')
  for (const a of accounts) {
    console.log(`\n[${a.role.toUpperCase()}]`)
    console.log(`  Email   : ${a.email}`)
    console.log(`  Password: ${a.password}`)
  }
  console.log('\n============================================')
}

main().catch(console.error)
