'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateShippingStatus(formData: FormData) {
  const id = formData.get('id') as string
  const cargo_sent = formData.get('cargo_sent') === 'true'
  const cargo_code = formData.get('cargo_code') as string
  const shipping_company_id = formData.get('shipping_company_id') as string

  if (!id) return

  const supabase = await createClient()
  
  // Kullanıcı kargocu mu veya admin mi kontrol et
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'shipper' && profile?.role !== 'admin') {
    return
  }

  // Siparişi güncelle (Veritabanındaki trigger diğer alanların değişmesini engelleyecektir)
  const { error } = await supabase
    .from('orders')
    .update({
      cargo_sent,
      cargo_code: cargo_code.trim() || null,
      shipping_company_id: shipping_company_id || null,
    })
    .eq('id', id)

  if (error) {
    return
  }

  revalidatePath('/shipper')
  revalidatePath('/admin') // Admin paneli için de güncellensin
}
