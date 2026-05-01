 Weather API Documentation

 1. API Choice & Selection
API Selected: OpenWeatherMap API
- Purpose: Fetch real-time weather data and forecasts for cities worldwide
- Type: RESTful API with free and premium tiers
- Authentication: API Key-based authentication
- Rate Limits: Free tier allows 60 requests/minute
- Data Format: JSON response



 2. API Registration & Configuration

 2.1 Getting API Key
1. Visit: https://openweathermap.org/api
2. Sign up for a free account
3. Navigate to API keys section
4. Copy your API key

 2.2 Environment Setup
Store API key in `.env` file:
env
OPENWEATHER_API_KEY=your_api_key_here


 2.3 API Configuration in Code
typescript
// weather.service.ts
private readonly apiKey = process.env.OPENWEATHER_API_KEY ?? '';
private readonly requestTimeoutMs = 7000;




 3. Multiple Endpoints Implementation

 3.1 Current Weather Endpoint
Endpoint: `https://api.openweathermap.org/data/2.5/weather`

Request Parameters:
- `q`: City name (required)
- `appid`: API key (required)
- `units`: Temperature units (metric = Celsius)

Response Format:
json
{
  "main": {
    "temp": 15.5
  },
  "weather": [
    {
      "description": "Partly cloudy"
    }
  ],
  "dt": 1693478400
}


Implementation:
typescript
const currentWeatherUrl = 
  `https://api.openweathermap.org/data/2.5/weather?q=${dto.city}&appid=${this.apiKey}&units=metric`;
const currentData = await this.getWithRetry<OpenWeatherCurrent>(currentWeatherUrl, 'current weather');


 3.2 Forecast Endpoint
Endpoint: `https://api.openweathermap.org/data/2.5/forecast`

Request Parameters:
- `q`: City name (required)
- `appid`: API key (required)
- `units`: Temperature units (metric)

Response Format:
json
{
  "list": [
    {
      "dt_txt": "2023-08-30 12:00:00",
      "main": {
        "temp": 18.2
      },
      "weather": [
        {
          "description": "Clear sky"
        }
      ]
    }
  ]
}


Implementation:
typescript
const forecastUrl = 
  `https://api.openweathermap.org/data/2.5/forecast?q=${dto.city}&appid=${this.apiKey}&units=metric`;
const forecastData = await this.getWithRetry<OpenWeatherForecast>(forecastUrl, 'weather forecast');


 3.3 Parallel Requests
Both endpoints are called simultaneously using `Promise.all()`:
typescript
const [currentData, forecastData] = await Promise.all([
  this.getWithRetry<OpenWeatherCurrent>(currentWeatherUrl, 'current weather'),
  this.getWithRetry<OpenWeatherForecast>(forecastUrl, 'weather forecast'),
]);




 4. Multi-Page Results Handling

 4.1 Forecast Data Pagination
The forecast API returns 40 items per call (5-day forecast at 3-hour intervals).

Implementation:
typescript
const forecastRecords = forecastData.list.map((item) =>
  this.weatherRepo.create({
    city: dto.city,
    temperature: item.main.temp,
    description: item.weather[0]?.description ?? 'No description',
    source: 'forecast',
    observedAt: new Date(item.dt_txt),
  }),
);


 4.2 Database Pagination for Retrieval
Pagination is implemented when retrieving stored weather data:

Endpoint Parameters:
- `page`: Current page number (default: 1)
- `limit`: Records per page (default: 10, max: 100)

Implementation:
typescript
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




 5. Robust Error Handling & Retries

 5.1 Retry Mechanism
Configuration:
- Max retries: 3 attempts
- Timeout: 7 seconds per request

Implementation:
typescript
private readonly maxRetries = 3;
private readonly requestTimeoutMs = 7000;

private async getWithRetry<T>(url: string, context: string): Promise<T> {
  for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
    try {
      const response = await firstValueFrom(
        this.httpService.get<T>(url, { timeout: this.requestTimeoutMs }),
      );
      return response.data;
    } catch (error) {
      if (attempt === this.maxRetries) throw error;
      console.warn(`Retry ${attempt}/${this.maxRetries} for ${context}...`);
    }
  }
}


 5.2 Error Handling
typescript
async fetchWeather(dto: CreateWeatherDto) {
  if (!this.apiKey) {
    throw new InternalServerErrorException('OPENWEATHER_API_KEY is missing in .env');
  }

  try {
    // API calls here
  } catch (error: unknown) {
    if (error instanceof NotFoundException || error instanceof BadGatewayException) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new BadGatewayException(`Weather API failed: ${message}`);
  }
}


Error Types Handled:
- ❌ Missing API key
- ❌ Network timeouts (7 seconds)
- ❌ Invalid city names
- ❌ API rate limits
- ❌ Server errors (500, 503)



 6. Data Persistence to Database

 6.1 Database Schema
