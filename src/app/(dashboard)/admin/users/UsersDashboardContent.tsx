import React from 'react'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { Users, UserCheck, ShieldAlert, ShieldCheck } from 'lucide-react'

export default async function UsersDashboardContent() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Tüm veritabanı sorgularını PARALEL çalıştıralım
  const [profileRes, profilesRes] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('profiles').select('*').neq('id', user.id).order('created_at', { ascending: false })
  ])

  const profile = profileRes.data
  const profiles = profilesRes.data

  if (profile?.role !== 'admin') {
    redirect('/')
  }

  // Eylem 1: Rol Güncelle (Server Action)
  async function updateRole(formData: FormData) {
    'use server'
    const profileId = formData.get('id') as string
    const newRole = formData.get('role') as string

    if (!profileId || !newRole) return

    const supabaseClient = await createClient()
    await supabaseClient
      .from('profiles')
      .update({ role: newRole })
      .eq('id', profileId)

    revalidatePath('/admin/users')
  }

  // Eylem 2: Bilinmeyen Bayi Durumu Değiştir (Server Action)
  async function toggleUnknownDealer(formData: FormData) {
    'use server'
    const profileId = formData.get('id') as string
    const currentStatus = formData.get('currentStatus') === 'true'

    const supabaseClient = await createClient()
    
    // Profili güncelle
    await supabaseClient
      .from('profiles')
      .update({ is_unknown_dealer: !currentStatus })
      .eq('id', profileId)

    // Eğer bilinmeyen bayi yapıldıysa, tüm mevcut siparişlerini de bilinmeyen yap
    if (!currentStatus === true) {
      await supabaseClient
        .from('orders')
        .update({ is_known_customer: false })
        .eq('dealer_id', profileId)
    }

    revalidatePath('/admin/users')
  }

  const getRoleBadgeClass = (role: string) => {
    if (role === 'admin') return 'badge badge-danger'
    if (role === 'dealer') return 'badge badge-success'
    if (role === 'shipper') return 'badge badge-info'
    return 'badge badge-warning'
  }

  const getRoleText = (role: string) => {
    if (role === 'admin') return 'Yönetici'
    if (role === 'dealer') return 'Bayi'
    if (role === 'shipper') return 'Kargocu'
    return 'Onay Bekliyor (Pasif)'
  }

  return (
    <div className="glass-card">
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Users size={20} style={{ color: 'var(--primary)' }} />
        Kullanıcı Hesapları Yetkilendirme
      </h2>

      {profiles && profiles.length > 0 ? (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Kullanıcı Adı</th>
                <th>Mevcut Yetki</th>
                <th style={{ textAlign: 'center' }}>Bilinmeyen Bayi mi? (Only Dealer)</th>
                <th>Kayıt Tarihi</th>
                <th style={{ textAlign: 'right' }}>Yeni Yetki Ata</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>@{p.username}</td>
                  <td>
                    <span className={getRoleBadgeClass(p.role)}>
                      {getRoleText(p.role)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {p.role === 'dealer' ? (
                      <form action={toggleUnknownDealer} style={{ display: 'inline-block' }}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="currentStatus" value={String(p.is_unknown_dealer)} />
                        <button
                          type="submit"
                          className={p.is_unknown_dealer ? 'badge badge-danger' : 'badge badge-secondary'}
                          style={{
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0.35rem 0.65rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            borderRadius: '4px'
                          }}
                          title={p.is_unknown_dealer ? 'Bilinen bayi yapmak için tıklayın' : 'Bilinmeyen bayi yapmak için tıklayın'}
                        >
                          {p.is_unknown_dealer ? (
                            <>
                              <ShieldAlert size={12} />
                              <span>Evet (Bilinmeyen)</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck size={12} />
                              <span>Hayır (Bilinen)</span>
                            </>
                          )}
                        </button>
                      </form>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {new Date(p.created_at).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <form action={updateRole} style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <input type="hidden" name="id" value={p.id} />
                      <select name="role" className="form-input" defaultValue={p.role} style={{ width: '180px', padding: '0.4rem 0.75rem', height: '36px' }}>
                        <option value="pending">Onay Bekliyor</option>
                        <option value="dealer">Bayi (Dealer)</option>
                        <option value="shipper">Kargocu (Shipper)</option>
                        <option value="admin">Yönetici (Admin)</option>
                      </select>
                      <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', height: '36px' }} title="Rolü Kaydet">
                        <UserCheck size={16} />
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
          Sistemde yetkilendirilecek başka bir kullanıcı hesabı bulunmuyor.
        </div>
      )}
    </div>
  )
}
