-- =========================================================================
-- TARANUTLA SATIŞ VE BAYİLİK TAKİP SİSTEMİ - SUPABASE VERİTABANI ŞEMASI
-- =========================================================================

-- 1. Rol Tipleri Enum
CREATE TYPE public.user_role AS ENUM ('admin', 'dealer', 'shipper', 'pending');

-- 2. Profiller Tablosu (auth.users ile eşleşir)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    role public.user_role NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS Etkinleştir
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Türler Tablosu (Tarantula Türleri ve Fiyatları)
CREATE TABLE public.species (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS Etkinleştir
ALTER TABLE public.species ENABLE ROW LEVEL SECURITY;

-- 4. Siparişler Tablosu (Siparişler)
CREATE TABLE public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    receiver_name TEXT NOT NULL,
    city TEXT NOT NULL,
    district TEXT NOT NULL,
    cargo_branch TEXT NOT NULL,
    species_id UUID REFERENCES public.species(id) ON DELETE SET NULL,
    price_at_sale NUMERIC(10, 2) NOT NULL CHECK (price_at_sale >= 0),
    payment_completed BOOLEAN NOT NULL DEFAULT FALSE,
    cargo_sent BOOLEAN NOT NULL DEFAULT FALSE,
    cargo_code TEXT,
    dealer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS Etkinleştir
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;


-- =========================================================================
-- OTOMATİK PROFİL OLUŞTURMA TETİKLEYİCİSİ (TRIGGER)
-- =========================================================================

-- Yeni bir kullanıcı kaydolduğunda profiles tablosuna ekleyen fonksiyon
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auth tablosunda yeni satır oluştuğunda tetiklenen trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =========================================================================
-- GÜVENLİK VE ROL DOĞRULAMA TETİKLEYİCİLERİ (TRIGGERS)
-- =========================================================================

-- Kargocuların sadece kargo alanlarını (cargo_sent, cargo_code) güncelleyebilmesini sağlayan trigger
CREATE OR REPLACE FUNCTION public.check_shipper_order_update()
RETURNS TRIGGER AS $$
DECLARE
  current_user_role public.user_role;
BEGIN
  -- İşlemi yapan kullanıcının rolünü alalım
  SELECT role INTO current_user_role FROM public.profiles WHERE id = auth.uid();
  
  IF current_user_role = 'shipper' THEN
    -- Diğer sütunların değişip değişmediğini kontrol et
    IF NEW.receiver_name <> OLD.receiver_name OR
       NEW.city <> OLD.city OR
       NEW.district <> OLD.district OR
       NEW.cargo_branch <> OLD.cargo_branch OR
       NEW.species_id <> OLD.species_id OR
       NEW.price_at_sale <> OLD.price_at_sale OR
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

CREATE OR REPLACE TRIGGER on_shipper_order_update
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.check_shipper_order_update();


-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLİTİKALARI
-- =========================================================================

-- ----------------- PROFILLER (profiles) -----------------

-- Herkes profilleri görebilir (kullanıcı adlarını görüntülemek için)
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT TO authenticated USING (true);

-- Sadece admin profilleri güncelleyebilir (yetki atamak için)
CREATE POLICY "profiles_admin_update_policy" ON public.profiles
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ----------------- TÜRLER (species) -----------------

-- Tüm kullanıcılar türleri görüntüleyebilir
CREATE POLICY "species_select_policy" ON public.species
    FOR SELECT TO authenticated USING (true);

-- Sadece admin türleri ekleyebilir/güncelleyebilir/silebilir
CREATE POLICY "species_admin_all_policy" ON public.species
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ----------------- SİPARİŞLER (orders) -----------------

-- 1. Admin Sipariş Politikası (Admin her şeyi yapabilir)
CREATE POLICY "orders_admin_all_policy" ON public.orders
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 2. Bayi Sipariş Politikaları (Kendi siparişleri)
-- Bayi kendi siparişlerini seçebilir
CREATE POLICY "orders_dealer_select_policy" ON public.orders
    FOR SELECT TO authenticated
    USING (
        dealer_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'dealer'
        )
    );

-- Bayi kendi siparişini ekleyebilir
CREATE POLICY "orders_dealer_insert_policy" ON public.orders
    FOR INSERT TO authenticated
    WITH CHECK (
        dealer_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'dealer'
        )
    );

-- Bayi kargo gönderilmediyse kendi siparişini düzenleyebilir
CREATE POLICY "orders_dealer_update_policy" ON public.orders
    FOR UPDATE TO authenticated
    USING (
        dealer_id = auth.uid() AND
        cargo_sent = FALSE AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'dealer'
        )
    )
    WITH CHECK (
        dealer_id = auth.uid() AND
        cargo_sent = FALSE
    );

-- Bayi kargo gönderilmediyse kendi siparişini silebilir
CREATE POLICY "orders_dealer_delete_policy" ON public.orders
    FOR DELETE TO authenticated
    USING (
        dealer_id = auth.uid() AND
        cargo_sent = FALSE AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'dealer'
        )
    );

-- 3. Kargocu Sipariş Politikaları
-- Kargocu ödemesi tamamlanmış tüm siparişleri görebilir
CREATE POLICY "orders_shipper_select_policy" ON public.orders
    FOR SELECT TO authenticated
    USING (
        payment_completed = TRUE AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'shipper'
        )
    );

-- Kargocu ödemesi tamamlanmış siparişleri güncelleyebilir (Trigger ile sadece kargo alanları güncellenebilir)
CREATE POLICY "orders_shipper_update_policy" ON public.orders
    FOR UPDATE TO authenticated
    USING (
        payment_completed = TRUE AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'shipper'
        )
    )
    WITH CHECK (
        payment_completed = TRUE
    );
