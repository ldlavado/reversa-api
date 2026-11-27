import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';

export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: string;
  timestamp: string;
  database: 'up' | 'down';
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Check API and database health status' })
  @ApiOkResponse({ description: 'Current health status of the API and PostgreSQL database' })
  async check(): Promise<HealthResponse> {
    const dbUp = await this.prisma.isHealthy();

    return {
      status: dbUp ? 'ok' : 'degraded',
      service: 'reversa-api',
      timestamp: new Date().toISOString(),
      database: dbUp ? 'up' : 'down',
    };
  }
}
