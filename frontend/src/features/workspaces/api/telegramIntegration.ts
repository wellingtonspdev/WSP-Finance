import { api } from '../../../shared/lib/axios';

export interface TelegramUserLink {
  id: string;
  status: string;
  telegramUsername: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export interface TelegramDestination {
  id: string;
  workspaceId: number;
  accountId: number;
  defaultExpenseCategoryId: number;
  defaultIncomeCategoryId: number | null;
  label: string | null;
  isDefault: boolean;
  status: string;
}

export interface TelegramStatusResponse {
  link: TelegramUserLink | null;
  destinations: TelegramDestination[];
}

export interface GenerateLinkDTO {
  defaultWorkspaceId?: number;
  defaultExpenseCategoryId?: number;
  defaultIncomeCategoryId?: number;
}

export interface GenerateLinkResponse {
  code: string;
  telegramUrl: string;
  expiresAt: string;
}

export async function getTelegramStatus(): Promise<TelegramStatusResponse> {
  const response = await api.get('/integrations/telegram');
  return response.data;
}

export async function generateTelegramLink(data: GenerateLinkDTO): Promise<GenerateLinkResponse> {
  const response = await api.post('/integrations/telegram/pairing-code', data);
  return response.data;
}

export async function revokeTelegramLink(id: string): Promise<void> {
  await api.delete(`/integrations/telegram/link/${id}`);
}
