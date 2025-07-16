import React, { useEffect, useRef, useState } from 'react'

interface TimeSeriesDataPoint {
  date: string
  trustScore: number
  totalVotes: number
  positiveVotes: number
}

interface SimpleLineChartProps {
  data: TimeSeriesDataPoint[]
  height?: number
}

export const SimpleLineChart: React.FC<SimpleLineChartProps> = ({ 
  data, 
  height = 200
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth)
      }
    }

    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

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
    const y = padding + chartHeight - ((point.trustScore - yMin) / yRange) * chartHeight
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')

  // Generate grid lines
  const gridLines = []
  for (let i = 0; i <= 4; i++) {
    const y = padding + (i * chartHeight) / 4
    gridLines.push(
      <line
        key={`grid-${i}`}
        x1={padding}
        y1={y}
        x2={padding + chartWidth}
        y2={y}
        stroke="#e9ecef"
        strokeWidth="1"
      />
    )
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height }}>
      <svg width="100%" height={height} style={{ overflow: 'visible' }}>
        {/* Grid lines */}
        {gridLines}
        
        {/* Y-axis labels */}
        {[0, 1, 2, 3, 4].map(i => {
          const value = yMin + (yRange * i) / 4
          const y = padding + chartHeight - (i * chartHeight) / 4
          return (
            <text
              key={`y-label-${i}`}
              x={padding - 10}
              y={y + 4}
              textAnchor="end"
              fontSize="12"
              fill="#6c757d"
            >
              {(value * 100).toFixed(0)}%
            </text>
          )
        })}
        
        {/* X-axis labels */}
        {data.map((point, index) => {
          if (index % Math.ceil(data.length / 3) === 0 || index === data.length - 1) {
            const x = padding + index * xScale
            const date = new Date(point.date)
            const label = date.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            })
            return (
              <text
                key={`x-label-${index}`}
                x={x}
                y={height - 10}
                textAnchor="middle"
                fontSize="12"
                fill="#6c757d"
              >
                {label}
              </text>
            )
          }
          return null
        })}
        
        {/* Chart line */}
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
          const y = padding + chartHeight - ((point.trustScore - yMin) / yRange) * chartHeight
          return (
            <circle
              key={`point-${index}`}
              cx={x}
              cy={y}
              r="4"
              fill="#0d6efd"
              stroke="#fff"
              strokeWidth="2"
            />
          )
        })}
      </svg>
    </div>
  )
} 