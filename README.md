# Assignment API Integration Project

This project integrates two APIs from the assignment list:

- Weather data API (OpenWeather)
- Country information API (REST Countries)

It demonstrates:

- API key configuration through `.env`
- Requests to multiple endpoints per API
- Multi-page result handling
- Retry and robust error handling for external API calls
- Saving retrieved data into PostgreSQL (via TypeORM)

## APIs and Endpoint Strategy

### 1) Weather API (OpenWeather)

Documentation:

- [Current weather endpoint](https://openweathermap.org/current)
- [5 day / 3 hour forecast endpoint](https://openweathermap.org/forecast5)

Implemented behavior:

- `POST /weather`
  - Calls **two endpoints**:
    - `/data/2.5/weather` (current weather)
    - `/data/2.5/forecast` (forecast preview)
  - Saves current weather to the database.
  - Returns saved row + first five forecast entries.
- `GET /weather?page=1&limit=10`
  - Returns paginated saved weather rows from DB.

### 2) Country API (REST Countries)

Documentation:

- [Name endpoint](https://restcountries.com/#api-endpoints-v3-name)
- [Alpha code endpoint](https://restcountries.com/#api-endpoints-v3-alpha)
- [Region endpoint](https://restcountries.com/#api-endpoints-v3-region)

Implemented behavior:

- `POST /country`
  - Calls **two endpoints**:
    - `/v3.1/name/{name}`
    - `/v3.1/alpha/{code}`
  - Saves resolved country data to DB.
  - Returns saved row + language/timezone details.
- `GET /country?page=1&limit=10`
  - Returns paginated saved country rows from DB.
- `GET /country/region/{region}?page=1&limit=25`
  - Fetches region countries then returns **paged results** (multi-page handling).

## Environment Configuration

Create/update `.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=assignment
OPENWEATHER_API_KEY=YOUR_API_KEY
PORT=3000
```

## How Requirements 2-7 Are Covered

2) Register API keys / OAuth:

- OpenWeather API key is configured in `.env` (`OPENWEATHER_API_KEY`).
- REST Countries does not require authentication.

3) Requests to multiple endpoints:

- Weather service requests current + forecast endpoints.
- Country service requests name + alpha endpoints.

4) Handle multi-page results:

- DB list endpoints support `page` and `limit`.
- Region countries endpoint supports external list pagination via slicing and metadata.

5) Robust error handling and retries:

- External API requests use retry loops with backoff and timeout.
- 404 maps to `NotFoundException`.
- Repeated failures map to `BadGatewayException` with attempt count.

6) Save retrieved data:

- Weather and country records are persisted to PostgreSQL through TypeORM repositories.

7) Document API interaction process:

- This README explains API choices, endpoint flow, env setup, paging, retries, and run instructions.

## Run the Project

```bash
pnpm install
pnpm run start:dev
```

## Quick Test Calls

```bash
curl -X POST http://localhost:3000/weather -H "Content-Type: application/json" -d '{"city":"London"}'
curl "http://localhost:3000/weather?page=1&limit=5"

curl -X POST http://localhost:3000/country -H "Content-Type: application/json" -d '{"name":"Jordan"}'
curl "http://localhost:3000/country?page=1&limit=5"
curl "http://localhost:3000/country/region/asia?page=1&limit=10"
```
