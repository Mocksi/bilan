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
      <div className={`card ${className}`}>
        <div className="card-body">
          <div className="placeholder-glow">
            <div className="placeholder col-3 mb-3"></div>
            <div className="placeholder col-12 mb-2"></div>
            <div className="placeholder col-12 mb-2"></div>
            <div className="placeholder col-8"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`card ${className}`}>
      {title && (
        <div className="card-header">
          <h3 className="card-title">{title}</h3>
        </div>
      )}
      
      <div className="table-responsive">
        <table className="table table-vcenter">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`${
                    column.align === 'center' ? 'text-center' : 
                    column.align === 'right' ? 'text-end' : ''
                  }`}
                  style={{ width: column.width }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center text-muted py-4"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr key={getRowKey(row, index)}>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`${
                        column.align === 'center' ? 'text-center' : 
                        column.align === 'right' ? 'text-end' : ''
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