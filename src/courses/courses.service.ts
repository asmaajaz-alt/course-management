import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
  ConflictException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Course } from './entities/course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { DiscountType } from './enums/discount-type.enum';

import { EnrollmentsService } from '../enrollments/enrollments.service';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly coursesRepository: Repository<Course>,

    @Inject(forwardRef(() => EnrollmentsService))
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  async findAll() {
    const courses = await this.coursesRepository.find();

    return courses.map((course) => ({
      ...course,
      finalPrice: this.calculateFinalPrice(
        course.price,
        course.discountType,
        course.discountValue,
      ),
    }));
  }

  async findOne(id: number) {
    const course = await this.coursesRepository.findOneBy({ id });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return {
      ...course,
      finalPrice: this.calculateFinalPrice(
        course.price,
        course.discountType,
        course.discountValue,
      ),
    };
  }

  async create(createCourseDto: CreateCourseDto) {
    const discountValue =
      createCourseDto.discountType === DiscountType.NONE
        ? 0
        : createCourseDto.discountValue;

    const finalPrice = this.calculateFinalPrice(
      createCourseDto.price,
      createCourseDto.discountType,
      discountValue,
    );

    const newCourse = this.coursesRepository.create({
      ...createCourseDto,
      discountValue,
    });

    const savedCourse = await this.coursesRepository.save(newCourse);

    return {
      ...savedCourse,
      finalPrice,
    };
  }

  async update(id: number, updateCourseDto: CreateCourseDto) {
    const course = await this.coursesRepository.findOneBy({ id });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    const discountValue =
      updateCourseDto.discountType === DiscountType.NONE
        ? 0
        : updateCourseDto.discountValue;

    const finalPrice = this.calculateFinalPrice(
      updateCourseDto.price,
      updateCourseDto.discountType,
      discountValue,
    );

    Object.assign(course, updateCourseDto, { discountValue });

    const updatedCourse = await this.coursesRepository.save(course);

    return {
      ...updatedCourse,
      finalPrice,
    };
  }

  async updatePartial(id: number, updateCourseDto: UpdateCourseDto) {
    const course = await this.coursesRepository.findOneBy({ id });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    Object.assign(course, updateCourseDto);

    if (course.discountType === DiscountType.NONE) {
      course.discountValue = 0;
    }

    const finalPrice = this.calculateFinalPrice(
      course.price,
      course.discountType,
      course.discountValue,
    );

    const updatedCourse = await this.coursesRepository.save(course);

    return {
      ...updatedCourse,
      finalPrice,
    };
  }

  async remove(id: number) {
    await this.findOne(id);

    const hasEnrollments =
      await this.enrollmentsService.hasEnrollmentsForCourse(id);

    if (hasEnrollments) {
      throw new ConflictException(
        'Cannot delete course because enrollments exist',
      );
    }

    await this.coursesRepository.delete(id);
  }

  private calculateFinalPrice(
    price: number,
    discountType: DiscountType,
    discountValue: number,
  ): number {
    if (discountType === DiscountType.NONE) {
      return price;
    }

    if (discountType === DiscountType.PERCENTAGE) {
      if (discountValue > 100) {
        throw new BadRequestException('Percentage discount cannot exceed 100%');
      }

      return price - (price * discountValue) / 100;
    }

    if (discountType === DiscountType.FIXED) {
      if (discountValue > price) {
        throw new BadRequestException(
          'Fixed discount cannot exceed course price',
        );
      }

      return price - discountValue;
    }

    return price;
  }
}
