import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./core/prisma/prisma.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { LessonsModule } from "./modules/lessons/lessons.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),
    PrismaModule,
    PaymentsModule,
    LessonsModule,
  ],
})
export class AppModule {}
