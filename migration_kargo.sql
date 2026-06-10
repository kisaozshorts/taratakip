-- =========================================================================
-- TARANUTLA SATIŞ VE BAYİLİK TAKİP SİSTEMİ - KARGO FİRMASI YÖNETİMİ MİGRASYONU
-- =========================================================================

-- 1. Kullanılabilir Kargo Firmaları (shipping_companies) tablosunu oluşturma
CREATE TABLE IF NOT EXISTS public.shipping_companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS Etkinleştirme
ALTER TABLE public.shipping_companies ENABLE ROW LEVEL SECURITY;

-- 2. RLS Politikaları
-- Giriş yapmış tüm kullanıcılar kargo firmalarını listeleyebilir (Kargocu seçerken, bayi/admin görüntülerken)
CREATE POLICY "shipping_companies_select_policy" ON public.shipping_companies
    FOR SELECT TO authenticated USING (true);

-- Sadece yöneticiler (Admin) kargo firması ekleyebilir/silebilir
CREATE POLICY "shipping_companies_admin_all_policy" ON public.shipping_companies
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 3. Siparişler tablosuna kargo firması ilişkisi ekleme
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_company_id UUID REFERENCES public.shipping_companies(id) ON DELETE SET NULL;

-- Varsayılan birkaç kargo firması ekleyelim
INSERT INTO public.shipping_companies (name) VALUES 
('Yurtiçi Kargo'),
('MNG Kargo'),
('Aras Kargo'),
('Sürat Kargo'),
('PTT Kargo')
ON CONFLICT (name) DO NOTHING;
