import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WeatherModule } from './weather/weather.module';
import { CountryModule } from './country/country.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      ignoreEnvVars: false,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbUser = config.get<string>('DB_USERNAME', 'fahm');
        const dbPassword = config.get<string>('DB_PASSWORD', '');
        const dbName = config.get<string>('DB_NAME', 'assignment');
        const dbHost = config.get<string>('DB_HOST', 'localhost');
        const dbPort = config.get<number>('DB_PORT', 5432);
        console.log('[DB CONFIG]', { dbUser, dbHost, dbPort, dbName, passwordSet: !!dbPassword });

        return {
          type: 'postgres',
          host: dbHost,
          port: dbPort,
          username: dbUser,
          password: dbPassword,
          database: dbName,
          autoLoadEntities: true,
          synchronize: true,
        };
      },
    }),
    WeatherModule,
    CountryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
