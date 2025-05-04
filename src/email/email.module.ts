import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { join } from 'path';
import * as fs from 'fs';
import * as Handlebars from 'handlebars';
import { ConfigService } from '@nestjs/config';
import { EmailController } from './email.controller';

@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Registering partials
        const partialsDir = join(__dirname, 'templates', 'shared');
        fs.readdirSync(partialsDir).forEach((file) => {
          const partialName = file.split('.')[0];
          const partialTemplate = fs.readFileSync(
            join(partialsDir, file),
            'utf8',
          );
          Handlebars.registerPartial(partialName, partialTemplate);
        });

        return {
          transport: {
            host: configService.get('MAIL_HOST'),
            secure: true,
            auth: {
              user: configService.get('MAIL_USER'),
              pass: configService.get('MAIL_PASS'),
            },
          },
          defaults: {
            from: `${configService.get('MAIL_USER')}`,
          },
          template: {
            dir: join(__dirname, 'templates'),
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
        };
      },
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
  controllers: [EmailController],
})
export class EmailModule {}
