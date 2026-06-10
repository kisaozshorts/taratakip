'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateShippingStatus(formData: FormData) {
  const id = formData.get('id') as string
  const cargo_code = (formData.get('cargo_code') as string) || ''
  const shipping_company_id = formData.get('shipping_company_id') as string
  
  const cargo_sent = formData.get('cargo_sent') === 'true'
  const cargo_code_trimmed = cargo_sent ? (cargo_code.trim() || null) : null
  const final_shipping_company_id = cargo_sent ? (shipping_company_id || null) : null

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

  console.log('updateShippingStatus details:', {
    id,
    cargo_sent,
    cargo_code: cargo_code_trimmed,
    shipping_company_id: final_shipping_company_id,
  })

  // Siparişi güncelle (Veritabanındaki trigger diğer alanların değişmesini engelleyecektir)
  const { data, error } = await supabase
    .from('orders')
    .update({
      cargo_sent,
      cargo_code: cargo_code_trimmed,
      shipping_company_id: final_shipping_company_id,
    })
    .eq('id', id)
    .select()

  console.log('updateShippingStatus DB result data:', data)

  if (error) {
    console.error('updateShippingStatus DB error:', error)
    return
  }

  revalidatePath('/shipper')
  revalidatePath('/admin') // Admin paneli için de güncellensin
}
