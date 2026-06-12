-- =========================================================================
-- TARANUTLA SATIŞ VE BAYİLİK TAKİP SİSTEMİ - MİGRASYON V2 (İNDİRİMLER, KODLAR & TESLİMAT)
-- =========================================================================

-- 1. Profiles tablosuna bayi yüzdelik indirim alanı ekleme
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (discount_percentage >= 0 AND discount_percentage <= 100);

-- 2. Orders tablosuna sipariş kodu ve teslimat durumu alanı ekleme
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_code TEXT UNIQUE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_status TEXT CHECK (delivery_status IN ('delivered', 'issue'));

-- 3. Mevcut siparişler için geriye dönük sipariş kodu üretme
UPDATE public.orders SET order_code = 'TR-' || upper(substring(md5(id::text) from 1 for 6)) WHERE order_code IS NULL;

-- 4. Sipariş kodu otomatik oluşturma trigger fonksiyonu
CREATE OR REPLACE FUNCTION generate_unique_order_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'TR-' || upper(substring(md5(random()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM public.orders WHERE order_code = new_code) INTO code_exists;
    IF NOT code_exists THEN
      NEW.order_code := new_code;
      EXIT;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı bağlayalım
DROP TRIGGER IF EXISTS trigger_generate_order_code ON public.orders;
CREATE TRIGGER trigger_generate_order_code
BEFORE INSERT ON public.orders
FOR EACH ROW
WHEN (NEW.order_code IS NULL)
EXECUTE FUNCTION generate_unique_order_code();

-- 5. Toplu Sipariş İndirimleri (bulk_discounts) tablosu
CREATE TABLE IF NOT EXISTS public.bulk_discounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    species_id UUID REFERENCES public.species(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 1),
    discounted_price NUMERIC(10, 2) NOT NULL CHECK (discounted_price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(species_id, quantity)
);

-- RLS Etkinleştirme
ALTER TABLE public.bulk_discounts ENABLE ROW LEVEL SECURITY;

-- 6. Toplu İndirim RLS Politikaları
DROP POLICY IF EXISTS "bulk_discounts_select_policy" ON public.bulk_discounts;
CREATE POLICY "bulk_discounts_select_policy" ON public.bulk_discounts
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "bulk_discounts_admin_all_policy" ON public.bulk_discounts;
CREATE POLICY "bulk_discounts_admin_all_policy" ON public.bulk_discounts
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 7. Profiles ve Orders RLS Politikası Güncellemeleri
-- Profilleri select politikasını tamamen herkese açarak bilinmeyen bayi adlarının görünmeme bugını çözüyoruz
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT TO authenticated USING (true);

-- Bayi sipariş düzenleme politikasını güncelliyoruz, böylece kargoya verildiğinde de teslimat durumunu güncelleyebilirler (sunucu tarafında denetlenecek)
DROP POLICY IF EXISTS "orders_dealer_update_policy" ON public.orders;
CREATE POLICY "orders_dealer_update_policy" ON public.orders
    FOR UPDATE TO authenticated
    USING (
        dealer_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'dealer'
        )
    );
