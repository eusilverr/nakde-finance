-- Add missing columns to orders table for Sales feature
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS sale_number TEXT,
  ADD COLUMN IF NOT EXISTS sale_type TEXT CHECK (sale_type IN ('product', 'service', 'both')) DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('pix', 'boleto', 'credit_card', 'transfer')),
  ADD COLUMN IF NOT EXISTS installments INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS responsible TEXT NOT NULL DEFAULT '';

-- Update status constraint to include more values
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending', 'approved', 'invoiced', 'completed', 'canceled'));

-- Update default for status
ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.orders ALTER COLUMN status SET NOT NULL;

-- Add columns to order_items table
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS item_type TEXT CHECK (item_type IN ('product', 'service')) DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS item_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS discount DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- Enable RLS on order_items if not already
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for orders if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can view orders from their own company') THEN
        CREATE POLICY "Users can view orders from their own company"
            ON public.orders FOR SELECT
            USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

        CREATE POLICY "Users can insert orders from their own company"
            ON public.orders FOR INSERT
            WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

        CREATE POLICY "Users can update orders from their own company"
            ON public.orders FOR UPDATE
            USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

        CREATE POLICY "Users can delete orders from their own company"
            ON public.orders FOR DELETE
            USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Users can view order_items from their own company') THEN
        CREATE POLICY "Users can view order_items"
            ON public.order_items FOR SELECT
            USING (order_id IN (SELECT id FROM public.orders WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())));

        CREATE POLICY "Users can insert order_items"
            ON public.order_items FOR INSERT
            WITH CHECK (order_id IN (SELECT id FROM public.orders WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())));

        CREATE POLICY "Users can update order_items"
            ON public.order_items FOR UPDATE
            USING (order_id IN (SELECT id FROM public.orders WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())));

        CREATE POLICY "Users can delete order_items"
            ON public.order_items FOR DELETE
            USING (order_id IN (SELECT id FROM public.orders WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())));
    END IF;
END
$$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS orders_company_id_idx ON public.orders (company_id);
CREATE INDEX IF NOT EXISTS orders_client_id_idx ON public.orders (client_id);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items (order_id);
