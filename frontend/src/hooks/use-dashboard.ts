import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api/dashboard-api'

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardApi.getSummary(),
    refetchInterval: 10000, // Refetch every 10 seconds for live data
    staleTime: 5000, // Consider data stale after 5 seconds
  })
}