import {
  FinanceInsight,
  InsightImpact,
} from '../interfaces/finance-advice-response.interface';
import { GmfDto } from '../dto/finance-advice.dto';
import { cop, monthLabel, pct, slug } from './format';
import { FinanceMetrics, VehicleMetrics } from './metrics';

const MAX_INSIGHTS = 8;
const GMF_RATE = 0.004; // 4x1000

// Umbrales (proporciones sobre ingresos salvo que se indique otra base)
const MARGIN_LOW = 0.1; // por debajo: impacto alto
const MARGIN_TIGHT = 0.2; // por debajo: impacto medio
const MARGIN_DROP = 0.05; // caída del margen del último mes (puntos porcentuales)
const MARGIN_DROP_SEVERE = 0.15;
const INCOME_DROP = 0.15; // caída de ingresos del último mes vs. promedio anterior
const FUEL_SHARE_HIGH = 0.35;
const FUEL_SHARE_SEVERE = 0.45;
const FUEL_EFFICIENCY_GAIN = 0.05; // ahorro conservador de un programa de eficiencia
const VEHICLE_FUEL_EXCESS = 0.2; // sobre el promedio de la flota
const VEHICLE_FUEL_EXCESS_SEVERE = 0.4;
const VEHICLE_MAINTENANCE_EXCESS = 0.5;
const VEHICLE_MAINTENANCE_MIN_SHARE = 0.1;
const MAINTENANCE_SHARE_HIGH = 0.15;
const OVERDUE_SEVERE = 0.3; // cartera vencida / ingreso mensual promedio
const OVERDUE_MEDIUM = 0.1;
const RECEIVABLES_DAYS_HIGH = 30; // días de facturación por cobrar

const IMPACT_RANK: Record<InsightImpact, number> = {
  alto: 0,
  medio: 1,
  bajo: 2,
};

export function buildInsights(
  m: FinanceMetrics,
  gmf: GmfDto | undefined,
): FinanceInsight[] {
  const perMonth = (amount: number) => Math.round(amount / m.monthsCount);
  const insights: FinanceInsight[] = [
    ...marginInsights(m),
    ...fuelInsights(m, perMonth),
    ...vehicleInsights(m, perMonth),
    ...receivablesInsights(m),
    ...liquidityInsights(m),
    ...gmfInsights(gmf),
  ];

  if (insights.length === 0) {
    insights.push({
      id: 'sin-alertas',
      title: 'Sin alertas relevantes',
      detail:
        'Los indicadores del periodo están en rangos sanos. Mantén el control mensual del combustible por vehículo y el seguimiento semanal de la cartera.',
      category: 'ingresos',
      impact: 'bajo',
      estimatedMonthlySavings: null,
      relatedVehicleIds: [],
    });
  }

  const usedIds = new Set<string>();
  return insights
    .sort(
      (a, b) =>
        IMPACT_RANK[a.impact] - IMPACT_RANK[b.impact] ||
        (b.estimatedMonthlySavings ?? 0) - (a.estimatedMonthlySavings ?? 0),
    )
    .slice(0, MAX_INSIGHTS)
    .map((insight) => {
      // Dos vehículos con etiquetas que producen el mismo slug
      let id = insight.id;
      for (let n = 2; usedIds.has(id); n++) id = `${insight.id}-${n}`;
      usedIds.add(id);
      // Orden de claves fijo en el JSON, igual al contrato
      return {
        id,
        title: insight.title,
        detail: insight.detail,
        category: insight.category,
        impact: insight.impact,
        estimatedMonthlySavings: insight.estimatedMonthlySavings,
        relatedVehicleIds: insight.relatedVehicleIds,
      };
    });
}

