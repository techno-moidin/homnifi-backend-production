import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { EmailService } from './email.service';
import ApiResponse from '../utils/api-response.util';
import { Token } from '../token/schemas/token.schema';

@Controller('email')
export class EmailController {
  constructor(private readonly templateService: EmailService) {}

  @Get()
  async getTemplate(@Query('name') name: string, @Res() res: any) {
    try {
      const html = await this.templateService.renderTemplate(name, {
        customerName: 'John Doe',
        accountSetupLink: 'http://example.com/setup',
        supportEmail: 'support@example.com',
        message:
          'We are please to announce that you have successfully registered',
        tokenName: 'This is my token man',
        amount: '100256515',
        headerMessage: 'Your deposit has been successfully processed!',
        headerTitle: 'Deposit confirmation',
      });
      res.send(html);
    } catch (err) {
      res.status(500).send('Error rendering template');
    }
  }

  @Get('deposit')
  async deposit(@Res() res: any) {
    try {
      // await this.templateService.deposit(
      //   'khalid.alsaleh.dev@gmail.com',
      //   'Message',
      //   'Token name',
      //   '100',
      //   '2022-01-01',
      //   'Transaction id',
      //   'James Doe',
      // );
      return new ApiResponse({}, 'Email sent successfully');
    } catch (err) {
      res.status(500).send('Error rendering template');
    }
  }
  @Get('withdrawl')
  async withdrawl(@Res() res: any) {
    try {
      await this.templateService.withdrawl(
        'khalid.alsaleh.dev@gmail.com',
        '100',
        '2022-01-01',
        'destination',
        'Transaction id',
        'James Doe',
      );
      return new ApiResponse({}, 'Email sent successfully');
    } catch (err) {
      res.status(500).send('Error rendering template');
    }
  }

  // @Post('send-withdrawal-processed')
  // async sendWithdrawalProcessed(
  //   @Body()
  //   body: {
  //     email: string;
  //     name: string;
  //     amount: string;
  //     dateTime: string;
  //     destination: string;
  //     transactionId: string;
  //   },
  // ) {
  //   const user = { email: body.email, name: body.name };
  //   const transactionDetails = {
  //     amount: body.amount,
  //     dateTime: body.dateTime,
  //     destination: body.destination,
  //     transactionId: body.transactionId,
  //   };
  //   await this.templateService.sendWithdrawalProcessedEmail(
  //     user,
  //     transactionDetails,
  //   );
  //   return { message: 'Withdrawal processed email sent' };
  // }
}
