import React from 'react'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { updateShippingStatus } from './actions'
import { Truck, Check, PackageOpen, Calendar, MapPin, Tag, User } from 'lucide-react'

export default async function ShipperPage() {
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

  // Sadece ödemesi iletilmiş siparişleri getirelim
  const { data: orders } = await supabase
    .from('orders')
    .select('*, species:species_id(name), profiles:dealer_id(username)')
    .eq('payment_completed', true)
    .order('cargo_sent', { ascending: true }) // Kargo bekleyenler üstte gözüksün
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📦 Kargo Gönderi Yönetimi</h1>
      </div>

      <div className="glass-card" style={{ marginBottom: '2rem', background: 'rgba(99, 102, 241, 0.05)' }}>
        <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--text-main)' }}>
          <strong>Bilgilendirme:</strong> Aşağıda yalnızca ödemesi tamamlanmış olan satışlar listelenmektedir. Siparişlerin kargo durumlarını ve takip kodlarını bu panel üzerinden güncelleyebilirsiniz.
        </p>
      </div>

      {orders && orders.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {orders.map((order) => {
            const speciesName = (order.species as any)?.name || 'Bilinmeyen Tür'
            const dealerName = (order.profiles as any)?.username || 'Bilinmeyen Bayi'

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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      <MapPin size={16} style={{ color: 'var(--primary)' }} />
                      <span style={{ color: 'var(--text-main)' }}>
                        {order.city} / {order.district} ({order.cargo_branch})
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      <Tag size={16} style={{ color: 'var(--primary)' }} />
                      <span style={{ color: 'var(--text-main)', fontStyle: 'italic' }}>
                        {speciesName}
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
                </div>

                {/* Kargo İşlem Formu */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                  <form action={updateShippingStatus} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input type="hidden" name="id" value={order.id} />

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
                      <span>Bilgileri Güncelle</span>
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
          <p>Şu anda gönderilmeyi bekleyen (ödenmiş) herhangi bir sipariş bulunmuyor.</p>
        </div>
      )}
    </div>
  )
}
