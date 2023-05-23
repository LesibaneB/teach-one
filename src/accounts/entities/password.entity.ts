import { IsDate, IsOptional, validate } from 'class-validator';
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

@Entity()
export class Password {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  passwordHash: string;

  @Column()
  @IsDate()
  createdDate: Date;

  @Column({ nullable: true })
  @IsOptional()
  @IsDate()
  updatedDate: Date;

  @OneToOne(() => Account)
  @JoinColumn()
  account: Account;

  @BeforeInsert()
  @BeforeUpdate()
  async validate(): Promise<void> {
    const errors = await validate(this);

    if (errors.length > 0) {
      console.log(`${Password.name} validation failed with errors : ${errors}`);
      throw new Error(`${Password.name} Entity Validation failed!`);
    }
  }
}
