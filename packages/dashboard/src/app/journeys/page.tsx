'use client'

import { Navigation, BreadcrumbItem } from '@/components/Navigation'

const breadcrumbs: BreadcrumbItem[] = [
  { label: 'Dashboard', href: '/' },
  { label: 'Journeys' }
]

export default function JourneysPage() {
  return (
    <Navigation breadcrumbs={breadcrumbs}>
      <div className="page-header">
        <div className="row g-2 align-items-center">
          <div className="col">
            <h2 className="page-title">Journeys Analytics</h2>
            <div className="text-muted mt-1">
              Workflow tracking and funnel analysis
            </div>
          </div>
        </div>
      </div>

      <div className="row row-deck row-cards">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Journeys Overview</h3>
            </div>
            <div className="card-body">
              <div className="text-center text-muted py-5">
                <div className="mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                  </svg>
                </div>
                <h3>Journeys Analytics</h3>
                <p className="text-muted">
                  Dedicated journeys page with workflow tracking will be implemented here.
                  This will include journey completion rates, funnel analysis, and optimization insights.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Navigation>
  )
} 