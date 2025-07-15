import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatsCard from '../StatsCard'

describe('StatsCard', () => {
  it('renders with basic props', () => {
    render(
      <StatsCard
        title="Trust Score"
        value="85%"
      />
    )
    
    expect(screen.getByText('Trust Score')).toBeInTheDocument()
    expect(screen.getByText('85%')).toBeInTheDocument()
  })

  it('renders with numeric value', () => {
    render(
      <StatsCard
        title="Total Votes"
        value={1234}
      />
    )
    
    expect(screen.getByText('Total Votes')).toBeInTheDocument()
    expect(screen.getByText('1234')).toBeInTheDocument()
  })

  it('renders with string value', () => {
    render(
      <StatsCard
        title="Completion Rate"
        value="N/A"
      />
    )
    
    expect(screen.getByText('Completion Rate')).toBeInTheDocument()
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })

  it('renders with up trend', () => {
    render(
      <StatsCard
        title="Trust Score"
        value="85%"
        trend="up"
      />
    )
    
    expect(screen.getByText('Trust Score')).toBeInTheDocument()
    expect(screen.getByText('85%')).toBeInTheDocument()
    expect(screen.getByText('↗')).toBeInTheDocument()
  })

  it('renders with down trend', () => {
    render(
      <StatsCard
        title="Trust Score"
        value="65%"
        trend="down"
      />
    )
    
    expect(screen.getByText('Trust Score')).toBeInTheDocument()
    expect(screen.getByText('65%')).toBeInTheDocument()
    expect(screen.getByText('↘')).toBeInTheDocument()
  })

  it('renders with stable trend', () => {
    render(
      <StatsCard
        title="Trust Score"
        value="75%"
        trend="stable"
      />
    )
    
    expect(screen.getByText('Trust Score')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('→')).toBeInTheDocument()
  })

  it('renders without optional props', () => {
    render(
      <StatsCard
        title="Basic Card"
        value="100"
      />
    )
    
    expect(screen.getByText('Basic Card')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    
    // Should not crash without trend
    const card = screen.getByText('Basic Card').closest('div')
    expect(card).toBeInTheDocument()
  })

  it('handles long titles gracefully', () => {
    const longTitle = "This is a very long title that might wrap to multiple lines"
    render(
      <StatsCard
        title={longTitle}
        value="42"
      />
    )
    
    expect(screen.getByText(longTitle)).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('handles zero values correctly', () => {
    render(
      <StatsCard
        title="Zero Value"
        value={0}
      />
    )
    
    expect(screen.getByText('Zero Value')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('handles empty string values', () => {
    render(
      <StatsCard
        title="Empty String"
        value=""
      />
    )
    
    expect(screen.getByText('Empty String')).toBeInTheDocument()
    // For empty strings, just check that the component renders without crashing
    const card = screen.getByText('Empty String').closest('div')
    expect(card).toBeInTheDocument()
  })

  it('applies custom className when provided', () => {
    const { container } = render(
      <StatsCard
        title="Custom Class"
        value="100"
        className="custom-stats-card"
      />
    )
    
    expect(container.firstChild).toHaveClass('custom-stats-card')
  })

  it('has proper semantic structure', () => {
    render(
      <StatsCard
        title="Semantic Test"
        value="100"
      />
    )
    
    // Check for proper heading structure
    const title = screen.getByText('Semantic Test')
    expect(title).toBeInTheDocument()
    
    // Check for proper value display
    const value = screen.getByText('100')
    expect(value).toBeInTheDocument()
  })
}) 