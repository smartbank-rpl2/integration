import { Controller, Post, Body, Req } from '@nestjs/common';
import { ManagerService } from './manager.service';
import { ManagerUserActionDto, ManagerLoanActionDto } from './dto';
import { Roles } from '../../common/roles.decorator';
import { UserRole } from '@prisma/client';
import { RequestUser, CurrentUser } from '../../common/current-user.decorator';
import { Request } from 'express';
import { requestId, requireIdempotencyKey } from '../../common/request-utils';

@Controller('manager')
@Roles(UserRole.MANAGER)
export class ManagerController {
  constructor(
    private readonly manager: ManagerService,
  ) {}

  @Post('users/suspend')
  async suspendUser(@Body() dto: ManagerUserActionDto, @Req() req: Request, @CurrentUser() user: RequestUser) {
    return this.manager.suspendUser({
      userId: dto.userId,
      actorUserId: user.sub,
      requestId: requestId(req),
      reasonCode: dto.reasonCode,
    });
  }

  @Post('users/activate')
  async activateUser(@Body() dto: ManagerUserActionDto, @Req() req: Request, @CurrentUser() user: RequestUser) {
    return this.manager.activateUser({
      userId: dto.userId,
      actorUserId: user.sub,
      requestId: requestId(req),
      reasonCode: dto.reasonCode,
    });
  }

  @Post('loans/approve')
  async approveLoan(@Body() dto: ManagerLoanActionDto, @Req() req: Request, @CurrentUser() user: RequestUser) {
    return this.manager.approveLoan({
      loanId: dto.loanId,
      actorUserId: user.sub,
      requestId: requestId(req),
      idempotencyKey: requireIdempotencyKey(req),
      reasonCode: dto.reasonCode,
    });
  }

  @Post('loans/reject')
  async rejectLoan(@Body() dto: ManagerLoanActionDto, @Req() req: Request, @CurrentUser() user: RequestUser) {
    return this.manager.rejectLoan({
      loanId: dto.loanId,
      actorUserId: user.sub,
      requestId: requestId(req),
      reasonCode: dto.reasonCode,
    });
  }
}
