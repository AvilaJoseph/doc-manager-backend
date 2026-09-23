import { createParamDecorator, ExecutionContext, InternalServerErrorException, SetMetadata } from '@nestjs/common';

export const GetUser = createParamDecorator(
    (data: string, ctx: ExecutionContext) => {
        const req = ctx.switchToHttp().getRequest()
        const user = req.user

        if (!user) {
            throw new InternalServerErrorException('Usuario no encontrado en la petición (Asegúrate de usar @UseGuards(AuthGuard()))');
        }

        return data ? user[data] : user;
    }
)
