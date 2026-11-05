import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';

import { Permissions } from '../auth/decorators/permissions.decorator';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { ParseIntPipe } from '@nestjs/common';

@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get()
  @Permissions('enrollment:list')
  findAll() {
    return this.enrollmentsService.findAll();
  }

  @Get(':id')
  @Permissions('enrollment:read')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() request: any) {
    return this.enrollmentsService.findOne(Number(id), request.user);
  }

  @Post()
  @Permissions('enrollment:create')
  create(
    @Body() createEnrollmentDto: CreateEnrollmentDto,
    @Req() request: any,
  ) {
    return this.enrollmentsService.create(createEnrollmentDto, request.user);
  }

  @Patch(':id')
  @Permissions('enrollment:update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEnrollmentDto: UpdateEnrollmentDto,
    @Req() request: any,
  ) {
    return this.enrollmentsService.update(
      Number(id),
      updateEnrollmentDto,
      request.user,
    );
  }

  @Delete(':id')
  @Permissions('enrollment:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @Req() request: any) {
    return this.enrollmentsService.remove(Number(id), request.user);
  }
}
