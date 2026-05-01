import { Controller, Post, Body, Get } from '@nestjs/common';
import { WeatherService } from './weather.service';
import { CreateWeatherDto } from './dto/create-weather.dto';

@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) { }

  @Post()
  fetchWeather(@Body() dto: CreateWeatherDto) {
    return this.weatherService.fetchWeather(dto);
  }

  @Get()
  findAll() {
    return this.weatherService.findAll();
  }
}
