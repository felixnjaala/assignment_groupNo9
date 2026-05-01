 Country API Documentation

 1. API Choice & Selection
API Selected: RestCountries API (v3.1)
- Purpose: Fetch detailed information about countries worldwide
- Type: RESTful API with no authentication required
- Authentication: None (open access)
- Data Format: JSON response



 2. API Registration & Configuration

 2.1 API Key Requirements
API key needed! RestCountries is a completely free and open API.

 2.2 Environment Setup
environment variables required for RestCountries stored in your `.env` for reference:
env

RESTCOUNTRIES_API=https://restcountries.com/v3.1


 2.3 Base Configuration in Code
typescript
// country.service.ts
private readonly maxRetries = 3;
private readonly requestTimeoutMs = 7000;

// API Base URLs (hardcoded)
// - https://restcountries.com/v3.1/name/{name}
// - https://restcountries.com/v3.1/alpha/{code}
// - https://restcountries.com/v3.1/region/{region}




 3. Multiple Endpoints Implementation

 3.1 Search by Country Name Endpoint
Endpoint: `https://restcountries.com/v3.1/name/{name}`

Request Parameters:
- `name`: Country name (required, URL encoded)
- Query string: `?fullText` (optional, for exact match)

Example Request:

https://restcountries.com/v3.1/name/United%20Kingdom


Response Format:
json
[
  {
    "name": {
      "common": "United Kingdom",
      "official": "United Kingdom of Great Britain and Northern Ireland"
    },
    "capital": ["London"],
    "region": "Europe",
    "population": 67736802,
    "cca2": "GB",
    "cca3": "GBR",
    "languages": {
      "eng": "English"
    },
    "timezones": ["UTC+0", "UTC+1"]
  }
]


Implementation:
typescript
const nameUrl = `https://restcountries.com/v3.1/name/${encodeURIComponent(dto.name)}`;
const byName = await this.getWithRetry<RestCountry[]>(nameUrl, 'country by name');
const countryFromName = byName[0];


 3.2 Search by Country Code Endpoint
Endpoint: `https://restcountries.com/v3.1/alpha/{code}`

Request Parameters:
- `code`: ISO 3166-1 alpha-2 (GB) or alpha-3 (GBR) code

Example Request:

https://restcountries.com/v3.1/alpha/GB


Response Format:
json
[
  {
    "name": { "common": "United Kingdom" },
    "capital": ["London"],
    "region": "Europe",
    "population": 67736802,
    "cca2": "GB",
    "cca3": "GBR"
  }
]


Implementation:
typescript
const countryCode = countryFromName.cca2 ?? countryFromName.cca3;
const alphaUrl = countryCode
  ? `https://restcountries.com/v3.1/alpha/${countryCode}`
  : undefined;
const alphaResponse = alphaUrl
  ? await this.getWithRetry<RestCountry | RestCountry[]>(alphaUrl, 'country by alpha code')
  : countryFromName;


 3.3 Search by Region Endpoint
Endpoint: `https://restcountries.com/v3.1/region/{region}`

Request Parameters:
- `region`: Region name (Africa, Americas, Asia, Europe, Oceania)

Example Request:

https://restcountries.com/v3.1/region/Europe


Response Format:
json
[
  {
    "name": { "common": "France" },
    "region": "Europe",
    "population": 67750000,
    "cca2": "FR"
  },
  {
    "name": { "common": "Germany" },
    "region": "Europe",
    "population": 83470000,
    "cca2": "DE"
  }
  // ... more countries
]


Implementation:
typescript
const regionUrl = `https://restcountries.com/v3.1/region/${encodeURIComponent(region)}`;
const countries = await this.getWithRetry<RestCountry[]>(regionUrl, `countries in region ${region}`);




 4. Multi-Page Results Handling

 4.1 Region Data Pagination
The region endpoint returns all countries in that region (e.g., ~50 countries in Europe).

Implementation Strategy:
Instead of server-side pagination (API doesn't support), implement client-side pagination:

typescript
async listByRegion(region: string, page = 1, limit = 25) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 100) : 25;

  // Fetch all countries from region
  const regionUrl = `https://restcountries.com/v3.1/region/${encodeURIComponent(region)}`;
  const countries = await this.getWithRetry<RestCountry[]>(regionUrl, `countries in region ${region}`);

  // Apply client-side pagination
  const startIndex = (safePage - 1)  safeLimit;
  const endIndex = startIndex + safeLimit;
  const paginatedCountries = countries.slice(startIndex, endIndex);

  // Save paginated results
  const persisted = await this.countryRepo.save(
    paginatedCountries.map((country) => this.buildCountryEntity(country, 'region')),
  );

  return {
    data: persisted,
    meta: {
      page: safePage,
      limit: safeLimit,
      total: countries.length,
      totalPages: Math.ceil(countries.length / safeLimit),
    },
  };
}


 4.2 Database Pagination for Retrieval
When retrieving stored country data:

Endpoint Parameters:
- `page`: Current page number (default: 1)
- `limit`: Records per page (default: 10, max: 100)

