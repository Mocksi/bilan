import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const Navigation: React.FC = () => {
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/votes', label: 'Votes', icon: '👍' },
    { href: '/conversations', label: 'Conversations', icon: '💬' },
    { href: '/journeys', label: 'Journeys', icon: '🗺️' },
  ]

  return (
    <ul className="navbar-nav">
      {navItems.map((item) => (
        <li key={item.href} className={`nav-item ${pathname === item.href ? 'active' : ''}`}>
          <Link
            href={item.href}
            className="nav-link"
          >
            <span className="nav-link-icon d-md-none d-lg-inline-block me-2">
              {item.icon}
            </span>
            <span className="nav-link-title">{item.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
} 