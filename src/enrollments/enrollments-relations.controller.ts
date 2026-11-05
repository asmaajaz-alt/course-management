import {
  Controller,
  Get,
  Param,
  Req,
  ForbiddenException,
  ParseIntPipe,
} from '@nestjs/common';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { EnrollmentsService } from './enrollments.service';

@Controller()
export class EnrollmentsRelationsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get('students/:id/enrollments')
  @Permissions('enrollment:read')
  findByStudent(@Param('id', ParseIntPipe) id: number, @Req() request: any) {
    if (request.user.role === 'student' && Number(request.user.sub) !== id) {
      throw new ForbiddenException(
        'Students can only access their own enrollments',
      );
    }

    return this.enrollmentsService.findByStudent(id, request.user);
  }

  @Get('courses/:id/enrollments')
  @Permissions('enrollment:list')
  findByCourse(@Param('id', ParseIntPipe) id: number) {
    return this.enrollmentsService.findByCourse(id);
  }
}
