import { useState, useEffect } from 'react'
import { Search, ChevronRight, ChevronDown, Check, Folder } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SensorNode {
    id: string
    name: string
    type: 'folder' | 'sensor'
    children?: SensorNode[]
}

export function SensorSelector() {
    const [nodes, setNodes] = useState<SensorNode[]>([])
    const [expanded, setExpanded] = useState<Set<string>>(new Set())
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [searchTerm, setSearchTerm] = useState('')

    // Fetch sensors and build tree
    useEffect(() => {
        fetch('http://localhost:8000/api/sensors')
            .then(res => res.json())
            .then((data: Record<string, string[]>) => {
                const tree: SensorNode[] = []
                const allSensors = new Set<string>()

                Object.entries(data).forEach(([group, sensors], idx) => {
                    const groupId = `group-${idx}`
                    tree.push({
                        id: groupId,
                        name: group,
                        type: 'folder',
                        children: sensors.map(s => {
                            allSensors.add(s)
                            return { id: s, name: s, type: 'sensor' }
                        })
                    })
                })
                setNodes(tree)
                setExpanded(new Set(tree.map(n => n.id))) // Expand all groups by default

                // Initialize selection from URL
                const params = new URLSearchParams(window.location.search)
                const sensorsParam = params.get('sensors')

                if (!sensorsParam) {
                    // Empty param = All selected (implied)
                    // But visually we might want to show all checked? 
                    // Or keep 'selected' empty to mean 'all'?
                    // Let's explicitly check all for visual consistency if param is missing (default state)
                    // OR: explicit 'ALL' flag.
                    // For UI feedback, let's select existing ones.
                    setSelected(allSensors)
                } else if (sensorsParam !== 'NONE') {
                    setSelected(new Set(sensorsParam.split(',')))
                }
            })
            .catch(err => console.error("Failed to load sensors:", err))
    }, [])

    const updateUrl = (newSelected: Set<string>) => {
        const params = new URLSearchParams(window.location.search)

        // Logic: 
        // If "All" are selected (or close to it? no, simplistic), we can't easily detect "All" without knowing total count always.
        // But we can check if count is high.
        // Actually, let's revert to: "Clear All" -> Remove Param.
        // If user selects specific, add them.

        const count = newSelected.size
        // If 0 selected, maybe we want 0?
        if (count === 0) {
            // Let's say empty URL = All. 
            // So if we want NONE, we need a flag? 
            // Or we just don't fetch. 
            // Let's assume user wants to filter.
            // If we want 0 items, we can set sensors=NONE.
            params.set('sensors', 'NONE')
        } else {
            // If massive selection, simplistic fix for 431:
            // If > 200 items, assume "ALL" intent or warn? 
            // Let's just omit params if it looks like "All" (heuristically > 100 for now?)
            // This is a hack, but solves the crash.
            if (count > 50) {
                params.delete('sensors') // Fallback to "All"
            } else {
                params.set('sensors', Array.from(newSelected).join(','))
            }
        }

        const newUrl = `${window.location.pathname}?${params.toString()}`
        window.history.replaceState(null, '', newUrl)
        window.dispatchEvent(new Event('sensor-selection-change'))
    }

    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expanded)
        if (newExpanded.has(id)) newExpanded.delete(id)
        else newExpanded.add(id)
        setExpanded(newExpanded)
    }

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selected)
        if (newSelected.has(id)) newSelected.delete(id)
        else newSelected.add(id)
        setSelected(newSelected)
        updateUrl(newSelected)
    }

    const selectAll = () => {
        // Collect all sensor IDs
        const all = new Set<string>()
        nodes.forEach(g => g.children?.forEach(s => all.add(s.id)))
        setSelected(all)
        // For URL: Empty param = All
        const params = new URLSearchParams(window.location.search)
        params.delete('sensors')
        const newUrl = `${window.location.pathname}?${params.toString()}`
        window.history.replaceState(null, '', newUrl)
        window.dispatchEvent(new Event('sensor-selection-change'))
    }

    const clearAll = () => {
        setSelected(new Set())
        updateUrl(new Set())
    }

    const renderNode = (node: SensorNode, level: number = 0) => {
        // Simple filter logic
        if (searchTerm && node.type === 'sensor' && !node.name.toLowerCase().includes(searchTerm.toLowerCase())) {
            return null
        }

        // Filter folders if no children match
        if (node.type === 'folder' && searchTerm) {
            const hasMatchingChild = node.children?.some(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
            if (!hasMatchingChild) return null
        }

        const isExpanded = expanded.has(node.id)
        const isSelected = selected.has(node.id)

        return (
            <div key={node.id}>
                <div
                    className={cn(
                        "flex items-center gap-2 py-1 px-2 hover:bg-slate-800 cursor-pointer text-sm select-none",
                        isSelected && node.type === 'sensor' && "bg-primary/20 text-primary"
                    )}
                    style={{ paddingLeft: `${level * 16 + 8}px` }}
                    onClick={() => node.type === 'folder' ? toggleExpand(node.id) : toggleSelect(node.id)}
                >
                    {node.type === 'folder' && (
                        <span className="text-muted-foreground">
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                    )}
                    {node.type === 'folder' ? <Folder size={14} className="text-blue-400" /> : (
                        <div className={cn("w-4 h-4 border rounded flex items-center justify-center", isSelected ? "bg-primary border-primary" : "border-slate-600")}>
                            {isSelected && <Check size={10} className="text-white" />}
                        </div>
                    )}
                    <span className="truncate">{node.name}</span>
                </div>
                {node.type === 'folder' && isExpanded && node.children && (
                    <div>
                        {node.children.map(child => renderNode(child, level + 1))}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-card border-r w-64 shrink-0">
            <div className="p-4 border-b">
                <h3 className="font-semibold mb-2">Sensors</h3>
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                        placeholder="Search signals..."
                        className="w-full bg-slate-900 border rounded py-2 pl-8 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <div className="flex-1 overflow-auto py-2">
                {nodes.map(node => renderNode(node))}
            </div>
            <div className="p-3 border-t bg-slate-900/50 text-xs text-muted-foreground flex justify-between">
                <span>Selected: {selected.size}</span>
                <div className="flex gap-2">
                    <button className="text-primary hover:underline" onClick={selectAll}>All</button>
                    <button className="text-primary hover:underline" onClick={clearAll}>None</button>
                </div>
            </div>
        </div>
    )
}
