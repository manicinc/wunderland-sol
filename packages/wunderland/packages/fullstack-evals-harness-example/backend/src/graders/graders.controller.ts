import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { GradersService, CreateGraderDto, UpdateGraderDto } from './graders.service';

@Controller('graders')
export class GradersController {
  constructor(private readonly gradersService: GradersService) {}

  @Get()
  findAll() {
    return this.gradersService.findAll();
  }

  @Get(':id/yaml')
  getRawYaml(@Param('id') id: string, @Res() res: Response) {
    const yamlContent = this.gradersService.getRawYaml(id);
    res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
    res.send(yamlContent);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gradersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateGraderDto) {
    return this.gradersService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGraderDto) {
    return this.gradersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.gradersService.remove(id);
  }

  @Post('reload')
  reload() {
    return this.gradersService.reload();
  }
}
