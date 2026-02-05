import { useEffect, useRef, useState } from 'react'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'

interface SensorGraphProps {
    data: uPlot.AlignedData
    title?: string
    height?: number
}

// Custom theme colors matching our Dark Mode aesthetic
const THEME = {
    text: "#94a3b8", // muted-foreground
    grid: "#1e293b80", // slate-800 with 50% opacity
    background: "#020817", // background
}

export function SensorGraph({ data, title = "Sensor Stream", height = 600 }: SensorGraphProps) {
    const chartRef = useRef<HTMLDivElement>(null)
    const uPlotRef = useRef<uPlot | null>(null)
    const [dimensions, setDimensions] = useState({ width: 0, height })

    // Initialize ResizeObserver to handle fluid dashboard layouts
    useEffect(() => {
        if (!chartRef.current) return

        const observer = new ResizeObserver((entries) => {
            if (entries[0]) {
                const { width } = entries[0].contentRect
                setDimensions(d => ({ ...d, width }))
                if (uPlotRef.current) {
                    uPlotRef.current.setSize({ width, height })
                }
            }
        })

        observer.observe(chartRef.current)
        return () => observer.disconnect()
    }, [height])

    // Initialize uPlot
    useEffect(() => {
        if (!chartRef.current || dimensions.width === 0) return

        const opts: uPlot.Options = {
            title: title,
            width: dimensions.width,
            height: height,
            mode: 1, // 1: scale x, 2: scale y
            tzDate: (ts) => uPlot.tzDate(new Date(ts * 1000), 'UTC'),
            series: [
                {
                    label: "Time",
                    value: (_self: uPlot, raw: number) => new Date(raw * 1000).toISOString().replace('T', ' ').slice(0, -1),
                    stroke: THEME.text,
                },
                {
                    label: "Sensor A",
                    stroke: "#22d3ee", // Cyan-400
                    width: 2,
                    points: { show: false }
                },
                {
                    label: "Sensor B",
                    stroke: "#d946ef", // Fuchsia-500
                    width: 2,
                    points: { show: false }
                },
                {
                    label: "Sensor C",
                    stroke: "#84cc16", // Lime-500
                    width: 2,
                    points: { show: false }
                }
            ],
            axes: [
                {
                    grid: { show: true, stroke: THEME.grid, width: 1 },
                    ticks: { show: true, stroke: THEME.grid, width: 1 },
                    stroke: THEME.text,
                },
                {
                    grid: { show: true, stroke: THEME.grid, width: 1 },
                    ticks: { show: true, stroke: THEME.grid, width: 1 },
                    stroke: THEME.text,
                }
            ],
            cursor: {
                drag: { x: true, y: true },
                points: {
                    size: 9,
                    fill: (self: uPlot, i: number) => self.series[i].stroke as string
                }
            },
            legend: {
                show: true,
            }
        }

        const instance = new uPlot(opts, data, chartRef.current)
        uPlotRef.current = instance

        return () => {
            instance.destroy()
            uPlotRef.current = null
        }
    }, [dimensions.width, height, title]) // Re-init on resize is expensive, better to just setSize, but this is safe for now

    // Update data without destroying instance
    useEffect(() => {
        if (uPlotRef.current && data) {
            uPlotRef.current.setData(data)
        }
    }, [data])

    return (
        <div className="w-full relative h-full">
            <div ref={chartRef} />
        </div>
    )
}
