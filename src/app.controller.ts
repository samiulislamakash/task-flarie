import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { CouponRedeemDto } from './dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('coupon-redeem')
  redeemCoupon(@Body() couponRedeem: CouponRedeemDto) {
    return this.appService.redeemCoupon(couponRedeem);
  }
}
