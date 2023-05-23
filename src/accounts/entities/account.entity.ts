import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  validate,
} from 'class-validator';
import { AccountStatus, AccountTypes } from '@accounts/models';

@Entity()
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty()
  @MaxLength(50)
  firstName: string;

  @Column()
  @IsNotEmpty()
  @MaxLength(50)
  lastName: string;

  @Column({ unique: true })
  @IsEmail()
  emailAddress: string;

  @Column({ type: 'enum', enum: AccountTypes })
  userType: AccountTypes;

  @Column({
    type: 'enum',
    enum: AccountStatus,
    default: AccountStatus.INACTIVE,
  })
  status: AccountStatus;

  @Column({ default: false })
  verified: boolean;

  @Column()
  @IsDate()
  createdDate: Date;

  @Column({ nullable: true })
  @IsOptional()
  @IsDate()
  updatedDate: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async validate(): Promise<void> {
    const errors = await validate(this);

    if (errors.length > 0) {
      console.log(`${Account.name} validation failed with errors : ${errors}`);
      throw new Error(`${Account.name} Entity Validation failed!`);
    }
  }
}
