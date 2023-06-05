import { IsDate, IsNotEmpty, validate } from 'class-validator';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Account } from './account.entity';
import { IsNumberLength } from '@lib/validators';

@Entity()
export class OTP {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty()
  @IsNumberLength(6)
  otp: number;

  @Column()
  @IsDate()
  expiry: Date;

  @Column({ default: true })
  isValid: boolean;

  @OneToOne(() => Account)
  @JoinColumn()
  account: Account;

  @BeforeInsert()
  @BeforeUpdate()
  async validate(): Promise<void> {
    const errors = await validate(this);

    if (errors.length > 0) {
      console.log(`${OTP.name} validation failed with errors : ${errors}`);
      throw new Error(`${OTP.name} Entity Validation failed!`);
    }
  }
}
