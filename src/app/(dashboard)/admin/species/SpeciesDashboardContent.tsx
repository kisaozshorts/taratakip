import React from 'react'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { Plus, Edit2, Check, X, Tags } from 'lucide-react'
import Link from 'next/link'
import DeleteButton from '@/components/DeleteButton'

interface SearchParams {
  edit?: string
}

export default async function SpeciesDashboardContent({
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

  // Tüm veritabanı sorgularını PARALEL çalıştıralım (Mükemmel performans artışı!)
  const [profileRes, speciesRes] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('species').select('*').order('name', { ascending: true })
  ])

  const profile = profileRes.data
  const species = speciesRes.data

  if (profile?.role !== 'admin') {
    redirect('/')
  }

  const p = await searchParams
  const editId = p.edit

  // Eylem 1: Tür Ekle (Server Action)
  async function addSpecies(formData: FormData) {
    'use server'
    const name = formData.get('name') as string
    const price = Number(formData.get('price'))

    if (!name || isNaN(price)) return

    const supabaseClient = await createClient()
    await supabaseClient.from('species').insert({
      name: name.trim(),
      price,
    })

    revalidatePath('/admin/species')
  }

  // Eylem 2: Tür Güncelle (Server Action)
  async function updateSpecies(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const price = Number(formData.get('price'))

    if (!id || !name || isNaN(price)) return

    const supabaseClient = await createClient()
    await supabaseClient
      .from('species')
      .update({
        name: name.trim(),
        price,
      })
      .eq('id', id)

    redirect('/admin/species') // Edit modundan çıkmak için yönlendir
  }

  // Eylem 3: Tür Sil (Server Action)
  async function deleteSpecies(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    if (!id) return

    const supabaseClient = await createClient()
    await supabaseClient.from('species').delete().eq('id', id)

    revalidatePath('/admin/species')
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
      
      {/* Sol Kolon: Yeni Tür Ekle */}
      <div>
        <div className="glass-card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={20} style={{ color: 'var(--primary)' }} />
            Yeni Tür Tanımla
          </h2>
          <form action={addSpecies}>
            <div className="form-group">
              <label className="form-label" htmlFor="name">Tarantula Tür Adı</label>
              <input
                type="text"
                name="name"
                id="name"
                className="form-input"
                placeholder="Örn: Brachypelma hamorii"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="price">Satış Fiyatı (TL)</label>
              <input
                type="number"
                step="0.01"
                name="price"
                id="price"
                className="form-input"
                placeholder="Örn: 450.00"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary w-full" style={{ marginTop: '0.5rem' }}>
              Tür Ekle
            </button>
          </form>
        </div>
      </div>

      {/* Sağ Kolon: Mevcut Türler Listesi */}
      <div style={{ flex: 2 }}>
        <div className="glass-card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Tags size={20} style={{ color: 'var(--primary)' }} />
            Sistemdeki Türler
          </h2>

          {species && species.length > 0 ? (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Tür Adı</th>
                    <th>Fiyat</th>
                    <th style={{ textAlign: 'right' }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {species.map((s) => {
                    const isEditing = editId === s.id

                    if (isEditing) {
                      return (
                        <tr key={s.id} style={{ background: 'rgba(99, 102, 241, 0.05)' }}>
                          <td colSpan={3} style={{ padding: '0.5rem' }}>
                            <form action={updateSpecies} style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                              <input type="hidden" name="id" value={s.id} />
                              <input
                                type="text"
                                name="name"
                                className="form-input"
                                defaultValue={s.name}
                                required
                                style={{ flex: 2 }}
                              />
                              <input
                                type="number"
                                step="0.01"
                                name="price"
                                className="form-input"
                                defaultValue={s.price}
                                required
                                style={{ flex: 1 }}
                              />
                              <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 0.75rem' }} title="Kaydet">
                                <Check size={16} />
                              </button>
                              <Link href="/admin/species" className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center' }} title="İptal">
                                <X size={16} />
                              </Link>
                            </form>
                          </td>
                        </tr>
                      )
                    }

                    return (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 600, fontStyle: 'italic' }}>{s.name}</td>
                        <td>
                          {Number(s.price).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                        </td>
                        <td style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <Link
                            href={`/admin/species?edit=${s.id}`}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.5rem' }}
                            title="Düzenle"
                          >
                            <Edit2 size={16} />
                          </Link>

                          <DeleteButton
                            id={s.id}
                            action={deleteSpecies}
                            confirmMessage="Bu türü silmek istediğinizden emin misiniz?"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
              Henüz tanımlanmış bir tarantula türü bulunmuyor.
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
