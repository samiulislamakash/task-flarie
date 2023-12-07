import { Connection } from 'typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { Coupon, Player, Reward } from '../src/entities';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let validReword: Reward;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    connection = moduleFixture.get(Connection);
  });

  afterAll(async () => {
    await connection.synchronize(true);
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  describe('/coupon-redeem (POST)', () => {
    it('it should return 400 player not found error', () => {
      return request(app.getHttpServer())
        .post('/coupon-redeem')
        .send({ playerId: 20, rewardId: 20 })
        .expect((response: request.Response) => {
          expect(response.body.message).toEqual('Player not found');
          expect(response.body.statusCode).toEqual(400);
        })
        .expect(400);
    });

    it('it should return 400 reward not found error', async () => {
      await createTestPlayer();

      return request(app.getHttpServer())
        .post('/coupon-redeem')
        .send({ playerId: 20, rewardId: 20 })
        .expect((response: request.Response) => {
          expect(response.body.message).toEqual('Reward not found');
          expect(response.body.statusCode).toEqual(400);
        })
        .expect(400);
    });

    it('it should return 400 reward is not valid at the moment error', async () => {
      await createTestInvalidReward();

      return request(app.getHttpServer())
        .post('/coupon-redeem')
        .send({ playerId: 20, rewardId: 20 })
        .expect((response: request.Response) => {
          expect(response.body.message).toEqual(
            'Reward is not valid at the moment',
          );
          expect(response.body.statusCode).toEqual(400);
        })
        .expect(400);
    });

    it('it should return 400 coupon is not found', async () => {
      await createTestValidReward1();

      return request(app.getHttpServer())
        .post('/coupon-redeem')
        .send({ playerId: 20, rewardId: 21 })
        .expect((response: request.Response) => {
          expect(response.body.message).toEqual('Coupon is not found');
          expect(response.body.statusCode).toEqual(400);
        })
        .expect(400);
    });

    it('it should return 201 player get coupon successfully', async () => {
      await createTestCoupon1();
      return request(app.getHttpServer())
        .post('/coupon-redeem')
        .send({ playerId: 20, rewardId: 21 })
        .expect((response: request.Response) => {
          expect(response.body.id).toBeDefined();
          expect(response.body.value).toBeDefined();
        })
        .expect(201);
    });

    it('it should return 400 reward has exceeded the per day limit', async () => {
      await createTestValidReward2();
      await createTestCoupon2();

      return request(app.getHttpServer())
        .post('/coupon-redeem')
        .send({ playerId: 20, rewardId: 21 })
        .expect((response: request.Response) => {
          expect(response.body.message).toEqual(
            'Player has exceeded the per day limit',
          );
          expect(response.body.statusCode).toEqual(400);
        })
        .expect(400);
    });

    it('it should return 400 player has exceeded the total limit', async () => {
      return request(app.getHttpServer())
        .post('/coupon-redeem')
        .send({ playerId: 20, rewardId: 22 })
        .expect((response: request.Response) => {
          expect(response.body.message).toEqual(
            'Player has exceeded the total limit',
          );
          expect(response.body.statusCode).toEqual(400);
        })
        .expect(400);
    });
  });

  const createTestPlayer = async () => {
    const playerRepository = connection.getRepository(Player);
    const testPlayer = {
      id: 20,
      name: 'Player 1',
    };
    return playerRepository.save(testPlayer);
  };

  const createTestInvalidReward = async () => {
    const rewardRepository = connection.getRepository(Reward);
    const testReward = {
      id: 20,
      name: 'Reward 1',
      startDate: new Date(
        new Date(new Date().setDate(new Date().getDate() + 2)).setHours(
          0,
          0,
          0,
          0,
        ),
      ),
      endDate: new Date(
        new Date(new Date().setDate(new Date().getDate() + 3)).setHours(
          23,
          59,
          59,
          999,
        ),
      ),
      perDayLimit: 1,
      totalLimit: 2,
    };
    return rewardRepository.save(testReward);
  };

  const createTestValidReward1 = async () => {
    const rewardRepository = connection.getRepository(Reward);

    const testReward = {
      id: 21,
      name: 'Reward 2',
      startDate: new Date(new Date().setHours(0, 0, 0, 0)),
      endDate: new Date(
        new Date(new Date().setDate(new Date().getDate() + 1)).setHours(
          23,
          59,
          59,
          999,
        ),
      ),
      perDayLimit: 1,
      totalLimit: 1,
    };

    validReword = rewardRepository.create(testReward);
    return await rewardRepository.save(validReword);
  };

  const createTestValidReward2 = async () => {
    const rewardRepository = connection.getRepository(Reward);

    const testReward = {
      id: 22,
      name: 'Reward 3',
      startDate: new Date(new Date().setHours(0, 0, 0, 0)),
      endDate: new Date(
        new Date(new Date().setDate(new Date().getDate() + 1)).setHours(
          23,
          59,
          59,
          999,
        ),
      ),
      perDayLimit: 1,
      totalLimit: 0,
    };

    validReword = rewardRepository.create(testReward);
    return await rewardRepository.save(validReword);
  };

  const createTestCoupon1 = async () => {
    const couponRepository = connection.getRepository(Coupon);
    const testCoupon = [
      {
        id: 20,
        value: 'Coupon 1',
        reward: validReword,
      },
      {
        id: 21,
        value: 'Coupon 2',
        reward: validReword,
      },
    ];
    return couponRepository.save(testCoupon);
  };

  const createTestCoupon2 = async () => {
    const couponRepository = connection.getRepository(Coupon);
    const testCoupon = {
      id: 22,
      value: 'Coupon 3',
      reward: validReword,
    };
    return couponRepository.save(testCoupon);
  };
});
