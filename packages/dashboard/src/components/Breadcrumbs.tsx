'use client'

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

export function Breadcrumbs({ className = '', items }: BreadcrumbsProps) {
  const pathname = usePathname()
  
  // Generate breadcrumbs from pathname if items not provided
  const breadcrumbItems = items || generateBreadcrumbs(pathname)

  if (breadcrumbItems.length <= 1) {
    return null
  }

  return (
    <nav className={`breadcrumb ${className}`} aria-label="breadcrumb">
      <ol className="breadcrumb-item">
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