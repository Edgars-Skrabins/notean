export function scrollEdges(metrics: { scrollLeft: number; clientWidth: number; scrollWidth: number }): { start: boolean; end: boolean } {
  return {
    start: metrics.scrollLeft > 1,
    end: metrics.scrollLeft + metrics.clientWidth < metrics.scrollWidth - 1
  };
}
