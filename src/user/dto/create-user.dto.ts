import { IsEmail, IsString, MinLength, Matches, MaxLength } from 'class-validator';

export class CreateUserDto {
    @IsString()
    @IsEmail({}, { message: 'El corroe electronico no es válido' })
    email: string

    @IsString()
    @MinLength(6)
    @MaxLength(50)
    @Matches(
        /(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message: 'La contraseña debe contener una letra mayúscula, una letra minúscula y un número.'
    })
    password: string;

    @IsString()
    @MinLength(1, { message: 'El nombre completo es obligatorio' })
    fullName: string;

    // Sin `roles`, `plan` ni `maxVehicles`: el ValidationPipe (forbidNonWhitelisted) rechaza
    // cualquier intento de asignárselos desde el body del registro.
}
