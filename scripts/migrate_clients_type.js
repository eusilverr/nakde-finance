const { Client } = require('pg');

// URL da connection string do projeto (puxada do migrate.js)
const url = 'postgresql://postgres.ubjlllrrhdmtesxydziv:pAcJsjUhQK1gON2g@aws-1-sa-east-1.pooler.supabase.com:5432/postgres';

const sql = `
-- Adicionar coluna type se não existir
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'cliente';

-- Adicionar colunas extras que serão usadas no novo layout
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS city_state TEXT;
`;

async function run() {
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    await client.query(sql);
    console.log("Migration for clients type and fields executed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

run();
