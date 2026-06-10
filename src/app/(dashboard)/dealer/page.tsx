import React, { Suspense } from 'react'
import DealerDashboardContent from './DealerDashboardContent'
import { DealerDashboardSkeleton } from '@/components/Skeletons'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export const unstable_instant = {
  prefetch: 'static',
  unstable_disableValidation: true,
}

export default async function DealerPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🕷 Bayi Paneli</h1>
        <Link href="/dealer/new-order" className="btn btn-primary">
          <Plus size={18} />
          <span>Yeni Sipariş Raporla</span>
        </Link>
      </div>

      <Suspense fallback={<DealerDashboardSkeleton />}>
        <DealerDashboardContent />
      </Suspense>
    </div>
  )
}

