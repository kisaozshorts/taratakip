'use client'

import React, { useActionState } from 'react'
import Link from 'next/link'
import { updateOrder } from '../../actions'

interface Species {
  id: string
  name: string
  price: number
}

interface Order {
  id: string
  receiver_name: string
  city: string
  district: string
  cargo_branch: string
  species_id: string
}

export default function EditOrderForm({ order, speciesList }: { order: Order; speciesList: Species[] }) {
  const [state, formAction, isPending] = useActionState(updateOrder, { error: null as string | null })

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={order.id} />
      
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
          defaultValue={order.receiver_name}
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
            defaultValue={order.city}
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
            defaultValue={order.district}
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
          defaultValue={order.cargo_branch}
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
          defaultValue={order.species_id || ''}
        >
          {speciesList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} - {Number(s.price).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
        <Link href="/dealer" className="btn btn-secondary w-full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          İptal
        </Link>
        <button type="submit" className="btn btn-primary w-full" disabled={isPending}>
          {isPending ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
        </button>
      </div>
    </form>
  )
}
