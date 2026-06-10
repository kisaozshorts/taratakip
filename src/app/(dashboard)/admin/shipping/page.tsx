import React, { Suspense } from 'react'
import ShippingDashboardContent from './ShippingDashboardContent'
import { SpeciesDashboardSkeleton } from '@/components/Skeletons'

export const unstable_instant = {
  prefetch: 'static',
  unstable_disableValidation: true,
}

export default async function ShippingPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🚚 Kargo Firmaları Yönetimi</h1>
      </div>

      <Suspense fallback={<SpeciesDashboardSkeleton />}>
        <ShippingDashboardContent />
      </Suspense>
    </div>
  )
}
