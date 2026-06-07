import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // Tidak ada metadata role, izinkan.
    }

    const request = context.switchToHttp().getRequest();
    // Membaca dari header x-user-role yang diteruskan oleh API Gateway
    // ATAU fallback ke JWT payload jika diakses langsung tanpa Gateway
    const userRole = request.headers['x-user-role'] || (request.user && request.user.role);

    if (!userRole) {
      throw new ForbiddenException('Akses ditolak: Tidak ada role terdeteksi.');
    }

    const hasRole = requiredRoles.includes(userRole as UserRole);

    if (!hasRole) {
      throw new ForbiddenException(`Akses ditolak: Membutuhkan salah satu dari role berikut: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
