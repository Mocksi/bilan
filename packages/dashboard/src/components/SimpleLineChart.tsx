import React from 'react'

export interface SimpleLineChartProps {
  data: { label: string; value: number }[]
  height?: number
  className?: string
  color?: string
}

export const SimpleLineChart: React.FC<SimpleLineChartProps> = ({
  data,
  height = 200,
  className = '',
  color = '#3b82f6'
}) => {
  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-gray-500 text-sm">No data available</div>
      </div>
    )
  }

  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))
  const range = maxValue - minValue || 1

  const width = 300
  const padding = 20

  const points = data.map((point, index) => {
    const x = padding + (index * (width - 2 * padding)) / (data.length - 1)
    const y = padding + ((maxValue - point.value) / range) * (height - 2 * padding)
    return { x, y, ...point }
  })

  const pathData = points.map((point, index) => {
    const command = index === 0 ? 'M' : 'L'
    return `${command} ${point.x} ${point.y}`
  }).join(' ')

  return (
    <div className={`${className}`}>
      <svg width={width} height={height} className="overflow-visible">
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Points */}
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="4"
            fill={color}
            className="hover:r-6 transition-all"
          />
        ))}
        
        {/* Labels */}
        {points.map((point, index) => (
          <text
            key={index}
            x={point.x}
            y={height - 5}
            textAnchor="middle"
            className="text-xs fill-gray-500"
          >
            {point.label}
          </text>
        ))}
      </svg>
    </div>
  )
} 