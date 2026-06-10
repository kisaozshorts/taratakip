'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { Logger } from '@/utils/logger'

export async function createOrder(prevState: any, formData: FormData) {
  const receiver_name = formData.get('receiver_name') as string
  const city = formData.get('city') as string
  const district = formData.get('district') as string
  const cargo_branch = formData.get('cargo_branch') as string
  const species_id = formData.get('species_id') as string
  const payment_completed = formData.get('payment_completed') === 'true'

  Logger.info('Yeni sipariş oluşturma isteği alındı.', {
    receiver_name,
    city,
    district,
    cargo_branch,
    species_id,
    payment_completed,
  })

  if (!receiver_name || !city || !district || !cargo_branch || !species_id) {
    Logger.warn('Sipariş oluşturma başarısız: Eksik alanlar var.')
    return { error: 'Lütfen tüm alanları doldurun.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    Logger.error('Sipariş oluşturma başarısız: Oturum açmış kullanıcı bulunamadı.')
    redirect('/login')
  }

  Logger.info(`Tür fiyat bilgisi veritabanından çekiliyor. Tür ID: ${species_id}`)
  const { data: species, error: speciesError } = await supabase
    .from('species')
    .select('price')
    .eq('id', species_id)
    .single()

  if (speciesError || !species) {
    Logger.error('Sipariş oluşturma başarısız: Tarantula türü fiyatı alınamadı.', speciesError)
    return { error: 'Seçilen tarantula türü sistemde bulunamadı.' }
  }

  Logger.info(`Fiyat kilitlendi. Satış Anındaki Fiyat: ${species.price} TL. Sipariş kaydediliyor...`)

  // Siparişi veritabanına ekle
  const { error: insertError } = await supabase.from('orders').insert({
    receiver_name: receiver_name.trim(),
    city: city.trim(),
    district: district.trim(),
    cargo_branch: cargo_branch.trim(),
    species_id,
    price_at_sale: species.price,
    payment_completed,
    dealer_id: user.id,
  })

  if (insertError) {
    Logger.error('Sipariş veritabanına kaydedilirken hata oluştu:', insertError)
    return { error: 'Sipariş oluşturulurken hata oluştu: ' + insertError.message }
  }

  Logger.info(`Sipariş başarıyla oluşturuldu! Bayi: ${user.email}, Alıcı: ${receiver_name}`)
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

  Logger.info(`Sipariş güncelleme isteği alındı. Sipariş ID: ${id}`, {
    receiver_name,
    city,
    district,
    cargo_branch,
    species_id,
  })

  if (!id || !receiver_name || !city || !district || !cargo_branch || !species_id) {
    Logger.warn('Sipariş güncelleme başarısız: Eksik alanlar var.')
    return { error: 'Lütfen tüm alanları doldurun.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    Logger.error('Sipariş güncelleme başarısız: Oturum bulunamadı.')
    redirect('/login')
  }

  // Siparişin varlığını ve kargo durumunu kontrol et
  Logger.info(`Güncellenecek siparişin sahipliği ve kargo durumu kontrol ediliyor. Sipariş ID: ${id}`)
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('dealer_id, cargo_sent')
    .eq('id', id)
    .single()

  if (fetchError || !order) {
    Logger.error('Sipariş güncelleme başarısız: Sipariş bulunamadı.', fetchError)
    return { error: 'Sipariş bulunamadı.' }
  }

  if (order.dealer_id !== user.id) {
    Logger.warn(`Sipariş güncelleme engellendi: Yetkisiz erişim denemesi! Kullanıcı: ${user.email}, Sipariş Sahibi ID: ${order.dealer_id}`)
    return { error: 'Bu siparişi düzenleme yetkiniz yok.' }
  }

  if (order.cargo_sent) {
    Logger.warn(`Sipariş güncelleme engellendi: Sipariş kargolanmış. Sipariş ID: ${id}`)
    return { error: 'Kargoya verilmiş siparişler düzenlenemez.' }
  }

  // Seçilen türün fiyatını alıp satış anındaki fiyatı da güncelleyelim
  Logger.info(`Güncellenen tarantula türü fiyatı alınıyor. Tür ID: ${species_id}`)
  const { data: species, error: speciesError } = await supabase
    .from('species')
    .select('price')
    .eq('id', species_id)
    .single()

  if (speciesError || !species) {
    Logger.error('Sipariş güncelleme başarısız: Tarantula tür fiyatı alınamadı.', speciesError)
    return { error: 'Seçilen tarantula türü sistemde bulunamadı.' }
  }

  Logger.info(`Güncelleme kaydediliyor. Yeni Satış Fiyatı: ${species.price} TL`)

  // Güncelleme işlemi
  const { error: updateError } = await supabase
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

  if (updateError) {
    Logger.error('Sipariş veritabanında güncellenirken hata oluştu:', updateError)
    return { error: 'Sipariş güncellenirken hata oluştu: ' + updateError.message }
  }

  Logger.info(`Sipariş başarıyla güncellendi! ID: ${id}`)
  revalidatePath('/dealer')
  redirect('/dealer')
}
