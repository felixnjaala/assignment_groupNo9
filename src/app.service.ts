import { Injectable, OnModuleInit } from '@nestjs/common';
import { WeatherService } from './weather/weather.service';
import { CountryService } from './country/country.service';

export interface PipelineInput {
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

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    private readonly weatherService: WeatherService,
    private readonly countryService: CountryService,
  ) {}

  async onModuleInit() {
    console.log('🚀 Application started - Running pipeline with hardcoded data...');
    try {
      const result = await this.runPipeline({
        city: 'London',
        countryName: 'United Kingdom',
        region: 'Europe',
      });
      console.log('✅ Pipeline completed on startup:', result);
    } catch (error) {
      console.error('❌ Pipeline failed on startup:', error);
    }
  }

  getHello(): string {
    return 'Hello World!';
  }

  async runPipeline(input: PipelineInput) {
    const weatherResult = await this.weatherService.fetchWeather({ city: input.city });
    const countryResult = await this.countryService.fetchCountry({ name: input.countryName });
    const regionResult = await this.countryService.listByRegion(
      input.region,
      input.regionPage ?? 1,
      input.regionLimit ?? 25,
    );

    const weatherStored = await this.weatherService.findAll(
      input.weatherPage ?? 1,
      input.weatherLimit ?? 10,
    );
    const countryStored = await this.countryService.findAll(
      input.countryPage ?? 1,
      input.countryLimit ?? 10,
    );

    return {
      message: 'Pipeline completed: fetched from external APIs and persisted to PostgreSQL.',
      input,
      weatherApi: weatherResult,
      countryApi: countryResult,
      regionApi: regionResult,
      storedSnapshot: {
        weather: weatherStored.meta,
        country: countryStored.meta,
      },
    };
  }
}
