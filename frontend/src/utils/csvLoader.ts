import Papa from 'papaparse'
import uPlot from 'uplot'

export const parseCSV = (file: File): Promise<uPlot.AlignedData> => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            worker: true, // Run in a web worker to not block UI
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.data.length === 0) {
                    resolve([[], []])
                    return
                }

                const keys = Object.keys(results.data[0] as object)
                const timeKey = keys.find(k => k.toLowerCase().includes('time') || k.toLowerCase().includes('timestamp') || k.toLowerCase() === 't') || keys[0]

                // Prepare arrays for uPlot
                // data[0] is x-axis (time), data[1..N] are y-axes
                const uPlotData: number[][] = Array.from({ length: keys.length }, () => [])

                const rows = results.data as Record<string, string>[]

                // Optimization: Pre-allocate if possible, but simplest is push for now
                rows.forEach((row: Record<string, string>) => {
                    // Timestamp parsing
                    const timeVal = parseFloat(row[timeKey])
                    // Check if timestamp is in ms (huge number) or seconds. uPlot wants seconds.
                    // Heuristic: if > 1000000000000 (year 2001 in ms), divide by 1000
                    const finalTime = timeVal > 1000000000000 ? timeVal / 1000 : timeVal

                    uPlotData[0].push(finalTime)

                    // Other series
                    let seriesIdx = 1
                    keys.forEach(key => {
                        if (key !== timeKey) {
                            uPlotData[seriesIdx].push(parseFloat(row[key]))
                            seriesIdx++
                        }
                    })
                })

                resolve(uPlotData as uPlot.AlignedData)
            },
            error: (error) => {
                reject(error)
            }
        })
    })
}
