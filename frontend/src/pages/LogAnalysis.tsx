import { useState, useEffect } from 'react'
import { LogConsole } from '../components/logs/LogConsole'

interface LogEntry {
    id: number
    timestamp: string
    level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'
    message: string
}

const MOCK_MESSAGES = [
    "Connection established to TimescaleDB node #1",
    "Ingesting data chunk (4MB)",
    "Aggregation complete for window [10m]",
    "Sensor #492 reporting high latency",
    "Worker process spawned",
    "Garbage collection triggered",
    "User query received: range=1h",
]

function generateLogs(count: number): LogEntry[] {
    const logs: LogEntry[] = []
    const now = Date.now()
    for (let i = 0; i < count; i++) {
        logs.push({
            id: i,
            timestamp: new Date(now - (count - i) * 1000).toISOString().replace('T', ' ').split('.')[0],
            level: i % 50 === 0 ? 'ERROR' : i % 20 === 0 ? 'WARN' : 'INFO',
            message: `${MOCK_MESSAGES[Math.floor(Math.random() * MOCK_MESSAGES.length)]} [ID:${Math.floor(Math.random() * 1000)}]`
        })
    }
    return logs
}

export default function LogAnalysis() {
    const [logs, setLogs] = useState<LogEntry[]>([])

    useEffect(() => {
        // Generate 50,000 logs to demonstrate performance
        setLogs(generateLogs(50000))
    }, [])

    return (
        <div className="p-6 h-[calc(100vh-2rem)] flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-3xl font-bold">System Logs</h1>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Search logs..."
                        className="bg-background border rounded px-3 py-1 text-sm w-64 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>
            </div>

            <div className="flex-1 min-h-0">
                <LogConsole logs={logs} />
            </div>
        </div>
    )
}
