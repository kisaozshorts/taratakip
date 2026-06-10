import React from 'react'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'

export default async function PendingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile && profile.role !== 'pending') {
    redirect('/')
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <div className="glass-card" style={{ maxWidth: '500px', padding: '3rem' }}>
        <div style={{
          background: 'rgba(245, 158, 11, 0.1)',
          color: 'var(--warning)',
          borderRadius: '50%',
          width: '64px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem auto'
        }}>
          <ShieldAlert size={36} />
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#ffffff' }}>
          Hesabınız Onay Bekliyor
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
          Kaydınız başarıyla alındı. Sisteme erişebilmeniz için yöneticinin (Admin) hesabınızı onaylaması ve rolünüzü (Bayi veya Kargocu) tanımlaması gerekmektedir.
        </p>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
          Lütfen daha sonra tekrar kontrol edin. Rolünüz atandığında bu sayfa güncellenecektir (Sayfayı yenileyebilirsiniz).
        </div>
      </div>
    </div>
  )
}
