import { api } from '../../../shared/lib/axios';

export interface WorkspaceSummary {
  id: number;
  name: string;
  type: 'BUSINESS' | 'PERSONAL';
}

export interface RecurringProLaboreSchedule {
  id: string;
  sourceWorkspaceId: number;
  destinationWorkspaceId: number;
  amount: string | number;
  dayOfMonth: number;
  description: string;
  isActive: boolean;
  deactivatedAt?: string | null;
  sourceWorkspace?: WorkspaceSummary;
  destinationWorkspace?: WorkspaceSummary;
}

export interface RecurringProLaborePending {
  id: string;
  scheduleId: string;
  competence: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  confirmedAt?: string | null;
  lastError?: string | null;
  schedule: RecurringProLaboreSchedule;
}

export interface CreateRecurringProLaboreScheduleDTO {
  sourceWorkspaceId: number;
  destinationWorkspaceId: number;
  amount: number;
  dayOfMonth: number;
  description: string;
}

export const recurringProLaboreApi = {
  async listSchedules(workspaceId?: number) {
    const response = await api.get<{ schedules: RecurringProLaboreSchedule[] }>('/recurring-pro-labore/schedules', {
      params: workspaceId ? { workspaceId } : undefined,
    });
    return response.data.schedules;
  },

  async createSchedule(data: CreateRecurringProLaboreScheduleDTO) {
    const response = await api.post<{ schedule: RecurringProLaboreSchedule }>('/recurring-pro-labore/schedules', data);
    return response.data.schedule;
  },

  async deactivateSchedule(id: string) {
    const response = await api.patch<{ schedule: RecurringProLaboreSchedule }>(`/recurring-pro-labore/schedules/${id}/deactivate`);
    return response.data.schedule;
  },

  async listPendings(workspaceId?: number) {
    const response = await api.get<{ pendings: RecurringProLaborePending[] }>('/recurring-pro-labore/pending', {
      params: workspaceId ? { workspaceId } : undefined,
    });
    return response.data.pendings;
  },

  async confirmPending(id: string) {
    const response = await api.post<{ pending: RecurringProLaborePending }>(`/recurring-pro-labore/pending/${id}/confirm`);
    return response.data.pending;
  },

  async cancelPending(id: string) {
    const response = await api.post<{ pending: RecurringProLaborePending }>(`/recurring-pro-labore/pending/${id}/cancel`);
    return response.data.pending;
  },
};
