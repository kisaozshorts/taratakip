'use client'

import React from 'react'
import { Trash2 } from 'lucide-react'

interface DeleteButtonProps {
  id: string
  action: (formData: FormData) => void | Promise<void>
  confirmMessage?: string
}

export default function DeleteButton({
  id,
  action,
  confirmMessage = 'Bu öğeyi silmek istediğinizden emin misiniz?',
}: DeleteButtonProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!window.confirm(confirmMessage)) {
      e.preventDefault()
    }
  }

  return (
    <form action={action} onSubmit={handleSubmit} style={{ display: 'inline-block' }}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="btn btn-secondary"
        style={{
          padding: '0.35rem 0.5rem',
          color: 'var(--error)',
          borderColor: 'rgba(239, 68, 68, 0.2)',
          cursor: 'pointer',
        }}
        title="Sil"
      >
        <Trash2 size={16} />
      </button>
    </form>
  )
}
