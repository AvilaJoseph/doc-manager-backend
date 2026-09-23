import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [TypeOrmModule.forFeature([User]),
  PassportModule.register({ defaultStrategy: 'jwt' }),
  JwtModule.registerAsync({
    imports: [],
    inject: [],
    useFactory: () => {
      return {
        secret: process.env.JWT_SECRET,
        signOptions: {
          expiresIn: '2h'
        }
      }
    }
  })
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [
    TypeOrmModule,
    PassportModule,
    JwtModule,
    JwtStrategy
  ]
})
export class AuthModule { }
