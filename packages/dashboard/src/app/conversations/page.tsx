'use client'

import { Navigation, BreadcrumbItem } from '@/components/Navigation'

const breadcrumbs: BreadcrumbItem[] = [
  { label: 'Dashboard', href: '/' },
  { label: 'Conversations' }
]

export default function ConversationsPage() {
  return (
    <Navigation breadcrumbs={breadcrumbs}>
      <div className="page-header">
        <div className="row g-2 align-items-center">
          <div className="col">
            <h2 className="page-title">Conversations Analytics</h2>
            <div className="text-muted mt-1">
              Multi-turn chat sessions and interaction analysis
            </div>
          </div>
        </div>
      </div>

      <div className="row row-deck row-cards">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Conversations Overview</h3>
            </div>
            <div className="card-body">
              <div className="text-center text-muted py-5">
                <div className="mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                  </svg>
                </div>
                <h3>Conversations Analytics</h3>
                <p className="text-muted">
                  Dedicated conversations page with multi-turn chat analysis will be implemented here.
                  This will include conversation success rates, message flow analysis, and engagement metrics.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Navigation>
  )
} 