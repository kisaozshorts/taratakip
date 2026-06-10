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

  // Bayi kontrolü
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'dealer') {
    redirect('/')
  }

  // Tarantula türlerini çekelim
  const { data: speciesList } = await supabase
    .from('species')
    .select('id, name, price')
    .order('name', { ascending: true })

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">📝 Yeni Satış Raporla</h1>
      </div>

      <div className="glass-card" style={{ padding: '2.5rem' }}>
        <OrderForm speciesList={speciesList || []} />
      </div>
    </div>
  )
}
