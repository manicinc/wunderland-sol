/**
 * @file organization.module.ts
 * @description NestJS module for organization management (CRUD, invites, members).
 */

import { Module } from '@nestjs/common';
import { OrganizationController } from './organization.controller.js';

@Module({
  controllers: [OrganizationController],
})
export class OrganizationModule {}
