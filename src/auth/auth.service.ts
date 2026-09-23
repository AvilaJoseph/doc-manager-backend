import { BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { LoginUserDto } from './dto/loginUserDto.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './dto/JwtPayload.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly jwtService: JwtService
  ) { }

  async create(createUserDto: CreateUserDto) {
    try {
      const { password, ...userData } = createUserDto

      const user = this.userRepository.create({
        ...userData,
        password: bcrypt.hashSync(password, 10)
      })

      await this.userRepository.save(user);
      const { password: _, ...userWithoutPassword } = user

      return {
        ...userWithoutPassword,
        token: this.getJwtToken({ id: user.id }),
      };
    } catch (error) {
      this.handleDBException(error)
    }
  }

  async login(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto

    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        password: true,
        fullName: true,
        roles: true,
        isActive: true,
        plan: true,
        maxVehicles: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales no válidas (email)');
    }

    if (!bcrypt.compareSync(password, user.password)) {
      throw new UnauthorizedException('Credenciales no válidas (password)');
    }

    const { password: _, ...userWithoutPassword } = user;

    return {
      ...userWithoutPassword,
      token: this.getJwtToken({ id: user.id }),
    };
  }

  private getJwtToken(payload: JwtPayload) {
    const token = this.jwtService.sign(payload);
    return token;
  }

  private handleDBException(error: any): never {
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }
    throw new InternalServerErrorException('Error no controlado, revise los logs del servidor');
  }
}
