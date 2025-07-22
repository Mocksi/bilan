'use client'

import React, { useState, Suspense, useMemo } from 'react'
import { useJourneys } from '@/lib/api-client'
import { DashboardLayout } from '@/components/DashboardLayout'
import StatsCard from '@/components/StatsCard'

/**
 * JourneysContent component renders the main journey analytics interface
 * including statistics, filtering, and journey data table with pagination state management.
 * This component wraps the useSearchParams hook to enable client-side search functionality.
 */
function JourneysContent() {
  const [page, setPage] = useState(1)
  const [limit] = useState(50)
  
  // Use useMemo to create a stable filters object
  const filters = useMemo(() => ({}), [])
  
  const { data, loading, error } = useJourneys(filters, page, limit)

  if (loading) {
    return (
      <DashboardLayout 
        title="Journey Analytics"
        subtitle="Loading journey data..."
      >
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout 
        title="Journey Analytics"
        subtitle="Error loading journeys"
      >
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error loading journeys</h4>
          <p>{error}</p>
        </div>
      </DashboardLayout>
    )
  }

  const totalJourneys = data?.total || 0
  const completedJourneys = data?.journeys.filter(journey => journey.status === 'completed').length || 0
  const activeJourneys = data?.journeys.filter(journey => journey.status === 'active').length || 0
  const completionRate = totalJourneys > 0 ? (completedJourneys / totalJourneys) * 100 : 0

  return (
    <DashboardLayout 
      title="Journey Analytics" 
      subtitle="Workflow tracking and user journey optimization"
    >
      {/* Key Metrics */}
      <div className="row row-deck row-cards mb-4">
        <div className="col-sm-6 col-lg-3">
          <StatsCard
            title="Total Journeys"
            value={totalJourneys.toLocaleString()}
            trend={totalJourneys > 0 ? 'up' : 'stable'}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
              </svg>
            }
          />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatsCard
            title="Completion Rate"
            value={`${completionRate.toFixed(1)}%`}
            trend={completionRate > 50 ? 'up' : completionRate < 50 ? 'down' : 'stable'}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22,4 12,14.01 9,11.01"></polyline>
              </svg>
            }
          />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatsCard
            title="Active Journeys"
            value={activeJourneys.toLocaleString()}
            trend={activeJourneys > 0 ? 'up' : 'stable'}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="20" x2="12" y2="10"></line>
                <line x1="18" y1="20" x2="18" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="16"></line>
              </svg>
            }
          />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatsCard
            title="Completed"
            value={completedJourneys.toLocaleString()}
            trend={completedJourneys > 0 ? 'up' : 'stable'}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            }
          />
        </div>
      </div>

      {/* Journeys Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Journeys</h3>
        </div>
        <div className="card-body">
          {data && data.journeys.length > 0 ? (
            <>
              <div className="table-responsive">
              <table className="table table-vcenter">
                <thead>
                  <tr>
                    <th>Journey ID</th>
                    <th>Name</th>
                    <th>User</th>
                    <th>Status</th>
                    <th>Steps</th>
                    <th>Started</th>
                  </tr>
                </thead>
                <tbody>
                  {data.journeys.map((journey, index) => (
                    <tr key={index}>
                      <td className="text-muted">
                        <code>{journey.id}</code>
                      </td>
                      <td>
                        <strong>{journey.name}</strong>
                      </td>
                      <td className="text-muted">
                        <code>{journey.userId}</code>
                      </td>
                      <td>
                        <span className={`badge ${
                          journey.status === 'completed' ? 'bg-success text-white' : 
                          journey.status === 'abandoned' ? 'bg-danger text-white' : 'bg-primary text-white'
                        }`}>
                          {journey.status}
                        </span>
                      </td>
                      <td>
                        {journey.completedSteps.length}/{journey.steps.length}
                      </td>
                      <td className="text-muted">
                        {new Date(journey.startTime).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Simple Pagination Controls */}
            {data && data.total > limit && (
              <div className="card-footer">
                <div className="d-flex justify-content-between align-items-center">
                  <div className="text-muted">
                    Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data.total)} of {data.total} journeys
                  </div>
                  <div className="btn-group">
                    <button 
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      Previous
                    </button>
                    <button 
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= Math.ceil(data.total / limit)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
            </>
          ) : (
            <div className="text-center py-5">
              <div className="text-muted">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-3">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                </svg>
                <h3>No journey tracking enabled</h3>
                <p>This system currently tracks individual votes, not user journeys.</p>
                <p className="text-muted small">
                  To enable journey tracking, use the SDK's <code>startJourney()</code>, 
                  <code>updateJourney()</code>, and <code>completeJourney()</code> methods.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

/**
 * Journeys component is the main page component that renders the journey analytics
 * section with a Suspense fallback for loading states. This component provides
 * workflow tracking and user journey optimization analytics.
 */
export default function Journeys() {
  return (
    <Suspense fallback={<div>Loading journeys...</div>}>
      <JourneysContent />
    </Suspense>
  )
} 