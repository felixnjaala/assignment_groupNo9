import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

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
  source: string;

  @Column({ nullable: true })
  countryCode: string;

  @Column('simple-array', { nullable: true })
  languages: string[];

  @Column('simple-array', { nullable: true })
  timezones: string[];
}
