import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let prismaService: { isHealthy: jest.Mock };

  beforeEach(async () => {
    prismaService = {
      isHealthy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should return ok when database is reachable', async () => {
    prismaService.isHealthy.mockResolvedValue(true);

    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('reversa-api');
    expect(result.database).toBe('up');
    expect(result.timestamp).toBeDefined();
  });

  it('should return degraded when database is unreachable', async () => {
    prismaService.isHealthy.mockResolvedValue(false);

    const result = await controller.check();

    expect(result.status).toBe('degraded');
    expect(result.database).toBe('down');
  });
});
