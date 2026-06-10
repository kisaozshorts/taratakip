-- =========================================================================
-- TARANUTLA SATIŞ VE BAYİLİK TAKİP SİSTEMİ - SUPABASE GÜNCELLEME MİGRASYONU
-- =========================================================================

-- 1. Profiles tablosuna is_unknown_dealer kolonu ekleme
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_unknown_dealer BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Orders tablosuna yeni alanlar ekleme (telefon numarası, bilinen/bilinmeyen müşteri, admin onay durumu)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS phone_number TEXT NOT NULL DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_known_customer BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_approved BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Eski siparişlerin verilerini korumak veya yeni tabloya aktarmak için (isteğe bağlı)
-- Yerel ortamda veya sıfır veriyle başlanacağı varsayılarak direkt order_items tablosu oluşturulacaktır.

-- 4. Sipariş Kalemleri (order_items) tablosunun oluşturulması (Çoklu Tarantula / Sepet Desteği için)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    species_id UUID REFERENCES public.species(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    price_at_sale NUMERIC(10, 2) NOT NULL CHECK (price_at_sale >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS Etkinleştirme
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 5. Orders tablosundan eski tekil tarantula ve fiyat alanlarının kaldırılması
-- Önce trigger'ı devre dışı bırakalım ki bağımlılık hatası almayalım.
DROP TRIGGER IF EXISTS on_shipper_order_update ON public.orders;

-- Şimdi eski kolonları silebiliriz.
ALTER TABLE public.orders DROP COLUMN IF EXISTS species_id;
ALTER TABLE public.orders DROP COLUMN IF EXISTS price_at_sale;

-- 6. Kargocuların güncellemelerini kısıtlayan trigger fonksiyonunu güncelleme
CREATE OR REPLACE FUNCTION public.check_shipper_order_update()
RETURNS TRIGGER AS $$
DECLARE
  current_user_role public.user_role;
BEGIN
  -- İşlemi yapan kullanıcının rolünü alalım
  SELECT role INTO current_user_role FROM public.profiles WHERE id = auth.uid();
  
  IF current_user_role = 'shipper' THEN
    -- Diğer sütunların değişip değişmediğini kontrol et (Kargocu sadece kargo alanlarını değiştirebilir)
    IF NEW.receiver_name <> OLD.receiver_name OR
       NEW.city <> OLD.city OR
       NEW.district <> OLD.district OR
       NEW.cargo_branch <> OLD.cargo_branch OR
       NEW.phone_number <> OLD.phone_number OR
       NEW.is_known_customer <> OLD.is_known_customer OR
       NEW.admin_approved <> OLD.admin_approved OR
       NEW.payment_completed <> OLD.payment_completed OR
       NEW.dealer_id <> OLD.dealer_id OR
       NEW.created_at <> OLD.created_at OR
       NEW.id <> OLD.id THEN
      RAISE EXCEPTION 'Kargocular sadece kargo durumunu ve kargo kodunu güncelleyebilir.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı tekrar bağlayalım
CREATE TRIGGER on_shipper_order_update
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.check_shipper_order_update();

-- 7. Orders RLS Politikalarını Güncelleme (Yeni Pipeline: Sadece Ödemesi Yapılmış VE Admin Onaylı Siparişler Kargocuya Gider)
DROP POLICY IF EXISTS "orders_shipper_select_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_shipper_update_policy" ON public.orders;

CREATE POLICY "orders_shipper_select_policy" ON public.orders
    FOR SELECT TO authenticated
    USING (
        payment_completed = TRUE AND
        admin_approved = TRUE AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'shipper'
        )
    );

CREATE POLICY "orders_shipper_update_policy" ON public.orders
    FOR UPDATE TO authenticated
    USING (
        payment_completed = TRUE AND
        admin_approved = TRUE AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'shipper'
        )
    )
    WITH CHECK (
        payment_completed = TRUE AND
        admin_approved = TRUE
    );

-- 8. Order Items RLS Politikaları
-- Admin tüm kalemleri yönetebilir
CREATE POLICY "order_items_admin_all_policy" ON public.order_items
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Bayi kendi sipariş kalemlerini görebilir
CREATE POLICY "order_items_dealer_select_policy" ON public.order_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id AND orders.dealer_id = auth.uid()
        )
    );

-- Bayi kendi siparişine kalem ekleyebilir
CREATE POLICY "order_items_dealer_insert_policy" ON public.order_items
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id AND orders.dealer_id = auth.uid()
        )
    );

-- Bayi kargo gönderilmediyse kendi sipariş kalemini güncelleyebilir
CREATE POLICY "order_items_dealer_update_policy" ON public.order_items
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id AND orders.dealer_id = auth.uid() AND orders.cargo_sent = FALSE
        )
    );

-- Bayi kargo gönderilmediyse kendi sipariş kalemini silebilir
CREATE POLICY "order_items_dealer_delete_policy" ON public.order_items
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id AND orders.dealer_id = auth.uid() AND orders.cargo_sent = FALSE
        )
    );

-- Kargocu sadece onaylı ve ödenmiş sipariş kalemlerini görebilir
CREATE POLICY "order_items_shipper_select_policy" ON public.order_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id 
              AND orders.payment_completed = TRUE 
              AND orders.admin_approved = TRUE
              AND EXISTS (
                  SELECT 1 FROM public.profiles
                  WHERE id = auth.uid() AND role = 'shipper'
              )
        )
    );
