import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export enum DocumentType {
    CC = 'CC',
    CE = 'CE',
    PASSPORT = 'PASSPORT',
    OTHER = 'OTHER',
}

export class CreateDriverDto {
    @IsString()
    @IsNotEmpty()
    fullName: string;

    @IsEnum(DocumentType)
    @IsNotEmpty()
    documentType: DocumentType;

    @IsString()
    @IsNotEmpty()
    documentId: string;

    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsString()
    @IsNotEmpty()
    licenseNumber: string;

    @IsDateString()
    @IsNotEmpty()
    licenseExpirationDate: string; // YYYY-MM-DD

    @IsUUID()
    @IsOptional()
    assignedVehicleId?: string | null;
}