import {
  BadGatewayException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { Weather } from './entities/weather.entity';
import { CreateWeatherDto } from './dto/create-weather.dto';

interface OpenWeatherCurrent {
  main: { temp: number };
  weather: Array<{ description: string }>;
  dt?: number;
}

interface OpenWeatherForecast {
  list: Array<{
    dt_txt: string;
    main: { temp: number };
    weather: Array<{ description: string }>;
  }>;
}

@Injectable()
export class WeatherService {
  private readonly maxRetries = 3;
  private readonly timeout = 7000;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(Weather)
    private readonly weatherRepo: Repository<Weather>,
  ) { }

  private get apiKey(): string {
    return this.configService.get<string>('OPENWEATHER_API_KEY')?.trim() ?? '';
  }


  async fetchWeather(dto: CreateWeatherDto) {
    const apiKey = this.apiKey;

    if (!apiKey) {
      return {
        skipped: true,
        reason: 'Missing API key',
      };
    }

    try {
      const base = 'https://api.openweathermap.org/data/2.5';

      const currentUrl =
        `${base}/weather?q=${dto.city}&appid=${apiKey}&units=metric`;

      const forecastUrl =
        `${base}/forecast?q=${dto.city}&appid=${apiKey}&units=metric`;

      const [current, forecast] = await Promise.all([
        this.requestWithRetry<OpenWeatherCurrent>(currentUrl, 'current'),
        this.requestWithRetry<OpenWeatherForecast>(forecastUrl, 'forecast'),
      ]);


      const currentEntity = this.weatherRepo.create({
        city: dto.city,
        temperature: current.main.temp,
        description: current.weather[0]?.description ?? 'N/A',
        source: 'current',
        observedAt: current.dt
          ? new Date(current.dt * 1000)
          : new Date(),
      });


      const forecastEntities = forecast.list.map((item) =>
        this.weatherRepo.create({
          city: dto.city,
          temperature: item.main.temp,
          description: item.weather[0]?.description ?? 'N/A',
          source: 'forecast',
          observedAt: new Date(item.dt_txt.replace(' ', 'T')),
        }),
      );

      const saved = await this.weatherRepo.save([
        currentEntity,
        ...forecastEntities,
      ]);

      return {
        city: dto.city,
        current: saved[0],
        forecastCount: saved.length - 1,
      };
    } catch (err) {
      const error = err as AxiosError;

      throw new BadGatewayException(
        `Weather API failed for ${dto.city}: ${error.message}`,
      );
    }
  }


  async findAll(page = 1, limit = 10) {
    const [data, total] = await this.weatherRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { id: 'DESC' },
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  
  private async requestWithRetry<T>(
    url: string,
    label: string,
  ): Promise<T> {
    let attempt = 0;

    while (attempt < this.maxRetries) {
      try {
        const res = await firstValueFrom(
          this.httpService.get<T>(url, { timeout: this.timeout }),
        );

        return res.data;
      } catch (err) {
        attempt++;

        const error = err as AxiosError;
        const status = error.response?.status;

        if (status === 404) {
          throw new NotFoundException(`${label} not found`);
        }

        if (attempt >= this.maxRetries) {
          throw new BadGatewayException(
            `Failed ${label} after ${this.maxRetries} retries`,
          );
        }

        await new Promise((r) => setTimeout(r, 300 * attempt));
      }
    }

    throw new BadGatewayException(`Failed to fetch ${label}`);
  }
}