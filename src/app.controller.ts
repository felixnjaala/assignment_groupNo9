import { Body, Controller, Post } from '@nestjs/common';
import { AppService } from './app.service';

interface PipelineRequestBody {
  city: string;
  countryName: string;
  region: string;
  weatherPage?: number;
  weatherLimit?: number;
  countryPage?: number;
  countryLimit?: number;
  regionPage?: number;
  regionLimit?: number;
}

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('pipeline/run')
  runPipeline(@Body() body: PipelineRequestBody) {
    const { city, countryName, region } = body;

    return this.appService.runPipeline([
      { city, country: countryName, region },
    ]);
  }
}