Implementation:
typescript
async findAll(page = 1, limit = 10) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 100) : 10;

  const [data, total] = await this.countryRepo.findAndCount({
    skip: (safePage - 1)  safeLimit,
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


 4.3 Pagination Example
Request: Get European countries, page 2, 25 per page

GET /pipeline/run with region=Europe, regionPage=2, regionLimit=25


Processing:
- Fetch all 50 European countries from API
- Apply slice: `countries.slice(25, 50)` (second 25 countries)
- Save to database
- Return paginated results



 5. Robust Error Handling & Retries

 5.1 Retry Mechanism
Configuration:
- Max retries: 3 attempts
- Timeout: 7 seconds per request

Implementation:
typescript
private async getWithRetry<T>(url: string, context: string): Promise<T> {
  for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
    try {
      const response = await firstValueFrom(
        this.httpService.get<T>(url, { timeout: this.requestTimeoutMs }),
      );
      return response.data;
    } catch (error: unknown) {
      if (attempt === this.maxRetries) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 404) {
          throw new NotFoundException(`Country not found: ${context}`);
        }
        throw new BadGatewayException(`Failed to fetch ${context} after ${this.maxRetries} retries`);
      }
      console.warn(`Retry ${attempt}/${this.maxRetries} for ${context}...`);
    }
  }
}


 5.2 Error Handling
typescript
async fetchCountry(dto: CreateCountryDto) {
  try {
    const nameUrl = `https://restcountries.com/v3.1/name/${encodeURIComponent(dto.name)}`;
    const byName = await this.getWithRetry<RestCountry[]>(nameUrl, 'country by name');
    const countryFromName = byName[0];

    if (!countryFromName) {
      throw new NotFoundException(`No country found for name "${dto.name}"`);
    }
    // ... additional logic
  } catch (error: unknown) {
    if (error instanceof NotFoundException || error instanceof BadGatewayException) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new BadGatewayException(`Country API failed: ${message}`);
  }
}


Error Types Handled:
- ❌ Invalid country name (404)
- ❌ Invalid country code (404)
- ❌ Invalid region name (404)
- ❌ Network timeouts (7 seconds)
- ❌ Server errors (500, 503)
- ❌ Connection refused



 6. Data Persistence to Database

 6.1 Database Schema
sql
CREATE TABLE country (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  capital VARCHAR NOT NULL,
  region VARCHAR NOT NULL,
  population BIGINT NOT NULL,
  source VARCHAR DEFAULT 'name',
  country_code VARCHAR NULL,
  languages TEXT[] NULL,
  timezones TEXT[] NULL
);


 6.2 Entity Definition
typescript
@Entity()
export class Country {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  capital: string;

  @Column()
  region: string;

  @Column('bigint')
  population: number;

  @Column({ default: 'name' })
  source: string; // 'name', 'alpha', or 'region'

  @Column({ nullable: true })
  countryCode: string;

  @Column('simple-array', { nullable: true })
  languages: string[];

  @Column('simple-array', { nullable: true })
  timezones: string[];
}


 6.3 Entity Builder
typescript
private buildCountryEntity(country: RestCountry, source: 'name' | 'alpha' | 'region'): Country {
  return this.countryRepo.create({
    name: country.name.common,
    capital: (country.capital ?? ['Unknown'])[0],
    region: country.region,
    population: country.population,
    source,
    countryCode: country.cca2 ?? country.cca3,
    languages: Object.values(country.languages ?? {}),
    timezones: country.timezones,
  });
}


 6.4 Saving Data Pattern

For Country Search (by name):
typescript
const recordsToSave = [
  this.buildCountryEntity(countryFromName, 'name'),     // From name search
  this.buildCountryEntity(resolvedCountry, 'alpha'),    // From alpha code search
];
const savedCountries = await this.countryRepo.save(recordsToSave);


Records saved: 2 records per country search

For Region Search:
typescript
const persisted = await this.countryRepo.save(
  paginatedCountries.map((country) => this.buildCountryEntity(country, 'region')),
);


Records saved: 25 records per region page (or as per limit parameter)



 7. API Interaction Process Flow

 7.1 Complete Request Flow - Country Search

User Request (POST /pipeline/run with countryName="United Kingdom")
    ↓
CountryService.fetchCountry()
    ↓
[Step 1] Search by Name
nameUrl = https://restcountries.com/v3.1/name/United%20Kingdom
    ├─→ Retry Logic (max 3 attempts)
    ├─→ Parse Response (get cca2, cca3 codes)
    └─→ Extract: name, capital, region, population, languages, timezones
    
    ↓
[Step 2] Search by Country Code
alphaUrl = https://restcountries.com/v3.1/alpha/GB
    ├─→ Retry Logic (max 3 attempts)
    ├─→ Parse Response
    └─→ Extract complete country details
    
    ↓
[Step 3] Create Entities (2 records)
Entity 1 (source: 'name')  - from name search result
Entity 2 (source: 'alpha') - from country code search result
    
    ↓
