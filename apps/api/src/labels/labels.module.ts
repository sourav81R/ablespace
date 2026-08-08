import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Label, LabelSchema } from './schemas/label.schema';
import { LabelsService } from './labels.service';
import { LabelsController } from './labels.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Label.name, schema: LabelSchema }])],
  controllers: [LabelsController],
  providers: [LabelsService],
  // AuthModule seeds default labels; TasksModule validates label ids.
  exports: [LabelsService],
})
export class LabelsModule {}
