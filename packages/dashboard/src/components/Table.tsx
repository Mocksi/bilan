import React from 'react'

interface TableColumn {
  key: string
  label: string
  render?: (value: any, row: any) => React.ReactNode
  align?: 'left' | 'center' | 'right'
  width?: string
}

interface TableProps {
  columns: TableColumn[]
  data: any[]
  title?: string
  loading?: boolean
  emptyMessage?: string
  className?: string
  keyField?: string // Field to use as unique key for rows
}

export default function Table({ 
  columns, 
  data, 
  title, 
  loading = false, 
  emptyMessage = 'No data available',
  className = '',
  keyField = 'id'
}: TableProps) {
  const getRowKey = (row: any, index: number) => {
    // Try to use the specified keyField, fallback to common id fields, then index
    return row[keyField] || row.id || row._id || row.uuid || `row-${index}`
  }

  if (loading) {
    return (
      <div className={`relative flex flex-col min-w-0 bg-white border border-black/10 rounded-lg ${className}`} style={{ boxShadow: 'rgba(31, 41, 55, 0.04) 0px 2px 4px 0px' }}>
        <div className="py-4 px-5">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative flex flex-col min-w-0 bg-white border border-black/10 rounded-lg overflow-hidden ${className}`} style={{ boxShadow: 'rgba(31, 41, 55, 0.04) 0px 2px 4px 0px' }}>
      {title && (
        <div className="py-4 px-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.align === 'center' ? 'text-center' : 
                    column.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                  style={{ width: column.width }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr key={getRowKey(row, index)} className="hover:bg-gray-50">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-6 py-4 whitespace-nowrap text-sm ${
                        column.align === 'center' ? 'text-center' : 
                        column.align === 'right' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {column.render ? 
                        column.render(row[column.key], row) : 
                        row[column.key]
                      }
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Common table cell renderers
export const TableRenderers = {
  // Render a percentage with color coding
  percentage: (value: number) => (
    <span className={`font-medium ${
      value >= 70 ? 'text-green-600' : 
      value >= 50 ? 'text-yellow-600' : 
      'text-red-600'
    }`}>
      {value.toFixed(1)}%
    </span>
  ),

  // Render a trend indicator
  trend: (value: string) => {
    const colors = {
      improving: 'text-green-600 bg-green-100',
      declining: 'text-red-600 bg-red-100',
      stable: 'text-gray-600 bg-gray-100'
    }
    const icons = {
      improving: '↗️',
      declining: '↘️',
      stable: '➡️'
    }
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[value as keyof typeof colors] || colors.stable}`}>
        {icons[value as keyof typeof icons]} {value}
      </span>
    )
  },

  // Render a count with formatting
  count: (value: number) => (
    <span className="font-medium text-gray-900">
      {value.toLocaleString()}
    </span>
  ),

  // Render a date
  date: (value: string | number) => (
    <span className="text-gray-500">
      {new Date(value).toLocaleDateString()}
    </span>
  )
} 