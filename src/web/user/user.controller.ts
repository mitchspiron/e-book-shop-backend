import { Body, Controller, Delete, Get, Patch, Post } from "@nestjs/common";
import { UserService } from "./user.service";
import { User as UserEntity } from '.prisma/client';
import { GlobalResponseType } from "../../utils/type";
import { User } from "../../shared/decorators";
import { AddCardDto, DeleteCardDto, MakeDefaultCardDto, UpdateCardDto, UpdateProfileDto } from "./dto";

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('view/profile/me')
  async getProfile(@User() user: UserEntity): GlobalResponseType {
    return await this.userService.getProfile(user);
  }

  @Patch('update/profile')
  async createOrUpdateProfile(
    @User() user: UserEntity,
    @Body() dto: UpdateProfileDto,
  ): GlobalResponseType {
    return await this.userService.createOrUpdateProfile(user, dto);
  }

  @Post('add/card')
  async addCard(
    @User() user: UserEntity,
    @Body() dto: AddCardDto,
  ): GlobalResponseType {
    return await this.userService.addCard(user, dto);
  }

  @Get('view/card')
  async getCard(@User() user: UserEntity): GlobalResponseType {
    return await this.userService.getCard(user);
  }

  @Patch('update/card')
  async updateCard(
    @User() user: UserEntity,
    dto: UpdateCardDto,
  ): GlobalResponseType {
    return await this.userService.updateCard(user, dto);
  }

  @Delete('remove/card')
  async deleteCard(
    @User() user: UserEntity,
    @Body() dto: DeleteCardDto,
  ): GlobalResponseType {
    return await this.userService.deleteCard(user, dto);
  }

  @Patch('default/card')
  async makeDefaultCard(
    @User() user: UserEntity,
    @Body() dto: MakeDefaultCardDto,
  ): GlobalResponseType {
    return await this.userService.makeDefaultCard(user, dto);
  }
}
