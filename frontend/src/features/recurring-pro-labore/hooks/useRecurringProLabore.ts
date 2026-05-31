import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { recurringProLaboreApi, type CreateRecurringProLaboreScheduleDTO } from '../api/recurringProLabore';

const recurringProLaboreKeys = {
  all: ['recurring-pro-labore'] as const,
  schedules: (workspaceId?: number) => [...recurringProLaboreKeys.all, 'schedules', workspaceId ?? 'all'] as const,
  pendings: (workspaceId?: number) => [...recurringProLaboreKeys.all, 'pending', workspaceId ?? 'all'] as const,
};

export function useRecurringProLabore(workspaceId?: number) {
  const queryClient = useQueryClient();

  const schedules = useQuery({
    queryKey: recurringProLaboreKeys.schedules(workspaceId),
    queryFn: () => recurringProLaboreApi.listSchedules(workspaceId),
  });

  const pendings = useQuery({
    queryKey: recurringProLaboreKeys.pendings(workspaceId),
    queryFn: () => recurringProLaboreApi.listPendings(workspaceId),
  });

  const invalidateRecurring = () => {
    queryClient.invalidateQueries({ queryKey: recurringProLaboreKeys.all });
  };

  const createSchedule = useMutation({
    mutationFn: (data: CreateRecurringProLaboreScheduleDTO) => recurringProLaboreApi.createSchedule(data),
    onSuccess: invalidateRecurring,
  });

  const deactivateSchedule = useMutation({
    mutationFn: (id: string) => recurringProLaboreApi.deactivateSchedule(id),
    onSuccess: invalidateRecurring,
  });

  const confirmPending = useMutation({
    mutationFn: (id: string) => recurringProLaboreApi.confirmPending(id),
    onSuccess: () => {
      invalidateRecurring();
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });

  const cancelPending = useMutation({
    mutationFn: (id: string) => recurringProLaboreApi.cancelPending(id),
    onSuccess: invalidateRecurring,
  });

  return {
    schedules,
    pendings,
    createSchedule,
    deactivateSchedule,
    confirmPending,
    cancelPending,
  };
}
