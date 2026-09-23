import {
  FinanceAdviceDto,
  MonthSummaryDto,
  VehicleFinanceDto,
} from '../dto/finance-advice.dto';

export interface VehicleMetrics {
  vehicle: VehicleFinanceDto;
  costs: number;
  net: number;
  /** combustible / ingresos del vehículo; null si no facturó. */
  fuelRatio: number | null;
  maintenanceRatio: number | null;
}

export interface FinanceMetrics {
  /** Meses con datos: los montos de vehicles se asumen del mismo rango. */
  monthsCount: number;
  totalIncome: number;
  totalExpenses: number;
  net: number;
  /** net / ingresos; null sin ingresos. */
  margin: number | null;
  avgMonthlyIncome: number;
  lastMonth: MonthSummaryDto;
  lastMonthNet: number;
  lastMonthMargin: number | null;
  /** Margen agregado de los meses anteriores al último; null si no hay. */
  previousMargin: number | null;
  previousAvgIncome: number | null;
  lossMonths: MonthSummaryDto[];
  fuelTotal: number | null;
  fuelShare: number | null;
  maintenanceTotal: number | null;
  maintenanceShare: number | null;
  overdue: number;
  overdueCount: number;
  pendingReceivables: number;
  pendingExpenses: number;
  vehicles: VehicleMetrics[];
  /** Promedios ponderados de la flota (solo vehículos que facturaron). */
  fleetFuelRatio: number | null;
  fleetMaintenanceRatio: number | null;
}

const ratio = (part: number, total: number) =>
  total > 0 ? part / total : null;
const sum = (values: number[]) => values.reduce((acc, value) => acc + value, 0);

function categoryTotal(
  months: MonthSummaryDto[],
  category: string,
): number | null {
  const amounts = months
    .map((month) => month.byCategory?.[category])
    .filter((amount): amount is number => amount !== undefined);
  return amounts.length ? sum(amounts) : null;
}

export function computeMetrics(dto: FinanceAdviceDto): FinanceMetrics {
  const months = [...dto.months].sort((a, b) => a.month.localeCompare(b.month));
  const monthsCount = months.length;
  const totalIncome = sum(months.map((m) => m.income));
  const totalExpenses = sum(months.map((m) => m.expenses));
  const lastMonth = months[months.length - 1];
  const previous = months.slice(0, -1);
  const previousIncome = sum(previous.map((m) => m.income));
  const previousExpenses = sum(previous.map((m) => m.expenses));

  const vehicles = (dto.vehicles ?? []).map((vehicle): VehicleMetrics => {
    const costs = vehicle.fuel + vehicle.maintenance + vehicle.otherExpenses;
    return {
      vehicle,
      costs,
      net: vehicle.income - costs,
      fuelRatio: ratio(vehicle.fuel, vehicle.income),
      maintenanceRatio: ratio(vehicle.maintenance, vehicle.income),
    };
  });
  const billing = vehicles.filter((v) => v.vehicle.income > 0);
  const fleetIncome = sum(billing.map((v) => v.vehicle.income));

  // Sin la categoría COMBUSTIBLE en los meses se usa lo reportado por vehículo
  const fuelTotal =
    categoryTotal(months, 'COMBUSTIBLE') ??
    (vehicles.length ? sum(vehicles.map((v) => v.vehicle.fuel)) : null);
  const maintenanceTotal =
    categoryTotal(months, 'MANTENIMIENTO') ??
    (vehicles.length ? sum(vehicles.map((v) => v.vehicle.maintenance)) : null);

  return {
    monthsCount,
    totalIncome,
    totalExpenses,
    net: totalIncome - totalExpenses,
    margin: ratio(totalIncome - totalExpenses, totalIncome),
    avgMonthlyIncome: totalIncome / monthsCount,
    lastMonth,
    lastMonthNet: lastMonth.income - lastMonth.expenses,
    lastMonthMargin: ratio(
      lastMonth.income - lastMonth.expenses,
      lastMonth.income,
    ),
    previousMargin: ratio(previousIncome - previousExpenses, previousIncome),
    previousAvgIncome: previous.length
      ? previousIncome / previous.length
      : null,
    lossMonths: months.filter((m) => m.expenses > m.income),
    fuelTotal,
    fuelShare: fuelTotal === null ? null : ratio(fuelTotal, totalIncome),
    maintenanceTotal,
    maintenanceShare:
      maintenanceTotal === null ? null : ratio(maintenanceTotal, totalIncome),
    overdue: dto.receivables?.overdue ?? 0,
    overdueCount: dto.receivables?.overdueCount ?? 0,
    pendingReceivables: dto.receivables?.pending ?? 0,
    pendingExpenses: dto.pendingExpenses ?? 0,
    vehicles,
    fleetFuelRatio:
      billing.length >= 2
        ? ratio(sum(billing.map((v) => v.vehicle.fuel)), fleetIncome)
        : null,
    fleetMaintenanceRatio:
      billing.length >= 2
        ? ratio(sum(billing.map((v) => v.vehicle.maintenance)), fleetIncome)
        : null,
  };
}

/** Puntaje lineal: `points` en `best` o mejor, 0 en `worst` o peor. */
function scale(value: number, best: number, worst: number, points: number) {
  const position = (value - worst) / (best - worst);
  return Math.min(1, Math.max(0, position)) * points;
}

/**
 * 0 a 100, suma de cinco componentes:
 * - Margen operativo (40): 25% o más = 40; -10% o menos = 0.
 * - Tendencia del margen (15): último mes vs. meses anteriores; igual o mejor = 15,
 *   15 puntos porcentuales menos = 0. Con un solo mes: 10 (sin información).
 * - Cartera vencida (20): 0 = 20; medio mes de ingresos o más = 0.
 * - Gastos pendientes (15): 0 = 15; medio mes de ingresos o más = 0.
 * - Peso del combustible (10): 30% de los ingresos o menos = 10; 50% o más = 0.
 * Sin ingresos en el periodo no hay operación que evaluar: 0.
 */
export function computeHealthScore(m: FinanceMetrics): number {
  if (m.margin === null) return 0;

  const margin = scale(m.margin, 0.25, -0.1, 40);
  const trend =
    m.lastMonthMargin === null || m.previousMargin === null
      ? 10
      : scale(m.lastMonthMargin - m.previousMargin, 0, -0.15, 15);
  const receivables = scale(m.overdue / m.avgMonthlyIncome, 0, 0.5, 20);
  const liquidity = scale(m.pendingExpenses / m.avgMonthlyIncome, 0, 0.5, 15);
  // Sin datos de combustible no se penaliza
  const fuel = m.fuelShare === null ? 10 : scale(m.fuelShare, 0.3, 0.5, 10);

  return Math.round(margin + trend + receivables + liquidity + fuel);
}
