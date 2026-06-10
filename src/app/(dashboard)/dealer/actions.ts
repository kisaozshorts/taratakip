'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function createOrder(prevState: any, formData: FormData) {
  const receiver_name = formData.get('receiver_name') as string
  const city = formData.get('city') as string
  const district = formData.get('district') as string
  const cargo_branch = formData.get('cargo_branch') as string
  const species_id = formData.get('species_id') as string
  const payment_completed = formData.get('payment_completed') === 'true'

  if (!receiver_name || !city || !district || !cargo_branch || !species_id) {
    return { error: 'Lütfen tüm alanları doldurun.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Seçilen türün veritabanındaki fiyatını alalım (Fiyat manipülasyonunu engellemek için)
  const { data: species } = await supabase
    .from('species')
    .select('price')
    .eq('id', species_id)
    .single()

  if (!species) {
    return { error: 'Seçilen tarantula türü sistemde bulunamadı.' }
  }

  // Siparişi veritabanına ekle
  const { error } = await supabase.from('orders').insert({
    receiver_name: receiver_name.trim(),
    city: city.trim(),
    district: district.trim(),
    cargo_branch: cargo_branch.trim(),
    species_id,
    price_at_sale: species.price,
    payment_completed,
    dealer_id: user.id,
  })

  if (error) {
    return { error: 'Sipariş oluşturulurken hata oluştu: ' + error.message }
  }

  revalidatePath('/dealer')
  redirect('/dealer')
}

export async function updateOrder(prevState: any, formData: FormData) {
  const id = formData.get('id') as string
  const receiver_name = formData.get('receiver_name') as string
  const city = formData.get('city') as string
  const district = formData.get('district') as string
  const cargo_branch = formData.get('cargo_branch') as string
  const species_id = formData.get('species_id') as string

  if (!id || !receiver_name || !city || !district || !cargo_branch || !species_id) {
    return { error: 'Lütfen tüm alanları doldurun.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Siparişin varlığını ve kargo durumunu kontrol et
  const { data: order } = await supabase
    .from('orders')
    .select('dealer_id, cargo_sent')
    .eq('id', id)
    .single()

  if (!order || order.dealer_id !== user.id) {
    return { error: 'Bu siparişi düzenleme yetkiniz yok.' }
  }

  if (order.cargo_sent) {
    return { error: 'Kargoya verilmiş siparişler düzenlenemez.' }
  }

  // Seçilen türün fiyatını alıp satış anındaki fiyatı da güncelleyelim
  const { data: species } = await supabase
    .from('species')
    .select('price')
    .eq('id', species_id)
    .single()

  if (!species) {
    return { error: 'Seçilen tarantula türü sistemde bulunamadı.' }
  }

  // Güncelleme işlemi
  const { error } = await supabase
    .from('orders')
    .update({
      receiver_name: receiver_name.trim(),
      city: city.trim(),
      district: district.trim(),
      cargo_branch: cargo_branch.trim(),
      species_id,
      price_at_sale: species.price,
    })
    .eq('id', id)

  if (error) {
    return { error: 'Sipariş güncellenirken hata oluştu: ' + error.message }
  }

  revalidatePath('/dealer')
  redirect('/dealer')
}
