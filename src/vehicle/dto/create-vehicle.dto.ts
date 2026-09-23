import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class CreateVehicleDto {
    @IsString()
    @IsNotEmpty()
    licensePlate: string;

    @IsString()
    @IsOptional()
    internalCode?: string;

    @IsString()
    @IsNotEmpty()
    brand: string;

    @IsString()
    @IsNotEmpty()
    model: string;

    @IsInt()
    @IsPositive()
    @Min(1900)
    year: number;

    @IsInt()
    @IsPositive()
    @IsOptional()
    currentMileage?: number; 
}