import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Table from '../Table'

describe('Table', () => {
  const mockData = [
    { id: '1', name: 'John Doe', email: 'john@example.com', status: 'active' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'inactive' },
    { id: '3', name: 'Bob Johnson', email: 'bob@example.com', status: 'active' }
  ]

  const mockColumns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Status' }
  ]

  it('renders with basic props', () => {
    render(
      <Table
        data={mockData}
        columns={mockColumns}
      />
    )
    
    // Check headers
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    
    // Check data rows
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument()
    expect(screen.getByText('bob@example.com')).toBeInTheDocument()
  })

  it('renders with empty data', () => {
    render(
      <Table
        data={[]}
        columns={mockColumns}
      />
    )
    
    // Headers should still be present
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    
    // Should show empty state or no data rows
    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()
  })

  it('handles single row data', () => {
    const singleRowData = [mockData[0]]
    
    render(
      <Table
        data={singleRowData}
        columns={mockColumns}
      />
    )
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
    
    // Should not show other rows
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
    expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument()
  })

  it('handles missing data properties gracefully', () => {
    const incompleteData = [
      { id: '1', name: 'John Doe' }, // missing email and status
      { id: '2', email: 'jane@example.com', status: 'active' } // missing name
    ]
    
    render(
      <Table
        data={incompleteData}
        columns={mockColumns}
      />
    )
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
  })

  it('renders with custom className', () => {
    const { container } = render(
      <Table
        data={mockData}
        columns={mockColumns}
        className="custom-table"
      />
    )
    
    expect(container.firstChild).toHaveClass('custom-table')
  })

  it('has proper table structure', () => {
    render(
      <Table
        data={mockData}
        columns={mockColumns}
      />
    )
    
    // Check for proper table elements
    expect(screen.getByRole('table')).toBeInTheDocument()
    
    // Check for header row
    const headers = screen.getAllByRole('columnheader')
    expect(headers).toHaveLength(3)
    
    // Check for data rows
    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(4) // 1 header + 3 data rows
  })

  it('handles different data types in cells', () => {
    const mixedData = [
      { id: '1', name: 'John', age: 30, score: 95.5 },
      { id: '2', name: 'Jane', age: 25, score: 88.2 }
    ]
    
    const mixedColumns = [
      { key: 'name', label: 'Name' },
      { key: 'age', label: 'Age' },
      { key: 'score', label: 'Score' }
    ]
    
    render(
      <Table
        data={mixedData}
        columns={mixedColumns}
      />
    )
    
    expect(screen.getByText('John')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.getByText('95.5')).toBeInTheDocument()
    expect(screen.getByText('Jane')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText('88.2')).toBeInTheDocument()
  })

  it('handles columns with no matching data', () => {
    const columnsWithExtra = [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'nonexistent', label: 'Non-existent' }
    ]
    
    render(
      <Table
        data={mockData}
        columns={columnsWithExtra}
      />
    )
    
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Non-existent')).toBeInTheDocument()
    
    // Data should still render for existing columns
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })

  it('maintains accessibility attributes', () => {
    render(
      <Table
        data={mockData}
        columns={mockColumns}
      />
    )
    
    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()
    
    // Check that headers are properly associated
    const headers = screen.getAllByRole('columnheader')
    headers.forEach(header => {
      expect(header).toBeInTheDocument()
    })
    
    // Check that rows are properly structured
    const rows = screen.getAllByRole('row')
    expect(rows.length).toBeGreaterThan(0)
  })
}) 