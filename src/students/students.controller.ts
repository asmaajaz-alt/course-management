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
  ForbiddenException,
} from '@nestjs/common';

import { ParseIntPipe } from '@nestjs/common';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @Permissions('student:list')
  findAll() {
    return this.studentsService.findAll();
  }

  @Get(':id')
  @Permissions('student:read')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() request: any) {
    if (
      request.user.role === 'student' &&
      Number(request.user.sub) !== Number(id)
    ) {
      throw new ForbiddenException(
        'Students can only access their own profile',
      );
    }

    return this.studentsService.findOne(Number(id));
  }

  @Post()
  @Permissions('student:create')
  create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.create(createStudentDto);
  }

  @Patch(':id')
  @Permissions('student:update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStudentDto: UpdateStudentDto,
    @Req() request: any,
  ) {
    return this.studentsService.update(
      Number(id),
      updateStudentDto,
      request.user,
    );
  }

  @Delete(':id')
  @Permissions('student:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.remove(Number(id));
  }
}
