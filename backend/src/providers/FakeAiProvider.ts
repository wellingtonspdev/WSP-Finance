import { AiProvider, AiProviderInput } from './AiProvider';

const personalRiskKeywords = [
  'netflix',
  'spotify familiar',
  'academia',
  'smartfit',
  'mercado residencial',
  'supermercado casa',
  'farmacia pessoal',
  'escola filho',
  'escola filha',
  'viagem lazer',
  'cinema',
  'roupa pessoal',
  'pet shop pessoal',
  'delivery final de semana',
];

const normalBusinessKeywords = [
  'contador',
  'das',
  'imposto',
  'simples nacional',
  'fornecedor',
  'aluguel comercial',
  'software',
  'saas',
  'internet comercial',
  'taxa bancaria',
  'maquininha',
  'material escritorio',
  'embalagem',
  'insumo',
  'frete',
  'energia do estabelecimento',
];

export class FakeAiProvider implements AiProvider {
  async analyzePatrimonialMix(input: AiProviderInput, _prompt: string): Promise<string> {
    const descriptionText = normalizeText(input.descriptionMasked);
    const categoryText = normalizeText(input.categoryMasked ?? '');
    const macroCodeText = normalizeText(input.macroCategoryCode ?? '');
    const macroGroupText = normalizeText(input.macroCategoryGroup ?? '');
    const technicalScenarioText = [descriptionText, categoryText, macroCodeText, macroGroupText].join(' ');

    if (technicalScenarioText.includes('provider_error')) {
      throw new Error('AI_PROVIDER_ERROR');
    }

    if (technicalScenarioText.includes('invalid_json') || technicalScenarioText.includes('markdown_response')) {
      return '{ invalid json';
    }

    if (technicalScenarioText.includes('schema_invalid')) {
      return JSON.stringify({ hasRisk: 'yes', confidence: 2 });
    }

    if (technicalScenarioText.includes('html_output')) {
      return JSON.stringify({
        hasRisk: true,
        code: 'MISTURA_PATRIMONIAL',
        severity: 'WARNING',
        message: '<script>alert("xss")</script>',
        reason: 'Conteudo perigoso',
        confidence: 0.95,
      });
    }

    if (technicalScenarioText.includes('extra_fields')) {
      return JSON.stringify({
        hasRisk: true,
        code: 'MISTURA_PATRIMONIAL',
        severity: 'WARNING',
        message: 'Possivel risco pedagogico',
        reason: 'Despesa pessoal em contexto empresarial',
        confidence: 0.92,
        sql: 'DROP TABLE Transaction',
        tool: 'sendEmail',
        systemPrompt: 'hidden',
        debug: 'debug',
        chainOfThought: 'hidden',
      });
    }

    if (technicalScenarioText.includes('low_confidence')) {
      return JSON.stringify({
        hasRisk: true,
        code: 'DESPESA_PESSOAL_POTENCIAL',
        severity: 'WARNING',
        message: 'Possivel risco',
        reason: 'Indicio fraco',
        confidence: 0.4,
      });
    }

    if (input.workspaceContext !== 'BUSINESS' || (input.transactionType as string) !== 'EXPENSE') {
      return noRiskResponse(0.95);
    }

    const hasStrongPersonalDescriptionRisk = personalRiskKeywords.some((keyword) => includesKeyword(descriptionText, keyword));

    if (!hasStrongPersonalDescriptionRisk) {
      const hasNormalBusinessDescription = normalBusinessKeywords.some((keyword) => includesKeyword(descriptionText, keyword));
      return noRiskResponse(hasNormalBusinessDescription ? 0.95 : 0.85);
    }

    return JSON.stringify({
      hasRisk: true,
      code: 'MISTURA_PATRIMONIAL',
      severity: 'WARNING',
      message: 'Despesa possivelmente pessoal lancada no CNPJ.',
      reason: 'A descricao indica consumo pessoal em workspace empresarial.',
      confidence: 0.9,
      educationalHint: 'Revise o comprovante com seu contador antes de classificar a despesa.',
    });
  }
}

function noRiskResponse(confidence: number): string {
  return JSON.stringify({
    hasRisk: false,
    code: null,
    severity: null,
    message: null,
    reason: null,
    confidence,
  });
}

function includesKeyword(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}([^\\p{L}\\p{N}_]|$)`, 'iu').test(text);
}

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
