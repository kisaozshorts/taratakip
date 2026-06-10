import React, { Suspense } from 'react'
import SpeciesDashboardContent from './SpeciesDashboardContent'
import { SpeciesDashboardSkeleton } from '@/components/Skeletons'

export const unstable_instant = {
  prefetch: 'static',
  unstable_disableValidation: true,
}

interface SearchParams {
  edit?: string
}

export default async function SpeciesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🏷 Tür & Fiyat Yönetimi</h1>
      </div>

      <Suspense fallback={<SpeciesDashboardSkeleton />}>
        <SpeciesDashboardContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

