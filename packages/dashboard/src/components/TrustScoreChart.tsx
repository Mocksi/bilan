import React from 'react'
import { SimpleLineChart } from './SimpleLineChart'
import { DashboardData } from '@/lib/types'

interface TrustScoreChartProps {
  data: DashboardData
  className?: string
}

export function TrustScoreChart({ data, className = '' }: TrustScoreChartProps) {
  return (
    <div className={`card ${className}`}>
      <div className="card-header">
        <div>
          <h3 className="card-title">Trust Score Trend</h3>
          <p className="card-subtitle">AI trust score over time</p>
        </div>
      </div>
      <div className="card-body">
        <div style={{ height: '300px' }}>
          {data.timeSeriesData.length > 0 ? (
            <SimpleLineChart 
              data={data.timeSeriesData}
              height={300}
            />
          ) : (
            <div className="d-flex align-items-center justify-content-center h-100">
              <div className="text-muted">
                <div className="text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-3">
                    <path d="M3 3v18h18"></path>
                    <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"></path>
                  </svg>
                  <h3>No data available</h3>
                  <p>Trust score data will appear here when events are recorded.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 