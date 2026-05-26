import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '../../../shared/lib/axios';
import type { AiInsightListResponse, HubFilters } from '../types';

export const AI_INSIGHTS_QUERY_KEY = 'ai-insights';

const fetchAiInsights = async (filters: HubFilters): Promise<AiInsightListResponse> => {
  const { data } = await api.get('/ai-insights', { params: filters });
  return data;
};

export const useAIInsights = (workspaceId: string | undefined, filters: HubFilters) => {
  return useQuery<AiInsightListResponse>({
    queryKey: [AI_INSIGHTS_QUERY_KEY, workspaceId, filters],
    queryFn: () => fetchAiInsights(filters),
    placeholderData: keepPreviousData,
    enabled: !!workspaceId,
  });
};
