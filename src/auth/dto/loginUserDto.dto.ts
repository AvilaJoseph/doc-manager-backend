import { IsEmail, IsNotEmpty, IsString } from "class-validator";

// Las reglas de complejidad de contraseña pertenecen al registro (CreateUserDto).
// En el login solo se valida el formato: aplicarlas aquí bloquearía a usuarios
// registrados antes de que existiera la validación.
export class LoginUserDto {
    @IsString()
    @IsEmail({}, { message: 'El correo electronico no es valido' })
    email: string

    @IsString()
    @IsNotEmpty()
    password: string;
}
