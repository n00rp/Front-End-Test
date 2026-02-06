import { useEffect, useRef, useState } from 'react'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'

interface SeriesConfig {
    label: string
    stroke: string
    width?: number
}

interface SensorGraphProps {
    data: uPlot.AlignedData
    seriesConfig: SeriesConfig[]
    title?: string
    height?: number
    onZoom?: (min: number, max: number) => void
    interactionMode?: 'zoom' | 'pan'
    onPan?: (deltaX: number) => void
}

// Custom theme colors matching our Dark Mode aesthetic
const THEME = {
    text: "#94a3b8", // muted-foreground
    grid: "#1e293b80", // slate-800 with 50% opacity
    background: "#020817", // background
    zoomFill: "rgba(34, 211, 238, 0.2)", // Cyan zoom box
}

export function SensorGraph({ data, seriesConfig, title = "Sensor Stream", height = 600, onZoom, interactionMode = 'zoom', onPan }: SensorGraphProps) {
    const chartRef = useRef<HTMLDivElement>(null)
    const uPlotRef = useRef<uPlot | null>(null)
    const [dimensions, setDimensions] = useState({ width: 0, height })

    // Panning State
    const isDragging = useRef(false)
    const lastX = useRef(0)

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

    // Pan Event Handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        if (interactionMode === 'pan') {
            isDragging.current = true
            lastX.current = e.clientX
            // Prevent text selection while dragging
            document.body.style.userSelect = 'none'
        }
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (interactionMode === 'pan' && isDragging.current) {
            const deltaPx = lastX.current - e.clientX
            lastX.current = e.clientX

            if (onPan && uPlotRef.current) {
                // Convert pixel delta to Value delta
                const u = uPlotRef.current
                const xMin = u.scales.x.min!
                const xMax = u.scales.x.max!
                const duration = xMax - xMin
                const plotWidth = u.bbox.width

                const deltaSeconds = (deltaPx / plotWidth) * duration

                onPan(deltaSeconds)
            }
        }
    }

    const handleMouseUp = () => {
        isDragging.current = false
        document.body.style.userSelect = ''
    }

    // Initialize uPlot
    useEffect(() => {
        if (!chartRef.current || dimensions.width === 0) return

        // 1. Time Series
        const seriesDefs: uPlot.Series[] = [
            {
                label: "Time",
                value: (_self: uPlot, raw: number) => new Date(raw * 1000).toISOString().replace('T', ' ').slice(0, -1),
                stroke: THEME.text,
            }
        ]

        // 2. Data Series (Dynamic)
        seriesConfig.forEach(conf => {
            seriesDefs.push({
                label: conf.label,
                stroke: conf.stroke,
                width: conf.width || 2,
                points: { show: false },
                spanGaps: true // Fix "dots" by connecting lines over nulls
            })
        })

        const opts: uPlot.Options = {
            title: title,
            width: dimensions.width,
            height: height,
            mode: 1, // 1: scale x, 2: scale y
            tzDate: (ts) => uPlot.tzDate(new Date(ts * 1000), 'UTC'),
            series: seriesDefs,
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
                drag: {
                    x: interactionMode === 'zoom', // Only enable native drag-zoom in zoom mode
                    y: false,
                    setScale: false // We handle zoom manually via setSelect hook
                },
                points: {
                    size: 9,
                    fill: (self: uPlot, i: number) => self.series[i].stroke as string
                }
            },
            legend: {
                show: true,
            },
            hooks: {
                setSelect: [
                    (u) => {
                        if (interactionMode !== 'zoom') return;

                        const min = u.posToVal(u.select.left, 'x');
                        const max = u.posToVal(u.select.left + u.select.width, 'x');

                        // Sanity check: ensure valid range
                        if (max - min > 0) {
                            // Reset selection so it doesn't stick
                            u.setSelect({ width: 0, height: 0, top: 0, left: 0 }, false);

                            if (onZoom) {
                                onZoom(min, max);
                            }
                        }
                    }
                ]
            }
        }

        const instance = new uPlot(opts, data, chartRef.current)
        uPlotRef.current = instance

        // Add CSS for visible zoom box
        const style = document.createElement('style');
        style.innerHTML = `
            .u-select {
                background: ${THEME.zoomFill} !important;
                border: 1px solid #22d3ee !important;
                opacity: 0.8;
            }
        `;
        chartRef.current.appendChild(style);

        return () => {
            instance.destroy()
            uPlotRef.current = null
        }
    }, [dimensions.width, height, title, seriesConfig, onZoom, interactionMode]) // Re-init when config changes

    // Update data without destroying instance
    useEffect(() => {
        if (uPlotRef.current && data) {
            uPlotRef.current.setData(data)
        }
    }, [data])

    return (
        <div
            ref={chartRef}
            className={`w-full h-full relative ${interactionMode === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        />
    )
}
