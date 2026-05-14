import { BadGatewayException, Injectable, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AxiosError } from 'axios';
import { Country } from './entities/country.entity';
import { CreateCountryDto } from './dto/create-country.dto';

interface RestCountry {
  name: { common: string };
  capital?: string[];
  region: string;
  population: number;
  cca2?: string;
  cca3?: string;
  languages?: Record<string, string>;
  timezones?: string[];
}

@Injectable()
export class CountryService {
  private readonly maxRetries = 3;
  private readonly requestTimeoutMs = 7000;

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(Country)
    private readonly countryRepo: Repository<Country>,
  ) {}

  async fetchCountry(dto: CreateCountryDto) {
    try {
      const nameUrl = `https://restcountries.com/v3.1/name/${encodeURIComponent(dto.name)}`;
      const byName = await this.getWithRetry<RestCountry[]>(nameUrl, 'country by name');
      const countryFromName = byName[0];

      if (!countryFromName) {
        throw new NotFoundException(`No country found for name "${dto.name}"`);
      }

      const countryCode = countryFromName.cca2 ?? countryFromName.cca3;
      const alphaUrl = countryCode
        ? `https://restcountries.com/v3.1/alpha/${countryCode}`
        : undefined;
      const alphaResponse = alphaUrl
        ? await this.getWithRetry<RestCountry | RestCountry[]>(alphaUrl, 'country by alpha code')
        : countryFromName;
      const resolvedCountry = Array.isArray(alphaResponse) ? alphaResponse[0] : alphaResponse;

      const recordsToSave = [
        this.buildCountryEntity(countryFromName, 'name'),
        this.buildCountryEntity(resolvedCountry, 'alpha'),
      ];
      const savedCountries = await this.countryRepo.save(recordsToSave);

      return {
        savedCountries,
        details: {
          languages: Object.values(resolvedCountry.languages ?? {}),
          timezones: resolvedCountry.timezones ?? [],
        },
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException || error instanceof BadGatewayException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BadGatewayException(`Country API failed: ${message}`);
    }
  }

  async findAll(page = 1, limit = 10) {
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 100) : 10;
    const [data, total] = await this.countryRepo.findAndCount({
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

  async listByRegion(region: string, page = 1, limit = 25) {
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 100) : 25;

    const regionUrl = `https://restcountries.com/v3.1/region/${encodeURIComponent(region)}`;
    const countries = await this.getWithRetry<RestCountry[]>(regionUrl, `countries in region ${region}`);
    const persisted = await this.countryRepo.save(
      countries.map((country) => this.buildCountryEntity(country, 'region')),
    );
    const total = countries.length;
    const start = (safePage - 1) * safeLimit;
    const end = start + safeLimit;

    return {
      persistedCount: persisted.length,
      data: countries.slice(start, end).map((country) => ({
        name: country.name.common,
        capital: country.capital ? country.capital[0] : '',
        region: country.region,
        population: country.population,
      })),
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

  private buildCountryEntity(country: RestCountry, source: string): Country {
    return this.countryRepo.create({
      name: country.name.common,
      capital: country.capital ? country.capital[0] : '',
      region: country.region,
      population: country.population,
      source,
      countryCode: country.cca2 ?? country.cca3,
      languages: Object.values(country.languages ?? {}),
      timezones: country.timezones ?? [],
    });
  }
}
