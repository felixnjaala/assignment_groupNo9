import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WeatherModule } from './weather/weather.module';
import { CountryModule } from './country/country.module';

@Module({
  imports: [WeatherModule, CountryModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
