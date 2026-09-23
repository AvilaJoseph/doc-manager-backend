import { ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';

import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { User } from 'src/user/entities/user.entity';

const body = {
  email: 'nueva@example.com',
  password: 'Clave123',
  fullName: 'Usuaria Nueva',
};

// Misma configuración que el pipe global de app.setup.ts
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const validate = (value: unknown) =>
  pipe.transform(value, { type: 'body', metatype: CreateUserDto });

describe('POST /auth/register', () => {
  it.each([
    ['roles', { roles: ['admin'] }],
    ['plan', { plan: 'ENTERPRISE' }],
    ['maxVehicles', { maxVehicles: 9999 }],
  ])('rechaza %s en el body', async (_field, extra) => {
    await expect(validate({ ...body, ...extra })).rejects.toMatchObject({
      status: 400,
    });
  });

  it('crea el usuario siempre con roles ["user"], aunque el DTO traiga otros campos', async () => {
    const created: Partial<User>[] = [];
    const repository = {
      create: (data: Partial<User>) => {
        created.push(data);
        return { id: 'u1', ...data };
      },
      save: () => Promise.resolve(),
    } as unknown as Repository<User>;
    const jwt = { sign: () => 'token' } as unknown as JwtService;
    const service = new AuthService(repository, jwt);

    // Simula un DTO que se saltó la validación
    const dto = {
      ...body,
      roles: ['admin'],
      plan: 'ENTERPRISE',
    } as CreateUserDto;
    const result = await service.create(dto);

    expect(created).toHaveLength(1);
    expect(created[0].roles).toEqual(['user']);
    expect(created[0]).not.toHaveProperty('plan');
    expect(created[0].password).not.toBe(body.password);
    expect(result).toMatchObject({ roles: ['user'], token: 'token' });
    expect(result).not.toHaveProperty('password');
  });
});