[Step 4] Save to Database
countryRepo.save([entity1, entity2])
    
    ↓
Return Results
{
  savedCountries: Country[],
  details: {
    languages: string[],
    timezones: string[]
  }
}


 7.2 Complete Request Flow - Region Search

User Request (POST /pipeline/run with region="Europe")
    ↓
CountryService.listByRegion()
    ↓
[Step 1] Fetch All Countries in Region
regionUrl = https://restcountries.com/v3.1/region/Europe
    ├─→ Retry Logic (max 3 attempts)
    ├─→ Parse Response (get ~50 countries)
    └─→ Extract all European countries
    
    ↓
[Step 2] Client-Side Pagination
Apply slice operation: countries.slice(0, 25) // or based on page/limit
    
    ↓
[Step 3] Create Entities (25 records)
Map each country to Country entity with source: 'region'
    
    ↓
[Step 4] Save to Database
countryRepo.save([entity1, entity2, ..., entity25])
    
    ↓
Return Results with Pagination Metadata
{
  data: Country[],
  meta: {
    page: 1,
    limit: 25,
    total: 50,
    totalPages: 2
  }
}


 7.3 Step-by-Step Process for Country Search

 Step 1: Validate Input
- Check country name is provided
- URL encode the country name

 Step 2: Search by Name
- Call `/name/{name}` endpoint
- Implement retry logic (3 attempts, 7s timeout)
- Extract country code (cca2 or cca3)

 Step 3: Validate Name Search Result
- Ensure country was found
- If not found, throw NotFoundException

 Step 4: Search by Country Code
- Use cca2 code to get more comprehensive data
- Call `/alpha/{code}` endpoint
- Implement retry logic

 Step 5: Parse Responses
- Extract: name, capital, region, population
- Extract: country codes, languages, timezones

 Step 6: Create Entities
- First entity from name search result
- Second entity from alpha code search result
- Mark source ('name' vs 'alpha')

 Step 7: Save to Database
- Batch save both records in single transaction
- Return saved records with full details

 Step 8: Return Response
typescript
return {
  savedCountries,
  details: {
    languages: Object.values(resolvedCountry.languages ?? {}),
    timezones: resolvedCountry.timezones ?? [],
  },
};




 8. Usage Examples

 8.1 Fetch Country Data
bash
curl -X POST http://localhost:3000/pipeline/run \
  -H "Content-Type: application/json" \
  -d '{
    "city": "London",
    "countryName": "United Kingdom",
    "region": "Europe"
  }'


 8.2 Get Stored Countries (with pagination)
bash
 Get page 1
curl http://localhost:3000/country?page=1&limit=10

 Get page 2 with 25 per page
curl http://localhost:3000/country?page=2&limit=25


 8.3 Typical Response - Country Search
json
{
  "savedCountries": [
    {
      "id": 1,
      "name": "United Kingdom",
      "capital": "London",
      "region": "Europe",
      "population": 67736802,
      "source": "name",
      "countryCode": "GB",
      "languages": ["English"],
      "timezones": ["UTC+0", "UTC+1"]
    },
    {
      "id": 2,
      "name": "United Kingdom",
      "capital": "London",
      "region": "Europe",
      "population": 67736802,
      "source": "alpha",
      "countryCode": "GB",
      "languages": ["English"],
      "timezones": ["UTC+0", "UTC+1"]
    }
  ],
  "details": {
    "languages": ["English"],
    "timezones": ["UTC+0", "UTC+1"]
  }
}


 8.4 Typical Response - Region Search
json
{
  "data": [
    {
      "id": 3,
      "name": "France",
      "capital": "Paris",
      "region": "Europe",
      "population": 67750000,
      "source": "region"
    },
    {
      "id": 4,
      "name": "Germany",
      "capital": "Berlin",
      "region": "Europe",
      "population": 83470000,
      "source": "region"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 50,
    "totalPages": 2
  }
}




 9. Performance Metrics

| Metric | Value |
|--|-|
| API Response Time | ~500-800ms |
| Retry Timeout | 7 seconds |
| Max Retries | 3 |
| Records Saved (Country Search) | 2 |
| Records Saved (Region Search) | 25-100 (based on limit) |
| Total Execution Time | ~1-2 seconds |



 10. Data Fields Captured

| Field | Type | Source | Example |
|-||--||
| name | string | common | "United Kingdom" |
| capital | string | capital[0] | "London" |
| region | string | region | "Europe" |
| population | bigint | population | 67736802 |
| source | string | metadata | "name", "alpha", "region" |
| countryCode | string | cca2/cca3 | "GB" |
| languages | array | languages object | ["English"] |
| timezones | array | timezones array | ["UTC+0", "UTC+1"] |



 11. References

- Official Documentation: https://restcountries.com/
- API v3.1: https://restcountries.com/v3.1/
- Available Regions: Africa, Americas, Asia, Europe, Oceania
- Country Codes: ISO 3166-1 (alpha-2, alpha-3)
- Rate Limiting: No official limit, use reasonable defaults
