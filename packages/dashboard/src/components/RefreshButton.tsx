import React from 'react'

export interface RefreshButtonProps {
  onClick: () => void
  loading?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
  lastUpdated?: Date | null
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onClick,
  loading = false,
  className = '',
  size = 'md',
  lastUpdated
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm'
      case 'md':
        return 'px-4 py-2 text-sm'
      case 'lg':
        return 'px-6 py-3 text-base'
      default:
        return 'px-4 py-2 text-sm'
    }
  }

  const baseClasses = "bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
  const sizeClasses = getSizeClasses()

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {lastUpdated && (
        <span className="text-sm text-gray-500">
          Updated: {lastUpdated.toLocaleTimeString()}
        </span>
      )}
      <button
        onClick={onClick}
        disabled={loading}
        className={`${baseClasses} ${sizeClasses} flex items-center space-x-2`}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Refreshing...</span>
          </>
        ) : (
          <>
            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </>
        )}
      </button>
    </div>
  )
} 