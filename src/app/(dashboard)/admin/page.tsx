import React, { Suspense } from 'react'
import { RefreshCw } from 'lucide-react'
import AdminDashboardContent from './AdminDashboardContent'
import { AdminDashboardSkeleton } from '@/components/Skeletons'

export const unstable_instant = {
  prefetch: 'static',
  unstable_disableValidation: true,
}

interface SearchParams {
  dealer?: string
  species?: string
  payment?: string
  cargo?: string
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  // Filtre sıfırlama eylemi (statik shell için inline server action)
  async function resetFilters() {
    'use server'
    const { redirect } = await import('next/navigation')
    redirect('/admin')
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🕷 Yönetici Paneli</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <form action={resetFilters}>
            <button className="btn btn-secondary" type="submit">
              <RefreshCw size={16} />
              <span>Filtreleri Sıfırla</span>
            </button>
          </form>
        </div>
      </div>

      <Suspense fallback={<AdminDashboardSkeleton />}>
        <AdminDashboardContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

