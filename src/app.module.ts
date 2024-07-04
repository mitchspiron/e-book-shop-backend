import { Module, ValidationPipe } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './web/auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { AtGuard } from './shared/guards';
import { UserModule } from './web/user/user.module';

@Module({
  imports: [ConfigModule.forRoot(), PrismaModule, AuthModule, UserModule],
  controllers: [AppController],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
    {
      provide: APP_GUARD,
      useClass: AtGuard,
    },
    AppService,
  ],
})
export class AppModule {}
