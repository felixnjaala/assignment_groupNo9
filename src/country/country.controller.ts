import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { CountryService } from './country.service';
import { CreateCountryDto } from './dto/create-country.dto';

@Controller('country')
export class CountryController {
  constructor(private readonly countryService: CountryService) { }

  @Post()
  fetchCountry(@Body() dto: CreateCountryDto) {
    return this.countryService.fetchCountry(dto);
  }

  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.countryService.findAll(Number(page), Number(limit));
  }

  @Get('region/:region')
  listByRegion(
    @Param('region') region: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.countryService.listByRegion(region, Number(page), Number(limit));
  }
}
