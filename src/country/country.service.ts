import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Country } from './entities/country.entity';
import { CreateCountryDto } from './dto/create-country.dto';

@Injectable()
export class CountryService {
  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(Country)
    private readonly countryRepo: Repository<Country>,
  ) {}

  async fetchCountry(dto: CreateCountryDto) {
    const url = `https://restcountries.com/v3.1/name/${dto.name}`;

    try {
      const response = await firstValueFrom(this.httpService.get(url));
      const data = response.data[0];

      const country = this.countryRepo.create({
        name: data.name.common,
        capital: data.capital ? data.capital[0] : '',
        region: data.region,
        population: data.population,
      });

      return await this.countryRepo.save(country);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Country API failed: ${message}`);
    }
  }

  async findAll() {
    return this.countryRepo.find();
  }
}
