import { PartialType } from '@nestjs/mapped-types';
import { CreateVehicleDocumentDto } from './create-vehicledocument.dto';

export class UpdateVehicleDocumentDto extends PartialType(CreateVehicleDocumentDto) { }