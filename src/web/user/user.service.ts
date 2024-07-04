import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Profile, User, UserCard } from '@prisma/client';
import { GlobalResponseType, ResponseMap } from '../../utils/type';
import {
  AddCardDto,
  DeleteCardDto,
  MakeDefaultCardDto,
  UpdateCardDto,
  UpdateProfileDto,
} from './dto';
import Stripe from '../../utils/Stripe';
import { StripeCardDetails } from '../../utils/interface';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getProfile(user: User): GlobalResponseType {
    try {
      const myProfile = await this.prisma.profile.findUnique({
        where: {
          userId: user.id,
          deletedAt: null,
        },
        select: {
          id: true,
          bio: true,
          address: true,
          city: true,
          country: true,
          phone: true,
        },
      });

      if (!myProfile) {
        throw new BadRequestException('Profile not found!');
      }

      return ResponseMap(
        {
          profile: myProfile,
        },
        'Profile successfully found',
      );
    } catch (error) {
      throw new HttpException(
        error,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createOrUpdateProfile(
    user: User,
    dto: UpdateProfileDto,
  ): GlobalResponseType {
    try {
      let updatedProfile: Profile = null;

      const hasProfile = await this.prisma.profile.findFirst({
        where: {
          userId: user.id,
          deletedAt: null,
        },
      });

      if (hasProfile) {
        updatedProfile = await this.prisma.profile.update({
          where: { id: hasProfile.id },
          data: {
            bio: dto.bio,
            phone: dto.phone,
            address: dto.address,
            city: dto.city,
            country: dto.country,
          },
        });
      } else {
        updatedProfile = await this.prisma.profile.create({
          data: {
            userId: user.id,
            bio: dto.bio,
            phone: dto.phone,
            address: dto.address,
            city: dto.city,
            country: dto.country,
          },
        });

        const stripeCustomer = await Stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: {
            userId: user.id,
          },
        });
        //console.log('🚀 ~ UserService ~ stripeCustomer:', stripeCustomer);

        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            stripeCustomerId: stripeCustomer.id,
          },
        });
      }

      return ResponseMap(
        {
          profile: updatedProfile,
        },
        'Profile Updated Successfully',
      );
    } catch (error) {
      throw new HttpException(
        error,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async addCard(user: User, dto: AddCardDto): GlobalResponseType {
    try {
      const userData = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { stripeCustomerId: true },
      });

      if (!userData.stripeCustomerId) {
        throw new BadRequestException(
          'User has no stripe customer id, please update your profile!',
        );
      }

      /* const paymentMethod = await Stripe.paymentMethods.create({
        type: 'card',
        card: {
          number: dto.cardNumber,
          exp_month: dto.cardExpiryMonth,
          exp_year: dto.cardExpiryYear,
          cvc: dto.cardCvc.toString(),
        },
      }); */

      const allCards = await Stripe.paymentMethods.list({
        type: 'card',
        customer: userData.stripeCustomerId,
      });

      if (allCards.data.length >= 1) {
        throw new BadRequestException('User already has card!');
      }

      const card = await Stripe.customers.createSource(
        userData.stripeCustomerId,
        {
          //source: paymentMethod.id,
          source: 'tok_visa',
        },
      );

      const newCard = await this.prisma.userCard.create({
        data: {
          userId: user.id,
          cardId: card.id,
        },
      });

      return ResponseMap(
        {
          card: newCard,
        },
        'New card added successfully',
      );
    } catch (error) {
      throw new HttpException(
        error,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getCard(user: User): GlobalResponseType {
    try {
      const userData = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { name: true, stripeCustomerId: true },
      });

      if (!userData.stripeCustomerId) {
        throw new BadRequestException('User has no stripe customer id');
      }

      const cards = await this.prisma.userCard.findMany({
        where: {
          userId: user.id,
          deletedAt: null,
        },
      });

      const stripeCustomer = await Stripe.customers.retrieve(
        userData.stripeCustomerId,
      );

      // @ts-ignore
      const defaultSource = stripeCustomer.default_source;

      const userCardData: Array<StripeCardDetails> = [];

      for (let i = 0; i < cards.length; i++) {
        try {
          const cardData = await Stripe.customers.retrieveSource(
            userData.stripeCustomerId,
            cards[i].cardId,
          );
          const stripeCardObj = {
            // @ts-ignore : Stripe Ignore
            cardName: cardData.name || userData.name,
            cardId: cards[i].cardId,
            // @ts-ignore : Stripe Ignore
            cardExpiryMonth: cardData.exp_month,
            // @ts-ignore : Stripe Ignore
            cardExpiryYear: cardData.exp_year,
            // @ts-ignore : Stripe Ignore
            cardLast4: cardData.last4,
            // @ts-ignore : Stripe Ignore
            cardBrand: cardData.brand,
            cardDefault: defaultSource === cards[i].cardId ? true : false,
          };
          userCardData.push(stripeCardObj);
        } catch (error) {
          throw new HttpException(
            error,
            error.status || HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
      }

      return ResponseMap(
        {
          cards: userCardData,
          totalCards: userCardData.length,
        },
        'Cards fetched successfully',
      );
    } catch (error) {
      throw new HttpException(
        error,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateCard(user: User, dto: UpdateCardDto): GlobalResponseType {
    try {
      const userData = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { stripeCustomerId: true },
      });

      if (!userData.stripeCustomerId) {
        throw new BadRequestException('User has no stripe customer id');
      }

      const card = await this.prisma.userCard.findFirst({
        where: {
          cardId: dto.cardId,
          deletedAt: null,
        },
      });

      if (!card) {
        throw new BadRequestException('No existing card found to update');
      }

      await Stripe.customers.updateSource(
        userData.stripeCustomerId,
        card.cardId,
        {
          name: dto.cardName,
          exp_month: dto.cardExpiryMonth.toString(),
          exp_year: dto.cardExpiryYear.toString(),
        },
      );

      return ResponseMap(
        {
          updatedCard: card,
        },
        'Card updated successfully',
      );
    } catch (error) {
      throw new HttpException(
        error,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteCard(user: User, dto: DeleteCardDto): GlobalResponseType {
    try {
      const userData = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { stripeCustomerId: true },
      });

      if (!userData.stripeCustomerId) {
        throw new BadRequestException('User has no stripe customer id');
      }

      const card = await this.prisma.userCard.findFirst({
        where: {
          cardId: dto.cardId,
          deletedAt: null,
        },
      });

      if (!card) {
        throw new BadRequestException('No existing card found to delete');
      }

      const stripeDeleteCard = await Stripe.customers.deleteSource(
        userData.stripeCustomerId,
        card.cardId,
      );
      let deletedCard: UserCard = null;

      // @ts-ignore : Stripe Ignore
      if (stripeDeleteCard.deleted) {
        deletedCard = await this.prisma.userCard.update({
          where: { id: card.id },
          data: {
            deletedAt: new Date(),
          },
        });
      }

      return ResponseMap(
        {
          deletedCard: deletedCard,
          deleted: deletedCard.deletedAt ? true : false,
        },
        'Card deleted successfully',
      );
    } catch (error) {
      throw new HttpException(
        error,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async makeDefaultCard(
    user: User,
    dto: MakeDefaultCardDto,
  ): GlobalResponseType {
    try {
      const userData = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { stripeCustomerId: true },
      });

      if (!userData.stripeCustomerId) {
        throw new BadGatewayException('No Stripe ID found');
      }

      const userCard = await this.prisma.userCard.findFirst({
        where: {
          cardId: dto.cardId,
          deletedAt: null,
        },
      });

      if (!userCard) {
        throw new BadRequestException('No card found to make default');
      }

      await Stripe.customers.update(userData.stripeCustomerId, {
        default_source: dto.cardId,
      });

      return ResponseMap(
        {
          default: true,
        },
        'Successfully updated default card',
      );
    } catch (err) {
      throw new HttpException(
        err,
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
