const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const url = 'postgresql://postgres.ubjlllrrhdmtesxydziv:pAcJsjUhQK1gON2g@aws-1-sa-east-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: url });
  try {
    await client.connect();

    const sqlPath = path.join(__dirname, 'migrate_sales_cost.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    await client.query(sql);
    console.log("Sales cost migration executed successfully!");
  } catch (err) {
    console.error("Sales cost migration failed:", err);
  } finally {
    await client.end();
  }
}

run();
