import React, { Suspense } from 'react'
import ShipperDashboardContent from './ShipperDashboardContent'
import { ShipperDashboardSkeleton } from '@/components/Skeletons'

export const unstable_instant = {
  prefetch: 'static',
  unstable_disableValidation: true,
}

export default async function ShipperPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📦 Kargo Gönderi Yönetimi</h1>
      </div>

      <Suspense fallback={<ShipperDashboardSkeleton />}>
        <ShipperDashboardContent />
      </Suspense>
    </div>
  )
}

