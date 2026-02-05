import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
    Activity,
    History,
    FileText,
    Settings,
    Menu,
    X
} from 'lucide-react'

interface SidebarProps {
    className?: string
}

export function Sidebar({ className }: SidebarProps) {
    const location = useLocation()
    const [collapsed, setCollapsed] = useState(false)

    const navItems = [
        { name: 'Live Monitor', path: '/', icon: Activity },
        { name: 'Sessions', path: '/sessions', icon: History },
        { name: 'System Logs', path: '/logs', icon: FileText },
        { name: 'Settings', path: '/settings', icon: Settings },
    ]

    return (
        <div className={cn("flex flex-col h-screen border-r bg-card transition-all duration-300", collapsed ? "w-16" : "w-64", className)}>
            <div className="flex h-16 items-center justify-between px-4 border-b">
                {!collapsed && <span className="font-bold text-lg tracking-tight text-primary">SensorFlow</span>}
                <button onClick={() => setCollapsed(!collapsed)} className="p-2 rounded-md hover:bg-accent hover:text-accent-foreground">
                    {collapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
                </button>
            </div>

            <nav className="flex-1 space-y-2 p-2">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                                collapsed && "justify-center"
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            {!collapsed && <span>{item.name}</span>}
                        </Link>
                    )
                })}
            </nav>

            <div className="p-4 border-t">
                {!collapsed && <p className="text-xs text-muted-foreground">Connected: <span className="text-green-500">Online</span></p>}
            </div>
        </div>
    )
}
