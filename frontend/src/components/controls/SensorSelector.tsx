import { useState } from 'react'
import { Search, ChevronRight, ChevronDown, Check, Folder } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SensorNode {
    id: string
    name: string
    type: 'folder' | 'sensor'
    children?: SensorNode[]
    selected?: boolean
}

// Mock Data Structure
const MOCK_TREE: SensorNode[] = [
    {
        id: 'root-1',
        name: 'Production Line A',
        type: 'folder',
        children: [
            { id: 's-1', name: 'Temp_Extruder_1', type: 'sensor' },
            { id: 's-2', name: 'Temp_Extruder_2', type: 'sensor' },
            { id: 's-3', name: 'Pressure_Main', type: 'sensor' },
        ]
    },
    {
        id: 'root-2',
        name: 'Production Line B',
        type: 'folder',
        children: [
            { id: 's-4', name: 'Vibration_Motor_X', type: 'sensor' },
            { id: 's-5', name: 'Vibration_Motor_Y', type: 'sensor' },
            {
                id: 'sub-1',
                name: 'Cooling System',
                type: 'folder',
                children: [
                    { id: 's-6', name: 'Flow_Rate_In', type: 'sensor' },
                    { id: 's-7', name: 'Flow_Rate_Out', type: 'sensor' }
                ]
            }
        ]
    }
]

export function SensorSelector() {
    const [expanded, setExpanded] = useState<Set<string>>(new Set(['root-1', 'root-2']))
    const [selected, setSelected] = useState<Set<string>>(new Set(['s-1', 's-2']))
    const [searchTerm, setSearchTerm] = useState('')

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
    }

    const renderNode = (node: SensorNode, level: number = 0) => {
        // Simple filter logic
        if (searchTerm && node.type === 'sensor' && !node.name.toLowerCase().includes(searchTerm.toLowerCase())) {
            return null
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
                    <span>{node.name}</span>
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
                {MOCK_TREE.map(node => renderNode(node))}
            </div>
            <div className="p-3 border-t bg-slate-900/50 text-xs text-muted-foreground flex justify-between">
                <span>Selected: {selected.size}</span>
                <button className="text-primary hover:underline" onClick={() => setSelected(new Set())}>Clear All</button>
            </div>
        </div>
    )
}
