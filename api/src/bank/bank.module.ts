import { Module } from '@nestjs/common';
import { TestsModule } from '../tests/tests.module';
import { BankController } from './bank.controller';
import { BankService } from './bank.service';

@Module({
  imports: [TestsModule],
  controllers: [BankController],
  providers: [BankService],
})
export class BankModule {}
