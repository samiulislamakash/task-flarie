import { IsNotEmpty, IsNumber } from 'class-validator';

export class CouponRedeemDto {
  @IsNotEmpty()
  @IsNumber()
  playerId: number;

  @IsNotEmpty()
  @IsNumber()
  rewardId: number;
}
