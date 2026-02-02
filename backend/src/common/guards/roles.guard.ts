import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { UserRole } from '../../modules/users/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user as { role?: UserRole } | undefined;
    return user?.role === UserRole.ADMIN;
  }
}
