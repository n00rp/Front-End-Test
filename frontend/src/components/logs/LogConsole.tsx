import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

interface LogEntry {
    id: number
    timestamp: string
    level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'
    message: string
}

interface LogConsoleProps {
    logs: LogEntry[]
}

export function LogConsole({ logs }: LogConsoleProps) {
    const parentRef = useRef<HTMLDivElement>(null)

    const rowVirtualizer = useVirtualizer({
        count: logs.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 24, // Estimate row height (24px)
        overscan: 5,
    })

    return (
        <div className="flex flex-col h-full border rounded-lg bg-black font-mono text-sm overflow-hidden shadow-inner">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
                <span className="text-muted-foreground text-xs">Console Output ({logs.length} lines)</span>
                <div className="flex gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                    <span className="text-xs text-red-500">Live</span>
                </div>
            </div>

            <div
                ref={parentRef}
                className="flex-1 overflow-auto bg-[#0c0c0c]"
            >
                <div
                    style={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const log = logs[virtualRow.index]
                        return (
                            <div
                                key={virtualRow.index}
                                className="absolute top-0 left-0 w-full px-4 flex gap-4 hover:bg-white/5 transition-colors"
                                style={{
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                            >
                                <span className="text-slate-500 w-[160px] shrink-0 select-none block truncate">
                                    {log.timestamp}
                                </span>
                                <span className={`w-[50px] shrink-0 font-bold ${log.level === 'ERROR' ? 'text-red-500' :
                                        log.level === 'WARN' ? 'text-yellow-500' :
                                            log.level === 'DEBUG' ? 'text-blue-500' : 'text-green-500'
                                    }`}>
                                    {log.level}
                                </span>
                                <span className="text-slate-300 truncate">
                                    {log.message}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
