import React, { Suspense } from 'react'
import UsersDashboardContent from './UsersDashboardContent'
import { UsersDashboardSkeleton } from '@/components/Skeletons'

export const unstable_instant = {
  prefetch: 'static',
  unstable_disableValidation: true,
}

export default async function UsersPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">👥 Bayi & Rol Yönetimi</h1>
      </div>

      <Suspense fallback={<UsersDashboardSkeleton />}>
        <UsersDashboardContent />
      </Suspense>
    </div>
  )
}

