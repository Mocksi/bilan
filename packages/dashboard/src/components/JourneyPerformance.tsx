import React from 'react'
import { DashboardData } from '@/lib/types'

interface JourneyPerformanceProps {
  data: DashboardData
  className?: string
}

export function JourneyPerformance({ data, className = '' }: JourneyPerformanceProps) {
  const { journeyStats } = data
  
  const getStatusBadge = (completionRate: number) => {
    if (completionRate >= 0.8) {
      return 'badge bg-success'
    } else if (completionRate >= 0.6) {
      return 'badge bg-warning'
    } else {
      return 'badge bg-danger'
    }
  }

  const getStatusText = (completionRate: number) => {
    if (completionRate >= 0.8) {
      return 'Healthy'
    } else if (completionRate >= 0.6) {
      return 'Warning'
    } else {
      return 'Critical'
    }
  }

  return (
    <div className={`bg-white border border-gray-200/60 rounded-lg shadow-sm p-5 ${className}`}>
      <div className="mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
            </svg>
            Journey Performance
          </h3>
          <p className="text-sm text-gray-600">User workflow completion rates and efficiency</p>
        </div>
      </div>
      <div>
        {journeyStats.popularJourneys.length > 0 ? (
          <div className="space-y-4">
            {journeyStats.popularJourneys.map((journey, index) => (
              <div key={index} className="p-3 border rounded">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="d-flex align-items-center">
                    <h4 className="mb-0 me-3">{journey.name}</h4>
                    <span className={getStatusBadge(journey.completionRate)}>
                      {getStatusText(journey.completionRate)}
                    </span>
                  </div>
                  <div className="text-end">
                    <div className="h4 mb-0">{Math.round(journey.completionRate * 100)}%</div>
                    <div className="text-muted small">completion rate</div>
                  </div>
                </div>
                
                <div className="progress mb-2" style={{ height: '8px' }}>
                  <div 
                    className="progress-bar bg-primary" 
                    style={{ width: `${journey.completionRate * 100}%` }}
                    role="progressbar"
                    aria-valuenow={Math.round(journey.completionRate * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  ></div>
                </div>
                
                <div className="d-flex justify-content-between text-muted small">
                  <div className="d-flex align-items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-1">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span>{journey.count} journeys</span>
                  </div>
                  <div className="d-flex align-items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-1">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                      <polyline points="17 6 23 6 23 12"></polyline>
                    </svg>
                    <span>{Math.round(journey.completionRate * 100)}% success</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-5">
            <div className="text-muted">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-3">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
              </svg>
              <h3>No journey data</h3>
              <p>Journey performance will appear here when users complete workflows.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 