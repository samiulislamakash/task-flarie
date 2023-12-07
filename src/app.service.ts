import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Coupon, Player, PlayerCoupon, Reward } from './entities';
import { In, Not, Repository } from 'typeorm';
import { CouponRedeemDto } from './dto';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,
    @InjectRepository(PlayerCoupon)
    private readonly playerCouponRepository: Repository<PlayerCoupon>,
    @InjectRepository(Reward)
    private readonly rewardRepository: Repository<Reward>,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async redeemCoupon(couponRedeem: CouponRedeemDto) {
    const { playerId, rewardId } = couponRedeem;

    const player = await this.playerRepository.findOne({
      where: { id: playerId },
    });
    if (!player) {
      throw new BadRequestException('Player not found');
    }

    const reward = await this.rewardRepository.findOne({
      where: { id: rewardId },
    });
    if (!reward) {
      throw new BadRequestException('Reward not found');
    }

    // Check if reward is valid within startDate and endDate
    const currentDate = new Date();
    if (currentDate < reward.startDate || currentDate > reward.endDate) {
      throw new BadRequestException('Reward is not valid at the moment');
    }

    const redeemedCoupons = await this.playerCouponRepository.find({
      where: {
        player: {
          id: playerId,
        },
      },
      relations: { coupon: { reward: true } },
    });

    // Check if player exceeds per day limit
    const todayRedeemedCoupons = redeemedCoupons.filter(
      (item) =>
        item.redeemedAt.toDateString() === currentDate.toDateString() &&
        item.coupon.reward.id === rewardId,
    );
    if (todayRedeemedCoupons.length >= reward.perDayLimit) {
      throw new BadRequestException('Player has exceeded the per day limit');
    }

    // Check if player exceeds total limit
    const totalCouponRedeemedByUsingReward = redeemedCoupons.filter(
      (item) => item.coupon.reward.id === rewardId,
    );
    if (totalCouponRedeemedByUsingReward.length >= reward.totalLimit) {
      throw new BadRequestException('Player has exceeded the total limit');
    }

    const alreadyTakenCoupon = redeemedCoupons.map((item: any) => {
      if (item.coupon.reward.id === rewardId) {
        return item.coupon.id;
      }
    });

    const coupon = await this.couponRepository.findOne({
      where: {
        reward: {
          id: rewardId,
        },
        id: Not(In(alreadyTakenCoupon)),
      },
    });

    if (!coupon) {
      throw new BadRequestException('Coupon is not found');
    }

    const playerCoupon = {
      player: player,
      coupon: coupon,
      redeemedAt: new Date(),
    };
    await this.playerCouponRepository.save(playerCoupon);

    return coupon;
  }
}
