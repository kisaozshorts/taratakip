'use client'

import React, { useActionState, useState } from 'react'
import Link from 'next/link'
import { createOrder } from '../actions'
import { Plus, Trash2, ShoppingCart } from 'lucide-react'

interface Species {
  id: string
  name: string
  price: number
}

interface CartItem {
  speciesId: string
  name: string
  price: number
  quantity: number
}

export default function OrderForm({
  speciesList,
  isUnknownDealer
}: {
  speciesList: Species[]
  isUnknownDealer: boolean
}) {
  const [state, formAction, isPending] = useActionState(createOrder, { error: null as string | null })
  const [cart, setCart] = useState<CartItem[]>([])
  
  // Seçili tarantula ve adet state'leri
  const [selectedSpeciesId, setSelectedSpeciesId] = useState('')
  const [quantity, setQuantity] = useState(1)

  // Sepete ürün ekleme
  const handleAddToBag = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!selectedSpeciesId) return

    const selectedSpecies = speciesList.find((s) => s.id === selectedSpeciesId)
    if (!selectedSpecies) return

    const existingIndex = cart.findIndex((item) => item.speciesId === selectedSpeciesId)
    if (existingIndex > -1) {
      // Zaten varsa adet arttır
      const updatedCart = [...cart]
      updatedCart[existingIndex].quantity += quantity
      setCart(updatedCart)
    } else {
      // Yoksa yeni ekle
      setCart([
        ...cart,
        {
          speciesId: selectedSpecies.id,
          name: selectedSpecies.name,
          price: Number(selectedSpecies.price),
          quantity: quantity
        }
      ])
    }

    // Reset
    setSelectedSpeciesId('')
    setQuantity(1)
  }

  // Sepetten ürün silme
  const handleRemoveFromBag = (index: number) => {
    setCart(cart.filter((_, i) => i !== index))
  }

  // Toplam sepet tutarı
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <form action={formAction}>
      {state?.error && (
        <div className="auth-error" style={{ marginBottom: '1.5rem' }}>
          {state.error}
        </div>
      )}

      {/* Alıcı Bilgileri */}
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

      <div className="form-group">
        <label className="form-label" htmlFor="phone_number">Alıcı Telefon Numarası</label>
        <input
          type="tel"
          id="phone_number"
          name="phone_number"
          className="form-input"
          placeholder="Örn: 0555 123 45 67"
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

      {/* Müşteri Tipi - Eğer admin bayiyi bilinmeyen yapmadıysa gösterilir */}
      {!isUnknownDealer ? (
        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', marginBottom: '1.5rem' }}>
          <input
            type="checkbox"
            id="is_known_customer"
            name="is_known_customer"
            value="true"
            defaultChecked
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <label htmlFor="is_known_customer" style={{ fontSize: '0.875rem', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 500 }}>
            Müşteri Biliniyor (Güvenilir Tanıdık Müşteri)
          </label>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', marginBottom: '1.5rem', borderRadius: '8px' }}>
          <p style={{ fontSize: '0.8rem', color: '#f87171', margin: 0, fontWeight: 500 }}>
            ⚠️ Hesabınız "Bilinmeyen Bayi" olarak işaretlendiği için bu sipariş otomatik olarak <strong>Bilinmeyen Müşteri</strong> olarak kaydedilecektir.
          </p>
          <input type="hidden" name="is_known_customer" value="false" />
        </div>
      )}

      {/* SEPET SİSTEMİ */}
      <div className="glass-card" style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
          <ShoppingCart size={18} />
          Sipariş Sepeti (Çoklu Tarantula Satışı)
        </h3>

        {/* Sepete Ekleme Form Alanları */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ flex: 3 }}>
            <select
              id="species_select"
              className="form-input"
              value={selectedSpeciesId}
              onChange={(e) => setSelectedSpeciesId(e.target.value)}
              style={{ height: '42px' }}
            >
              <option value="">Tarantula Türü Seçin</option>
              {speciesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} - {Number(s.price).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1 }}>
            <input
              type="number"
              min="1"
              className="form-input"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              placeholder="Adet"
              style={{ height: '42px', textAlign: 'center' }}
            />
          </div>

          <button
            onClick={handleAddToBag}
            disabled={!selectedSpeciesId}
            className="btn btn-primary"
            style={{ height: '42px', padding: '0 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Plus size={16} />
            <span>Ekle</span>
          </button>
        </div>

        {/* Sepet İçeriği Listesi */}
        {cart.length > 0 ? (
          <div>
            <div className="table-container" style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '1rem' }}>
              <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Tür Adı</th>
                    <th style={{ textAlign: 'center' }}>Adet</th>
                    <th>Birim Fiyat</th>
                    <th>Toplam</th>
                    <th style={{ textAlign: 'right' }}>Sil</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, index) => (
                    <tr key={index}>
                      <td style={{ fontStyle: 'italic', fontWeight: 600 }}>{item.name}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.quantity} adet</td>
                      <td>{item.price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                      <td style={{ fontWeight: 600 }}>
                        {(item.price * item.quantity).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromBag(index)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Toplam Fiyat */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', fontWeight: 700 }}>
              <span style={{ color: 'var(--text-muted)' }}>Genel Toplam Tutar:</span>
              <span style={{ fontSize: '1.2rem', color: 'var(--success)' }}>
                {totalPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.875rem', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
            Sipariş sepetiniz henüz boş.
          </div>
        )}
      </div>

      {/* Sepet Kalemleri Gizli Input */}
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(cart.map((i) => ({ speciesId: i.speciesId, quantity: i.quantity })))}
      />

      {/* Ödeme Durumu Tiki */}
      <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
        <input
          type="checkbox"
          id="payment_completed"
          name="payment_completed"
          value="true"
          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
        />
        <label htmlFor="payment_completed" style={{ fontSize: '0.875rem', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}>
          💵 Ödemeyi Admine Gönderdim (Sipariş Onay Sırasına Girecektir)
        </label>
      </div>

      {/* Submit Butonları */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
        <Link href="/dealer" className="btn btn-secondary w-full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          İptal
        </Link>
        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={isPending || cart.length === 0}
        >
          {isPending ? 'Kaydediliyor...' : 'Satışı Kaydet'}
        </button>
      </div>
    </form>
  )
}