function marginInsights(m: FinanceMetrics): FinanceInsight[] {
  const result: FinanceInsight[] = [];
  const base = {
    category: 'ingresos' as const,
    estimatedMonthlySavings: null,
    relatedVehicleIds: [],
  };

  if (m.totalIncome === 0) {
    if (m.totalExpenses > 0) {
      result.push({
        ...base,
        id: 'sin-ingresos',
        title: 'No hay ingresos registrados',
        detail: `El periodo tiene gastos por ${cop(m.totalExpenses)} pero ningún ingreso. Registra los fletes facturados para que el diagnóstico sea confiable.`,
        impact: 'alto',
      });
    }
    return result;
  }

  const margin = m.margin!;
  if (margin < 0) {
    result.push({
      ...base,
      id: 'margen-negativo',
      title: 'La operación está dando pérdidas',
      detail: `Los gastos (${cop(m.totalExpenses)}) superan los ingresos (${cop(m.totalIncome)}): pérdida de ${cop(-m.net)} en el periodo. Revisa primero los vehículos con pérdida y compara la tarifa de cada flete con su costo por viaje.`,
      impact: 'alto',
    });
  } else if (margin < MARGIN_TIGHT) {
    result.push({
      ...base,
      id: 'margen-bajo',
      title: 'Margen operativo ajustado',
      detail: `De cada $100 que factura el negocio quedan ${cop(margin * 100)} después de gastos (margen del ${pct(margin)}). Con un margen así, una reparación mayor o un cliente que no paga pueden dejar el mes en pérdida.`,
      impact: margin < MARGIN_LOW ? 'alto' : 'medio',
    });
  }

  // Meses en pérdida aunque el periodo completo sea positivo
  if (margin >= 0 && m.monthsCount >= 2 && m.lossMonths.length > 0) {
    result.push({
      ...base,
      id: 'meses-en-perdida',
      title: `${m.lossMonths.length} de ${m.monthsCount} meses cerraron en pérdida`,
      detail: `Los gastos superaron a los ingresos en ${m.lossMonths.map((month) => monthLabel(month.month)).join(', ')}. Revisa qué gastos extraordinarios o qué caída de viajes hubo en esos meses.`,
      impact: 'medio',
    });
  }

  if (m.lastMonthMargin !== null && m.previousMargin !== null) {
    const drop = m.previousMargin - m.lastMonthMargin;
    if (drop >= MARGIN_DROP) {
      result.push({
        ...base,
        id: 'margen-en-caida',
        title: 'El margen viene bajando',
        detail: `En ${monthLabel(m.lastMonth.month)} el margen fue del ${pct(m.lastMonthMargin)}, frente al ${pct(m.previousMargin)} de los meses anteriores.`,
        impact: drop >= MARGIN_DROP_SEVERE ? 'alto' : 'medio',
      });
    }
  }

  if (
    m.previousAvgIncome !== null &&
    m.previousAvgIncome > 0 &&
    m.lastMonth.income < m.previousAvgIncome * (1 - INCOME_DROP)
  ) {
    const drop = 1 - m.lastMonth.income / m.previousAvgIncome;
    result.push({
      ...base,
      id: 'caida-ingresos',
      title: 'Caída de ingresos en el último mes',
      detail: `Los ingresos de ${monthLabel(m.lastMonth.month)} (${cop(m.lastMonth.income)}) están un ${pct(drop)} por debajo del promedio de los meses anteriores (${cop(m.previousAvgIncome)}).`,
      impact: 'medio',
    });
  }

  return result;
}

function fuelInsights(
  m: FinanceMetrics,
  perMonth: (amount: number) => number,
): FinanceInsight[] {
  if (m.fuelShare === null || m.fuelTotal === null) return [];
  if (m.fuelShare < FUEL_SHARE_HIGH) return [];

  const savings = perMonth(m.fuelTotal * FUEL_EFFICIENCY_GAIN);
  return [
    {
      id: 'combustible-alto',
      title: 'El combustible pesa demasiado en los ingresos',
      detail: `El combustible se lleva el ${pct(m.fuelShare)} de los ingresos (${cop(m.fuelTotal)} en el periodo). Bajarlo un 5% con control de tanqueos, rutas y conducción eficiente liberaría unos ${cop(savings)} al mes.`,
      category: 'costos',
      impact: m.fuelShare >= FUEL_SHARE_SEVERE ? 'alto' : 'medio',
      estimatedMonthlySavings: savings,
      relatedVehicleIds: [],
    },
  ];
}

function vehicleIds(v: VehicleMetrics): string[] {
  return v.vehicle.vehicleId ? [v.vehicle.vehicleId] : [];
}

