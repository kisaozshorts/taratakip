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

  // Ödemesi yapılmış ve onaylanmış siparişleri ve kullanılabilir kargo firmalarını çekelim
  const [ordersRes, companiesRes] = await Promise.all([
    supabase.from('orders')
      .select('*, order_items(*, species:species_id(name)), profiles:dealer_id(username)')
      .eq('payment_completed', true)
      .eq('admin_approved', true)
      .order('cargo_sent', { ascending: true })
      .order('created_at', { ascending: false }),
    supabase.from('shipping_companies')
      .select('*')
      .order('name', { ascending: true })
  ])

  const orders = ordersRes.data || []
  const companies = companiesRes.data || []

  return (
    <div>
      <ShipperTabs
        orders={orders as any}
        companies={companies}
        updateShippingStatus={updateShippingStatus}
      />
    </div>
  )
}
