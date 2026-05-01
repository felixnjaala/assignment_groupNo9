import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AxiosError } from 'axios';
import { Weather } from './entities/weather.entity';
import { CreateWeatherDto } from './dto/create-weather.dto';

interface OpenWeatherCurrent {
  main: { temp: number };
  weather: Array<{ description: string }>;
  dt?: number;
}

interface OpenWeatherForecast {
  list: Array<{ dt_txt: string; main: { temp: number }; weather: Array<{ description: string }> }>;
}

@Injectable()
export class WeatherService {
  private readonly apiKey = process.env.OPENWEATHER_API_KEY ?? '';
  private readonly maxRetries = 3;
  private readonly requestTimeoutMs = 7000;

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(Weather)
    private readonly weatherRepo: Repository<Weather>,
  ) { }

  async fetchWeather(dto: CreateWeatherDto) {
    if (!this.apiKey) {
      throw new InternalServerErrorException('OPENWEATHER_API_KEY is missing in .env');
    }

    try {
      const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${dto.city}&appid=${this.apiKey}&units=metric`;
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${dto.city}&appid=${this.apiKey}&units=metric`;

      const [currentData, forecastData] = await Promise.all([
        this.getWithRetry<OpenWeatherCurrent>(currentWeatherUrl, 'current weather'),
        this.getWithRetry<OpenWeatherForecast>(forecastUrl, 'weather forecast'),
      ]);

      const currentWeather = this.weatherRepo.create({
        city: dto.city,
        temperature: currentData.main.temp,
        description: currentData.weather[0]?.description ?? 'No description',
        source: 'current',
        observedAt: currentData.dt ? new Date(currentData.dt * 1000) : null,
      });

      const forecastRecords = forecastData.list.map((item) =>
        this.weatherRepo.create({
          city: dto.city,
          temperature: item.main.temp,
          description: item.weather[0]?.description ?? 'No description',
          source: 'forecast',
          observedAt: new Date(item.dt_txt),
        }),
      );

      const savedWeather = await this.weatherRepo.save([currentWeather, ...forecastRecords]);
      return {
        savedCurrent: savedWeather[0],
        savedForecastCount: savedWeather.length - 1,
        forecastPreview: forecastData.list.slice(0, 5).map((item) => ({
          datetime: item.dt_txt,
          temperature: item.main.temp,
          description: item.weather[0]?.description ?? 'No description',
        })),
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof BadGatewayException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BadGatewayException(`Weather API failed: ${message}`);
    }
  }

  async findAll(page = 1, limit = 10) {
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 100) : 10;
    const [data, total] = await this.weatherRepo.findAndCount({
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      order: { id: 'DESC' },
    });

    return {
      data,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  private async getWithRetry<T>(url: string, label: string): Promise<T> {
    let attempt = 0;
    while (attempt < this.maxRetries) {
      try {
        const response = await firstValueFrom(
          this.httpService.get<T>(url, { timeout: this.requestTimeoutMs }),
        );
        return response.data;
      } catch (error: unknown) {
        attempt += 1;
        const axiosError = error as AxiosError;
        const status = axiosError.response?.status;

        if (status === 404) {
          throw new NotFoundException(`No data found for ${label}`);
        }

        if (attempt >= this.maxRetries) {
          const message = axiosError.message || `Unknown ${label} API error`;
          throw new BadGatewayException(
            `Failed to fetch ${label} after ${this.maxRetries} attempts: ${message}`,
          );
        }

        const backoffMs = 300 * attempt;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    throw new BadGatewayException(`Failed to fetch ${label}`);
  }
}
