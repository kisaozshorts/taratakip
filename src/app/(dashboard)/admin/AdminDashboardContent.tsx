import React from 'react'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { DollarSign, ShoppingBag, CreditCard, Truck, Trash2, Filter, RefreshCw } from 'lucide-react'
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

  // Filtre seçenekleri için bayileri ve türleri çekelim
  const { data: dealers } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('role', 'dealer')

  const { data: speciesList } = await supabase
    .from('species')
    .select('id, name')

  // Hesaplamalar için filtresiz tüm siparişleri çekelim
  const { data: allOrders } = await supabase
    .from('orders')
    .select('price_at_sale, payment_completed, cargo_sent')

  // Filtrelenmiş Sipariş Sorgusunu hazırlayalım (henüz await etmiyoruz)
  let query = supabase
    .from('orders')
    .select('*, species:species_id(name), profiles:dealer_id(username)')
    .order('created_at', { ascending: false })

  if (p.dealer) query = query.eq('dealer_id', p.dealer)
  if (p.species) query = query.eq('species_id', p.species)
  if (p.payment) query = query.eq('payment_completed', p.payment === 'true')
  if (p.cargo) query = query.eq('cargo_sent', p.cargo === 'true')

  // Tüm veritabanı sorgularını PARALEL çalıştıralım (Mükemmel performans artışı!)
  Logger.info('Admin paneli veritabanı sorguları paralel olarak başlatılıyor...')
  const [dealersRes, speciesListRes, allOrdersRes, ordersRes] = await Promise.all([
    supabase.from('profiles').select('id, username').eq('role', 'dealer'),
    supabase.from('species').select('id, name'),
    supabase.from('orders').select('price_at_sale, payment_completed, cargo_sent'),
    query
  ])

  const dealersData = dealersRes.data || []
  const speciesListData = speciesListRes.data || []
  const allOrdersData = allOrdersRes.data || []
  const ordersData = ordersRes.data || []

  Logger.info('Tüm paralel sorgular tamamlandı.')

  // İstatistik Metrikleri
  const totalRevenue =
    allOrdersData.reduce((sum, order) => sum + Number(order.price_at_sale), 0) || 0
  const pendingPayments =
    allOrdersData
      .filter((o) => !o.payment_completed)
      .reduce((sum, order) => sum + Number(order.price_at_sale), 0) || 0
  const pendingCargoCount =
    allOrdersData.filter((o) => o.payment_completed && !o.cargo_sent).length || 0
  const totalSalesCount = allOrdersData.length || 0

  // Sipariş Silme Eylemi (Server Action)
  async function handleDelete(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const supabaseClient = await createClient()
    await supabaseClient.from('orders').delete().eq('id', id)
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
              <option value="true">Ödeme Tamamlandı</option>
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
                  <th>Alıcı</th>
                  <th>Konum / Şube</th>
                  <th>Tür</th>
                  <th>Satış Fiyatı</th>
                  <th>Bayi</th>
                  <th>Ödeme</th>
                  <th>Kargo</th>
                  <th>Kargo Kodu</th>
                  <th>Tarih</th>
                  <th style={{ textAlign: 'right' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {ordersData.map((order) => {
                  const speciesName = (order.species as any)?.name || 'Bilinmeyen Tür'
                  const dealerName = (order.profiles as any)?.username || 'Bilinmeyen Bayi'
                  
                  return (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 600 }}>{order.receiver_name}</td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>{order.city} / {order.district}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{order.cargo_branch}</div>
                      </td>
                      <td>{speciesName}</td>
                      <td style={{ fontWeight: 600 }}>
                        {Number(order.price_at_sale).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      </td>
                      <td style={{ color: 'var(--primary)', fontWeight: 500 }}>@{dealerName}</td>
                      <td>
                        <span className={order.payment_completed ? 'badge badge-success' : 'badge badge-warning'}>
                          {order.payment_completed ? 'İletildi' : 'Bekliyor'}
                        </span>
                      </td>
                      <td>
                        <span className={order.cargo_sent ? 'badge badge-success' : 'badge badge-warning'}>
                          {order.cargo_sent ? 'Gönderildi' : 'Bekliyor'}
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
