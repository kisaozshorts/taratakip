'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { Logger } from '@/utils/logger'

interface CartItem {
  speciesId: string
  quantity: number
}

export async function createOrder(prevState: any, formData: FormData) {
  const receiver_name = formData.get('receiver_name') as string
  const city = formData.get('city') as string
  const district = formData.get('district') as string
  const cargo_branch = formData.get('cargo_branch') as string
  const phone_number = formData.get('phone_number') as string
  const is_known_customer_form = formData.get('is_known_customer') === 'true'
  const payment_completed = formData.get('payment_completed') === 'true'
  const itemsStr = formData.get('items') as string

  Logger.info('Yeni sipariş oluşturma isteği alındı (sepetli).', {
    receiver_name,
    city,
    district,
    cargo_branch,
    phone_number,
    is_known_customer_form,
    payment_completed,
    itemsStrLength: itemsStr?.length
  })

  if (!receiver_name || !city || !district || !cargo_branch || !phone_number || !itemsStr) {
    Logger.warn('Sipariş oluşturma başarısız: Eksik alanlar var.')
    return { error: 'Lütfen tüm alanları doldurun ve sepete en az bir ürün ekleyin.' }
  }

  let items: CartItem[] = []
  try {
    items = JSON.parse(itemsStr)
  } catch (e) {
    Logger.error('Sepet verisi JSON ayrıştırılırken hata:', e)
    return { error: 'Sepet verisi geçersiz.' }
  }

  if (items.length === 0) {
    Logger.warn('Sipariş oluşturma başarısız: Sepet boş.')
    return { error: 'Lütfen sepete en az bir ürün ekleyin.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    Logger.error('Sipariş oluşturma başarısız: Oturum açmış kullanıcı bulunamadı.')
    redirect('/login')
  }

  // Bayinin profilini ve is_unknown_dealer durumunu kontrol et
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_unknown_dealer')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    Logger.error('Sipariş oluşturma başarısız: Bayi profil bilgisi alınamadı.', profileError)
    return { error: 'Profil doğrulanamadı.' }
  }

  // Eğer bayi "bilinmeyen" olarak işaretlenmişse, sipariş kesinlikle bilinmeyen müşteri olmalıdır.
  const is_known_customer = profile.is_unknown_dealer ? false : is_known_customer_form

  // Siparişi veritabanına ekle
  Logger.info('Sipariş üst kaydı oluşturuluyor...')
  const { data: newOrder, error: insertError } = await supabase
    .from('orders')
    .insert({
      receiver_name: receiver_name.trim(),
      city: city.trim(),
      district: district.trim(),
      cargo_branch: cargo_branch.trim(),
      phone_number: phone_number.trim(),
      is_known_customer,
      payment_completed,
      admin_approved: false, // İlk eklemede her zaman onay bekler
      dealer_id: user.id,
    })
    .select('id')
    .single()

  if (insertError || !newOrder) {
    Logger.error('Sipariş veritabanına kaydedilirken hata oluştu:', insertError)
    return { error: 'Sipariş oluşturulurken hata oluştu: ' + (insertError?.message || 'Sipariş kaydı alınamadı') }
  }

  Logger.info(`Sipariş üst kaydı oluşturuldu. ID: ${newOrder.id}. Sepet kalemleri ekleniyor...`)

  // Sepetteki tarantula türlerinin fiyatlarını tek seferde çekelim
  const speciesIds = items.map((i) => i.speciesId)
  const { data: speciesList, error: speciesError } = await supabase
    .from('species')
    .select('id, price')
    .in('id', speciesIds)

  if (speciesError || !speciesList) {
    Logger.error('Sepet kalemleri eklenirken tür fiyatları alınamadı:', speciesError)
    // Üst kaydı geri silelim (rollback)
    await supabase.from('orders').delete().eq('id', newOrder.id)
    return { error: 'Tarantula tür bilgileri doğrulanamadı.' }
  }

  const speciesMap = new Map(speciesList.map((s) => [s.id, Number(s.price)]))

  // Kalemleri insert edelim
  const orderItemsData = items.map((item) => {
    const price = speciesMap.get(item.speciesId) || 0
    return {
      order_id: newOrder.id,
      species_id: item.speciesId,
      quantity: item.quantity,
      price_at_sale: price
    }
  })

  const { error: itemsInsertError } = await supabase
    .from('order_items')
    .insert(orderItemsData)

  if (itemsInsertError) {
    Logger.error('Sipariş kalemleri kaydedilirken hata oluştu:', itemsInsertError)
    // Üst kaydı silerek temizlik yapalım
    await supabase.from('orders').delete().eq('id', newOrder.id)
    return { error: 'Sipariş kalemleri oluşturulamadı: ' + itemsInsertError.message }
  }

  Logger.info(`Sipariş ve tüm kalemleri başarıyla oluşturuldu! Bayi: ${user.email}, Alıcı: ${receiver_name}`)
  revalidatePath('/dealer')
  redirect('/dealer')
}

