import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('RBAC Guard (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/central-bank/reversals (POST) - fails without CENTRAL_BANK_ADMIN role', () => {
    return request(app.getHttpServer())
      .post('/central-bank/reversals')
      .set('x-user-role', 'WALLET_USER')
      .send({})
      .expect(403)
      .expect((res) => {
        expect(res.body.message).toContain('Akses ditolak: Membutuhkan salah satu dari role berikut: CENTRAL_BANK_ADMIN');
      });
  });

  it('/api/v1/central-bank/reversals (POST) - proceeds with CENTRAL_BANK_ADMIN role (fails on validation/logic, not 403)', () => {
    return request(app.getHttpServer())
      .post('/central-bank/reversals')
      .set('x-user-role', 'CENTRAL_BANK_ADMIN')
      .send({})
      .expect((res) => {
        // Since payload is empty, it will probably fail with 400 Bad Request or 500, but NOT 403.
        expect(res.status).not.toBe(403);
      });
  });
});
