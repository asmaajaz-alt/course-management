import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Put,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { ParseIntPipe } from '@nestjs/common';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @Permissions('course:read')
  findAll() {
    return this.coursesService.findAll();
  }

  @Get(':id')
  @Permissions('course:read')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.coursesService.findOne(Number(id));
  }

  @Post()
  @Permissions('course:create')
  create(@Body() createCourseDto: CreateCourseDto) {
    return this.coursesService.create(createCourseDto);
  }

  @Put(':id')
  @Permissions('course:update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCourseDto: CreateCourseDto,
  ) {
    return this.coursesService.update(Number(id), updateCourseDto);
  }

  @Patch(':id')
  @Permissions('course:update')
  updatePartial(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCourseDto: UpdateCourseDto,
  ) {
    return this.coursesService.updatePartial(Number(id), updateCourseDto);
  }

  @Delete(':id')
  @Permissions('course:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.coursesService.remove(Number(id));
  }
}
