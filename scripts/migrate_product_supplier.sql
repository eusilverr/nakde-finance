-- Adiciona coluna supplier_id (FK -> clients) para vincular produto a um fornecedor
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.clients(id);

-- Atualiza o CHECK constraint de type para aceitar 'service' (já usado no frontend)
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_type_check;
ALTER TABLE public.products ADD CONSTRAINT products_type_check CHECK (type IN ('physical', 'digital', 'service'));

-- Cria índice para buscas por fornecedor
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON public.products(supplier_id);

-- Adiciona coluna updated_at para rastrear última atualização
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Adiciona ON DELETE CASCADE em order_items para permitir exclusão de produtos vinculados
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
