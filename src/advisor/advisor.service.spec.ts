import { ADVISOR_ENGINE, AdvisorService } from './advisor.service';
import { FinanceAdviceDto } from './dto/finance-advice.dto';

const VA = '11111111-1111-4111-8111-111111111111';
const VB = '22222222-2222-4222-8222-222222222222';

// Body de ejemplo del contrato con el frontend
const example = (): FinanceAdviceDto => ({
  question: '¿Cómo reduzco el gasto en combustible?',
  period: { from: '2026-01-01', to: '2026-09-23' },
  months: [
    {
      month: '2026-09',
      income: 12500000,
      expenses: 7800000,
      byCategory: {
        COMBUSTIBLE: 4200000,
        MANTENIMIENTO: 1500000,
        PEAJES: 800000,
        GMF: 31200,
      },
    },
  ],
  receivables: { pending: 5400000, overdue: 1200000, overdueCount: 2 },
  pendingExpenses: 850000,
  gmf: { enabled: true, monthlyExempt: 18330900, estimatedThisMonth: 31200 },
  vehicles: [
    {
      vehicleId: VA,
      label: 'ABC123 (T-04)',
      trips: 6,
      income: 9000000,
      fuel: 3100000,
      maintenance: 900000,
      otherExpenses: 400000,
    },
  ],
});

// Dos meses con el margen cayendo y una flota con un vehículo ineficiente y otro parado
const fleet = (): FinanceAdviceDto => ({
  period: { from: '2026-08-01', to: '2026-09-30' },
  months: [
    {
      month: '2026-09',
      income: 20000000,
      expenses: 16000000,
      byCategory: { COMBUSTIBLE: 4500000 },
    },
    {
      month: '2026-08',
      income: 20000000,
      expenses: 14000000,
      byCategory: { COMBUSTIBLE: 4000000 },
    },
  ],
  vehicles: [
    {
      vehicleId: VA,
      label: 'ABC123',
      trips: 5,
      income: 10000000,
      fuel: 3000000,
      maintenance: 1000000,
      otherExpenses: 500000,
    },
    {
      vehicleId: VB,
      label: 'XYZ-789 (Tráiler)',
      trips: 5,
      income: 10000000,
      fuel: 5000000,
      maintenance: 1000000,
      otherExpenses: 500000,
    },
    {
      vehicleId: null,
      label: 'Reserva',
      trips: 0,
      income: 0,
      fuel: 0,
      maintenance: 800000,
      otherExpenses: 0,
    },
  ],
});

