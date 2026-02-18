import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Datasets + Graders (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/datasets returns loaded datasets', async () => {
    const response = await request(app.getHttpServer()).get('/api/datasets').expect(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty('id');
    expect(response.body[0]).toHaveProperty('testCaseCount');
  });

  it('GET /api/datasets/:id returns dataset with test cases', async () => {
    const response = await request(app.getHttpServer()).get('/api/datasets/context-qa').expect(200);
    expect(response.body.id).toBe('context-qa');
    expect(Array.isArray(response.body.testCases)).toBe(true);
    expect(response.body.testCases.length).toBeGreaterThan(0);
  });

  it('GET /api/datasets/:id/export/csv returns CSV', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/datasets/context-qa/export/csv')
      .expect(200);
    expect(response.header['content-type']).toContain('text/csv');
    expect(response.text).toContain('input,expected_output,context,metadata');
  });

  it('GET /api/datasets/:id/export/json returns JSON export', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/datasets/context-qa/export/json')
      .expect(200);
    expect(response.body).toHaveProperty('name');
    expect(response.body).toHaveProperty('testCases');
  });

  it('GET /api/graders returns loaded graders', async () => {
    const response = await request(app.getHttpServer()).get('/api/graders').expect(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty('id');
    expect(response.body[0]).toHaveProperty('type');
  });
});
