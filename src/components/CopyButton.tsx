'use client'

import React, { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface CopyButtonProps {
  text: string
  title?: string
}

export default function CopyButton({ text, title = 'Kopyala' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Kopyalama başarısız:', err)
    }
  }

  return (
    <button
      onClick={handleCopy}
      type="button"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '4px',
        padding: '0.25rem',
        cursor: 'pointer',
        color: copied ? 'var(--success)' : 'var(--text-muted)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
        marginLeft: '0.4rem',
        verticalAlign: 'middle'
      }}
      title={copied ? 'Kopyalandı!' : title}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  )
}
