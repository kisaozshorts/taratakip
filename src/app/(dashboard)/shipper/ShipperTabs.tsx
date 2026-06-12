'use client'

import React, { useState } from 'react'
import { Check, PackageOpen, Calendar, MapPin, Tag, User, Phone, ShoppingCart, Truck } from 'lucide-react'
import CopyButton from '@/components/CopyButton'

interface OrderItem {
  id: string
  quantity: number
  price_at_sale: number
  species?: {
    name: string
  }
}

interface Order {
  id: string
  receiver_name: string
  city: string
  district: string
  cargo_branch: string
  phone_number: string
  cargo_sent: boolean
  cargo_code: string | null
  shipping_company_id: string | null
  created_at: string
  is_known_customer: boolean
  order_code: string | null
  delivery_status: string | null
  profiles: {
    username: string
  } | null
  order_items: OrderItem[]
}

interface Company {
  id: string
  name: string
}

export default function ShipperTabs({
  orders,
  companies,
  updateShippingStatus
}: {
  orders: Order[]
  companies: Company[]
  updateShippingStatus: (formData: FormData) => Promise<any>
}) {
  const [activeTab, setActiveTab] = useState<'known' | 'unknown' | 'shipped'>('known')

  const pendingKnown = orders.filter((o) => o.is_known_customer && !o.cargo_sent)
  const pendingUnknown = orders.filter((o) => !o.is_known_customer && !o.cargo_sent)
  const shippedOrders = orders.filter((o) => o.cargo_sent)

  const activeOrders =
    activeTab === 'known'
      ? pendingKnown
      : activeTab === 'unknown'
      ? pendingUnknown
      : shippedOrders

  return (
    <div>
      {/* Sekme Butonları */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <button
          onClick={() => setActiveTab('known')}
          className={`btn ${activeTab === 'known' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <span>👥 Bilinen Müşteriler</span>
          <span style={{ background: 'rgba(255,255,255,0.15)', padding: '0.1rem 0.4rem', borderRadius: '10px', fontSize: '0.75rem' }}>
            {pendingKnown.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('unknown')}
          className={`btn ${activeTab === 'unknown' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <span>👤 Bilinmeyen Müşteriler</span>
          <span style={{ background: 'rgba(255,255,255,0.15)', padding: '0.1rem 0.4rem', borderRadius: '10px', fontSize: '0.75rem' }}>
            {pendingUnknown.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('shipped')}
          className={`btn ${activeTab === 'shipped' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <span>🚚 Gönderilmiş Siparişler</span>
          <span style={{ background: 'rgba(255,255,255,0.15)', padding: '0.1rem 0.4rem', borderRadius: '10px', fontSize: '0.75rem' }}>
            {shippedOrders.length}
          </span>
        </button>
      </div>

      {/* Gönderilen Siparişler Özeti */}
      {activeTab === 'shipped' && (
        <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--success)' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '50%', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Truck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Toplam Gönderilen Sipariş Sayısı</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffffff' }}>{shippedOrders.length} adet</div>
          </div>
        </div>
      )}

      {/* Kart Listesi */}
      {activeOrders.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {activeOrders.map((order) => {
            const dealerName = order.profiles?.username || 'Bilinmeyen Bayi'

            return (
              <div
                key={order.id}
                className="glass-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderLeft: order.cargo_sent
                    ? '4px solid var(--success)'
                    : '4px solid var(--warning)',
                  padding: '1.5rem',
                }}
              >
                <div>
                  {/* Başlık ve Durum */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
                      {order.receiver_name}
                    </h3>
                    <span className={order.cargo_sent ? 'badge badge-success' : 'badge badge-warning'}>
                      {order.cargo_sent ? 'Gönderildi' : 'Kargo Bekliyor'}
                    </span>
                  </div>

                  {/* Detay Bilgileri */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      <Tag size={16} style={{ color: 'var(--primary)' }} />
                      <span>Sipariş Kodu:</span>
                      <span style={{ color: 'var(--primary)', fontWeight: 700, fontFamily: 'monospace' }}>
                        {order.order_code || '-'}
                      </span>
                      {order.order_code && <CopyButton text={order.order_code} />}
                    </div>

                    {order.cargo_sent && order.delivery_status && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                        <Truck size={16} style={{ color: 'var(--primary)' }} />
                        <span>Teslimat Durumu:</span>
                        {order.delivery_status === 'delivered' ? (
                          <span className="badge badge-success" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                            Canlı Sağlıklı Teslim Edildi
                          </span>
                        ) : (
                          <span className="badge badge-danger" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                            Sorun Bildirildi
                          </span>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      <Phone size={16} style={{ color: 'var(--primary)' }} />
                      <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                        {order.phone_number || 'Telefon Yok'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      <MapPin size={16} style={{ color: 'var(--primary)' }} />
                      <span style={{ color: 'var(--text-main)' }}>
                        {order.city} / {order.district} ({order.cargo_branch})
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      <User size={16} style={{ color: 'var(--primary)' }} />
                      <span>Satıcı Bayi:</span>
                      <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                        @{dealerName}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      <Calendar size={16} style={{ color: 'var(--primary)' }} />
                      <span>Sipariş Tarihi:</span>
                      <span>
                        {new Date(order.created_at).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Sepet İçeriği Görünümü */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary)' }}>
                      <ShoppingCart size={14} />
                      <span>Gönderilecek Ürünler:</span>
                    </div>
                    {order.order_items?.map((item, idx) => (
                      <div key={idx} style={{ fontSize: '0.8rem', fontStyle: 'italic', padding: '0.15rem 0' }}>
                        • {item.species?.name || 'Bilinmeyen Tür'} ({item.quantity} adet)
                      </div>
                    ))}
                  </div>
                </div>

                {/* Kargo İşlem Formu */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                  <form action={updateShippingStatus} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input type="hidden" name="id" value={order.id} />

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" htmlFor={`shipping_company_id_${order.id}`} style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Truck size={14} />
                        <span>Kargo Firması</span>
                      </label>
                      <select
                        name="shipping_company_id"
                        id={`shipping_company_id_${order.id}`}
                        className="form-input"
                        defaultValue={order.shipping_company_id || ''}
                        style={{ height: '38px', padding: '0.5rem 0.75rem' }}
                        required
                      >
                        <option value="" disabled>Kargo Firması Seçin</option>
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" htmlFor={`cargo_code_${order.id}`} style={{ fontSize: '0.75rem' }}>
                        Kargo Takip Kodu
                      </label>
                      <input
                        type="text"
                        name="cargo_code"
                        id={`cargo_code_${order.id}`}
                        className="form-input"
                        placeholder="Örn: YK-123456789"
                        defaultValue={order.cargo_code || ''}
                        style={{ height: '38px', padding: '0.5rem 0.75rem' }}
                        onChange={(e) => {
                          const selectEl = document.getElementById(`cargo_sent_${order.id}`) as HTMLSelectElement;
                          if (selectEl) {
                            if (e.target.value.trim().length > 0) {
                              selectEl.value = 'true';
                            } else {
                              selectEl.value = 'false';
                            }
                          }
                        }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" htmlFor={`cargo_sent_${order.id}`} style={{ fontSize: '0.75rem' }}>
                        Gönderim Durumu
                      </label>
                      <select
                        name="cargo_sent"
                        id={`cargo_sent_${order.id}`}
                        className="form-input"
                        defaultValue={String(order.cargo_sent)}
                        style={{ height: '38px', padding: '0.5rem 0.75rem' }}
                      >
                        <option value="false">Kargo Bekliyor</option>
                        <option value="true">Kargoya Verildi</option>
                      </select>
                    </div>

                    <button type="submit" className="btn btn-primary w-full" style={{ height: '38px', padding: '0.5rem' }}>
                      <Check size={16} />
                      <span>{order.cargo_sent ? 'Gönderiyi Güncelle' : 'Kargoya Ver'}</span>
                    </button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)' }}>
          <PackageOpen size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <p>
            {activeTab === 'shipped'
              ? 'Henüz gönderilmiş bir sipariş bulunmuyor.'
              : 'Bu sekmede kargo bekleyen sipariş bulunmuyor.'}
          </p>
        </div>
      )}
    </div>
  )
}
