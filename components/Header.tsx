'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ThemeToggle from './ThemeToggle'

interface HeaderProps {
  fullWidth?: boolean
}

export default function Header({ fullWidth = false }: HeaderProps) {
  const pathname = usePathname()
  const [agentStatus, setAgentStatus] = useState({
    planner: 'idle',
    coder: 'idle',
    debugger: 'idle',
    pm: 'idle'
  })

  return (
    <header className="bg-white dark:bg-gray-900/90 backdrop-blur border-b border-border">
      <div className={fullWidth ? 'w-full px-4 sm:px-6 lg:px-8' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}>
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
              <span className="text-xl font-bold tracking-tight text-foreground">AI Hack Mate</span>
              <span className="ml-3 text-xs text-muted-foreground uppercase">Multi-Agent</span>
            </Link>
          </div>

          {/* Center: Navigation */}
          <nav className="hidden md:flex items-center space-x-2">
            <Link 
              href="/" 
              className={`nav-link ${pathname === '/' ? 'nav-link-active' : ''}`}
            >
              Home
            </Link>
            <Link 
              href="/dashboard" 
              className={`nav-link ${pathname === '/dashboard' ? 'nav-link-active' : ''}`}
            >
              Dashboard
            </Link>
            <Link 
              href="/github" 
              className={`nav-link ${pathname === '/github' ? 'nav-link-active' : ''}`}
            >
              🚀 GitHub AI
            </Link>
            <Link 
              href="/analytics" 
              className={`nav-link ${pathname === '/analytics' ? 'nav-link-active' : ''}`}
            >
              Analytics
            </Link>
          </nav>

          {/* Right: Utilities */}
          <div className="flex items-center space-x-3">
            <ThemeToggle />

            {/* Agent status - compact, show on lg+ */}
            <div className="hidden lg:flex items-center space-x-2 px-2 py-1 rounded-full bg-muted">
              {Object.entries(agentStatus).map(([agent, status]) => (
                <div key={agent} className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${
                    status === 'active' ? 'bg-green-500' :
                    status === 'working' ? 'bg-yellow-500 animate-pulse' :
                    'bg-gray-300 dark:bg-gray-600'
                  }`} />
                  <span className="text-[10px] text-muted-foreground capitalize">{agent}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </header>
  )
}