function vehicleInsights(
  m: FinanceMetrics,
  perMonth: (amount: number) => number,
): FinanceInsight[] {
  const result: FinanceInsight[] = [];

  for (const v of m.vehicles) {
    const { label, trips, income, fuel, maintenance } = v.vehicle;
    const key = slug(label);

    if (trips === 0 && income === 0) {
      if (v.costs > 0) {
        result.push({
          id: `inactivo-${key}`,
          title: `${label} no registra viajes`,
          detail: `No tuvo viajes en el periodo pero generó costos por ${cop(v.costs)}. Evalúa asignarle rutas, alquilarlo o venderlo.`,
          category: 'flota',
          impact: 'medio',
          estimatedMonthlySavings: null,
          relatedVehicleIds: vehicleIds(v),
        });
      }
      continue;
    }

    if (v.net < 0) {
      result.push({
        id: `perdida-${key}`,
        title: `${label} está dando pérdidas`,
        detail: `Sus costos (combustible, mantenimiento y otros: ${cop(v.costs)}) superan lo que factura (${cop(income)}): pierde ${cop(-v.net)} en el periodo. Revisa las tarifas de sus rutas o si conviene reasignarlo.`,
        category: 'flota',
        impact: 'alto',
        estimatedMonthlySavings: perMonth(-v.net),
        relatedVehicleIds: vehicleIds(v),
      });
    }

    const fleetFuel = m.fleetFuelRatio;
    if (fleetFuel && v.fuelRatio !== null) {
      const excess = v.fuelRatio / fleetFuel - 1;
      if (excess > VEHICLE_FUEL_EXCESS) {
        const savings = perMonth(fuel - fleetFuel * income);
        const perTrip =
          trips > 0
            ? ` Costo de combustible por viaje: ${cop(fuel / trips)}.`
            : '';
        result.push({
          id: `fuel-${key}`,
          title: `Consumo de combustible alto en ${label}`,
          detail: `Gasta en combustible el ${pct(v.fuelRatio)} de lo que factura, frente al ${pct(fleetFuel)} de la flota (${pct(excess)} por encima del promedio).${perTrip} Llevarlo al promedio ahorraría unos ${cop(savings)} al mes: revisa rutas, estado mecánico (inyectores, llantas) y hábitos de conducción.`,
          category: 'costos',
          impact: excess >= VEHICLE_FUEL_EXCESS_SEVERE ? 'alto' : 'medio',
          estimatedMonthlySavings: savings,
          relatedVehicleIds: vehicleIds(v),
        });
      }
    }

    const fleetMaintenance = m.fleetMaintenanceRatio;
    if (
      fleetMaintenance &&
      v.maintenanceRatio !== null &&
      v.maintenanceRatio >= VEHICLE_MAINTENANCE_MIN_SHARE &&
      v.maintenanceRatio > fleetMaintenance * (1 + VEHICLE_MAINTENANCE_EXCESS)
    ) {
      result.push({
        id: `mantenimiento-${key}`,
        title: `Mantenimiento elevado en ${label}`,
        detail: `El mantenimiento (${cop(maintenance)}) equivale al ${pct(v.maintenanceRatio)} de lo que factura, frente al ${pct(fleetMaintenance)} de la flota. Revisa si son reparaciones recurrentes: puede convenir un plan preventivo o renovar el vehículo.`,
        category: 'flota',
        impact: 'medio',
        estimatedMonthlySavings: null,
        relatedVehicleIds: vehicleIds(v),
      });
    }
  }

  // Si ningún vehículo se sale del promedio, se revisa el peso global del mantenimiento
  const hasVehicleMaintenance = result.some((i) =>
    i.id.startsWith('mantenimiento-'),
  );
  if (
    !hasVehicleMaintenance &&
    m.maintenanceShare !== null &&
    m.maintenanceTotal !== null &&
    m.maintenanceShare >= MAINTENANCE_SHARE_HIGH
  ) {
    result.push({
      id: 'mantenimiento-alto',
      title: 'Gasto de mantenimiento alto',
      detail: `El mantenimiento suma ${cop(m.maintenanceTotal)}, el ${pct(m.maintenanceShare)} de los ingresos. Un plan preventivo por kilometraje y cotizar con al menos dos talleres suele bajar este rubro.`,
      category: 'costos',
      impact: 'medio',
      estimatedMonthlySavings: null,
      relatedVehicleIds: [],
    });
  }

  return result;
}

