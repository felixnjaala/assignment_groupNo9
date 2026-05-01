import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

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
}
