import React from 'react'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { DollarSign, ShoppingBag, CreditCard, Truck, Edit, CheckSquare, Square, Phone, ShieldCheck, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import DeleteButton from '@/components/DeleteButton'

export default async function DealerDashboardContent() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Siparişleri, sepet kalemlerini ve tarantula tür adlarını tek sorguda çekelim (Supabase JOIN gücü!)
  const [profileRes, ordersRes] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('orders')
      .select('*, order_items(*, species:species_id(name)), shipping_companies:shipping_company_id(name)')
      .eq('dealer_id', user.id)
      .order('created_at', { ascending: false })
  ])

  const profile = profileRes.data
  const orders = ordersRes.data || []

  if (profile?.role !== 'dealer') {
    redirect('/')
  }

  // Sipariş toplam fiyatını hesaplayan yardımcı fonksiyon
  const getOrderTotal = (order: any) => {
    return order.order_items?.reduce((sum: number, item: any) => sum + (Number(item.price_at_sale) * item.quantity), 0) || 0
  }

  // İstatistikleri hesaplayalım (Sadece bu bayiye özel)
  const totalRevenue = orders.reduce((sum, order) => sum + getOrderTotal(order), 0)
  const pendingPayments = orders
    .filter((o) => !o.payment_completed)
    .reduce((sum, order) => sum + getOrderTotal(order), 0)
  const shippedCount = orders.filter((o) => o.cargo_sent).length
  const totalOrdersCount = orders.length

  // Eylem 1: Admine Ödeme İletildi Toggle (Server Action)
  async function togglePayment(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const currentStatus = formData.get('currentStatus') === 'true'

    const supabaseClient = await createClient()
    const {
      data: { user: currentUser },
    } = await supabaseClient.auth.getUser()

    if (!currentUser) return

    const { data: order } = await supabaseClient
      .from('orders')
      .select('dealer_id, cargo_sent, admin_approved')
      .eq('id', id)
      .single()

    // Güvenlik doğrulaması: Sipariş bu bayiye ait olmalı, kargo gönderilmemiş olmalı ve admin tarafından henüz onaylanmamış olmalı
    if (order && order.dealer_id === currentUser.id && !order.cargo_sent && !order.admin_approved) {
      await supabaseClient
        .from('orders')
        .update({ payment_completed: !currentStatus })
        .eq('id', id)
      revalidatePath('/dealer')
    }
  }

  // Eylem 2: Sipariş Sil (Server Action)
  async function deleteOrder(formData: FormData) {
    'use server'
    const id = formData.get('id') as string

    const supabaseClient = await createClient()
    const {
      data: { user: currentUser },
    } = await supabaseClient.auth.getUser()

    if (!currentUser) return

    const { data: order } = await supabaseClient
      .from('orders')
      .select('dealer_id, cargo_sent, admin_approved')
      .eq('id', id)
      .single()

    // Güvenlik doğrulaması: Sipariş bayiye ait olmalı, kargo gönderilmemiş olmalı ve admin onaylamamış olmalı
    if (order && order.dealer_id === currentUser.id && !order.cargo_sent && !order.admin_approved) {
      await supabaseClient.from('orders').delete().eq('id', id)
      revalidatePath('/dealer')
    }
  }

  return (
    <div>
      {/* İstatistikler */}
      <div className="dashboard-grid">
        <div className="glass-card stat-card">
          <div className="stat-icon primary">
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <h3>Toplam Cirom</h3>
            <p>{totalRevenue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon warning">
            <CreditCard size={24} />
          </div>
          <div className="stat-info">
            <h3>Bekleyen Ödemelerim</h3>
            <p>{pendingPayments.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon success">
            <Truck size={24} />
          </div>
          <div className="stat-info">
            <h3>Kargolanan</h3>
            <p>{shippedCount} Sipariş</p>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon error">
            <ShoppingBag size={24} />
          </div>
          <div className="stat-info">
            <h3>Sipariş Sayım</h3>
            <p>{totalOrdersCount} Adet</p>
          </div>
        </div>
      </div>

      {/* Sipariş Listesi */}
      <div className="glass-card">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Oluşturduğum Satış Siparişleri</h2>

        {orders.length > 0 ? (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Alıcı / Telefon</th>
                  <th>Konum / Şube</th>
                  <th>Sepet İçeriği (Türler & Adetler)</th>
                  <th>Toplam Fiyat</th>
                  <th style={{ textAlign: 'center' }}>Müşteri Tipi</th>
                  <th style={{ textAlign: 'center' }}>Admine Ödeme</th>
                  <th style={{ textAlign: 'center' }}>Admin Onayı</th>
                  <th>Kargo Durumu</th>
                  <th style={{ textAlign: 'right' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const orderTotal = getOrderTotal(order)
                  const isLocked = order.admin_approved || order.cargo_sent
                  
                  return (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 600 }}>
                        <div>{order.receiver_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                          <Phone size={12} /> {order.phone_number || '-'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>{order.city} / {order.district}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{order.cargo_branch}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {order.order_items?.map((item: any, idx: number) => (
                            <div key={idx} style={{ fontSize: '0.8rem' }}>
                              • <span style={{ fontStyle: 'italic' }}>{item.species?.name || 'Bilinmeyen Tür'}</span> ({item.quantity} adet)
                            </div>
                          )) || <span style={{ color: 'var(--text-muted)' }}>Sepet Boş</span>}
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--success)' }}>
                        {orderTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={order.is_known_customer ? 'badge badge-info' : 'badge badge-warning'}>
                          {order.is_known_customer ? 'Bilinen' : 'Bilinmeyen'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {isLocked ? (
                          <span className={order.payment_completed ? 'badge badge-success' : 'badge badge-warning'}>
                            {order.payment_completed ? 'İletildi (Kilitli)' : 'Bekliyor (Kilitli)'}
                          </span>
                        ) : (
                          <form action={togglePayment} style={{ display: 'inline-block' }}>
                            <input type="hidden" name="id" value={order.id} />
                            <input type="hidden" name="currentStatus" value={String(order.payment_completed)} />
                            <button
                              type="submit"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto',
                                color: order.payment_completed ? 'var(--success)' : 'var(--text-muted)',
                              }}
                              title="Ödeme bildirimini değiştirmek için tıklayın"
                            >
                              {order.payment_completed ? (
                                <span className="badge badge-success" style={{ gap: '0.25rem' }}>
                                  <CheckSquare size={14} /> İletildi
                                </span>
                              ) : (
                                <span className="badge badge-warning" style={{ gap: '0.25rem' }}>
                                  <Square size={14} /> İletilmedi
                                </span>
                              )}
                            </button>
                          </form>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={order.admin_approved ? 'badge badge-success' : 'badge badge-warning'} style={{ gap: '0.25rem' }}>
                          {order.admin_approved ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                          {order.admin_approved ? 'Onaylandı' : 'Bekliyor'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span className={order.cargo_sent ? 'badge badge-success' : 'badge badge-warning'}>
                            {order.cargo_sent ? 'Gönderildi' : 'Kargoya Verilmedi'}
                          </span>
                          {order.cargo_code && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', marginTop: '0.2rem' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                {(order as any).shipping_companies?.name || '-'}
                              </span>
                              <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600 }}>
                                Kod: {order.cargo_code}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          {isLocked ? (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              Onaylandı/Kargolandı (Kilitli)
                            </span>
                          ) : (
                            <>
                              <Link
                                href={`/dealer/edit/${order.id}`}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.5rem' }}
                                title="Siparişi Düzenle"
                              >
                                <Edit size={16} />
                              </Link>
                              
                              <DeleteButton
                                id={order.id}
                                action={deleteOrder}
                                confirmMessage="Bu siparişi silmek istediğinizden emin misiniz?"
                              />
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            Henüz raporladığınız bir satış bulunmamaktadır.
          </div>
        )}
      </div>
    </div>
  )
}