function receivablesInsights(m: FinanceMetrics): FinanceInsight[] {
  const result: FinanceInsight[] = [];
  const avg = m.avgMonthlyIncome;

  if (m.overdue > 0) {
    const share = avg > 0 ? m.overdue / avg : Infinity;
    const count =
      m.overdueCount > 0
        ? ` en ${m.overdueCount} ${m.overdueCount === 1 ? 'cuenta' : 'cuentas'}`
        : '';
    const equivalence =
      avg > 0 ? `, el ${pct(share)} de un mes de ingresos` : '';
    result.push({
      id: 'cartera-vencida',
      title: 'Cartera vencida por cobrar',
      detail: `Tienes ${cop(m.overdue)} vencidos${count}${equivalence}. Prioriza el cobro de lo más antiguo y pide anticipo o pago contra entrega a los clientes que se atrasan.`,
      category: 'cartera',
      impact:
        share >= OVERDUE_SEVERE
          ? 'alto'
          : share >= OVERDUE_MEDIUM
            ? 'medio'
            : 'bajo',
      estimatedMonthlySavings: null,
      relatedVehicleIds: [],
    });
  }

  if (avg > 0) {
    const days = (m.pendingReceivables / avg) * 30;
    if (days > RECEIVABLES_DAYS_HIGH) {
      result.push({
        id: 'cartera-alta',
        title: 'Mucho dinero en manos de los clientes',
        detail: `La cartera por cobrar (${cop(m.pendingReceivables)}) equivale a ${Math.round(days)} días de facturación. Ese dinero hace falta para combustible, peajes y nómina: acorta plazos o factura apenas se entrega la carga.`,
        category: 'cartera',
        impact: 'medio',
        estimatedMonthlySavings: null,
        relatedVehicleIds: [],
      });
    }
  }

  return result;
}

function liquidityInsights(m: FinanceMetrics): FinanceInsight[] {
  if (m.pendingExpenses <= 0) return [];
  if (m.lastMonthNet > 0 && m.pendingExpenses <= m.lastMonthNet) return [];

  const lastMonth = monthLabel(m.lastMonth.month);
  const result =
    m.lastMonthNet >= 0
      ? `un excedente de ${cop(m.lastMonthNet)}`
      : `una pérdida de ${cop(-m.lastMonthNet)}`;
  return [
    {
      id: 'gastos-pendientes',
      title: 'Gastos pendientes mayores que el excedente del mes',
      detail: `Hay ${cop(m.pendingExpenses)} en gastos pendientes de pago y ${lastMonth} dejó ${result}. Programa esos pagos contra el recaudo de la cartera para no quedarte sin caja.`,
      category: 'liquidez',
      impact: m.lastMonthNet <= 0 ? 'alto' : 'medio',
      estimatedMonthlySavings: null,
      relatedVehicleIds: [],
    },
  ];
}

function gmfInsights(gmf: GmfDto | undefined): FinanceInsight[] {
  if (!gmf?.enabled || gmf.estimatedThisMonth <= 0) return [];

  const savings = Math.round(
    Math.min(gmf.estimatedThisMonth, gmf.monthlyExempt * GMF_RATE),
  );
  if (savings <= 0) return [];
  return [
    {
      id: 'gmf-exencion',
      title: 'Aprovecha la exención del 4x1000',
      detail: `El GMF estimado de este mes es ${cop(gmf.estimatedThisMonth)}. Los retiros de hasta ${cop(gmf.monthlyExempt)} al mes desde una cuenta marcada como exenta no pagan este impuesto: podrías ahorrar hasta ${cop(savings)} mensuales. Valida con tu contador cuál cuenta marcar.`,
      category: 'impuestos',
      impact: 'bajo',
      estimatedMonthlySavings: savings,
      relatedVehicleIds: [],
    },
  ];
}
