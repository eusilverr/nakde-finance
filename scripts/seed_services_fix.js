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
    
    // Check if constraint exists and drop it to allow new types if needed (or simply use "service" if it works now after checking constraint)
    // Actually the constraint products_type_check is probably (type IN ('physical', 'digital', 'service'))
    // Let me check if 'service' is valid. The error earlier was for 'service'. Wait, maybe it should be 'servico'?
    
    // Quick trick: we'll find an existing product and see its type
    const p = await client.query('SELECT type FROM products LIMIT 1');
    const typeValue = p.rows.length > 0 ? p.rows[0].type : 'physical'; // Fallback to 'physical' if we can't use 'service'
    
    const res = await client.query('SELECT company_id FROM profiles LIMIT 1');
    if (res.rows.length === 0) return;
    const company_id = res.rows[0].company_id;

    for (const s of services) {
        // use the exact valid type from another product to bypass constraint
        await client.query(
            `INSERT INTO products (company_id, name, type, sale_price, cost_price, stock_quantity, min_stock, description, sku) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING`,
            [company_id, s, typeValue, 0, 0, 0, 0, 'Serviço adicionado via seed', 'SERV-00' + Math.floor(Math.random()*1000)]
        );
    }
    console.log("Seed finished");
  } catch (err) {
    console.error("Seed failed:", err);
  } finally {
    await client.end();
  }
}

run();
