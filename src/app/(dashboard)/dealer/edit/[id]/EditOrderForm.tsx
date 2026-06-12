'use client'

import React, { useActionState, useState } from 'react'
import Link from 'next/link'
import { updateOrder } from '../../actions'
import { Plus, Trash2, ShoppingCart, Percent } from 'lucide-react'

interface Species {
  id: string
  name: string
  price: number
}

interface OrderItem {
  id: string
  species_id: string
  quantity: number
  price_at_sale: number
  species?: {
    name: string
  }
}

interface Order {
  id: string
  receiver_name: string
  city: string
  district: string
  cargo_branch: string
  phone_number: string
  is_known_customer: boolean
}

interface BulkDiscount {
  species_id: string
  quantity: number
  discounted_price: number
}

interface CartItem {
  speciesId: string
  name: string
  price: number
  quantity: number
}

export default function EditOrderForm({
  order,
  orderItems,
  speciesList,
  isUnknownDealer,
  bulkDiscounts = [],
  dealerDiscountPercentage = 0
}: {
  order: Order
  orderItems: OrderItem[]
  speciesList: Species[]
  isUnknownDealer: boolean
  bulkDiscounts: BulkDiscount[]
  dealerDiscountPercentage: number
}) {
  const [state, formAction, isPending] = useActionState(updateOrder, { error: null as string | null })
  
  // Mevcut sipariş kalemlerinden başlangıç sepetini doldur (tür base fiyatlarını speciesList'ten eşleyelim)
  const initialCart: CartItem[] = orderItems.map((item) => {
    const matchedSpecies = speciesList.find((s) => s.id === item.species_id)
    const basePrice = matchedSpecies ? Number(matchedSpecies.price) : Number(item.price_at_sale)
    return {
      speciesId: item.species_id,
      name: item.species?.name || 'Bilinmeyen Tür',
      price: basePrice,
      quantity: item.quantity
    }
  })

  const [cart, setCart] = useState<CartItem[]>(initialCart)
  const [selectedSpeciesId, setSelectedSpeciesId] = useState('')
  const [quantity, setQuantity] = useState<number | ''>(1)

  // İndirimli fiyatı hesaplayan yardımcı fonksiyon
  const getDiscountedPrice = (speciesId: string, qty: number, basePrice: number) => {
    const speciesDiscounts = bulkDiscounts.filter((bd) => bd.species_id === speciesId)
    let appliedPrice = basePrice
    let maxQtyRule = 0
    
    for (const rule of speciesDiscounts) {
      if (qty >= rule.quantity && rule.quantity > maxQtyRule) {
        maxQtyRule = rule.quantity
        appliedPrice = Number(rule.discounted_price)
      }
    }
    
    const finalPrice = appliedPrice * (1 - (dealerDiscountPercentage || 0) / 100)
    return {
      unitPrice: finalPrice,
      isDiscounted: finalPrice < basePrice,
      bulkApplied: maxQtyRule > 0,
      dealerApplied: (dealerDiscountPercentage || 0) > 0,
      appliedPriceBeforeDealer: appliedPrice
    }
  }

  // Sepete ürün ekleme
  const handleAddToBag = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!selectedSpeciesId) return

    const selectedSpecies = speciesList.find((s) => s.id === selectedSpeciesId)
    if (!selectedSpecies) return

    const qty = typeof quantity === 'number' ? quantity : 1
    if (qty < 1) return

    const existingIndex = cart.findIndex((item) => item.speciesId === selectedSpeciesId)
    if (existingIndex > -1) {
      const updatedCart = [...cart]
      updatedCart[existingIndex].quantity += qty
      setCart(updatedCart)
    } else {
      setCart([
        ...cart,
        {
          speciesId: selectedSpecies.id,
          name: selectedSpecies.name,
          price: Number(selectedSpecies.price),
          quantity: qty
        }
      ])
    }

    setSelectedSpeciesId('')
    setQuantity(1)
  }

  // Sepetten ürün silme
  const handleRemoveFromBag = (index: number) => {
    setCart(cart.filter((_, i) => i !== index))
  }

  // Toplam sepet tutarı
  const totalPrice = cart.reduce((sum, item) => {
    const { unitPrice } = getDiscountedPrice(item.speciesId, item.quantity, item.price)
    return sum + unitPrice * item.quantity
  }, 0)

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={order.id} />
      
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
          defaultValue={order.receiver_name}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="phone_number">Alıcı Telefon Numarası</label>
        <input
          type="text"
          id="phone_number"
          name="phone_number"
          className="form-input"
          defaultValue={order.phone_number || ''}
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

      {/* Müşteri Tipi */}
      {!isUnknownDealer ? (
        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', marginBottom: '1.5rem' }}>
          <input
            type="checkbox"
            id="is_known_customer"
            name="is_known_customer"
            value="true"
            defaultChecked={order.is_known_customer}
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
              onChange={(e) => {
                const val = e.target.value
                if (val === '') {
                  setQuantity('')
                } else {
                  const parsed = parseInt(val)
                  if (!isNaN(parsed)) {
                    setQuantity(parsed)
                  }
                }
              }}
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
                  {cart.map((item, index) => {
                    const priceInfo = getDiscountedPrice(item.speciesId, item.quantity, item.price)
                    return (
                      <tr key={index}>
                        <td style={{ fontStyle: 'italic', fontWeight: 600 }}>{item.name}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.quantity} adet</td>
                        <td>
                          {priceInfo.isDiscounted ? (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ textDecoration: 'line-through', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {item.price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                              </span>
                              <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                                {priceInfo.unitPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                              </span>
                              <span style={{ fontSize: '0.65rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '2px', marginTop: '2px' }}>
                                <Percent size={8} /> {priceInfo.bulkApplied ? 'Toplu' : ''} {priceInfo.dealerApplied ? `+ %${dealerDiscountPercentage} Bayi` : ''} İndirimi
                              </span>
                            </div>
                          ) : (
                            <span>{item.price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                          )}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                          {(priceInfo.unitPrice * item.quantity).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
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
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Toplam Fiyat */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', fontWeight: 700 }}>
              <span style={{ color: 'var(--text-muted)' }}>Genel Toplam Tutar:</span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '1.2rem', color: 'var(--success)' }}>
                  {totalPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                </span>
                {dealerDiscountPercentage > 0 && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 500, marginTop: '2px' }}>
                    (Özel %{dealerDiscountPercentage} Bayi İndirimi Dahil)
                  </span>
                )}
              </div>
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
          {isPending ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
        </button>
      </div>
    </form>
  )
}
