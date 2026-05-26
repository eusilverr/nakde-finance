const { Client } = require('pg');

const url = 'postgresql://postgres.ubjlllrrhdmtesxydziv:pAcJsjUhQK1gON2g@aws-1-sa-east-1.pooler.supabase.com:5432/postgres';

const services = [
  '📊 Tráfego Pago',
  '💼 CRM Multiatendimento',
  '💻 Sistemas',
  '📱 Apps'
];

async function run() {
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    
    // Get the first company_id (assuming only one user for now or they just want it added)
    const res = await client.query('SELECT company_id FROM profiles LIMIT 1');
    if (res.rows.length === 0) {
        console.log("No profile found to attach products");
        return;
    }
    const company_id = res.rows[0].company_id;

    // Check existing
    const existing = await client.query('SELECT name FROM products WHERE type = $1 AND company_id = $2', ['service', company_id]);
    const existingNames = existing.rows.map(r => r.name);

    for (const s of services) {
        if (!existingNames.includes(s)) {
            await client.query(
                `INSERT INTO products (company_id, name, type, sale_price, cost_price, stock_quantity, min_stock, description, sku) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [company_id, s, 'service', 0, 0, 0, 0, 'Serviço adicionado via seed', 'SERV-00' + Math.floor(Math.random()*1000)]
            );
            console.log(`Inserted: ${s}`);
        }
    }

    console.log("Seed finished");
  } catch (err) {
    console.error("Seed failed:", err);
  } finally {
    await client.end();
  }
}

run();
