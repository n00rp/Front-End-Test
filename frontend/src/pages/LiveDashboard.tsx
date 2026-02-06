import { useState, useEffect } from 'react'
import { SensorGraph } from '../components/graph/SensorGraph'
import { HeatmapView } from '../components/graph/HeatmapView'
import { SensorSelector } from '../components/controls/SensorSelector'
import { TimeControls } from '../components/controls/TimeControls'
import uPlot from 'uplot'
import { BarChart2, Grid } from 'lucide-react'



export default function LiveDashboard() {
    const [data, setData] = useState<uPlot.AlignedData>([[]])
    const [seriesConfig, setSeriesConfig] = useState<any[]>([])
    const [viewMode, setViewMode] = useState<'graph' | 'heatmap'>('graph')
    const [loading, setLoading] = useState(false)
    const [timeRange, setTimeRange] = useState<{ start: number | null, end: number | null }>({ start: null, end: null })
    const [interactionMode, setInteractionMode] = useState<'zoom' | 'pan'>('zoom')

    // Fetch real data from Backend API
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Determine width for downsampling (default to window width)
                const width = window.innerWidth;

                // Get selected sensors from URL
                const params = new URLSearchParams(window.location.search);
                const sensorsParam = params.get('sensors');
                const cleanIds = sensorsParam ? sensorsParam : ""; // Send empty or CSV

                let url = `http://localhost:8000/api/data?width=${width}&ids=${cleanIds}`;
                // Add time range if zoomed
                if (timeRange.start !== null && timeRange.end !== null) {
                    url += `&start=${timeRange.start}&end=${timeRange.end}`
                }

                const response = await fetch(url)
                if (!response.ok) throw new Error("API call failed")

                const json = await response.json()
                // Backend returns { time: [], series: [{id, data: []}, ...] }

                console.log("🔥 API Response:", json)

                if (json && json.time && json.series) {
                    const times = json.time

                    // Construct AlignedData: [ [time], [s1], [s2]... ]
                    const alignedData: any[] = [times]
                    const newConfig: any[] = []

                    const colors = [
                        "#22d3ee", "#d946ef", "#84cc16", "#f59e0b", "#ef4444", "#3b82f6"
                    ]

                    json.series.forEach((s: any, idx: number) => {
                        alignedData.push(s.data)
                        newConfig.push({
                            label: s.id,
                            stroke: colors[idx % colors.length],
                            width: 2
                        })
                    })

                    console.log(`🔥 Received ${times.length} points for ${json.series.length} sensors`)

                    setData(alignedData as uPlot.AlignedData)
                    setSeriesConfig(newConfig)
                } else {
                    console.error("🔥 Invalid API Data Structure", json)
                    setData([[]])
                    setSeriesConfig([])
                }
            } catch (err) {
                console.error("Failed to fetch from backend:", err)
                // Fallback (empty for now, removed mock generator)
                setData([[]])
                setSeriesConfig([])
            }
        }

        fetchData()

        // Listen for selection changes from Sidebar
        const handleSelectionChange = () => {
            console.log("⚡ Selection Changed! Refetching...")
            fetchData()
        }
        window.addEventListener('sensor-selection-change', handleSelectionChange)

        return () => {
            window.removeEventListener('sensor-selection-change', handleSelectionChange)
        }
    }, [timeRange])

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setLoading(true)
        try {
            const { parseCSV } = await import('../utils/csvLoader')
            const parsedData = await parseCSV(file)
            setData(parsedData)
            // Mock config for CSV for now
            setSeriesConfig([{ label: "CSV Data", stroke: "#fff" }])
        } catch (err) {
            console.error("CSV Parse Error", err)
            alert("Failed to parse CSV")
        } finally {
            setLoading(false)
        }
    }

    const handleZoom = (min: number, max: number) => {
        console.log(`Zooming to: ${min} - ${max}`)
        setTimeRange({ start: min, end: max })
    }

    // Pan Handler
    const handlePan = (deltaSeconds: number) => {
        if (!data || !data[0] || data[0].length === 0) return

        let currentStart = timeRange.start
        let currentEnd = timeRange.end

        // If no range set (full view), derive from current data
        if (currentStart === null || currentEnd === null) {
            const times = data[0]
            currentStart = times[0]
            currentEnd = times[times.length - 1]
        }

        const newStart = currentStart! + deltaSeconds
        const newEnd = currentEnd! + deltaSeconds

        setTimeRange({ start: newStart, end: newEnd })
    }

    return (
        <div className="flex h-full overflow-hidden">
            {/* Integrated Sensor Selector Sidebar */}
            <SensorSelector />

            <div className="flex-1 flex flex-col min-w-0 bg-background/50">
                {/* Top Bar with Controls */}
                <div className="h-14 border-b flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm">

                    <div className="flex items-center gap-4">
                        <TimeControls />

                        <div className="flex bg-slate-900 rounded p-1 border border-slate-700 ml-4">
                            <button
                                onClick={() => setInteractionMode('zoom')}
                                title="Zoom Mode (Drag to select)"
                                className={`px-3 py-1 rounded text-xs font-bold transition-colors ${interactionMode === 'zoom' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
                            >
                                Zoom
                            </button>
                            <button
                                onClick={() => setInteractionMode('pan')}
                                title="Pan Mode (Drag to move)"
                                className={`px-3 py-1 rounded text-xs font-bold transition-colors ${interactionMode === 'pan' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
                            >
                                Pan
                            </button>
                        </div>
                        {timeRange.start !== null && (
                            <button
                                onClick={() => setTimeRange({ start: null, end: null })}
                                className="px-3 py-1 bg-red-500/20 text-red-500 border border-red-500/50 rounded text-xs font-bold hover:bg-red-500/30 transition-colors"
                            >
                                Reset Zoom
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        {/* CSV Upload for Performance Testing */}
                        <div className="relative group">
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <button className={`px-3 py-1 flex items-center gap-2 text-xs font-medium border rounded transition-colors ${loading ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}>
                                {loading ? 'Parsing...' : 'Upload CSV'}
                            </button>
                        </div>


                        <div className="flex bg-slate-900 rounded p-1 border border-slate-700">
                            <button
                                onClick={() => setViewMode('graph')}
                                className={`p-2 rounded flex items-center gap-2 text-xs font-medium ${viewMode === 'graph' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-slate-800'}`}
                            >
                                <BarChart2 size={14} /> Graph
                            </button>
                            <button
                                onClick={() => setViewMode('heatmap')}
                                className={`p-2 rounded flex items-center gap-2 text-xs font-medium ${viewMode === 'heatmap' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-slate-800'}`}
                            >
                                <Grid size={14} /> Heatmap
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-6 flex-1 flex flex-col gap-6 overflow-auto">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-xl bg-card border shadow-sm">
                            <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Active Sensors</span>
                            <div className="text-2xl font-mono font-bold text-cyan-400 mt-1">2 Selection</div>
                        </div>
                        <div className="p-4 rounded-xl bg-card border shadow-sm">
                            <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Data Points</span>
                            <div className="text-2xl font-mono font-bold text-lime-400 mt-1">
                                {data && data[0] ? data[0].length : 0}
                            </div>
                        </div>
                    </div>

                    {/* DEBUG PANEL */}
                    <div className="p-4 bg-red-900/20 border border-red-500/50 rounded text-xs font-mono text-white overflow-auto max-h-32">
                        <strong>DEBUG INFO:</strong><br />
                        Data Loaded: {data && data[0] ? "YES" : "NO"} <br />
                        Point Count: {data && data[0] ? data[0].length : 0} <br />
                        First Time: {data && data[0] && data[0][0] ? new Date(data[0][0] * 1000).toLocaleString() : "N/A"} <br />
                        First Value: {data && data[1] && data[1][0] ? data[1][0] : "N/A"} <br />
                        Backend URL: http://localhost:8000/api/data?width={window.innerWidth}
                    </div>

                    {/* Main Graph Area */}
                    <div className="flex-1 min-h-[500px] w-full bg-card rounded-xl border shadow-sm flex items-center justify-center p-1 relative">
                        {viewMode === 'graph' ? (
                            <SensorGraph
                                data={data}
                                seriesConfig={seriesConfig}
                                height={600}
                                onZoom={handleZoom}
                                interactionMode={interactionMode}
                                onPan={handlePan}
                            />
                        ) : (
                            <HeatmapView />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
