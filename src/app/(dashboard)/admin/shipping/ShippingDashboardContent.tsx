import React from 'react'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { Plus, Trash2, Truck } from 'lucide-react'
import DeleteButton from '@/components/DeleteButton'
import { Logger } from '@/utils/logger'

export default async function ShippingDashboardContent() {
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

  // Kargo firmalarını çekelim
  const { data: companies } = await supabase
    .from('shipping_companies')
    .select('*')
    .order('name', { ascending: true })

  // Eylem 1: Firma Ekle (Server Action)
  async function addCompany(formData: FormData) {
    'use server'
    const name = formData.get('name') as string

    if (!name || name.trim().length === 0) return

    const supabaseClient = await createClient()
    
    Logger.info(`Yeni kargo firması ekleniyor: ${name}`)
    const { error } = await supabaseClient.from('shipping_companies').insert({
      name: name.trim(),
    })

    if (error) {
      Logger.error(`Kargo firması eklenirken hata: ${error.message}`)
    }

    revalidatePath('/admin/shipping')
  }

  // Eylem 2: Firma Sil (Server Action)
  async function deleteCompany(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    if (!id) return

    const supabaseClient = await createClient()
    
    Logger.info(`Kargo firması siliniyor. ID: ${id}`)
    const { error } = await supabaseClient.from('shipping_companies').delete().eq('id', id)

    if (error) {
      Logger.error(`Kargo firması silinirken hata: ${error.message}`)
    }

    revalidatePath('/admin/shipping')
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
      
      {/* Sol Kolon: Yeni Firma Ekle */}
      <div>
        <div className="glass-card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={20} style={{ color: 'var(--primary)' }} />
            Yeni Firma Tanımla
          </h2>
          <form action={addCompany}>
            <div className="form-group">
              <label className="form-label" htmlFor="name">Kargo Firması Adı</label>
              <input
                type="text"
                name="name"
                id="name"
                className="form-input"
                placeholder="Örn: MNG Kargo"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary w-full" style={{ marginTop: '0.5rem' }}>
              Firma Ekle
            </button>
          </form>
        </div>
      </div>

      {/* Sağ Kolon: Mevcut Firmalar Listesi */}
      <div style={{ flex: 2 }}>
        <div className="glass-card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Truck size={20} style={{ color: 'var(--primary)' }} />
            Sistemdeki Kargo Firmaları
          </h2>

          {companies && companies.length > 0 ? (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Firma Adı</th>
                    <th>Tanımlanma Tarihi</th>
                    <th style={{ textAlign: 'right' }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {new Date(c.created_at).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <DeleteButton
                          id={c.id}
                          action={deleteCompany}
                          confirmMessage="Bu kargo firmasını silmek istediğinizden emin misiniz? (Bu firmaya ait geçmiş siparişlerin kargo firma bilgisi temizlenecektir)"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
              Sistemde tanımlanmış bir kargo firması bulunmuyor.
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
