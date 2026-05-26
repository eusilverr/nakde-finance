-- Adiciona a coluna cost_price na tabela order_items
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00;
