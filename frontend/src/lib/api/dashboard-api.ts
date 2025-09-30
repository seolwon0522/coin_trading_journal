import apiClient from './axios-client'

export interface DashboardSummary {
  totalTrades: number
  openPositions: number
  totalPnl: number
  monthlyPnl: number
  winRate: number
  activeStrategies: number
}

export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    const response = await apiClient.get<DashboardSummary>('/api/dashboard/summary')
    return response.data
  },
}