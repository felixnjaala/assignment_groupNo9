import { Controller, Post, Body, Get } from '@nestjs/common';
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
  findAll() {
    return this.countryService.findAll();
  }
}
