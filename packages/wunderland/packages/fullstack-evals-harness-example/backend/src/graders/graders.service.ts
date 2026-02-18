import { Injectable } from '@nestjs/common';
import { GraderLoaderService, LoadedGrader, GraderType } from './grader-loader.service';

export { GraderType };

export interface CreateGraderDto {
  /**
   * Optional stable ID for the grader. When omitted, the ID is derived from `name`.
   * This is primarily used by built-in presets so "load preset" is idempotent.
   */
  id?: string;
  name: string;
  description?: string;
  type: GraderType;
  rubric?: string;
  config?: Record<string, unknown>;
}

export interface UpdateGraderDto {
  name?: string;
  description?: string;
  rubric?: string;
  config?: Record<string, unknown>;
}

@Injectable()
export class GradersService {
  constructor(private readonly loader: GraderLoaderService) {}

  findAll(): LoadedGrader[] {
    return this.loader.findAll();
  }

  findOne(id: string): LoadedGrader {
    return this.loader.findOne(id);
  }

  findMany(ids: string[]): LoadedGrader[] {
    return this.loader.findMany(ids);
  }

  getRawYaml(id: string): string {
    return this.loader.getRawYaml(id);
  }

  create(dto: CreateGraderDto): LoadedGrader {
    const rawId = (dto.id || dto.name).trim();
    if (!rawId) {
      throw new Error('Grader id/name is required');
    }
    const id = rawId
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return this.loader.createGrader(id, {
      name: dto.name,
      description: dto.description,
      type: dto.type,
      rubric: dto.rubric,
      config: dto.config,
    });
  }

  update(id: string, dto: UpdateGraderDto): LoadedGrader {
    return this.loader.updateGrader(id, dto);
  }

  remove(id: string): { deleted: boolean } {
    this.loader.deleteGrader(id);
    return { deleted: true };
  }

  reload(): { loaded: number } {
    return this.loader.loadAll();
  }
}
