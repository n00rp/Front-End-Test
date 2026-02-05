import { useRef, useEffect, useState } from 'react'

interface HeatmapViewProps {
    sensorCount?: number
    timeSteps?: number
}

// Generate some coherent noise for the demo
function noise(x: number, y: number) {
    return (Math.sin(x * 0.05) + Math.sin(y * 0.1) + Math.sin((x + y) * 0.02)) * 0.33
}

export function HeatmapView({ sensorCount = 500, timeSteps = 1000 }: HeatmapViewProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [hoverInfo, setHoverInfo] = useState<{ x: number, y: number, val: number } | null>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Set canvas size
        const width = canvas.width = canvas.parentElement?.clientWidth || 800
        const height = canvas.height = canvas.parentElement?.clientHeight || 600

        // Render Heatmap
        const imageData = ctx.createImageData(width, height)
        const data = imageData.data

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Map pixel to sensor/time space
                const sensorIdx = Math.floor((y / height) * sensorCount)
                const timeIdx = Math.floor((x / width) * timeSteps)

                // Generate value (0-1)
                const val = (noise(timeIdx, sensorIdx) + 1) / 2

                // Color Mapping (Blue -> Green -> Red)
                const r = Math.floor(val * 255)
                const g = Math.floor((1 - Math.abs(val - 0.5) * 2) * 255)
                const b = Math.floor((1 - val) * 255)

                const index = (y * width + x) * 4
                data[index] = r     // Red
                data[index + 1] = g // Green
                data[index + 2] = b // Blue
                data[index + 3] = 255 // Alpha
            }
        }

        ctx.putImageData(imageData, 0, 0)

        // Draw Grid Lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
        ctx.beginPath()
        for (let i = 1; i < 10; i++) {
            const x = (width / 10) * i
            ctx.moveTo(x, 0)
            ctx.lineTo(x, height)
        }
        ctx.stroke()

    }, [sensorCount, timeSteps])

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const relY = y / rect.height
        setHoverInfo({
            x: Math.floor(x),
            y: Math.floor(y),
            val: Math.floor(relY * sensorCount)
        })
    }

    return (
        <div className="w-full h-full relative bg-black rounded-lg overflow-hidden border border-border">
            <canvas
                ref={canvasRef}
                className="w-full h-full cursor-crosshair"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoverInfo(null)}
            />
            {hoverInfo && (
                <div
                    className="absolute bg-slate-900 border border-slate-700 p-2 rounded pointer-events-none text-xs text-white shadow-xl"
                    style={{ top: hoverInfo.y + 10, left: hoverInfo.x + 10 }}
                >
                    <p className="font-bold">Sensor ID: {hoverInfo.val}</p>
                    <p className="text-slate-400">Time: +{hoverInfo.x}ms</p>
                </div>
            )}
            <div className="absolute top-2 right-2 bg-black/50 p-1 rounded text-xs text-white">
                Heatmap Mode (GPU Accelerated)
            </div>
        </div>
    )
}
