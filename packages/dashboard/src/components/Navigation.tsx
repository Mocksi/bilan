'use client'

import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Breadcrumbs, BreadcrumbItem } from './Breadcrumbs'

interface NavigationProps {
  children: ReactNode
  breadcrumbs?: BreadcrumbItem[]
  className?: string
}

export function Navigation({ children, breadcrumbs, className = '' }: NavigationProps) {
  return (
    <div className={`page ${className}`}>
      <Sidebar className="navbar-vertical" />
      
      <div className="page-wrapper">
        <div className="page-header d-print-none">
          <div className="container-xl">
            <div className="row g-2 align-items-center">
              <div className="col">
                <Breadcrumbs items={breadcrumbs} />
              </div>
            </div>
          </div>
        </div>
        
        <div className="page-body">
          <div className="container-xl">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export type { BreadcrumbItem } 