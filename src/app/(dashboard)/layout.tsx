import React from 'react'
export const unstable_instant = false

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { logout } from '../(auth)/actions'
import {
  ShoppingBag,
  PlusCircle,
  Tags,
  Users,
  LogOut,
  User,
  ShieldAlert,
  Truck
} from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

export default async function DashboardLayout({ children }: LayoutProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, role')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'pending'
  const username = profile?.username || 'Kullanıcı'

  // Rol bazlı menü başlıklarını oluştur
  const renderNavLinks = () => {
    switch (role) {
      case 'admin':
        return (
          <>
            <li>
              <Link href="/admin" className="sidebar-link">
                <ShoppingBag size={18} />
                <span>Tüm Siparişler</span>
              </Link>
            </li>
            <li>
              <Link href="/admin/species" className="sidebar-link">
                <Tags size={18} />
                <span>Tür & Fiyat Yönetimi</span>
              </Link>
            </li>
            <li>
              <Link href="/admin/shipping" className="sidebar-link">
                <Truck size={18} />
                <span>Kargo Firmaları Yönetimi</span>
              </Link>
            </li>
            <li>
              <Link href="/admin/users" className="sidebar-link">
                <Users size={18} />
                <span>Bayi & Rol Yönetimi</span>
              </Link>
            </li>
          </>
        )
      case 'dealer':
        return (
          <>
            <li>
              <Link href="/dealer" className="sidebar-link">
                <ShoppingBag size={18} />
                <span>Siparişlerim</span>
              </Link>
            </li>
            <li>
              <Link href="/dealer/new-order" className="sidebar-link">
                <PlusCircle size={18} />
                <span>Yeni Sipariş Ekle</span>
              </Link>
            </li>
          </>
        )
      case 'shipper':
        return (
          <>
            <li>
              <Link href="/shipper" className="sidebar-link">
                <Truck size={18} />
                <span>Kargo Gönderileri</span>
              </Link>
            </li>
          </>
        )
      default:
        return null
    }
  }

  // Rol etiket rengi
  const getRoleBadgeClass = () => {
    if (role === 'admin') return 'badge badge-danger'
    if (role === 'dealer') return 'badge badge-success'
    if (role === 'shipper') return 'badge badge-info'
    return 'badge badge-warning'
  }

  const getRoleText = () => {
    if (role === 'admin') return 'Yönetici'
    if (role === 'dealer') return 'Bayi'
    if (role === 'shipper') return 'Kargocu'
    return 'Onay Bekliyor'
  }

  return (
    <div className="layout-wrapper">
      {/* Sol Menü / Sidebar */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-brand">
            <span style={{ color: 'var(--primary)', fontWeight: 800 }}>🕷 TARANUTLA</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>v1.0</span>
          </div>

          <nav>
            <ul className="sidebar-menu">
              {renderNavLinks()}
            </ul>
          </nav>
        </div>

        {/* Profil Bilgisi ve Çıkış */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <User size={18} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff' }}>@{username}</div>
              <span className={getRoleBadgeClass()} style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem', marginTop: '0.2rem' }}>
                {getRoleText()}
              </span>
            </div>
          </div>

          <form action={logout}>
            <button className="btn btn-secondary w-full" style={{ justifyContent: 'flex-start', padding: '0.5rem 1rem' }} type="submit">
              <LogOut size={16} />
              <span>Çıkış Yap</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Ana İçerik Alanı */}
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
