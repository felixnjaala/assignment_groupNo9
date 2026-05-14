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

  @Column({ default: 'current' })
  source: string;

  @Column({ type: 'timestamp', nullable: true })
  observedAt: Date | null;
}