describe('AdvisorService', () => {
  const service = new AdvisorService();

  it('responde el contrato completo para el body de ejemplo', () => {
    const result = service.getFinanceAdvice(example());

    expect(Object.keys(result).sort()).toEqual([
      'answer',
      'generatedAt',
      'healthScore',
      'insights',
      'model',
      'summary',
    ]);
    expect(result.model).toBe(ADVISOR_ENGINE);
    expect(new Date(result.generatedAt).toISOString()).toBe(result.generatedAt);
    // Margen 37,6% (40) + un solo mes (10) + cartera 9,6% (16,2) + pendientes 6,8% (13) + combustible 33,6% (8,2)
    expect(result.healthScore).toBe(87);
    expect(result.summary).toBe(
      'Entre el 1 de enero de 2026 y el 23 de septiembre de 2026 el negocio facturó $12.500.000 y gastó $7.800.000, con un margen operativo del 37,6%. La salud financiera es buena (87/100).',
    );
    expect(result.insights.map((i) => i.id)).toEqual([
      'gmf-exencion',
      'cartera-vencida',
    ]);
    expect(result.insights[0]).toMatchObject({
      category: 'impuestos',
      impact: 'bajo',
      estimatedMonthlySavings: 31200,
    });
    expect(result.insights[1]).toMatchObject({
      category: 'cartera',
      impact: 'bajo',
    });
  });

  it('responde la pregunta de combustible con cifras y consejos', () => {
    const { answer } = service.getFinanceAdvice(example());

    expect(answer).toContain(
      'El combustible representa el 33,6% de tus ingresos ($4.200.000 en el periodo).',
    );
    expect(answer).toContain('**Qué puedes hacer:**');
    expect(answer).toContain('kilómetros por galón');
  });

  it('answer es null sin pregunta y da un resumen general si no reconoce el tema', () => {
    expect(
      service.getFinanceAdvice({ ...example(), question: undefined }).answer,
    ).toBeNull();

    const general = service.getFinanceAdvice({
      ...example(),
      question: '¿Qué me recomiendas?',
    });
    expect(general.answer).toContain(general.summary);
    expect(general.answer).toContain('**Lo más importante ahora:**');
  });

  it('reconoce palabras clave solo al inicio de palabra', () => {
    // "efectiva" contiene "iva" pero no es una pregunta de impuestos
    const { answer } = service.getFinanceAdvice({
      ...example(),
      question: '¿Es efectiva mi operación?',
    });
    expect(answer).not.toContain('Sobre impuestos');
    expect(answer).toContain('**Lo más importante ahora:**');
  });

  it('detecta el vehículo que gasta más combustible que la flota y el vehículo parado', () => {
    const { insights, healthScore } = service.getFinanceAdvice(fleet());

    const fuel = insights.find((i) => i.id === 'fuel-xyz-789-trailer');
    // Flota: 8M de combustible / 20M facturados = 40%. XYZ: 50% -> 25% por encima.
    // Ahorro: (5M - 40% de 10M) / 2 meses = 500.000
    expect(fuel).toMatchObject({
      category: 'costos',
      impact: 'medio',
      estimatedMonthlySavings: 500000,
      relatedVehicleIds: [VB],
    });
    expect(insights.find((i) => i.id === 'inactivo-reserva')).toMatchObject({
      category: 'flota',
      relatedVehicleIds: [],
    });
    // Margen de septiembre 20% vs. 30% en agosto
    expect(insights.find((i) => i.id === 'margen-en-caida')?.impact).toBe(
      'medio',
    );
    expect(insights.some((i) => i.id.startsWith('fuel-abc123'))).toBe(false);
    // Mayor ahorro primero dentro del mismo impacto
    expect(insights[0].id).toBe('fuel-xyz-789-trailer');
    // Margen 25% (40) + caída de 10 pp (5) + sin cartera (20) + sin pendientes (15) + combustible 21,3% (10)
    expect(healthScore).toBe(90);
  });

  it('marca como crítica una operación con pérdidas, cartera vencida y gastos pendientes', () => {
    const result = service.getFinanceAdvice({
      period: { from: '2026-09-01', to: '2026-09-30' },
      months: [{ month: '2026-09', income: 10000000, expenses: 12000000 }],
      receivables: { pending: 6000000, overdue: 6000000, overdueCount: 3 },
      pendingExpenses: 6000000,
    });

    expect(result.healthScore).toBe(20);
    expect(
      result.insights
        .filter((i) => i.impact === 'alto')
        .map((i) => i.id)
        .sort(),
    ).toEqual(['cartera-vencida', 'gastos-pendientes', 'margen-negativo']);
    expect(result.summary).toContain(
      'La salud financiera es crítica (20/100).',
    );
    expect(result.summary).toContain(
      'Lo más urgente: la operación está dando pérdidas.',
    );
  });

  it('da 0 sin ingresos y 100 con indicadores ideales', () => {
    const noIncome = service.getFinanceAdvice({
      period: { from: '2026-09-01', to: '2026-09-30' },
      months: [{ month: '2026-09', income: 0, expenses: 1000000 }],
    });
    expect(noIncome.healthScore).toBe(0);
    expect(noIncome.insights[0].id).toBe('sin-ingresos');

    const ideal = service.getFinanceAdvice({
      period: { from: '2026-08-01', to: '2026-09-30' },
      months: [
        {
          month: '2026-08',
          income: 10000000,
          expenses: 6000000,
          byCategory: { COMBUSTIBLE: 2000000 },
        },
        {
          month: '2026-09',
          income: 10000000,
          expenses: 5000000,
          byCategory: { COMBUSTIBLE: 2000000 },
        },
      ],
    });
    expect(ideal.healthScore).toBe(100);
    expect(ideal.insights.map((i) => i.id)).toEqual(['sin-alertas']);
  });

  it('genera ids únicos aunque dos etiquetas produzcan el mismo slug', () => {
    const base = fleet();
    const vehicles = base.vehicles!.map((v, index) =>
      index === 2 ? { ...v } : v,
    );
    vehicles.push({ ...vehicles[2], label: 'reserva' });

    const ids = service
      .getFinanceAdvice({ ...base, vehicles })
      .insights.map((i) => i.id);
    expect(ids).toContain('inactivo-reserva');
    expect(ids).toContain('inactivo-reserva-2');
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('es determinista salvo generatedAt', () => {
    const first = service.getFinanceAdvice(fleet());
    const second = service.getFinanceAdvice(fleet());
    expect({ ...second, generatedAt: '' }).toEqual({
      ...first,
      generatedAt: '',
    });
  });
});