export async function updateOrder(prevState: any, formData: FormData) {
  const id = formData.get('id') as string
  const receiver_name = formData.get('receiver_name') as string
  const city = formData.get('city') as string
  const district = formData.get('district') as string
  const cargo_branch = formData.get('cargo_branch') as string
  const phone_number = formData.get('phone_number') as string
  const is_known_customer_form = formData.get('is_known_customer') === 'true'
  const itemsStr = formData.get('items') as string

  Logger.info(`Sipariş güncelleme isteği alındı. Sipariş ID: ${id}`, {
    receiver_name,
    city,
    district,
    cargo_branch,
    phone_number,
    is_known_customer_form,
    itemsStrLength: itemsStr?.length
  })

  if (!id || !receiver_name || !city || !district || !cargo_branch || !phone_number || !itemsStr) {
    Logger.warn('Sipariş güncelleme başarısız: Eksik alanlar var.')
    return { error: 'Lütfen tüm alanları doldurun.' }
  }

  let items: CartItem[] = []
  try {
    items = JSON.parse(itemsStr)
  } catch (e) {
    Logger.error('Sepet verisi ayrıştırılamadı:', e)
    return { error: 'Sepet verisi geçersiz.' }
  }

  if (items.length === 0) {
    return { error: 'Siparişte en az bir ürün bulunmalıdır.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    Logger.error('Sipariş güncelleme başarısız: Oturum bulunamadı.')
    redirect('/login')
  }

  // Siparişin varlığını, sahipliğini ve kargo durumunu kontrol et
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
    Logger.warn(`Sipariş güncelleme engellendi: Yetkisiz erişim denemesi! Kullanıcı: ${user.email}`)
    return { error: 'Bu siparişi düzenleme yetkiniz yok.' }
  }

  if (order.cargo_sent) {
    Logger.warn(`Sipariş güncelleme engellendi: Sipariş kargolanmış. Sipariş ID: ${id}`)
    return { error: 'Kargoya verilmiş siparişler düzenlenemez.' }
  }

  // Bayinin profilini kontrol et
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_unknown_dealer')
    .eq('id', user.id)
    .single()

  const is_known_customer = profile?.is_unknown_dealer ? false : is_known_customer_form

  // Sipariş üst kaydını güncelle
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      receiver_name: receiver_name.trim(),
      city: city.trim(),
      district: district.trim(),
      cargo_branch: cargo_branch.trim(),
      phone_number: phone_number.trim(),
      is_known_customer,
    })
    .eq('id', id)

  if (updateError) {
    Logger.error('Sipariş üst kaydı güncellenirken hata oluştu:', updateError)
    return { error: 'Sipariş güncellenirken hata oluştu: ' + updateError.message }
  }

  // Eski kalemleri silip yenilerini ekleyelim
  Logger.info(`Eski sipariş kalemleri siliniyor. Sipariş ID: ${id}`)
  await supabase.from('order_items').delete().eq('order_id', id)

  // Yeni kalemlerin fiyatlarını çekelim
  const speciesIds = items.map((i) => i.speciesId)
  const { data: speciesList, error: speciesError } = await supabase
    .from('species')
    .select('id, price')
    .in('id', speciesIds)

  if (speciesError || !speciesList) {
    Logger.error('Sipariş kalemleri güncellenirken tarantula fiyatları alınamadı:', speciesError)
    return { error: 'Tarantula fiyatları doğrulanamadı.' }
  }

  const speciesMap = new Map(speciesList.map((s) => [s.id, Number(s.price)]))
  const orderItemsData = items.map((item) => {
    const price = speciesMap.get(item.speciesId) || 0
    return {
      order_id: id,
      species_id: item.speciesId,
      quantity: item.quantity,
      price_at_sale: price
    }
  })

  const { error: itemsInsertError } = await supabase
    .from('order_items')
    .insert(orderItemsData)

  if (itemsInsertError) {
    Logger.error('Sipariş yeni kalemleri kaydedilirken hata oluştu:', itemsInsertError)
    return { error: 'Sipariş güncellendi ancak kalemler güncellenirken hata oluştu: ' + itemsInsertError.message }
  }

  Logger.info(`Sipariş başarıyla güncellendi! ID: ${id}`)
  revalidatePath('/dealer')
  redirect('/dealer')
}
