const { Client } = require('pg');

const url = 'postgresql://postgres.ubjlllrrhdmtesxydziv:pAcJsjUhQK1gON2g@aws-1-sa-east-1.pooler.supabase.com:5432/postgres';

const sql = `
ALTER TABLE public.service_orders 
ADD COLUMN IF NOT EXISTS is_subscription BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS billing_cycle TEXT,
ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP WITH TIME ZONE;
`;

async function run() {
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    await client.query(sql);
    console.log("Subscriptions Migration executed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

run();
