import { IdempotencyService } from '../src/modules/idempotency/idempotency.service';
import { ErrorCode } from '../src/common/error-codes';

describe('IdempotencyService', () => {
  it('replays completed requests with the same request hash', async () => {
    const service = new IdempotencyService();
    const tx = {
      idempotencyKey: {
        findUnique: jest.fn().mockResolvedValue({
          requestHash: 'hash',
          status: 'COMPLETED',
          responseBody: { transaction_id: 'trx-1' },
        }),
      },
    };
    await expect(
      service.start(tx as never, {
        key: 'key',
        route: 'POST /api/v1/transfers',
        actorId: 'actor',
        requestHash: 'hash',
      }),
    ).resolves.toEqual({ replay: true, response: { transaction_id: 'trx-1' } });
  });

  it('rejects same key with different request hash', async () => {
    const service = new IdempotencyService();
    const tx = {
      idempotencyKey: {
        findUnique: jest.fn().mockResolvedValue({ requestHash: 'old-hash', status: 'COMPLETED' }),
      },
    };
    await expect(
      service.start(tx as never, {
        key: 'key',
        route: 'POST /api/v1/transfers',
        actorId: 'actor',
        requestHash: 'new-hash',
      }),
    ).rejects.toMatchObject({ code: ErrorCode.IDEMPOTENCY_CONFLICT });
  });
});
