import { useState, useEffect } from 'react'
import { SensorGraph } from '../components/graph/SensorGraph'
import { HeatmapView } from '../components/graph/HeatmapView'
import { SensorSelector } from '../components/controls/SensorSelector'
import { TimeControls } from '../components/controls/TimeControls'
import uPlot from 'uplot'
import { BarChart2, Grid } from 'lucide-react'

// Mock Data Generator for initial view
function generateMockData(pointCount: number): uPlot.AlignedData {
    const now = Math.floor(Date.now() / 1000)
    const xs = []
    const ys1 = []
    const ys2 = []
    const ys3 = []

    for (let i = 0; i < pointCount; i++) {
        xs.push(now - (pointCount - i))
        ys1.push(Math.sin(i * 0.05) * 10 + Math.random() * 2)
        ys2.push(Math.cos(i * 0.03) * 15 + Math.random() * 5 + 20)
        ys3.push(Math.sin(i * 0.02) * 5 + Math.random() * 1 - 10)
    }
    return [xs, ys1, ys2, ys3] as uPlot.AlignedData
}

export default function LiveDashboard() {
    const [data, setData] = useState<uPlot.AlignedData>([[], [], [], []])
    const [viewMode, setViewMode] = useState<'graph' | 'heatmap'>('graph')
    const [loading, setLoading] = useState(false)

    // Init with mock data
    useEffect(() => {
        setData(generateMockData(10000))
    }, [])

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setLoading(true)
        try {
            const { parseCSV } = await import('../utils/csvLoader')
            const parsedData = await parseCSV(file)
            setData(parsedData)
        } catch (err) {
            console.error("CSV Parse Error", err)
            alert("Failed to parse CSV")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex h-full overflow-hidden">
            {/* Integrated Sensor Selector Sidebar */}
            <SensorSelector />

            <div className="flex-1 flex flex-col min-w-0 bg-background/50">
                {/* Top Bar with Controls */}
                <div className="h-14 border-b flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm">
                    <TimeControls />

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
                            <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Data Rate</span>
                            <div className="text-2xl font-mono font-bold text-lime-400 mt-1">12 kHz</div>
                        </div>
                    </div>

                    {/* Main Graph Area */}
                    <div className="flex-1 min-h-[500px] w-full bg-card rounded-xl border shadow-sm flex items-center justify-center p-1 relative">
                        {viewMode === 'graph' ? (
                            <SensorGraph data={data} height={600} />
                        ) : (
                            <HeatmapView />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
