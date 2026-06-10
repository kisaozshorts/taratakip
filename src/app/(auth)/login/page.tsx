'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { login } from '../actions'

const initialState = {
  error: null as string | null,
}

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, initialState)

  return (
    <div className="auth-card-container">
      <div className="glass-card auth-card">
        <h2 className="auth-title">Taranutla'ya Giriş</h2>
        <p className="auth-subtitle">Bayilik Kontrol ve Sipariş Takip Sistemi</p>
        
        <form action={formAction} className="auth-form">
          {state?.error && (
            <div className="auth-error">
              {state.error}
            </div>
          )}

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
            {isPending ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        <p className="auth-footer">
          Hesabınız yok mu?{' '}
          <Link href="/register" className="auth-link">
            Bayi / Kargocu Kaydı Oluştur
          </Link>
        </p>
      </div>
    </div>
  )
}
