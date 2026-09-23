import { Injectable } from '@nestjs/common';

import { FinanceAdviceDto } from './dto/finance-advice.dto';
import { FinanceAdviceResponse } from './interfaces/finance-advice-response.interface';
import { computeHealthScore, computeMetrics } from './analysis/metrics';
import { buildInsights } from './analysis/insights';
import { buildAnswer, buildSummary } from './analysis/narrative';

/** Identifica en `model` la versión de las reglas que generó el diagnóstico. */
export const ADVISOR_ENGINE = 'familytruck-reglas-v1';

/**
 * Diagnóstico financiero calculado con reglas deterministas (sin IA externa):
 * la misma entrada produce siempre el mismo resultado, salvo generatedAt.
 */
@Injectable()
export class AdvisorService {
  getFinanceAdvice(dto: FinanceAdviceDto): FinanceAdviceResponse {
    const metrics = computeMetrics(dto);
    const healthScore = computeHealthScore(metrics);
    const insights = buildInsights(metrics, dto.gmf);
    const summary = buildSummary(dto, metrics, healthScore, insights);

    return {
      summary,
      healthScore,
      insights,
      answer: dto.question
        ? buildAnswer(dto.question, metrics, summary, insights)
        : null,
      generatedAt: new Date().toISOString(),
      model: ADVISOR_ENGINE,
    };
  }
}
