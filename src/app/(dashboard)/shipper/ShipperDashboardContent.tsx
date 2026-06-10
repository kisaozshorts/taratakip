import React from 'react'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { updateShippingStatus } from './actions'
import ShipperTabs from './ShipperTabs'

export default async function ShipperDashboardContent() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Kargocu kontrolü
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'shipper' && profile?.role !== 'admin') {
    redirect('/')
  }

  // Sadece ödemesi iletilmiş VE admin tarafından onaylanmış siparişleri getirelim (sepet kalemleriyle birlikte)
  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(*, species:species_id(name)), profiles:dealer_id(username)')
    .eq('payment_completed', true)
    .eq('admin_approved', true)
    .order('cargo_sent', { ascending: true }) // Kargo bekleyenler üstte gözüksün
    .order('created_at', { ascending: false })

  return (
    <div>
      <ShipperTabs orders={(orders || []) as any} updateShippingStatus={updateShippingStatus} />
    </div>
  )
}
