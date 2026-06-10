'use client'

import React, { useActionState } from 'react'
import Link from 'next/link'
import { createOrder } from '../actions'

interface Species {
  id: string
  name: string
  price: number
}

export default function OrderForm({ speciesList }: { speciesList: Species[] }) {
  const [state, formAction, isPending] = useActionState(createOrder, { error: null as string | null })

  return (
    <form action={formAction}>
      {state?.error && (
        <div className="auth-error">
          {state.error}
        </div>
      )}

      <div className="form-group">
        <label className="form-label" htmlFor="receiver_name">Alıcı Adı Soyadı</label>
        <input
          type="text"
          id="receiver_name"
          name="receiver_name"
          className="form-input"
          placeholder="Örn: Ahmet Yılmaz"
          required
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="city">Şehir</label>
          <input
            type="text"
            id="city"
            name="city"
            className="form-input"
            placeholder="Örn: Ankara"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="district">İlçe</label>
          <input
            type="text"
            id="district"
            name="district"
            className="form-input"
            placeholder="Örn: Çankaya"
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="cargo_branch">Kargo Teslim Şubesi</label>
        <input
          type="text"
          id="cargo_branch"
          name="cargo_branch"
          className="form-input"
          placeholder="Örn: Yurtiçi Kargo Bahçelievler Şubesi"
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="species_id">Tarantula Türü</label>
        <select
          id="species_id"
          name="species_id"
          className="form-input"
          required
          defaultValue=""
        >
          <option value="" disabled>Tarantula Türü Seçin</option>
          {speciesList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} - {Number(s.price).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
        <input
          type="checkbox"
          id="payment_completed"
          name="payment_completed"
          value="true"
          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
        />
        <label htmlFor="payment_completed" style={{ fontSize: '0.875rem', color: 'var(--text-main)', cursor: 'pointer' }}>
          Ödeme İletildi (Müşteri ödemeyi tamamladı)
        </label>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
        <Link href="/dealer" className="btn btn-secondary w-full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          İptal
        </Link>
        <button type="submit" className="btn btn-primary w-full" disabled={isPending}>
          {isPending ? 'Kaydediliyor...' : 'Satışı Kaydet'}
        </button>
      </div>
    </form>
  )
}