sql
CREATE TABLE weather (
  id SERIAL PRIMARY KEY,
  city VARCHAR NOT NULL,
  temperature FLOAT NOT NULL,
  description VARCHAR NOT NULL,
  source VARCHAR DEFAULT 'current',
  observedAt TIMESTAMP NULL
);


 6.2 Entity Definition
typescript
@Entity()
export class Weather {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  city: string;

  @Column('float')
  temperature: number;

  @Column()
  description: string;

  @Column({ default: 'current' })
  source: string;

  @Column({ type: 'timestamp', nullable: true })
  observedAt: Date | null;
}


 6.3 Saving Data
Data is saved in two records:
1. Current Weather Record (1 record per city)
2. Forecast Records (5+ records per forecast)

typescript
const currentWeather = this.weatherRepo.create({
  city: dto.city,
  temperature: currentData.main.temp,
  description: currentData.weather[0]?.description ?? 'No description',
  source: 'current',
  observedAt: currentData.dt ? new Date(currentData.dt * 1000) : null,
});

const savedWeather = await this.weatherRepo.save([currentWeather, ...forecastRecords]);


 6.4 Total Records Saved
- Current Weather: 1 record
- Forecast: ~40 records (5 days × 8 intervals)
- Total per city: ~41 records



 7. API Interaction Process Flow

 7.1 Complete Request Flow

User Request (POST /pipeline/run)
    ↓
WeatherService.fetchWeather()
    ↓
[Parallel Requests]
├─→ getCurrentWeather() → openweathermap.org/data/2.5/weather
│   └─→ Retry Logic (max 3 attempts)
│       └─→ Parse Response
│           └─→ Create Entity
│
└─→ getForecast() → openweathermap.org/data/2.5/forecast
    └─→ Retry Logic (max 3 attempts)
        └─→ Parse Response (40 items)
            └─→ Create Multiple Entities
    
    ↓
[Save to Database]
weatherRepo.save([currentWeather, ...forecastRecords])
    ↓
Return Results
{
  savedCurrent: Weather,
  savedForecastCount: number,
  forecastPreview: Array
}


 7.2 Step-by-Step Process

 Step 1: Initialize Request
- Validate API key exists
- Build API URLs with city parameter
- Set timeout to 7 seconds

 Step 2: Make Parallel Requests
- Call current weather endpoint
- Call forecast endpoint
- Both requests run simultaneously

 Step 3: Implement Retry Logic
- First attempt fails → Wait and retry (attempt 2)
- Second attempt fails → Wait and retry (attempt 3)
- Third attempt fails → Throw error

 Step 4: Parse Responses
- Extract temperature from `main.temp`
- Extract description from `weather[0].description`
- Convert timestamp to Date object

 Step 5: Create Entities
- Map current data to Weather entity
- Map each forecast item to separate Weather entity
- Set source field ('current' or 'forecast')

 Step 6: Save to Database
- Batch save all records in single transaction
- Return saved records with metadata

 Step 7: Return Response
typescript
return {
  savedCurrent: savedWeather[0],
  savedForecastCount: savedWeather.length - 1,
  forecastPreview: forecastData.list.slice(0, 5).map((item) => ({
    datetime: item.dt_txt,
    temperature: item.main.temp,
    description: item.weather[0]?.description ?? 'No description',
  })),
};




 8. Usage Examples

 8.1 Fetch Weather Data
bash
curl -X POST http://localhost:3000/pipeline/run \
  -H "Content-Type: application/json" \
  -d '{
    "city": "London",
    "countryName": "United Kingdom",
    "region": "Europe"
  }'


 8.2 Get Stored Weather (with pagination)
bash
curl http://localhost:3000/weather?page=1&limit=10


 8.3 Typical Response
json
{
  "message": "Pipeline completed",
  "weatherApi": {
    "savedCurrent": {
      "id": 1,
      "city": "London",
      "temperature": 15.5,
      "description": "Partly cloudy",
      "source": "current"
    },
    "savedForecastCount": 40,
    "forecastPreview": [
      {
        "datetime": "2023-08-30 12:00:00",
        "temperature": 18.2,
        "description": "Clear sky"
      }
    ]
  }
}




 9. Performance Metrics

| Metric | Value |
|--|-|
| API Response Time | ~1-2 seconds |
| Retry Timeout | 7 seconds |
| Max Retries | 3 |
| Records Saved per Call | ~41 |
| Total Execution Time | ~2-3 seconds |



 10. References

- Official Documentation: https://openweathermap.org/api
- API Endpoints: https://openweathermap.org/find
- Free Tier Limits: 60 calls/minute
- Data Units: Metric (Celsius, km/h)
