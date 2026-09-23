import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';

import { User } from 'src/user/entities/user.entity';
import { JwtPayload } from '../dto/JwtPayload.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {
        super({
            secretOrKey: process.env.JWT_SECRET || 'SecretKeySuperSecreta123',
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        });
    }

    async validate(payload: JwtPayload): Promise<User> {
        const { id } = payload;

        const user = await this.userRepository.findOneBy({ id });

        if (!user) {
            throw new UnauthorizedException('Token no válido');
        }

        if (!user.isActive) {
            throw new UnauthorizedException('Usuario inactivo, contacte al administrador');
        }

        return user;
    }
}