const { Client } = require('pg');

const url = 'postgresql://postgres.ubjlllrrhdmtesxydziv:pAcJsjUhQK1gON2g@aws-1-sa-east-1.pooler.supabase.com:5432/postgres';

const sql = `
CREATE TABLE IF NOT EXISTS public.service_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pendente',
    value NUMERIC(10, 2) NOT NULL DEFAULT 0,
    cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
    due_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'service_orders' AND policyname = 'Users can view service_orders from their own company'
    ) THEN
        CREATE POLICY "Users can view service_orders from their own company"
            ON public.service_orders
            FOR SELECT
            USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
            
        CREATE POLICY "Users can insert service_orders from their own company"
            ON public.service_orders
            FOR INSERT
            WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

        CREATE POLICY "Users can update service_orders from their own company"
            ON public.service_orders
            FOR UPDATE
            USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

        CREATE POLICY "Users can delete service_orders from their own company"
            ON public.service_orders
            FOR DELETE
            USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS service_orders_company_id_idx ON public.service_orders (company_id);
CREATE INDEX IF NOT EXISTS service_orders_client_id_idx ON public.service_orders (client_id);
`;

async function run() {
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    await client.query(sql);
    console.log("Migration executed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

run();
