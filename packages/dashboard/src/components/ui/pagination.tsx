import React from 'react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems: number
  itemsPerPage: number
  className?: string
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  className = ''
}: PaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = []
    const maxPagesToShow = 5
    
    if (totalPages <= maxPagesToShow) {
      // Show all pages if we have 5 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Show first page, last page, and pages around current page
      if (currentPage <= 3) {
        // Show first 3 pages
        pages.push(1, 2, 3)
        if (totalPages > 4) pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        // Show last 3 pages
        pages.push(1)
        if (totalPages > 4) pages.push('...')
        pages.push(totalPages - 2, totalPages - 1, totalPages)
      } else {
        // Show pages around current page
        pages.push(1)
        if (currentPage > 4) pages.push('...')
        pages.push(currentPage - 1, currentPage, currentPage + 1)
        if (currentPage < totalPages - 3) pages.push('...')
        pages.push(totalPages)
      }
    }
    
    return pages
  }

  return (
    <div className={`d-flex justify-content-between align-items-center ${className}`}>
      <div className="d-flex align-items-center text-muted">
        <span>
          Showing {startItem} to {endItem} of {totalItems} results
        </span>
      </div>
      
      <nav aria-label="Page navigation">
        <ul className="pagination pagination-sm mb-0">
          {/* Previous button */}
          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
            <button
              className="page-link"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous"
            >
              <span aria-hidden="true">&laquo;</span>
            </button>
          </li>

          {/* Page numbers */}
          {getPageNumbers().map((page, index) => (
            <li key={index} className={`page-item ${page === currentPage ? 'active' : ''}`}>
              {page === '...' ? (
                <span className="page-link">...</span>
              ) : (
                <button
                  className="page-link"
                  onClick={() => onPageChange(page as number)}
                  aria-label={`Go to page ${page}`}
                >
                  {page}
                </button>
              )}
            </li>
          ))}

          {/* Next button */}
          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
            <button
              className="page-link"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Next"
            >
              <span aria-hidden="true">&raquo;</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  )
} 