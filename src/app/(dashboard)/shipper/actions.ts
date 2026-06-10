'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateShippingStatus(formData: FormData) {
  const id = formData.get('id') as string
  const cargo_code = (formData.get('cargo_code') as string) || ''
  const shipping_company_id = formData.get('shipping_company_id') as string
  
  const cargo_sent = cargo_code.trim().length > 0 ? true : (formData.get('cargo_sent') === 'true')
  const cargo_code_trimmed = cargo_sent ? (cargo_code.trim() || null) : null
  const final_shipping_company_id = cargo_sent ? (shipping_company_id || null) : null

  if (!id) return

  // Dosya loglama sistemi
  const fs = require('fs')
  const path = require('path')
  const logFile = path.join(process.cwd(), 'shipper_action.log')
  const logMsg = `[${new Date().toISOString()}] Update Shipping: id=${id}, form_sent=${formData.get('cargo_sent')}, cargo_code="${cargo_code}", company="${shipping_company_id}" => calculated cargo_sent=${cargo_sent}, code="${cargo_code_trimmed}", final_company="${final_shipping_company_id}"\n`
  try {
    fs.appendFileSync(logFile, logMsg)
  } catch (err) {
    console.error('Failed to write to log file:', err)
  }

  const supabase = await createClient()
  
  // Kullanıcı kargocu mu veya admin mi kontrol et
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    try { fs.appendFileSync(logFile, `[${new Date().toISOString()}] AUTH ERROR: No authenticated user found\n`) } catch {}
    return
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'shipper' && profile?.role !== 'admin') {
    try { fs.appendFileSync(logFile, `[${new Date().toISOString()}] ROLE ERROR: User is not shipper/admin (role=${profile?.role})\n`) } catch {}
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
    try { fs.appendFileSync(logFile, `[${new Date().toISOString()}] DB UPDATE ERROR: ${JSON.stringify(error)}\n`) } catch {}
    return
  }

  try { fs.appendFileSync(logFile, `[${new Date().toISOString()}] DB UPDATE SUCCESS: ${JSON.stringify(data)}\n`) } catch {}

  revalidatePath('/shipper')
  revalidatePath('/admin') // Admin paneli için de güncellensin
}
