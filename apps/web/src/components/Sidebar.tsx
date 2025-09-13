'use client'

import { useState } from 'react'
import { 
  BarChart3, 
  Users, 
  MessageSquare, 
  Brain, 
  Settings, 
  Mail, 
  Database,
  Activity,
  TrendingUp,
  Zap,
  FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const navigation = [
  {
    name: 'Overview',
    href: '#',
    icon: BarChart3,
    current: true,
    badge: null
  },
  {
    name: 'Email Analytics',
    href: '#',
    icon: Mail,
    current: false,
    badge: null
  },
  {
    name: 'Contacts',
    href: '#',
    icon: Users,
    current: false,
    badge: 'New'
  },
  {
    name: 'Threads',
    href: '#',
    icon: MessageSquare,
    current: false,
    badge: null
  },
  {
    name: 'AI Console',
    href: '#',
    icon: Brain,
    current: false,
    badge: 'Beta'
  },
  {
    name: 'Insights',
    href: '#',
    icon: TrendingUp,
    current: false,
    badge: null
  },
  {
    name: 'Reports',
    href: '#',
    icon: FileText,
    current: false,
    badge: null
  },
  {
    name: 'Automation',
    href: '#',
    icon: Zap,
    current: false,
    badge: null
  },
  {
    name: 'Data Sources',
    href: '#',
    icon: Database,
    current: false,
    badge: null
  },
  {
    name: 'Health Monitor',
    href: '#',
    icon: Activity,
    current: false,
    badge: null
  },
]

const secondaryNavigation = [
  {
    name: 'Settings',
    href: '#',
    icon: Settings,
    current: false
  }
]

export function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      {/* Mobile sidebar */}
      <div className={cn(
        'fixed inset-0 z-50 lg:hidden',
        sidebarOpen ? 'block' : 'hidden'
      )}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4">
            <h2 className="text-lg font-semibold">Taskforce Mailer</h2>
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
              ×
            </Button>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item) => (
              <Button
                key={item.name}
                variant={item.current ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start',
                  item.current && 'bg-blue-50 text-blue-700'
                )}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
                {item.badge && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {item.badge}
                  </Badge>
                )}
              </Button>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div className="ml-3">
                <h2 className="text-lg font-semibold text-gray-900">Taskforce Mailer</h2>
                <p className="text-xs text-gray-500">Analytics Platform</p>
              </div>
            </div>
          </div>
          
          <nav className="mt-8 flex-1 px-2 space-y-1">
            {navigation.map((item) => (
              <Button
                key={item.name}
                variant={item.current ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start h-10',
                  item.current && 'bg-blue-50 text-blue-700 border-blue-200'
                )}
              >
                <item.icon className="mr-3 h-5 w-5" />
                <span className="truncate">{item.name}</span>
                {item.badge && (
                  <Badge 
                    variant={item.badge === 'Beta' ? 'default' : 'secondary'} 
                    className="ml-auto text-xs"
                  >
                    {item.badge}
                  </Badge>
                )}
              </Button>
            ))}
          </nav>

          <div className="flex-shrink-0 px-2 py-4 border-t border-gray-200">
            {secondaryNavigation.map((item) => (
              <Button
                key={item.name}
                variant="ghost"
                className="w-full justify-start h-10"
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
