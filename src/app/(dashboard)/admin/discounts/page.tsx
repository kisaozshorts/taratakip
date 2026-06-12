import React from 'react'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { Plus, Trash2, Percent, Tag, ShieldCheck, Gem } from 'lucide-react'
import DeleteButton from '@/components/DeleteButton'

export default async function AdminDiscountsPage() {
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

  // Tarantula türlerini ve mevcut toplu indirimleri paralel çekelim
  const [speciesRes, discountsRes] = await Promise.all([
    supabase.from('species').select('id, name, price').order('name', { ascending: true }),
    supabase.from('bulk_discounts')
      .select('*, species:species_id(name, price)')
      .order('created_at', { ascending: false })
  ])

  const speciesList = speciesRes.data || []
  const discounts = discountsRes.data || []

  // Eylem 1: Toplu İndirim Ekle (Server Action)
  async function addBulkDiscount(formData: FormData) {
    'use server'
    const speciesId = formData.get('species_id') as string
    const quantity = Number(formData.get('quantity'))
    const discountedPrice = Number(formData.get('discounted_price'))

    if (!speciesId || isNaN(quantity) || quantity <= 1 || isNaN(discountedPrice) || discountedPrice < 0) {
      return
    }

    const supabaseClient = await createClient()
    const { error } = await supabaseClient
      .from('bulk_discounts')
      .insert({
        species_id: speciesId,
        quantity,
        discounted_price: discountedPrice
      })

    if (error) {
      console.error('İndirim eklenirken hata oluştu:', error.message)
    }

    revalidatePath('/admin/discounts')
  }

  // Eylem 2: Toplu İndirim Sil (Server Action)
  async function deleteBulkDiscount(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    if (!id) return

    const supabaseClient = await createClient()
    await supabaseClient.from('bulk_discounts').delete().eq('id', id)

    revalidatePath('/admin/discounts')
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
      {/* Sol Kolon: Yeni Toplu İndirim Tanımla */}
      <div>
        <div className="glass-card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={20} style={{ color: 'var(--primary)' }} />
            Toplu Paket İndirimi Ekle
          </h2>
          
          <form action={addBulkDiscount}>
            <div className="form-group">
              <label className="form-label" htmlFor="species_id">Tarantula Türü</label>
              <select name="species_id" id="species_id" className="form-input" required style={{ height: '42px' }}>
                <option value="" disabled selected>Tür Seçin</option>
                {speciesList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} - {Number(s.price).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="quantity">Min. Adet (Threshold)</label>
                <input
                  type="number"
                  min="2"
                  name="quantity"
                  id="quantity"
                  className="form-input"
                  placeholder="Örn: 3 veya 5"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="discounted_price">Kampanyalı Birim Fiyat (TL)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="discounted_price"
                  id="discounted_price"
                  className="form-input"
                  placeholder="Örn: 350"
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full" style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Percent size={16} />
              <span>İndirimi Tanımla</span>
            </button>
          </form>

          <div className="glass-card" style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px dashed var(--border-color)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <h4 style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Gem size={12} />
              Toplu Sipariş Sistemi Nasıl Çalışır?
            </h4>
            <p style={{ lineHeight: '1.4' }}>
              Bir bayi sipariş oluştururken seçtiği adet, tanımladığınız min. adet sınırına ulaştığında veya aştığında, tarantulanın birim fiyatı otomatik olarak girdiğiniz kampanyalı fiyata düşer. Bayiye özel yüzdelik bir indirim de varsa, bu toplu indirimli fiyat üzerinden düşülecektir.
            </p>
          </div>
        </div>
      </div>

      {/* Sağ Kolon: Tanımlı Toplu İndirimler Listesi */}
      <div style={{ flex: 2 }}>
        <div className="glass-card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Tag size={20} style={{ color: 'var(--primary)' }} />
            Aktif Kampanyalar & Paket İndirimleri
          </h2>

          {discounts && discounts.length > 0 ? (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Tarantula Türü</th>
                    <th style={{ textAlign: 'center' }}>Paket Eşiği</th>
                    <th>Liste Fiyatı</th>
                    <th>Kampanyalı Fiyat</th>
                    <th style={{ textAlign: 'center' }}>Kazanç %</th>
                    <th style={{ textAlign: 'right' }}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {discounts.map((d: any) => {
                    const originalPrice = Number(d.species?.price || 0)
                    const discountedPrice = Number(d.discounted_price)
                    const percentSavings = originalPrice > 0 ? Math.round(((originalPrice - discountedPrice) / originalPrice) * 100) : 0
                    
                    return (
                      <tr key={d.id}>
                        <td style={{ fontWeight: 600, fontStyle: 'italic' }}>
                          {d.species?.name || 'Silinmiş Tür'}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>
                          {d.quantity}'li Paket (ve üzeri)
                        </td>
                        <td style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {originalPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--success)' }}>
                          {discountedPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-success" style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', fontWeight: 700 }}>
                            %{percentSavings} İndirim
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <DeleteButton
                            id={d.id}
                            action={deleteBulkDiscount}
                            confirmMessage="Bu toplu indirimi silmek istediğinizden emin misiniz?"
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
              Sistemde tanımlı herhangi bir toplu paket indirimi bulunmuyor.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
