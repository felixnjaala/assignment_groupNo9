import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WeatherService } from './weather/weather.service';
import { CountryService } from './country/country.service';

export interface PipelineCity {
  city: string;
  country: string;
  region: string;
}

export interface PipelineResultItem {
  city: string;
  country: string;
  region: string;
  weather: Awaited<ReturnType<WeatherService['fetchWeather']>>;
  countryData: Awaited<ReturnType<CountryService['fetchCountry']>>;
  regionData: Awaited<ReturnType<CountryService['listByRegion']>>;
}

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    private readonly weatherService: WeatherService,
    private readonly countryService: CountryService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    console.log('🚀 Pipeline starting...');

    try {
      const cities = this.getAllAvailableCities();

      const result = await this.runPipeline(cities);

      console.log('✅ Pipeline completed successfully');
      console.log(result);
    } catch (err) {
      console.error('❌ Pipeline failed:', err);
    }
  }

  private getAllAvailableCities(): PipelineCity[] {
    return [
    
      { city: 'Dar es Salaam', country: 'Tanzania', region: 'Africa' },
      { city: 'Dodoma', country: 'Tanzania', region: 'Africa' },
      { city: 'Arusha', country: 'Tanzania', region: 'Africa' },
      { city: 'Mwanza', country: 'Tanzania', region: 'Africa' },
      { city: 'Mbeya', country: 'Tanzania', region: 'Africa' },

      { city: 'Nairobi', country: 'Kenya', region: 'Africa' },
      { city: 'Mombasa', country: 'Kenya', region: 'Africa' },
      { city: 'Kisumu', country: 'Kenya', region: 'Africa' },
      { city: 'Nakuru', country: 'Kenya', region: 'Africa' },

      { city: 'Kampala', country: 'Uganda', region: 'Africa' },
      { city: 'Entebbe', country: 'Uganda', region: 'Africa' },
      { city: 'Gulu', country: 'Uganda', region: 'Africa' },

     
      { city: 'Lagos', country: 'Nigeria', region: 'Africa' },
      { city: 'Accra', country: 'Ghana', region: 'Africa' },
      { city: 'Cairo', country: 'Egypt', region: 'Africa' },
      { city: 'Cape Town', country: 'South Africa', region: 'Africa' },
    ];
  }

 
  async runPipeline(cities: PipelineCity[]) {
    const results: PipelineResultItem[] = [];

    for (const c of cities) {
      try {
        const weather = await this.weatherService.fetchWeather({
          city: c.city,
        });

        const country = await this.countryService.fetchCountry({
          name: c.country,
        });

        const region = await this.countryService.listByRegion(
          c.region,
          1,
          50,
        );

        results.push({
          city: c.city,
          country: c.country,
          region: c.region,
          weather,
          countryData: country,
          regionData: region,
        });
      } catch (err) {
        console.error(`⚠️ Failed for ${c.city}:`, err.message);
      }
    }

    return {
      message: 'Africa cities weather pipeline completed',
      totalCities: cities.length,
      results,
    };
  }
}