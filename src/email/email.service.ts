import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { User } from 'src/users/schemas/user.schema';
import { create } from 'express-handlebars';
import { Admin } from '../admin/schemas/admin.schema';
import path from 'path';
import fs from 'fs';
@Injectable()
export class EmailService {
  constructor(private mailerService: MailerService) {
    this.hbs = create({
      layoutsDir: join(__dirname, '..', '..', 'templates'),
      partialsDir: join(__dirname, '..', '..', 'templates', 'partials'),
      defaultLayout: false,
      extname: '.hbs',
    });
  }
  private hbs;
  async sendUserWelcome(user: User, otp: string) {
    await this.mailerService.sendMail({
      to: user.email,
      from: `${process.env.MAIL_USER}`, // override default from
      subject: 'Welcome to Softbuilders Properties! Confirm your Email',
      template: './welcome',
      context: {
        name: user.email,
        otp,
      },
    });
  }

  async withdrawl(
    to: string,
    amountWithdrawn: string,
    dateTime: string,
    destination: string,
    transactionId: string,
    customerName: string,
  ) {
    await this.mailerService.sendMail({
      to: to,
      from: `${process.env.MAIL_USER}`, // override default from
      subject: 'Withdrawal Processed',
      template: './withdrawal',
      context: {
        amountWithdrawn,
        dateTime,
        destination,
        transactionId,
        customerName,
      },
    });
  }
  async send(
    to: string,
    subject: string,
    headerTitle: string,
    headerMessage: string,
    message: string,
    tokenName: string,
    amount: string,
    dateTime: string,
    transactionId: string,
    customerName: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: to,
        from: `${process.env.MAIL_USER}`, // override default from
        subject: subject ?? headerTitle,
        template: './deposit',
        context: {
          tokenName,
          amount,
          dateTime,
          transactionId,
          customerName,
          message,
          headerTitle,
          headerMessage,
        },
      });
    } catch (err) {}
  }
  async resetPasswordEmail(user: User, link: string) {
    await this.mailerService.sendMail({
      to: user.email,
      // from: `${process.env.MAIL_USER}`, // override default from
      subject: 'Password Reset Request',
      template: './reset-password',
      context: {
        // name: user.firstName,
        link,
      },
    });
  }

  async forgotPasswordEmail(firstName, email: string, link: string) {
    await this.mailerService.sendMail({
      to: email,

      // from: `${process.env.MAIL_USER}`, // override default from
      subject: 'Password Forgot Request',
      template: './reset-password',
      context: {
        name: firstName,
        headerTitle: 'Forgot Your Password',
        headerMessage:
          'Click on the given link to reset your password and regain access to your account. The link will expire in 5 minutes. ',
        link,
      },
    });
  }

  async renderTemplate(templateName: string, context: any): Promise<string> {
    return new Promise((resolve, reject) => {
      this.hbs.renderView(
        join(__dirname, 'templates', `${templateName}.hbs`),
        context,
        (err, html) => {
          if (err) {
            return reject(err);
          }
          resolve(html);
        },
      );
    });
  }

  async signup(
    to: string,
    userName: string,
    dateTime: string,
    headerTitle: string,
    headerMessage: string,
  ) {
    await this.mailerService.sendMail({
      to: to,
      from: `${process.env.MAIL_USER}`, // override default from
      subject: 'Welcome to Homnifi',
      template: './signup',
      context: {
        userName,
        dateTime,
        headerTitle,
        headerMessage,
      },
    });
  }

  async adminLoginEmail(admin: Admin, otp: string) {
    await this.mailerService.sendMail({
      to: admin.email,
      from: `${process.env.MAIL_USER}`, // override default from
      subject: 'Admin Verification',
      template: './admin-login',
      context: {
        name: admin.firstName,
        headerTitle: 'Verify Your Password',
        headerMessage:
          'Click put  your  verification  password and  access to your account.',
        otp,
      },
    });
  }

  async superAdminEmail(admin: Admin, passwordUrl: string) {
    await this.mailerService.sendMail({
      to: admin.email,
      from: `${process.env.MAIL_USER}`, // override default from
      subject: 'The Super Admin Account | Hominifi',
      template: './new-admin',
      context: {
        name: admin.firstName,
        headerTitle: 'New Account Created',
        headerMessage: 'Account Created',
        passwordUrl,
      },
    });
  }

  async sendMailToMachinesUser(
    to: string,
    customerName: string,
    message: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: to,
        from: `${process.env.MAIL_USER}`,
        subject: 'Important Update About Your Machine',
        template: './send-email-to-machines-user.hbs',
        context: {
          customerName,
          message,
          dateTime: new Date().toLocaleString(),
          headerTitle: 'Machine Update',
          headerMessage: 'Important Information About Your Machine',
        },
      });
      console.log('message sent ');
    } catch (error) {
      console.log(error);

      throw error;
    }
  }
  async sendEmailWithAttachment({
    toEmail,
    subject,
    text,
    filePath,
  }: {
    toEmail: string;
    subject: string;
    text: string;
    filePath?: string;
  }) {
    const mailOptions = {
      from: `${process.env.MAIL_USER}`,
      to: toEmail,
      subject: subject,
      text: text,
      template: './file-share.hbs',
      context: {
        headerTitle: subject,
        headerMessage: text,
        content: text,
      },
    };
    if (filePath) {
      mailOptions['attachments'] = [
        {
          filename: path.basename(filePath),
          path: filePath,
        },
      ];
    }

    return await this.mailerService.sendMail(mailOptions);
  }
}
