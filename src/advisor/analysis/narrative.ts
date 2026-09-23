import { FinanceInsight } from '../interfaces/finance-advice-response.interface';
import { FinanceAdviceDto } from '../dto/finance-advice.dto';
import { cop, dateLabel, normalize, pct } from './format';
import { FinanceMetrics } from './metrics';

export function buildSummary(
  dto: FinanceAdviceDto,
  m: FinanceMetrics,
  healthScore: number,
  insights: FinanceInsight[],
): string {
  const period = `Entre el ${dateLabel(dto.period.from)} y el ${dateLabel(dto.period.to)}`;
  const results =
    m.margin === null
      ? `${period} no hay ingresos registrados y los gastos suman ${cop(m.totalExpenses)}.`
      : `${period} el negocio facturó ${cop(m.totalIncome)} y gastó ${cop(m.totalExpenses)}, con un margen operativo del ${pct(m.margin)}.`;

  const health =
    healthScore >= 80
      ? 'buena'
      : healthScore >= 60
        ? 'aceptable'
        : healthScore >= 40
          ? 'frágil'
          : 'crítica';
  const urgent = insights.find((insight) => insight.impact === 'alto');
  const priority = urgent
    ? ` Lo más urgente: ${lowerFirst(urgent.title)}.`
    : '';

  return `${results} La salud financiera es ${health} (${healthScore}/100).${priority}`;
}

interface Topic {
  keywords: string[];
  /** Prefijos de id de los hallazgos relacionados con el tema. */
  insightPrefixes: string[];
  opening: (m: FinanceMetrics) => string;
  tips: string[];
}

const TOPICS: Topic[] = [
  {
    keywords: [
      'combustible',
      'gasolina',
      'diesel',
      'acpm',
      'tanque',
      'galon',
      'consumo',
    ],
    insightPrefixes: ['combustible-', 'fuel-'],
    opening: (m) => {
      if (m.fuelTotal === null || m.fuelShare === null) {
        return 'No hay gastos de combustible registrados en el periodo, así que no puedo medir el consumo de la flota.';
      }
      const worst = [...m.vehicles]
        .filter((v) => v.fuelRatio !== null)
        .sort((a, b) => b.fuelRatio! - a.fuelRatio!)[0];
      const byVehicle =
        worst && m.vehicles.length >= 2
          ? ` El vehículo que más gasta en proporción a lo que factura es ${worst.vehicle.label}: el combustible se lleva el ${pct(worst.fuelRatio!)} de sus ingresos.`
          : '';
      return `El combustible representa el ${pct(m.fuelShare)} de tus ingresos (${cop(m.fuelTotal)} en el periodo).${byVehicle}`;
    },
    tips: [
      'Mide el rendimiento (kilómetros por galón) de cada camión en cada tanqueo y compáralo entre vehículos y conductores.',
      'Concentra los tanqueos en estaciones con convenio o con chip/tarjeta de flota para controlar precio y volumen.',
      'Revisa presión de llantas, alineación e inyectores: un vehículo desajustado consume más.',
      'Planea las rutas y busca carga de retorno para no regresar vacío.',
      'Capacita a los conductores en conducción eficiente: velocidad constante, menos ralentí y menos frenadas bruscas.',
    ],
  },
  {
    keywords: ['cartera', 'cobr', 'client', 'factur', 'deud', 'vencid'],
    insightPrefixes: ['cartera-'],
    opening: (m) =>
      m.pendingReceivables > 0 || m.overdue > 0
        ? `Tienes ${cop(m.pendingReceivables)} por cobrar, de los cuales ${cop(m.overdue)} están vencidos.`
        : 'No hay cartera pendiente registrada.',
    tips: [
      'Factura electrónicamente apenas se entrega la carga: cada día de demora es un día más de crédito al cliente.',
      'Haz seguimiento semanal de la cartera vencida, empezando por los montos más antiguos.',
      'Pide anticipo o pago contra entrega a los clientes que se atrasan con frecuencia.',
      'Para clientes grandes con plazos largos, evalúa el factoring de las facturas.',
    ],
  },
  {
    keywords: ['manten', 'repar', 'llanta', 'taller', 'repuesto'],
    insightPrefixes: ['mantenimiento-'],
    opening: (m) =>
      m.maintenanceTotal !== null && m.maintenanceShare !== null
        ? `El mantenimiento suma ${cop(m.maintenanceTotal)}, el ${pct(m.maintenanceShare)} de tus ingresos.`
        : 'No hay gastos de mantenimiento registrados en el periodo.',
    tips: [
      'Arma un plan de mantenimiento preventivo por kilometraje para cada vehículo.',
      'Lleva el historial de reparaciones por placa: las fallas repetidas indican cuándo conviene renovar.',
      'Cotiza con al menos dos talleres las reparaciones grandes.',
    ],
  },
  {
    keywords: [
      'gmf',
      '4x1000',
      '4 x 1000',
      'cuatro por mil',
      'impuest',
      'dian',
      'retencion',
      'iva',
    ],
    insightPrefixes: ['gmf-'],
    opening: (m) => {
      const disclaimer =
        'Sobre impuestos solo puedo darte una orientación general a partir de tus datos; valida cualquier decisión con tu contador.';
      if (m.gmfFromExpenses === null || m.gmfFromIncome === null) {
        return disclaimer;
      }
      const total = m.gmfFromExpenses + m.gmfFromIncome;
      return `En el periodo el 4x1000 suma ${cop(total)}: ${cop(m.gmfFromExpenses)} generado por tus pagos (egresos) y ${cop(m.gmfFromIncome)} que te descontaron los clientes (ingresos). ${disclaimer}`;
    },
    tips: [
      'Marca como exenta del 4x1000 la cuenta desde la que haces más retiros (la exención cubre un monto mensual limitado).',
      'Concentra los pagos grandes en esa cuenta para aprovechar el monto exento.',
      'Guarda los soportes de combustible, peajes y mantenimiento: son costos deducibles.',
    ],
  },
  {
    keywords: [
      'rentab',
      'margen',
      'ganan',
      'utilidad',
      'perdi',
      'salud',
      'como va',
      'como estoy',
    ],
    insightPrefixes: [
      'margen-',
      'meses-en-perdida',
      'caida-ingresos',
      'sin-ingresos',
      'perdida-',
    ],
    opening: (m) =>
      m.margin === null
        ? 'No hay ingresos registrados, así que no puedo calcular la rentabilidad.'
        : `En el periodo el margen operativo es del ${pct(m.margin)}: de cada $100 facturados quedan ${cop(m.margin * 100)} después de gastos.`,
    tips: [
      'Calcula el costo por viaje de cada ruta (combustible, peajes, viáticos) y compáralo con la tarifa que cobras.',
      'Renegocia o deja las rutas cuya tarifa no cubre el costo por viaje.',
      'Revisa mensualmente la utilidad por vehículo para detectar a tiempo los que dan pérdida.',
    ],
  },
  {
    keywords: [
      'vehicul',
      'camion',
      'placa',
      'flota',
      'conductor',
      'tractomula',
      'volqueta',
    ],
    insightPrefixes: ['fuel-', 'perdida-', 'inactivo-', 'mantenimiento-'],
    opening: (m) => {
      if (m.vehicles.length === 0) {
        return 'No enviaste datos por vehículo, así que no puedo comparar la flota.';
      }
      const ranked = [...m.vehicles].sort((a, b) => b.net - a.net);
      const best = ranked[0];
      const worst = ranked[ranked.length - 1];
      return ranked.length === 1
        ? `${best.vehicle.label} deja ${cop(best.net)} en el periodo después de sus costos directos.`
        : `De tus ${ranked.length} vehículos, el que más deja es ${best.vehicle.label} (${cop(best.net)}) y el que menos, ${worst.vehicle.label} (${cop(worst.net)}), después de sus costos directos.`;
    },
    tips: [
      'Compara cada mes ingresos, combustible y mantenimiento por vehículo.',
      'Reasigna rutas a los vehículos más eficientes y revisa los que están por debajo del promedio.',
    ],
  },
  {
    keywords: ['caja', 'liquidez', 'flujo', 'pagar', 'plata', 'efectivo'],
    insightPrefixes: ['gastos-pendientes', 'cartera-'],
    opening: (m) =>
      `Tienes ${cop(m.pendingExpenses)} en gastos pendientes y ${cop(m.pendingReceivables)} por cobrar.`,
    tips: [
      'Proyecta semana a semana los pagos (combustible, nómina, cuotas) frente al recaudo esperado.',
      'Mantén un colchón de caja de al menos un mes de gastos fijos.',
      'Negocia plazos con proveedores similares a los que les das a tus clientes.',
    ],
  },
];

