import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto, SignUpUserDto } from './dto';
import { GlobalResponseType, ResponseMap } from '../../utils/type';
import { AuthHelper } from './auth.helper';
import { JwtPayload } from '../../utils/interface';
import { Request, Response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async signUpUser(dto: SignUpUserDto): GlobalResponseType {
    try {
      const userExists = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (userExists) {
        throw new ConflictException(
          `User already exists for email: ${dto.email}`,
        );
      }

      const userPassword = await AuthHelper.hash(dto.password);
      const user = await this.prisma.user.create({
        data: { name: dto.name, email: dto.email, password: userPassword },
      });

      return ResponseMap(
        {
          user: user,
        },
        'User successfully registered!',
      );
    } catch (err) {
      throw new HttpException(
        err,
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async login(dto: LoginDto): GlobalResponseType {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          password: true,
        },
      });

      if (!user) {
        throw new NotFoundException(`No user found for email: ${dto.email}`);
      }

      const passwordMatch = await AuthHelper.validate(
        dto.password,
        user.password,
      );

      if (!passwordMatch) {
        throw new UnauthorizedException('Invalid password');
      }

      const payload: JwtPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      const access_token = this.jwtService.sign(payload);

      return ResponseMap(
        {
          user: user,
          access_token: access_token,
        },
        'User authenticated',
      );
    } catch (err) {
      throw new HttpException(
        err,
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  validatePayload(payload: JwtPayload) {
    return this.prisma.user.findUnique({
      where: { id: payload.userId },
    });
  }

  decodeToken(req: Request) {
    const AuthHeader = req.headers.authorization;
    const Token = AuthHeader.split(' ')[1];
    const secret = 'at-secret';
    const Data = this.jwtService.verify(Token, { secret });

    const { iat, exp, ...filteredData } = Data;

    return filteredData;
  }

  /* async isLoggedIn(req: Request, res: Response): Promise<any> {
    if (!req.headers.authorization) {
      throw new UnauthorizedException('Invalid Session');
    }

    try {
      const Decoded = this.decodeToken(req);
      req.user = Decoded;
      console.log(req.user);
    } catch (err) {
      throw new UnauthorizedException('Invalid Session');
    }
    res.send(req.user);
  } */
}
