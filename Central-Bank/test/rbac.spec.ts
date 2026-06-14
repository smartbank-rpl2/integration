import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from '../src/common/roles.guard';

function contextWithRole(role?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { role } : undefined }),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(['CENTRAL_BANK_ADMIN']),
  };

  it('rejects non-admin users from CENTRAL_BANK_ADMIN routes', () => {
    const guard = new RolesGuard(reflector as never);
    expect(() => guard.canActivate(contextWithRole('WALLET_USER'))).toThrow(ForbiddenException);
  });

  it('allows CENTRAL_BANK_ADMIN users', () => {
    const guard = new RolesGuard(reflector as never);
    expect(guard.canActivate(contextWithRole('CENTRAL_BANK_ADMIN'))).toBe(true);
  });

  it('rejects requests without a verified user role', () => {
    const guard = new RolesGuard(reflector as never);
    expect(() => guard.canActivate(contextWithRole())).toThrow(ForbiddenException);
  });
});
