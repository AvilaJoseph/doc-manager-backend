import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { DocumentType } from '../entities/vehicledocument.entity';

export class CreateVehicleDocumentDto {
    @IsEnum(DocumentType)
    @IsNotEmpty()
    type: DocumentType;

    @IsString()
    @IsNotEmpty()
    documentNumber: string;

    @IsDateString()
    @IsNotEmpty()
    issueDate: string; // YYYY-MM-DD

    @IsDateString()
    @IsNotEmpty()
    expirationDate: string; // YYYY-MM-DD

    @IsNumber()
    @Min(0)
    @IsOptional()
    cost?: number;

    @IsUUID()
    @IsNotEmpty()
    vehicleId: string;
}