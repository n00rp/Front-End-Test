import { useState, useEffect } from 'react'
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
    const [sensors, setSensors] = useState<Record<string, string[]>>({})
    const [selectedSensors, setSelectedSensors] = useState<Set<string>>(new Set())

    const navItems = [
        { name: 'Live Monitor', path: '/', icon: Activity },
        { name: 'Sessions', path: '/sessions', icon: History },
        { name: 'System Logs', path: '/logs', icon: FileText },
        { name: 'Settings', path: '/settings', icon: Settings },
    ]

    // Fetch sensors on mount
    useEffect(() => {
        fetch('http://localhost:8000/api/sensors')
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    console.error("Sensor Fetch Error:", data.error)
                } else {
                    setSensors(data)
                }
            })
            .catch(err => console.error("Failed to load sensors:", err))

        // Load selection from URL
        const params = new URLSearchParams(window.location.search)
        const sensorsParam = params.get('sensors')
        if (sensorsParam) {
            setSelectedSensors(new Set(sensorsParam.split(',')))
        }
    }, [])

    const updateUrl = (newSelection: Set<string>) => {
        const params = new URLSearchParams(window.location.search)
        if (newSelection.size > 0) {
            params.set('sensors', Array.from(newSelection).join(','))
        } else {
            params.delete('sensors')
        }

        const newUrl = `${window.location.pathname}?${params.toString()}`
        window.history.replaceState(null, '', newUrl)
        window.dispatchEvent(new Event('sensor-selection-change'))
    }

    const toggleSensor = (sensorId: string) => {
        const next = new Set(selectedSensors)
        if (next.has(sensorId)) {
            next.delete(sensorId)
        } else {
            next.add(sensorId)
        }
        setSelectedSensors(next)
        updateUrl(next)
    }

    const toggleAll = (group: string, list: string[]) => {
        const next = new Set(selectedSensors)
        const allSelected = list.every(s => next.has(s))

        if (allSelected) {
            list.forEach(s => next.delete(s))
        } else {
            list.forEach(s => next.add(s))
        }
        setSelectedSensors(next)
        updateUrl(next)
    }

    return (
        <div className={cn("flex flex-col h-screen border-r bg-card transition-all duration-300", collapsed ? "w-16" : "w-64", className)}>
            <div className="flex h-16 items-center justify-between px-4 border-b">
                {!collapsed && <span className="font-bold text-lg tracking-tight text-primary">SensorFlow</span>}
                <button onClick={() => setCollapsed(!collapsed)} className="p-2 rounded-md hover:bg-accent hover:text-accent-foreground">
                    {collapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
                </button>
            </div>

            <nav className="flex-1 space-y-2 p-2 overflow-y-auto">
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

                <div className="my-4 border-t border-border/50" />

                {!collapsed && (
                    <div className="px-3 py-2">
                        <div className="mb-2 px-2 flex items-center justify-between">
                            <h3 className="text-xs font-semibold tracking-tight text-muted-foreground">SENSORS</h3>
                        </div>

                        <div className="space-y-4">
                            {Object.entries(sensors).map(([group, list]) => (
                                <div key={group}>
                                    <div className="flex items-center justify-between px-2 mb-1">
                                        <h4 className="text-xs font-medium text-cyan-400/80">{group}</h4>
                                        <button
                                            onClick={() => toggleAll(group, list)}
                                            className="text-[10px] text-muted-foreground hover:text-white uppercase transition-colors"
                                        >
                                            Toggle All
                                        </button>
                                    </div>

                                    <div className="space-y-1">
                                        {list.slice(0, 50).map(sensor => {
                                            const isSelected = selectedSensors.has(sensor)
                                            return (
                                                <button
                                                    key={sensor}
                                                    onClick={() => toggleSensor(sensor)}
                                                    className={cn(
                                                        "w-full text-left flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                                                        isSelected ? "bg-accent/50 text-white" : "text-muted-foreground hover:bg-accent hover:text-white"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "h-3 w-3 border rounded-sm flex items-center justify-center transition-colors shrink-0",
                                                        isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                                                    )}>
                                                        {isSelected && <div className="h-1.5 w-1.5 bg-background rounded-[1px]" />}
                                                    </div>
                                                    <span className="truncate">{sensor}</span>
                                                </button>
                                            )
                                        })}
                                        {list.length > 50 && (
                                            <div className="px-2 text-xs text-muted-foreground italic">
                                                + {list.length - 50} more...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {Object.keys(sensors).length === 0 && (
                                <div className="px-2 text-xs text-muted-foreground italic">Loading sensors...</div>
                            )}
                        </div>
                    </div>
                )}
            </nav>

            <div className="p-4 border-t">
                {!collapsed && <p className="text-xs text-muted-foreground">Connected: <span className="text-green-500">Online</span></p>}
            </div>
        </div>
    )
}
