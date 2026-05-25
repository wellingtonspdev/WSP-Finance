export type AiWorkspaceContext = 'PERSONAL' | 'BUSINESS';

export interface AiProviderInput {
  workspaceContext: AiWorkspaceContext;
  transactionType: 'EXPENSE';
  amount: string;
  descriptionMasked: string;
  categoryMasked?: string | null;
  macroCategoryCode?: string | null;
  macroCategoryGroup?: string | null;
  businessContext: string;
}

export interface AiProvider {
  analyzePatrimonialMix(input: AiProviderInput, prompt: string): Promise<string>;
}
