export const INSIGHT_CATEGORIES = [
  'costos',
  'ingresos',
  'cartera',
  'impuestos',
  'flota',
  'liquidez',
] as const;
export const INSIGHT_IMPACTS = ['alto', 'medio', 'bajo'] as const;

export type InsightCategory = (typeof INSIGHT_CATEGORIES)[number];
export type InsightImpact = (typeof INSIGHT_IMPACTS)[number];

export interface FinanceInsight {
  /** Slug estable en kebab-case, único dentro de la respuesta (p. ej. "fuel-abc123"). */
  id: string;
  title: string;
  detail: string;
  category: InsightCategory;
  impact: InsightImpact;
  /** Ahorro mensual estimado en COP; null si los datos no permiten estimarlo. */
  estimatedMonthlySavings: number | null;
  /** Solo ids de `vehicles[].vehicleId` enviados en la petición. */
  relatedVehicleIds: string[];
}

export interface FinanceAdviceResponse {
  summary: string;
  /** 0 (crítica) a 100 (excelente). */
  healthScore: number;
  insights: FinanceInsight[];
  /** Respuesta a `question`, o null si no se envió pregunta. */
  answer: string | null;
  /** ISO 8601, generado por el servidor. */
  generatedAt: string;
  /** Modelo que generó la respuesta (puede ser el de respaldo si el principal declinó). */
  model: string;
}
