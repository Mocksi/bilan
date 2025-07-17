import React, { ReactNode } from 'react'
import { Navigation } from '../app/components/Navigation'
import { TimeRangeSelector, TimeRange } from './TimeRangeSelector'

/**
 * Props for the DashboardLayout component
 */
interface DashboardLayoutProps {
  /** The content to render inside the layout */
  children: ReactNode
  /** Optional title to display in the header */
  title?: string
  /** Optional subtitle to display below the title */
  subtitle?: string
  /** Optional action buttons to display in the header */
  actions?: ReactNode
  /** Whether to show the time range selector */
  showTimeRange?: boolean
  /** Current time range value */
  timeRange?: TimeRange
  /** Callback when time range changes */
  onTimeRangeChange?: (range: TimeRange) => void
  /** Callback when refresh button is clicked */
  onRefresh?: () => void
  /** Timestamp of last data update */
  lastUpdated?: Date | null
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
  children, 
  title, 
  subtitle, 
  actions,
  showTimeRange = false,
  timeRange,
  onTimeRangeChange,
  onRefresh,
  lastUpdated
}) => {
  return (
    <div className="page">
      {/* Header with title, time range selector, and refresh button */}
      <header className="navbar navbar-expand-md d-print-none" style={{ minHeight: '64px' }}>
        <div className="container-xl">
          <div className="navbar-brand">
            {title && <h1 className="navbar-brand-text">{title}</h1>}
          </div>
          <div className="navbar-nav flex-row order-md-last">
            {lastUpdated && (
              <span className="navbar-text me-3">
                <small className="text-muted">Updated: {lastUpdated.toLocaleTimeString()}</small>
              </span>
            )}
            {showTimeRange && timeRange && onTimeRangeChange && (
              <div className="me-3">
                <TimeRangeSelector 
                  value={timeRange}
                  onChange={onTimeRangeChange}
                />
              </div>
            )}
            {onRefresh && (
              <button onClick={onRefresh} className="btn btn-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-1">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="m3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                Refresh
              </button>
            )}
            {actions}
            {/* Add invisible spacer to maintain consistent height when no actions */}
            {!lastUpdated && !showTimeRange && !onRefresh && !actions && (
              <div style={{ height: '32px' }}></div>
            )}
          </div>
        </div>
      </header>
      
      {/* Navigation tabs under header */}
      <header className="navbar-expand-md">
        <div className="collapse navbar-collapse" id="navbar-menu">
          <div className="navbar">
            <div className="container-xl">
              <Navigation />
            </div>
          </div>
        </div>
      </header>

      {/* Main page wrapper */}
      <div className="page-wrapper">
        {subtitle && (
          <div className="page-header d-print-none">
            <div className="container-xl">
              <div className="row g-2 align-items-center">
                <div className="col">
                  <div className="text-muted">{subtitle}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="page-body">
          <div className="container-xl">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
} 