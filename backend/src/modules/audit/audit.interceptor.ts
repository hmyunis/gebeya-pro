import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle().pipe(
        tap(() => {
          const user = req.user;
          const body = { ...req.body };
          for (const [key, value] of Object.entries(body)) {
            if (key.toLowerCase().includes('password') && value !== undefined) {
              body[key] = '***';
            }
          }

          this.auditService.log({
            userId: user ? user.userId : null,
            userRole: user ? user.role : 'guest',
            method,
            path: req.url,
            ipAddress: req.ip || req.socket?.remoteAddress,
            payload: JSON.stringify(body),
          });
        }),
      );
    }

    return next.handle();
  }
}
