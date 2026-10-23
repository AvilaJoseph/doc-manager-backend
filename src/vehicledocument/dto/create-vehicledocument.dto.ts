import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, IsUUID, MaxLength, Min } from 'class-validator';
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

    // Enlace al soporte (PDF en Drive, OneDrive...). Solo http(s)
    @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
    @MaxLength(500)
    @IsOptional()
    fileUrl?: string;

    @IsUUID()
    @IsNotEmpty()
    vehicleId: string;
}