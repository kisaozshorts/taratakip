'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signup } from '../actions'

const initialState = {
  error: null as string | null,
}

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(signup, initialState)

  return (
    <div className="auth-card-container">
      <div className="glass-card auth-card">
        <h2 className="auth-title">Yeni Hesap Oluştur</h2>
        <p className="auth-subtitle">Bayi veya Kargocu olarak sisteme kaydolun</p>
        
        <form action={formAction} className="auth-form">
          {state?.error && (
            <div className="auth-error">
              {state.error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="username">Kullanıcı Adı (Bayi/Kargo Adı)</label>
            <input
              className="form-input"
              type="text"
              id="username"
              name="username"
              placeholder="Örn: antalyabayisi"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">E-posta</label>
            <input
              className="form-input"
              type="email"
              id="email"
              name="email"
              placeholder="ornek@taranutla.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Şifre</label>
            <input
              className="form-input"
              type="password"
              id="password"
              name="password"
              placeholder="••••••••"
              required
            />
          </div>

          <button className="btn btn-primary w-full" type="submit" disabled={isPending}>
            {isPending ? 'Kaydolunuyor...' : 'Kayıt Ol'}
          </button>
        </form>

        <p className="auth-footer">
          Zaten hesabınız var mı?{' '}
          <Link href="/login" className="auth-link">
            Giriş Yapın
          </Link>
        </p>
      </div>
    </div>
  )
}
