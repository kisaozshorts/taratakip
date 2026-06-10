import React from 'react'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { DollarSign, ShoppingBag, CreditCard, Truck, Trash2, Edit, Plus, CheckSquare, Square } from 'lucide-react'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'

export default async function DealerPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Kullanıcı bayi mi kontrol et
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'dealer') {
    redirect('/')
  }

  // Bayinin kendi siparişlerini çekelim
  const { data: orders } = await supabase
    .from('orders')
    .select('*, species:species_id(name)')
    .eq('dealer_id', user.id)
    .order('created_at', { ascending: false })

  // İstatistikleri hesaplayalım (Sadece bu bayiye özel)
  const totalRevenue =
    orders?.reduce((sum, order) => sum + Number(order.price_at_sale), 0) || 0
  const pendingPayments =
    orders
      ?.filter((o) => !o.payment_completed)
      .reduce((sum, order) => sum + Number(order.price_at_sale), 0) || 0
  const shippedCount = orders?.filter((o) => o.cargo_sent).length || 0
  const totalOrdersCount = orders?.length || 0

  // Eylem 1: Ödeme Durumu Toggle (Server Action)
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
      .select('dealer_id, cargo_sent')
      .eq('id', id)
      .single()

    // Güvenlik doğrulaması: Sipariş bu bayiye ait olmalı ve kargo gönderilmemiş olmalı
    if (order && order.dealer_id === currentUser.id && !order.cargo_sent) {
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
      .select('dealer_id, cargo_sent')
      .eq('id', id)
      .single()

    // Güvenlik doğrulaması: Kargo gönderilmediyse ve sipariş bayiye aitse sil
    if (order && order.dealer_id === currentUser.id && !order.cargo_sent) {
      await supabaseClient.from('orders').delete().eq('id', id)
      revalidatePath('/dealer')
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🕷 Bayi Paneli</h1>
        <Link href="/dealer/new-order" className="btn btn-primary">
          <Plus size={18} />
          <span>Yeni Sipariş Raporla</span>
        </Link>
      </div>

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

        {orders && orders.length > 0 ? (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Alıcı</th>
                  <th>Konum / Şube</th>
                  <th>Tür</th>
                  <th>Satış Fiyatı</th>
                  <th style={{ textAlign: 'center' }}>Ödeme Durumu</th>
                  <th>Kargo</th>
                  <th>Kargo Kodu</th>
                  <th>Tarih</th>
                  <th style={{ textAlign: 'right' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const speciesName = (order.species as any)?.name || 'Bilinmeyen Tür'
                  
                  return (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 600 }}>{order.receiver_name}</td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>{order.city} / {order.district}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{order.cargo_branch}</div>
                      </td>
                      <td style={{ fontStyle: 'italic' }}>{speciesName}</td>
                      <td style={{ fontWeight: 600 }}>
                        {Number(order.price_at_sale).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {order.cargo_sent ? (
                          // Kargo gönderildiyse ödeme durumunu kilitle
                          <span className={order.payment_completed ? 'badge badge-success' : 'badge badge-warning'}>
                            {order.payment_completed ? 'İletildi (Kilitli)' : 'Bekliyor (Kilitli)'}
                          </span>
                        ) : (
                          // Kargo gönderilmediyse ödemeyi kutucukla toggle edebilsin
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
                              title="Ödeme durumunu değiştirmek için tıklayın"
                            >
                              {order.payment_completed ? (
                                <span className="badge badge-success" style={{ gap: '0.25rem' }}>
                                  <CheckSquare size={14} /> İletildi
                                </span>
                              ) : (
                                <span className="badge badge-warning" style={{ gap: '0.25rem' }}>
                                  <Square size={14} /> Bekliyor
                                </span>
                              )}
                            </button>
                          </form>
                        )}
                      </td>
                      <td>
                        <span className={order.cargo_sent ? 'badge badge-success' : 'badge badge-warning'}>
                          {order.cargo_sent ? 'Gönderildi' : 'Kargoya Verilmedi'}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>
                        {order.cargo_code || '-'}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(order.created_at).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          {order.cargo_sent ? (
                            // Kargo gönderildiyse butonları devre dışı bırak/kilitle
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              Kargo Gönderildi (Değiştirilemez)
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
                              
                              <form action={deleteOrder} style={{ display: 'inline' }}>
                                <input type="hidden" name="id" value={order.id} />
                                <button
                                  type="submit"
                                  className="btn btn-secondary"
                                  style={{
                                    padding: '0.35rem 0.5rem',
                                    color: 'var(--error)',
                                    borderColor: 'rgba(239, 68, 68, 0.2)',
                                  }}
                                  title="Siparişi Sil"
                                  onClick={(e) => {
                                    if (!confirm('Bu siparişi silmek istediğinizden emin misiniz?')) {
                                      e.preventDefault()
                                    }
                                  }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </form>
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
