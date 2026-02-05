import { useState } from 'react'
import { Calendar } from 'lucide-react'
import { format, subMinutes, subHours } from 'date-fns'

export function TimeControls() {
    const [startTime, setStartTime] = useState(subHours(new Date(), 1))
    const [endTime, setEndTime] = useState(new Date())
    const [rangeLabel, setRangeLabel] = useState('Last 1 Hour')

    const setRange = (label: string, minutes: number) => {
        const end = new Date()
        const start = subMinutes(end, minutes)
        setStartTime(start)
        setEndTime(end)
        setRangeLabel(label)
    }

    return (
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg p-1">

            {/* Presets */}
            <div className="flex items-center border-r border-slate-700 pr-2 mr-2 gap-1">
                {['15m', '1h', '6h', '24h', '7d'].map((label) => (
                    <button
                        key={label}
                        onClick={() => setRange(`Last ${label}`, label === '15m' ? 15 : label === '1h' ? 60 : label === '6h' ? 360 : label === '24h' ? 1440 : 10080)}
                        className={`px-2 py-1 text-xs font-medium rounded hover:bg-slate-700 ${rangeLabel === `Last ${label}` ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Manual Picker Trigger */}
            <button className="flex items-center gap-2 px-3 py-1 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded">
                <Calendar size={14} />
                <span>{format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}</span>
            </button>

            <button className="p-1 px-2 bg-primary/20 text-primary text-xs rounded hover:bg-primary/30 uppercase font-bold tracking-wider">
                Live
            </button>
        </div>
    )
}
