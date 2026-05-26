-- Extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =======================================================
-- NAKDE FINANCE - SAAS MULTI-TENANT SCHEMA
-- =======================================================

-- 1. EMPRESAS (LOCATÁRIOS / TENANTS)
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    document TEXT UNIQUE, -- CNPJ ou equivalente
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. USUÁRIOS E PERMISSÕES (Baseado no Auth do Supabase)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'financeiro', 'operacao', 'vendas')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitando RLS para isolamento Multi-Tenant em Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see profiles from their own company" 
ON public.profiles FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- 3. CLIENTES (CRM)
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    document TEXT, -- CPF/CNPJ
    status TEXT CHECK (status IN ('prospect', 'active', 'inactive')) DEFAULT 'prospect',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clients from their own company"
ON public.clients FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can insert clients from their own company"
ON public.clients FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can update clients from their own company"
ON public.clients FOR UPDATE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can delete clients from their own company"
ON public.clients FOR DELETE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- 4. PRODUTOS E ESTOQUE
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    type TEXT CHECK (type IN ('physical', 'digital')) NOT NULL,
    cost_price DECIMAL(10, 2) NOT NULL,
    sale_price DECIMAL(10, 2) NOT NULL,
    stock_quantity INT DEFAULT 0,
    min_stock INT DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, sku) -- SKU deve ser único por empresa
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view products from their own company"
ON public.products FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can insert products from their own company"
ON public.products FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can delete products from their own company"
ON public.products FOR DELETE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can update products from their own company"
ON public.products FOR UPDATE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- 5. CONTRATOS DE SERVIÇOS (Operação)
CREATE TABLE public.service_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    service_type TEXT CHECK (service_type IN ('marketing', 'dev', 'automation', 'consulting')),
    status TEXT CHECK (status IN ('backlog', 'in_progress', 'review', 'completed')),
    responsible_id UUID REFERENCES public.profiles(id),
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    checklists JSONB DEFAULT '[]'::jsonb,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.service_contracts ENABLE ROW LEVEL SECURITY;

-- 6. VENDAS / PEDIDOS (Sales)
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id),
    sale_number TEXT NOT NULL,
    sale_type TEXT CHECK (sale_type IN ('product', 'service', 'both')) NOT NULL DEFAULT 'product',
    status TEXT CHECK (status IN ('pending', 'approved', 'invoiced', 'completed', 'canceled')) NOT NULL DEFAULT 'pending',
    payment_method TEXT CHECK (payment_method IN ('pix', 'boleto', 'credit_card', 'transfer')),
    installments INT DEFAULT 1,
    due_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    responsible TEXT NOT NULL DEFAULT '',
    total_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    item_type TEXT CHECK (item_type IN ('product', 'service')) NOT NULL DEFAULT 'product',
    item_name TEXT NOT NULL DEFAULT '',
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0,
    subtotal DECIMAL(10, 2) NOT NULL
);

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

-- 7. FINANCEIRO (Fluxo de Caixa / DRE)
CREATE TABLE public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
    category TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT DEFAULT '',
    due_date DATE NOT NULL,
    payment_date DATE,
    status TEXT CHECK (status IN ('pending', 'paid', 'completed', 'cancelled', 'overdue')) NOT NULL DEFAULT 'pending',
    payment_method TEXT CHECK (payment_method IN ('pix', 'boleto', 'credit_card', 'transfer')),
    client_id UUID REFERENCES public.clients(id),
    reference_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

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

-- 8. TIMELINE DE EVENTOS (Rastreabilidade CRM)
CREATE TABLE public.client_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, 
    description TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.client_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view client_events from their own company"
ON public.client_events FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can insert client_events from their own company"
ON public.client_events FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- Nota: Como será hospedado na Vercel e o banco no Supabase, 
-- certifique-se de configurar a connection pooler (Supavisor) 
-- no dashboard do Supabase para garantir a escalabilidade Serverless.
