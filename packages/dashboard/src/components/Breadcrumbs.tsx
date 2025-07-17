'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  className?: string
  items?: BreadcrumbItem[]
}

/**
 * Breadcrumbs component displays a navigational breadcrumb trail
 * showing the current page's position in the site hierarchy.
 * 
 * @param className - Optional CSS class name for styling
 * @param items - Array of breadcrumb items, auto-generated from pathname if not provided
 */
export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ className = '', items }) => {
  const pathname = usePathname()
  
  // Generate breadcrumbs from pathname if items not provided
  const breadcrumbItems = items || generateBreadcrumbs(pathname)

  if (breadcrumbItems.length <= 1) {
    return null
  }

  return (
    <nav className={className} aria-label="breadcrumb">
      <ol className="breadcrumb">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1
          
          if (isLast || !item.href) {
            return (
              <li key={index} className="breadcrumb-item active" aria-current="page">
                {item.label}
              </li>
            )
          }
          
          return (
            <li key={index} className="breadcrumb-item">
              <Link href={item.href} className="text-decoration-none">
                {item.label}
              </Link>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const pathSegments = pathname.split('/').filter(Boolean)
  
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/' }
  ]
  
  let currentPath = ''
  
  for (const segment of pathSegments) {
    currentPath += `/${segment}`
    
    const label = segment.charAt(0).toUpperCase() + segment.slice(1)
    
    breadcrumbs.push({
      label,
      href: currentPath
    })
  }
  
  return breadcrumbs
}

export type { BreadcrumbItem } 