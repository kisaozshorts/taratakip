import React from 'react'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import EditOrderForm from './EditOrderForm'

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Bayi kontrolü
  const { data: profileCheck } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileCheck?.role !== 'dealer') {
    redirect('/')
  }

  // Sipariş, kalemler, profil ve türleri paralel çekelim (Performans!)
  const [orderRes, orderItemsRes, profileRes, speciesListRes] = await Promise.all([
    supabase.from('orders').select('*').eq('id', id).single(),
    supabase.from('order_items').select('*, species:species_id(name)').eq('order_id', id),
    supabase.from('profiles').select('role, is_unknown_dealer').eq('id', user.id).single(),
    supabase.from('species').select('id, name, price').order('name', { ascending: true })
  ])

  const order = orderRes.data
  const orderItems = orderItemsRes.data
  const profile = profileRes.data
  const speciesList = speciesListRes.data

  if (!order || order.dealer_id !== user.id) {
    redirect('/dealer')
  }

  // Sipariş kargoya verildiyse düzenlemeyi engelle
  if (order.cargo_sent) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '3rem 0' }}>
        <div className="glass-card" style={{ padding: '3rem' }}>
          <h1 style={{ color: 'var(--error)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.25rem' }}>
            Düzenleme Engellendi
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', lineHeight: '1.6' }}>
            Bu sipariş kargoya verildiği için üzerinde herhangi bir düzenleme yapılamaz.
          </p>
          <a href="/dealer" className="btn btn-primary">
            Bayi Paneline Dön
          </a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">✏️ Siparişi Düzenle</h1>
      </div>

      <div className="glass-card" style={{ padding: '2.5rem' }}>
        <EditOrderForm
          order={order}
          orderItems={orderItems || []}
          speciesList={speciesList || []}
          isUnknownDealer={profile?.is_unknown_dealer || false}
        />
      </div>
    </div>
  )
}
