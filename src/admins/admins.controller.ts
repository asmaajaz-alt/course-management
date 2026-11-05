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
  ParseIntPipe,
  Req,
  ForbiddenException,
} from '@nestjs/common';

import { Permissions } from '../auth/decorators/permissions.decorator';
import { AdminsService } from './admins.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

@Controller('admins')
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Get()
  @Permissions('admin:read')
  findAll() {
    return this.adminsService.findAll();
  }

  @Get(':id')
  @Permissions('admin:read')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.adminsService.findOne(id);
  }

  @Post()
  @Permissions('admin:create')
  create(@Body() createAdminDto: CreateAdminDto) {
    return this.adminsService.create(createAdminDto);
  }

  @Patch(':id')
  @Permissions('admin:update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAdminDto: UpdateAdminDto,
  ) {
    return this.adminsService.update(id, updateAdminDto);
  }

  @Delete(':id')
  @Permissions('admin:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @Req() request: any) {
    if (
      request.user.role === 'admin' &&
      Number(request.user.sub) === Number(id)
    ) {
      throw new ForbiddenException('Admins cannot delete their own account');
    }

    return this.adminsService.remove(id);
  }
}
