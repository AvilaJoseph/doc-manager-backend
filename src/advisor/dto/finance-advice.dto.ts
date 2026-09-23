import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';

// Límites de tamaño: todo el body viaja al prompt, que se cobra por token.
const MAX_MONTHS = 24;
const MAX_VEHICLES = 100;
const MAX_CATEGORIES = 30;

/** Objeto { CATEGORIA: monto } con claves cortas y montos numéricos >= 0. */
function IsAmountRecord(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isAmountRecord',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (
            typeof value !== 'object' ||
            value === null ||
            Array.isArray(value)
          ) {
            return false;
          }
          const entries = Object.entries(value);
          return (
            entries.length <= MAX_CATEGORIES &&
            entries.every(
              ([key, amount]) =>
                /^[A-Z0-9_]{1,40}$/.test(key) &&
                typeof amount === 'number' &&
                Number.isFinite(amount) &&
                amount >= 0,
            )
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} debe ser un objeto { CATEGORIA: monto } con máximo ${MAX_CATEGORIES} categorías en MAYÚSCULAS y montos >= 0`;
        },
      },
    });
  };
}

export class PeriodDto {
  @IsDateString({ strict: true })
  from: string;

  @IsDateString({ strict: true })
  to: string;
}

export class MonthSummaryDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'month debe tener formato YYYY-MM',
  })
  month: string;

  @IsNumber()
  @Min(0)
  income: number;

  @IsNumber()
  @Min(0)
  expenses: number;

  @IsOptional()
  @IsAmountRecord()
  byCategory?: Record<string, number>;
}

export class ReceivablesDto {
  @IsNumber()
  @Min(0)
  pending: number;

  @IsNumber()
  @Min(0)
  overdue: number;

  @IsInt()
  @Min(0)
  overdueCount: number;
}

export class GmfDto {
  @IsBoolean()
  enabled: boolean;

  @IsNumber()
  @Min(0)
  monthlyExempt: number;

  @IsNumber()
  @Min(0)
  estimatedThisMonth: number;
}

export class VehicleFinanceDto {
  // null = gastos/ingresos no asociados a un vehículo concreto
  @IsOptional()
  @IsUUID()
  vehicleId?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  label: string;

  @IsInt()
  @Min(0)
  trips: number;

  @IsNumber()
  @Min(0)
  income: number;

  @IsNumber()
  @Min(0)
  fuel: number;

  @IsNumber()
  @Min(0)
  maintenance: number;

  @IsNumber()
  @Min(0)
  otherExpenses: number;
}

export class FinanceAdviceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  question: string;

  @ValidateNested()
  @Type(() => PeriodDto)
  period: PeriodDto;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_MONTHS)
  @ValidateNested({ each: true })
  @Type(() => MonthSummaryDto)
  months: MonthSummaryDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ReceivablesDto)
  receivables?: ReceivablesDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pendingExpenses?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => GmfDto)
  gmf?: GmfDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_VEHICLES)
  @ValidateNested({ each: true })
  @Type(() => VehicleFinanceDto)
  vehicles?: VehicleFinanceDto[];
}
