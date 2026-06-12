import React from 'react'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Search, ShoppingCart, User, MapPin, Phone, Calendar, CreditCard, Shield, Truck, Sparkles } from 'lucide-react'
import CopyButton from '@/components/CopyButton'

interface SearchParams {
  code?: string
}

export default async function AdminSearchPage({
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

  // Admin kontrolü
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/')
  }

  const p = await searchParams
  const searchCode = p.code?.trim().toUpperCase() || ''

  let order: any = null
  let errorMsg = ''

  if (searchCode) {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, species:species_id(name)), profiles:dealer_id(username), shipping_companies:shipping_company_id(name)')
      .eq('order_code', searchCode)
      .maybeSingle()

    if (error) {
      errorMsg = 'Arama yapılırken hata oluştu: ' + error.message
    } else if (!data) {
      errorMsg = `"${searchCode}" koduna ait herhangi bir sipariş bulunamadı.`
    } else {
      order = data
    }
  }

  const getOrderTotal = (ord: any) => {
    return ord.order_items?.reduce((sum: number, item: any) => sum + (Number(item.price_at_sale) * item.quantity), 0) || 0
  }

  // Arama gönderme eylemi (Server Action)
  async function handleSearch(formData: FormData) {
    'use server'
    const code = formData.get('code') as string
    if (code) {
      redirect(`/admin/search?code=${code.trim().toUpperCase()}`)
    } else {
      redirect('/admin/search')
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Search size={24} style={{ color: 'var(--primary)' }} />
          Sipariş Sorgulama Ekranı
        </h1>
      </div>

      {/* Arama Formu */}
      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <form action={handleSearch} style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              name="code"
              defaultValue={searchCode}
              placeholder="Sipariş Kodunu Girin (Örn: TR-A1B2C3)"
              className="form-input"
              style={{ paddingLeft: '2.5rem', height: '46px' }}
              required
            />
            <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '14px', color: 'var(--text-muted)' }} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: '46px', padding: '0 1.5rem' }}>
            Sorgula
          </button>
        </form>
      </div>

      {/* Hata Mesajı */}
      {errorMsg && (
        <div className="glass-card" style={{ border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.02)', padding: '1.5rem', color: '#f87171', textAlign: 'center' }}>
          {errorMsg}
        </div>
      )}

      {/* Sipariş Detayları */}
      {order && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Üst Kart - Genel Özet */}
          <div className="glass-card" style={{ borderLeft: '5px solid var(--primary)', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', fontFamily: 'monospace' }}>
                    {order.order_code}
                  </span>
                  <CopyButton text={order.order_code} title="Kodu Kopyala" />
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Calendar size={14} />
                  Sipariş Tarihi: {new Date(order.created_at).toLocaleString('tr-TR')}
                </div>
              </div>

              {/* Durum Rozetleri */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span className={order.is_known_customer ? 'badge badge-info' : 'badge badge-warning'}>
                  {order.is_known_customer ? 'Müşteri: Bilinen' : 'Müşteri: Bilinmeyen'}
                </span>
                <span className={order.payment_completed ? 'badge badge-success' : 'badge badge-warning'}>
                  {order.payment_completed ? 'Ödeme: İletildi' : 'Ödeme: Bekliyor'}
                </span>
                <span className={order.admin_approved ? 'badge badge-success' : 'badge badge-warning'}>
                  {order.admin_approved ? 'Admin: Onaylı' : 'Admin: Onay Bekliyor'}
                </span>
                <span className={order.cargo_sent ? 'badge badge-success' : 'badge badge-warning'}>
                  {order.cargo_sent ? 'Kargo: Gönderildi' : 'Kargo: Bekliyor'}
                </span>
              </div>
            </div>

            {/* Teslimat Sonucu (Varsa) */}
            {order.cargo_sent && (
              <div style={{
                background: order.delivery_status === 'delivered' ? 'rgba(16, 185, 129, 0.05)' : order.delivery_status === 'issue' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                border: order.delivery_status === 'delivered' ? '1px solid rgba(16, 185, 129, 0.2)' : order.delivery_status === 'issue' ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--border-color)',
                padding: '1rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <Sparkles size={20} style={{ color: order.delivery_status === 'delivered' ? 'var(--success)' : order.delivery_status === 'issue' ? 'var(--error)' : 'var(--text-muted)' }} />
                <div>
                  <span style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.9rem' }}>Müşteri Teslimat Sonucu:</span>
                  <span style={{
                    marginLeft: '0.5rem',
                    fontWeight: 700,
                    color: order.delivery_status === 'delivered' ? 'var(--success)' : order.delivery_status === 'issue' ? 'var(--error)' : 'var(--text-muted)'
                  }}>
                    {order.delivery_status === 'delivered' ? '🟢 Canlı Sağlıklı Teslim Edildi' : order.delivery_status === 'issue' ? '🔴 Sorun Bildirildi' : '⏳ Henüz Bildirilmedi'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* İki Kolonlu Detay Kartları */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Alıcı ve Konum Bilgileri */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={18} />
                Teslimat Bilgileri
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.9rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Alıcı Adı Soyadı:</span>
                  <div style={{ fontWeight: 600, color: '#ffffff', marginTop: '0.15rem' }}>{order.receiver_name}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Telefon Numarası:</span>
                  <div style={{ fontWeight: 600, color: '#ffffff', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Phone size={14} style={{ color: 'var(--primary)' }} />
                    {order.phone_number || '-'}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Adres / Konum:</span>
                  <div style={{ fontWeight: 600, color: '#ffffff', marginTop: '0.15rem' }}>
                    {order.city} / {order.district}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Kargo Teslim Şubesi:</span>
                  <div style={{ fontWeight: 600, color: '#ffffff', marginTop: '0.15rem' }}>{order.cargo_branch}</div>
                </div>
              </div>
            </div>

            {/* Satıcı ve Kargo Takip Bilgileri */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={18} />
                Satıcı ve Kargo Takibi
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.9rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Satıcı Bayi:</span>
                  <div style={{ fontWeight: 700, color: 'var(--success)', marginTop: '0.15rem' }}>
                    @{order.profiles?.username || 'Bilinmeyen Bayi'}
                  </div>
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Truck size={14} /> Kargo Detayları
                  </span>
                  {order.cargo_sent ? (
                    <div style={{ marginTop: '0.25rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Kargo Firması:</span>{' '}
                        <strong style={{ color: '#ffffff' }}>{order.shipping_companies?.name || '-'}</strong>
                      </div>
                      <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Takip Kodu:</span>{' '}
                        <strong style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{order.cargo_code}</strong>
                        {order.cargo_code && <CopyButton text={order.cargo_code} />}
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--warning)', fontWeight: 600, fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      ⏳ Sipariş henüz kargoya verilmedi.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sepet İçeriği Tablosu */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
              <ShoppingCart size={18} />
              Sipariş İçeriği (Sepet Kalemleri)
            </h3>
            
            <div className="table-container">
              <table className="custom-table" style={{ fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    <th>Tarantula Türü</th>
                    <th style={{ textAlign: 'center' }}>Adet</th>
                    <th>Satış Birim Fiyatı</th>
                    <th style={{ textAlign: 'right' }}>Toplam Fiyat</th>
                  </tr>
                </thead>
                <tbody>
                  {order.order_items?.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td style={{ fontStyle: 'italic', fontWeight: 600 }}>{item.species?.name || 'Bilinmeyen Tür'}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.quantity} adet</td>
                      <td>{Number(item.price_at_sale).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>
                        {(Number(item.price_at_sale) * item.quantity).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Toplam Fiyat Bilgisi */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', fontWeight: 700, marginTop: '1rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Genel Toplam Tutar:</span>
              <span style={{ fontSize: '1.3rem', color: 'var(--success)' }}>
                {getOrderTotal(order).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
