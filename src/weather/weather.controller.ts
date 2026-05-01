import { Controller, Post, Body, Get, Query } from '@nestjs/common';
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
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.weatherService.findAll(Number(page), Number(limit));
  }
}
