import React from 'react'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { DollarSign, ShoppingBag, CreditCard, Truck, Filter, Check, RefreshCw, Phone, ShieldCheck, ShieldAlert } from 'lucide-react'
import { revalidatePath } from 'next/cache'
import DeleteButton from '@/components/DeleteButton'
import { Logger } from '@/utils/logger'

interface SearchParams {
  dealer?: string
  species?: string
  payment?: string
  cargo?: string
}

export default async function AdminDashboardContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Kullanıcı admin mi kontrol et
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/')
  }

  const p = await searchParams

  // Filtrelenmiş Sipariş Sorgusunu hazırlayalım (Supabase JOIN ile kalemleri çekiyoruz)
  let query = supabase
    .from('orders')
    .select('*, order_items(*, species:species_id(name)), profiles:dealer_id(username), shipping_companies:shipping_company_id(name)')
    .order('created_at', { ascending: false })

  if (p.dealer) query = query.eq('dealer_id', p.dealer)
  if (p.payment) query = query.eq('payment_completed', p.payment === 'true')
  if (p.cargo) query = query.eq('cargo_sent', p.cargo === 'true')

  // Tüm veritabanı sorgularını PARALEL çalıştıralım
  Logger.info('Admin paneli veritabanı sorguları paralel olarak başlatılıyor...')
  const [dealersRes, speciesListRes, allOrdersRes, ordersRes] = await Promise.all([
    supabase.from('profiles').select('id, username').eq('role', 'dealer'),
    supabase.from('species').select('id, name'),
    supabase.from('orders').select('*, order_items(*)'),
    query
  ])

  const dealersData = dealersRes.data || []
  const speciesListData = speciesListRes.data || []
  const allOrdersData = allOrdersRes.data || []
  let ordersData = ordersRes.data || []

  Logger.info('Tüm paralel sorgular tamamlandı.')

  // Tür filtresini JS tarafında uygulayacağız (çünkü order_items içinde nested filtrelenmesi gerekiyor)
  if (p.species) {
    ordersData = ordersData.filter((order) =>
      order.order_items?.some((item: any) => item.species_id === p.species)
    )
  }

  // Sipariş toplam fiyatını hesaplayan yardımcı fonksiyon
  const getOrderTotal = (order: any) => {
    return order.order_items?.reduce((sum: number, item: any) => sum + (Number(item.price_at_sale) * item.quantity), 0) || 0
  }

  // İstatistik Metrikleri
  const totalRevenue = allOrdersData.reduce((sum, order) => sum + getOrderTotal(order), 0)
  
  const pendingPayments = allOrdersData
    .filter((o) => !o.payment_completed)
    .reduce((sum, order) => sum + getOrderTotal(order), 0)
    
  // Kargo Bekleyen: Ödemesi iletilmiş, admin tarafından onaylanmış ama kargo gönderilmemiş sipariş sayısı
  const pendingCargoCount = allOrdersData.filter((o) => o.payment_completed && o.admin_approved && !o.cargo_sent).length
  
  const totalSalesCount = allOrdersData.length

  // Admin Onayı Bekleyen Siparişler: Ödemesi yapılmış (payment_completed = true) ama admin onaylamamış (admin_approved = false)
  const approvalPendingOrders = allOrdersData.filter((o) => o.payment_completed && !o.admin_approved)

  // Sipariş Silme Eylemi (Server Action)
  async function handleDelete(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const supabaseClient = await createClient()
    await supabaseClient.from('orders').delete().eq('id', id)
    revalidatePath('/admin')
  }

  // Sipariş Onaylama Eylemi (Server Action)
  async function handleApprove(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const supabaseClient = await createClient()
    
    Logger.info(`Sipariş admin tarafından onaylanıyor. Sipariş ID: ${id}`)
    const { error } = await supabaseClient
      .from('orders')
      .update({ admin_approved: true })
      .eq('id', id)

    if (error) {
      Logger.error(`Sipariş onaylanırken hata oluştu: ${error.message}`)
    } else {
      Logger.info(`Sipariş başarıyla onaylandı ve kargocuya yönlendirildi. ID: ${id}`)
    }
    
    revalidatePath('/admin')
  }

  // Filtre sıfırlama eylemi
  async function resetFilters() {
    'use server'
    redirect('/admin')
  }

  return (
    <div>
      {/* Filtre sıfırlama alanı */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', marginTop: '-3rem' }}>
        <form action={resetFilters}>
          <button className="btn btn-secondary" type="submit">
            <RefreshCw size={16} />
            <span>Filtreleri Sıfırla</span>
          </button>
        </form>
      </div>

      {/* Metrik Kartları */}
      <div className="dashboard-grid">
        <div className="glass-card stat-card">
          <div className="stat-icon primary">
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <h3>Toplam Ciro</h3>
            <p>{totalRevenue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon warning">
            <CreditCard size={24} />
          </div>
          <div className="stat-info">
            <h3>Bekleyen Ödemeler</h3>
            <p>{pendingPayments.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon success">
            <Truck size={24} />
          </div>
          <div className="stat-info">
            <h3>Kargo Bekleyen</h3>
            <p>{pendingCargoCount} Adet</p>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon error">
            <ShoppingBag size={24} />
          </div>
          <div className="stat-info">
            <h3>Toplam Satış</h3>
            <p>{totalSalesCount} Sipariş</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ONAY BEKLEYEN SİPARİŞLER BÖLÜMÜ */}
      {/* ========================================================================= */}
      {approvalPendingOrders.length > 0 && (
        <div className="glass-card" style={{ marginBottom: '2rem', border: '1px solid rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.02)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={20} />
            Onay Bekleyen Siparişler ({approvalPendingOrders.length} Adet)
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Aşağıdaki siparişlerin ödemeleri bayiler tarafından admine iletilmiştir. Onayladığınızda sipariş kargocunun ekranına düşecektir.
          </p>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Bayi</th>
                  <th>Alıcı / Telefon</th>
                  <th>Sepet İçeriği</th>
                  <th>Toplam Tutar</th>
                  <th style={{ textAlign: 'center' }}>Müşteri Tipi</th>
                  <th style={{ textAlign: 'center' }}>Tarih</th>
                  <th style={{ textAlign: 'right' }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {approvalPendingOrders.map((order) => {
                  const orderTotal = getOrderTotal(order)
                  const dealerName = (order as any).profiles?.username || 'Bilinmeyen Bayi'
                  
                  // items içindeki species'lerin ismini bulalım (allOrders listesinde allOrdersData join'siz geldiğinden veritabanından çekilen ordersData'dan eşleyebiliriz)
                  const joinedOrder = ordersData.find((o) => o.id === order.id) || order;
                  
                  return (
                    <tr key={order.id} style={{ background: 'rgba(245, 158, 11, 0.03)' }}>
                      <td style={{ color: 'var(--primary)', fontWeight: 600 }}>@{dealerName}</td>
                      <td style={{ fontWeight: 600 }}>
                        <div>{order.receiver_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                          <Phone size={12} /> {order.phone_number || '-'}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {joinedOrder.order_items?.map((item: any, idx: number) => (
                            <div key={idx} style={{ fontSize: '0.8rem' }}>
                              • <span style={{ fontStyle: 'italic' }}>{item.species?.name || 'Bilinmeyen Tür'}</span> ({item.quantity} adet)
                            </div>
                          )) || <span style={{ color: 'var(--text-muted)' }}>-</span>}
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
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(order.created_at).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <form action={handleApprove} style={{ display: 'inline-block' }}>
                          <input type="hidden" name="id" value={order.id} />
                          <button type="submit" className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', background: '#f59e0b', borderColor: '#d97706', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Check size={14} />
                            <span>Siparişi Onayla</span>
                          </button>
                        </form>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filtreleme Paneli */}
      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={18} style={{ color: 'var(--primary)' }} />
          Sipariş Filtreleri
        </h2>
        <form method="GET" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label className="form-label" htmlFor="dealer">Satıcı Bayi</label>
            <select name="dealer" id="dealer" className="form-input" defaultValue={p.dealer || ''}>
              <option value="">Tümü</option>
              {dealersData.map((d) => (
                <option key={d.id} value={d.id}>
                  @{d.username}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" htmlFor="species">Tarantula Türü</label>
            <select name="species" id="species" className="form-input" defaultValue={p.species || ''}>
              <option value="">Tümü</option>
              {speciesListData.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" htmlFor="payment">Ödeme Durumu</label>
            <select name="payment" id="payment" className="form-input" defaultValue={p.payment || ''}>
              <option value="">Tümü</option>
              <option value="true">Ödeme Admine İletildi</option>
              <option value="false">Ödeme Bekliyor</option>
            </select>
          </div>

          <div>
            <label className="form-label" htmlFor="cargo">Kargo Durumu</label>
            <select name="cargo" id="cargo" className="form-input" defaultValue={p.cargo || ''}>
              <option value="">Tümü</option>
              <option value="true">Gönderildi</option>
              <option value="false">Bekliyor</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-primary w-full" type="submit" style={{ height: '42px' }}>
              Filtrele
            </button>
          </div>
        </form>
      </div>

      {/* Sipariş Tablosu */}
      <div className="glass-card">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Detaylı Sipariş İzleme</h2>
        
        {ordersData && ordersData.length > 0 ? (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Bayi</th>
                  <th>Alıcı / Telefon</th>
                  <th>Sepet İçeriği</th>
                  <th>Toplam Tutar</th>
                  <th style={{ textAlign: 'center' }}>Müşteri Tipi</th>
                  <th style={{ textAlign: 'center' }}>Admine Ödeme</th>
                  <th style={{ textAlign: 'center' }}>Admin Onayı</th>
                  <th>Kargo Durumu</th>
                  <th>Tarih</th>
                  <th style={{ textAlign: 'right' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {ordersData.map((order) => {
                  const orderTotal = getOrderTotal(order)
                  const dealerName = (order.profiles as any)?.username || 'Bilinmeyen Bayi'
                  
                  return (
                    <tr key={order.id}>
                      <td style={{ color: 'var(--primary)', fontWeight: 500 }}>@{dealerName}</td>
                      <td style={{ fontWeight: 600 }}>
                        <div>{order.receiver_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                          <Phone size={12} /> {order.phone_number || '-'}
                        </div>
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
                        <span className={order.payment_completed ? 'badge badge-success' : 'badge badge-warning'}>
                          {order.payment_completed ? 'İletildi' : 'Bekliyor'}
                        </span>
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
                                {order.cargo_code}
                              </span>
                            </div>
                          )}
                        </div>
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
                        <DeleteButton
                          id={order.id}
                          action={handleDelete}
                          confirmMessage="Bu siparişi silmek istediğinizden emin misiniz?"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            Filtrelere uygun sipariş bulunamadı.
          </div>
        )}
      </div>
    </div>
  )
}
