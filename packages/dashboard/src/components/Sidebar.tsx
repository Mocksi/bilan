'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThumbsUpIcon } from './icons'

interface SidebarProps {
  className?: string
}

export const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const navItems = [
    {
      href: '/',
      label: 'Overview',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9,22 9,12 15,12 15,22"/>
        </svg>
      )
    },
    {
      href: '/votes',
      label: 'Votes',
      icon: <ThumbsUpIcon width={16} height={16} />
    },
    {
      href: '/conversations',
      label: 'Conversations',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
        </svg>
      )
    },
    {
      href: '/journeys',
      label: 'Journeys',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 2v20M14 2v20M4 7l4-4 4 4M20 17l-4 4-4-4"/>
          <path d="M4 17h16M4 7h16"/>
        </svg>
      )
    }
  ]

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  return (
    <div className={`navbar-vertical navbar-expand-lg`}>
      <div className="container-fluid">
        <button
          className="navbar-toggler"
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-expanded={!isCollapsed}
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        
        <h1 className="navbar-brand navbar-brand-autodark">
          <Link href="/" className="text-decoration-none">
            Bilan Analytics
          </Link>
        </h1>

        <div className={`navbar-nav`}>
          <div className="nav-item dropdown">
            <div className="nav-link dropdown-toggle" data-bs-toggle="dropdown" role="button" aria-expanded="false">
              Analytics
            </div>
            <div className="dropdown-menu">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`dropdown-item ${isActive(item.href) ? 'active' : ''}`}
                >
                  <span className="nav-link-icon d-md-none d-lg-inline-block me-2">
                    {item.icon}
                  </span>
                  <span className="nav-link-title">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 