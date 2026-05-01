import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Weather } from './entities/weather.entity';
import { CreateWeatherDto } from './dto/create-weather.dto';

@Injectable()
export class WeatherService {
  private readonly apiKey = process.env.OPENWEATHER_API_KEY ?? '';

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(Weather)
    private readonly weatherRepo: Repository<Weather>,
  ) { }

  async fetchWeather(dto: CreateWeatherDto) {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${dto.city}&appid=${this.apiKey}&units=metric`;

    try {
      const response = await firstValueFrom(this.httpService.get(url));
      const data = response.data;

      const weather = this.weatherRepo.create({
        city: dto.city,
        temperature: data.main.temp,
        description: data.weather[0].description,
      });

      return await this.weatherRepo.save(weather);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Weather API failed: ${message}`);
    }
  }

  async findAll() {
    return this.weatherRepo.find();
  }
}
