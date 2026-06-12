import React from 'react'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import OrderForm from './OrderForm'

export default async function NewOrderPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Tüm verileri paralel olarak çekelim
  const [profileRes, speciesRes, bulkDiscountsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('role, is_unknown_dealer, discount_percentage')
      .eq('id', user.id)
      .single(),
    supabase
      .from('species')
      .select('id, name, price')
      .order('name', { ascending: true }),
    supabase
      .from('bulk_discounts')
      .select('*')
  ])

  const profile = profileRes.data
  const speciesList = speciesRes.data
  const bulkDiscounts = bulkDiscountsRes.data || []

  if (profile?.role !== 'dealer') {
    redirect('/')
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">📝 Yeni Satış Raporla</h1>
      </div>

      <div className="glass-card" style={{ padding: '2.5rem' }}>
        <OrderForm
          speciesList={speciesList || []}
          isUnknownDealer={profile?.is_unknown_dealer || false}
          bulkDiscounts={bulkDiscounts}
          dealerDiscountPercentage={profile?.discount_percentage || 0}
        />
      </div>
    </div>
  )
}
