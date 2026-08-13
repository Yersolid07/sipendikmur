const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Yersolid07_!@db.rmxockjudzqpffrftzdd.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();
  console.log('Connected to DB. Applying RLS fix...');
  try {
    await client.query(`
      DROP POLICY IF EXISTS "Superadmin and IP can view all profiles" ON public.profiles;
      DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
      CREATE POLICY "All authenticated can view profiles" ON public.profiles FOR SELECT USING (auth.uid() IS NOT NULL);
    `);
    console.log('Successfully applied RLS fix!');
  } catch(e) {
    console.error('Error applying fix:', e);
  } finally {
    await client.end();
  }
}

run();
