import { api } from '../../../shared/lib/axios';

/**
 * PATCH /ai-insights/:id/dismiss
 *
 * Marks an AI pedagogical insight as dismissed.
 * Does NOT delete the record or alter financial data.
 */
export const dismissAIInsight = async (insightId: string): Promise<{ id: string; dismissed: true }> => {
    const response = await api.patch(`/ai-insights/${insightId}/dismiss`);
    return response.data;
};
