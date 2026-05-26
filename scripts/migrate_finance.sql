-- Add description column to financial_transactions if missing
ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

-- Update status constraint to accept all app values
ALTER TABLE public.financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_status_check;
ALTER TABLE public.financial_transactions ADD CONSTRAINT financial_transactions_status_check
  CHECK (status IN ('pending', 'paid', 'completed', 'cancelled', 'overdue'));

-- Set default and not null for status
ALTER TABLE public.financial_transactions ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.financial_transactions ALTER COLUMN status SET NOT NULL;

-- Add RLS policies for financial_transactions if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'financial_transactions' AND policyname = 'Users can view financial_transactions from their own company') THEN
        CREATE POLICY "Users can view financial_transactions from their own company"
            ON public.financial_transactions FOR SELECT
            USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

        CREATE POLICY "Users can insert financial_transactions from their own company"
            ON public.financial_transactions FOR INSERT
            WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

        CREATE POLICY "Users can update financial_transactions from their own company"
            ON public.financial_transactions FOR UPDATE
            USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

        CREATE POLICY "Users can delete financial_transactions from their own company"
            ON public.financial_transactions FOR DELETE
            USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS financial_transactions_company_id_idx ON public.financial_transactions (company_id);
