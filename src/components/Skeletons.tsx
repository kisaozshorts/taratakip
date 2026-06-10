import React from 'react'

export function DashboardMetricsSkeleton() {
  return (
    <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="glass-card stat-card skeleton" style={{ minHeight: '100px', border: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', height: '100%' }}>
            <div className="skeleton" style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div className="skeleton" style={{ width: '60%', height: '14px', background: 'rgba(255, 255, 255, 0.03)' }} />
              <div className="skeleton" style={{ width: '40%', height: '22px', background: 'rgba(255, 255, 255, 0.03)' }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function FiltersSkeleton() {
  return (
    <div className="glass-card skeleton" style={{ marginBottom: '2rem', padding: '1.5rem', border: 'none' }}>
      <div className="skeleton" style={{ width: '150px', height: '20px', marginBottom: '1.25rem', background: 'rgba(255, 255, 255, 0.03)' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="skeleton" style={{ width: '80px', height: '12px', background: 'rgba(255, 255, 255, 0.03)' }} />
            <div className="skeleton" style={{ width: '100%', height: '42px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.03)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <div className="skeleton" style={{ width: '200px', height: '24px', marginBottom: '1.5rem', background: 'rgba(255, 255, 255, 0.03)' }} />
      <div className="table-container">
        <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i}>
                  <div className="skeleton" style={{ width: '60px', height: '14px', background: 'rgba(255, 255, 255, 0.03)' }} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c}>
                    <div className="skeleton skeleton-table-row" style={{ background: 'rgba(255, 255, 255, 0.02)', margin: 0 }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function AdminDashboardSkeleton() {
  return (
    <div>
      <DashboardMetricsSkeleton />
      <FiltersSkeleton />
      <TableSkeleton rows={5} cols={9} />
    </div>
  )
}

export function SpeciesDashboardSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
      {/* Sol taraf: Form */}
      <div className="glass-card skeleton" style={{ padding: '1.5rem', border: 'none', height: '320px' }}>
        <div className="skeleton" style={{ width: '180px', height: '20px', marginBottom: '1.5rem', background: 'rgba(255, 255, 255, 0.03)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="skeleton" style={{ width: '100px', height: '12px', background: 'rgba(255, 255, 255, 0.03)' }} />
            <div className="skeleton" style={{ width: '100%', height: '42px', background: 'rgba(255, 255, 255, 0.03)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="skeleton" style={{ width: '100px', height: '12px', background: 'rgba(255, 255, 255, 0.03)' }} />
            <div className="skeleton" style={{ width: '100%', height: '42px', background: 'rgba(255, 255, 255, 0.03)' }} />
          </div>
          <div className="skeleton" style={{ width: '100%', height: '42px', marginTop: '0.5rem', background: 'rgba(255, 255, 255, 0.03)' }} />
        </div>
      </div>
      {/* Sağ taraf: Liste */}
      <div style={{ flex: 2 }}>
        <TableSkeleton rows={5} cols={3} />
      </div>
    </div>
  )
}

export function UsersDashboardSkeleton() {
  return (
    <div>
      <TableSkeleton rows={6} cols={4} />
    </div>
  )
}

export function DealerDashboardSkeleton() {
  return (
    <div>
      <DashboardMetricsSkeleton />
      <TableSkeleton rows={5} cols={9} />
    </div>
  )
}

export function ShipperDashboardSkeleton() {
  return (
    <div>
      <div className="glass-card skeleton" style={{ marginBottom: '2rem', padding: '1.5rem', border: 'none' }}>
        <div className="skeleton" style={{ width: '100%', height: '24px', background: 'rgba(255, 255, 255, 0.03)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="glass-card skeleton" style={{ height: '380px', padding: '1.5rem', border: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div className="skeleton" style={{ width: '50%', height: '20px', background: 'rgba(255, 255, 255, 0.03)' }} />
                <div className="skeleton" style={{ width: '25%', height: '20px', background: 'rgba(255, 255, 255, 0.03)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div className="skeleton" style={{ width: '80%', height: '14px', background: 'rgba(255, 255, 255, 0.03)' }} />
                <div className="skeleton" style={{ width: '60%', height: '14px', background: 'rgba(255, 255, 255, 0.03)' }} />
                <div className="skeleton" style={{ width: '70%', height: '14px', background: 'rgba(255, 255, 255, 0.03)' }} />
                <div className="skeleton" style={{ width: '50%', height: '14px', background: 'rgba(255, 255, 255, 0.03)' }} />
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="skeleton" style={{ width: '100%', height: '38px', background: 'rgba(255, 255, 255, 0.03)' }} />
              <div className="skeleton" style={{ width: '100%', height: '38px', background: 'rgba(255, 255, 255, 0.03)' }} />
              <div className="skeleton" style={{ width: '100%', height: '38px', background: 'rgba(255, 255, 255, 0.03)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
