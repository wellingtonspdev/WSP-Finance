import { api } from '../../../shared/lib/axios';

export interface BankMovementDTO {
  id: string;
  description: string;
  amount: number;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MERGED';
  rawPayload: any;
  accountId: number;
  workspaceId: number;
  account?: { name: string };
}

interface PaginatedResponse {
  data: BankMovementDTO[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Busca movimentos pendentes do workspace informado.
 * O x-workspace-id é injetado via header customizado já que estamos
 * em rota de contador (sem workspaceId na URL).
 */
export async function fetchPendingMovements(
  workspaceId: number,
  cursor?: string,
  limit = 20
): Promise<PaginatedResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  params.set('limit', String(limit));

  const res = await api.get(`/bank-movements?${params.toString()}`, {
    headers: { 'x-workspace-id': String(workspaceId) },
  });
  return res.data;
}

export async function fetchGlobalPendingMovements(
  cursor?: string,
  limit = 20
): Promise<PaginatedResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  params.set('limit', String(limit));

  const res = await api.get(`/accountant/bank-movements/pending?${params.toString()}`);
  return res.data;
}

export async function mergeMovements(
  workspaceId: number,
  keepId: string,
  discardIds: string[]
): Promise<BankMovementDTO> {
  const res = await api.post(
    `/bank-movements/${keepId}/merge`,
    { keepId, discardIds },
    { headers: { 'x-workspace-id': String(workspaceId) } }
  );
  return res.data;
}

export async function approveMovement(
  workspaceId: number,
  movementId: string,
  accountId: number,
  categoryId: number
): Promise<any> {
  const res = await api.post(
    `/bank-movements/${movementId}/approve`,
    { categoryId },
    { accountId, categoryId },
    { headers: { 'x-workspace-id': String(workspaceId) } }
  );
  return res.data;
}

export async function rejectMovement(
  workspaceId: number,
  movementId: string
): Promise<BankMovementDTO> {
  const res = await api.post(
    `/bank-movements/${movementId}/reject`,
    {},
    { headers: { 'x-workspace-id': String(workspaceId) } }
  );
  return res.data;
}
