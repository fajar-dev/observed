export interface GridPosition { x: number, y: number, w: number, h: number }

export function compactEmptyRows(positions: GridPosition[]): GridPosition[] {
  const occupied = [...positions].sort((a, b) => a.y - b.y)
  const intervals: { start: number, end: number }[] = []
  for (const position of occupied) {
    const previous = intervals.at(-1)
    if (previous && position.y <= previous.end) previous.end = Math.max(previous.end, position.y + position.h)
    else intervals.push({ start: position.y, end: position.y + position.h })
  }
  return positions.map((position) => {
    let gap = 0
    let end = 0
    for (const interval of intervals) {
      if (interval.start > position.y) break
      gap += Math.max(0, interval.start - end)
      end = interval.end
    }
    return { ...position, y: Math.max(0, position.y - gap) }
  })
}
