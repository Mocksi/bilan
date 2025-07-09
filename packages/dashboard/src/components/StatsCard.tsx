interface StatsCardProps {
  title: string
  value: string | number
  trend?: 'up' | 'down' | 'stable'
  className?: string
}

export default function StatsCard({ title, value, trend, className = '' }: StatsCardProps) {
  const trendColor = {
    up: 'text-green-600',
    down: 'text-red-600',
    stable: 'text-gray-600'
  }

  return (
    <div className={`bg-white p-6 rounded-lg shadow-sm border ${className}`}>
      <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
      <div className="flex items-center justify-between">
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        {trend && (
          <span className={`text-sm ${trendColor[trend]}`}>
            {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
          </span>
        )}
      </div>
    </div>
  )
} 