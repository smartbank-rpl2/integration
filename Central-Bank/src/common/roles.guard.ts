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

    // SECURITY FIX: Role hanya dibaca dari JWT payload yang sudah terverifikasi.
    // Header x-user-role dari Gateway DAPAT dimanipulasi oleh client dan
    // TIDAK boleh dipercaya sebagai source of truth untuk authorization.
    // Jika accessed tanpa JWT (tanpa request.user), tolak.
    const userRole = request.user && request.user.role;

    if (!userRole) {
      throw new ForbiddenException('Akses ditolak: Role tidak ditemukan di token yang terverifikasi.');
    }

    const hasRole = requiredRoles.includes(userRole as UserRole);

    if (!hasRole) {
      throw new ForbiddenException(`Akses ditolak: Membutuhkan salah satu dari role berikut: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}