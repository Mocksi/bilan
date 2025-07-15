import React from 'react'

interface TimeSeriesDataPoint {
  date: string
  trustScore: number
  totalVotes: number
  positiveVotes: number
}

interface SimpleLineChartProps {
  data: TimeSeriesDataPoint[]
  height?: number
  width?: number
}

export const SimpleLineChart: React.FC<SimpleLineChartProps> = ({ 
  data, 
  height = 200, 
  width = 800 
}) => {
  if (data.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height }}>
        <div className="text-muted">No data available</div>
      </div>
    )
  }

  if (data.length === 1) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height }}>
        <div className="text-muted">Need at least 2 data points for trend</div>
      </div>
    )
  }

  const padding = 40
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  // Calculate scales
  const xScale = chartWidth / (data.length - 1)
  const yMin = Math.min(...data.map(d => d.trustScore))
  const yMax = Math.max(...data.map(d => d.trustScore))
  const yRange = yMax - yMin || 1
  const yScale = chartHeight / yRange

  // Generate path
  const pathData = data.map((point, index) => {
    const x = padding + index * xScale
    const y = padding + chartHeight - ((point.trustScore - yMin) * yScale)
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="position-relative">
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e9ecef" strokeWidth="1" opacity="0.5"/>
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#grid)" />
        
        {/* Chart area */}
        <rect 
          x={padding} 
          y={padding} 
          width={chartWidth} 
          height={chartHeight} 
          fill="none" 
          stroke="#dee2e6" 
          strokeWidth="1"
        />
        
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map(value => {
          const y = padding + chartHeight - (value * chartHeight)
          return (
            <g key={value}>
              <line 
                x1={padding - 5} 
                y1={y} 
                x2={padding} 
                y2={y} 
                stroke="#6c757d" 
                strokeWidth="1"
              />
              <text 
                x={padding - 10} 
                y={y + 4} 
                textAnchor="end" 
                fontSize="12" 
                fill="#6c757d"
              >
                {Math.round(value * 100)}%
              </text>
            </g>
          )
        })}
        
        {/* X-axis labels */}
        {data.map((point, index) => {
          const x = padding + index * xScale
          const showLabel = index === 0 || index === data.length - 1 || index % Math.max(1, Math.floor(data.length / 5)) === 0
          
          if (!showLabel) return null
          
          return (
            <g key={index}>
              <line 
                x1={x} 
                y1={padding + chartHeight} 
                x2={x} 
                y2={padding + chartHeight + 5} 
                stroke="#6c757d" 
                strokeWidth="1"
              />
              <text 
                x={x} 
                y={padding + chartHeight + 18} 
                textAnchor="middle" 
                fontSize="12" 
                fill="#6c757d"
              >
                {formatDate(point.date)}
              </text>
            </g>
          )
        })}
        
        {/* Data line */}
        <path 
          d={pathData} 
          fill="none" 
          stroke="#0d6efd" 
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Data points */}
        {data.map((point, index) => {
          const x = padding + index * xScale
          const y = padding + chartHeight - ((point.trustScore - yMin) * yScale)
          
          return (
            <g key={index}>
              <circle 
                cx={x} 
                cy={y} 
                r="4" 
                fill="#0d6efd"
                stroke="#ffffff"
                strokeWidth="2"
              />
              <title>
                {formatDate(point.date)}: {Math.round(point.trustScore * 100)}% 
                ({point.positiveVotes}/{point.totalVotes} votes)
              </title>
            </g>
          )
        })}
      </svg>
    </div>
  )
} 