const MAX_TIPS = 4;
const MAX_ANSWER_INSIGHTS = 4;

/** Respuesta en Markdown armada con los hallazgos y consejos del tema que detecta la pregunta. */
export function buildAnswer(
  question: string,
  m: FinanceMetrics,
  summary: string,
  insights: FinanceInsight[],
): string {
  const text = normalize(question);
  // Al inicio de palabra: "iva" no debe coincidir con "efectiva", "cobr" sí con "cobrar"
  const topics = TOPICS.filter((topic) =>
    topic.keywords.some((keyword) => new RegExp(`\\b${keyword}`).test(text)),
  );

  if (topics.length === 0) {
    return [
      summary,
      '',
      '**Lo más importante ahora:**',
      ...insights.slice(0, 3).map(insightLine),
    ].join('\n');
  }

  const related = insights
    .filter((insight) =>
      topics.some((topic) =>
        topic.insightPrefixes.some((prefix) => insight.id.startsWith(prefix)),
      ),
    )
    .slice(0, MAX_ANSWER_INSIGHTS);
  const tips = [...new Set(topics.flatMap((topic) => topic.tips))].slice(
    0,
    MAX_TIPS,
  );

  return [
    topics.map((topic) => topic.opening(m)).join(' '),
    '',
    '**Lo que muestran tus datos:**',
    ...(related.length
      ? related.map(insightLine)
      : ['- No aparecen alertas sobre este tema en el periodo.']),
    '',
    '**Qué puedes hacer:**',
    ...tips.map((tip) => `- ${tip}`),
  ].join('\n');
}

function insightLine(insight: FinanceInsight): string {
  return `- **${insight.title}:** ${insight.detail}`;
}

function lowerFirst(text: string): string {
  // Los títulos que empiezan con una placa o etiqueta se dejan tal cual
  return /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(text)
    ? text.charAt(0).toLowerCase() + text.slice(1)
    : text;
}
