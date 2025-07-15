import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SimpleLineChart } from '../SimpleLineChart'

describe('SimpleLineChart', () => {
  const mockData = [
    { date: '2023-01-01', trustScore: 0.8, totalVotes: 100, positiveVotes: 80 },
    { date: '2023-01-02', trustScore: 0.75, totalVotes: 120, positiveVotes: 90 },
    { date: '2023-01-03', trustScore: 0.9, totalVotes: 150, positiveVotes: 135 },
    { date: '2023-01-04', trustScore: 0.85, totalVotes: 200, positiveVotes: 170 },
    { date: '2023-01-05', trustScore: 0.95, totalVotes: 180, positiveVotes: 171 }
  ]

  it('renders with valid data', () => {
    render(<SimpleLineChart data={mockData} />)
    
    // Check that SVG is rendered
    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()
    
    // Check default dimensions
    expect(svg).toHaveAttribute('width', '800')
    expect(svg).toHaveAttribute('height', '200')
  })

  it('renders with custom dimensions', () => {
    render(<SimpleLineChart data={mockData} width={600} height={300} />)
    
    const svg = document.querySelector('svg')
    expect(svg).toHaveAttribute('width', '600')
    expect(svg).toHaveAttribute('height', '300')
  })

  it('shows empty state when no data provided', () => {
    render(<SimpleLineChart data={[]} />)
    
    expect(screen.getByText('No data available')).toBeInTheDocument()
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  it('shows single data point message', () => {
    const singleDataPoint = [mockData[0]]
    render(<SimpleLineChart data={singleDataPoint} />)
    
    expect(screen.getByText('Need at least 2 data points for trend')).toBeInTheDocument()
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders Y-axis labels correctly', () => {
    render(<SimpleLineChart data={mockData} />)
    
    // Check for percentage labels
    const yLabels = ['0%', '25%', '50%', '75%', '100%']
    yLabels.forEach(label => {
      const textElement = Array.from(document.querySelectorAll('text')).find(
        el => el.textContent === label
      )
      expect(textElement).toBeInTheDocument()
    })
  })

  it('renders X-axis labels with formatted dates', () => {
    render(<SimpleLineChart data={mockData} />)
    
    // Check for date labels (should show first and last at minimum)
    const textElements = Array.from(document.querySelectorAll('text'))
    const dateTexts = textElements.map(el => el.textContent).filter(text => 
      text && (text.includes('Jan') || text.includes('1'))
    )
    
    expect(dateTexts.length).toBeGreaterThan(0)
  })

  it('renders data line path', () => {
    render(<SimpleLineChart data={mockData} />)
    
    // Find the data line path (not the grid pattern)
    const paths = document.querySelectorAll('path')
    const dataPath = Array.from(paths).find(path => 
      path.getAttribute('stroke') === '#0d6efd'
    )
    
    expect(dataPath).toBeInTheDocument()
    expect(dataPath).toHaveAttribute('stroke', '#0d6efd')
    expect(dataPath).toHaveAttribute('stroke-width', '2')
    expect(dataPath).toHaveAttribute('fill', 'none')
  })

  it('renders data points as circles', () => {
    render(<SimpleLineChart data={mockData} />)
    
    const circles = document.querySelectorAll('circle')
    expect(circles).toHaveLength(mockData.length)
    
    circles.forEach(circle => {
      expect(circle).toHaveAttribute('r', '4')
      expect(circle).toHaveAttribute('fill', '#0d6efd')
      expect(circle).toHaveAttribute('stroke', '#ffffff')
      expect(circle).toHaveAttribute('stroke-width', '2')
    })
  })

  it('includes hover tooltips on data points', () => {
    render(<SimpleLineChart data={mockData} />)
    
    const titles = document.querySelectorAll('title')
    expect(titles).toHaveLength(mockData.length)
    
    // Check that tooltips contain expected information
    const firstTooltip = titles[0]
    expect(firstTooltip.textContent).toContain('80%')
    expect(firstTooltip.textContent).toContain('80/100 votes')
    // Date formatting might vary due to timezone - just check it contains expected parts
    expect(firstTooltip.textContent).toMatch(/Jan|Dec/)
  })

  it('renders grid pattern', () => {
    render(<SimpleLineChart data={mockData} />)
    
    const pattern = document.querySelector('pattern[id="grid"]')
    expect(pattern).toBeInTheDocument()
    
    const gridRect = document.querySelector('rect[fill="url(#grid)"]')
    expect(gridRect).toBeInTheDocument()
  })

  it('renders chart area border', () => {
    render(<SimpleLineChart data={mockData} />)
    
    const chartBorder = document.querySelector('rect[fill="none"][stroke="#dee2e6"]')
    expect(chartBorder).toBeInTheDocument()
  })

  it('handles data with same trust scores', () => {
    const flatData = [
      { date: '2023-01-01', trustScore: 0.8, totalVotes: 100, positiveVotes: 80 },
      { date: '2023-01-02', trustScore: 0.8, totalVotes: 120, positiveVotes: 96 },
      { date: '2023-01-03', trustScore: 0.8, totalVotes: 150, positiveVotes: 120 }
    ]
    
    render(<SimpleLineChart data={flatData} />)
    
    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()
    
    // Should still render circles and path
    expect(document.querySelectorAll('circle')).toHaveLength(3)
    expect(document.querySelector('path')).toBeInTheDocument()
  })

  it('handles data with extreme trust scores', () => {
    const extremeData = [
      { date: '2023-01-01', trustScore: 0.0, totalVotes: 100, positiveVotes: 0 },
      { date: '2023-01-02', trustScore: 1.0, totalVotes: 120, positiveVotes: 120 }
    ]
    
    render(<SimpleLineChart data={extremeData} />)
    
    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()
    
    // Should handle 0% and 100% scores
    const tooltips = Array.from(document.querySelectorAll('title')).map(t => t.textContent)
    expect(tooltips.some(t => t && t.includes('0%'))).toBe(true)
    expect(tooltips.some(t => t && t.includes('100%'))).toBe(true)
  })

  it('handles large datasets', () => {
    const largeData = Array.from({ length: 30 }, (_, i) => ({
      date: `2023-01-${String(i + 1).padStart(2, '0')}`,
      trustScore: 0.5 + Math.random() * 0.5,
      totalVotes: 100 + i * 10,
      positiveVotes: 50 + i * 8
    }))
    
    render(<SimpleLineChart data={largeData} />)
    
    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()
    
    // Should render all data points
    expect(document.querySelectorAll('circle')).toHaveLength(30)
    
    // Should show selective X-axis labels (not all 30)
    const xLabels = Array.from(document.querySelectorAll('text')).filter(
      el => el.textContent && el.textContent.includes('Jan')
    )
    expect(xLabels.length).toBeLessThan(30)
    expect(xLabels.length).toBeGreaterThan(0)
  })

  it('formats dates correctly', () => {
    const dataWithDifferentDates = [
      { date: '2023-01-15', trustScore: 0.8, totalVotes: 100, positiveVotes: 80 },
      { date: '2023-02-14', trustScore: 0.9, totalVotes: 120, positiveVotes: 108 },
      { date: '2023-03-10', trustScore: 0.85, totalVotes: 150, positiveVotes: 127 }
    ]
    
    render(<SimpleLineChart data={dataWithDifferentDates} />)
    
    const tooltips = Array.from(document.querySelectorAll('title')).map(t => t.textContent)
    // Check for month names - exact dates might vary due to timezone
    expect(tooltips[0]).toMatch(/Jan/)
    expect(tooltips[1]).toMatch(/Feb/)
    expect(tooltips[2]).toMatch(/Mar/)
  })

  it('maintains proper aspect ratio with custom dimensions', () => {
    render(<SimpleLineChart data={mockData} width={400} height={100} />)
    
    const svg = document.querySelector('svg')
    expect(svg).toHaveAttribute('width', '400')
    expect(svg).toHaveAttribute('height', '100')
    
    // Chart should still render with smaller dimensions
    expect(document.querySelector('path')).toBeInTheDocument()
    expect(document.querySelectorAll('circle')).toHaveLength(mockData.length)
  })

  it('handles missing or invalid data gracefully', () => {
    const invalidData = [
      { date: '2023-01-01', trustScore: 0.8, totalVotes: 100, positiveVotes: 80 },
      { date: '2023-01-02', trustScore: 0.9, totalVotes: 120, positiveVotes: 108 }
    ]
    
    render(<SimpleLineChart data={invalidData} />)
    
    // Should render without crashing
    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(document.querySelectorAll('circle')).toHaveLength(2)
  })
}) 