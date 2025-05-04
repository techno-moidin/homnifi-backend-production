import { MailerService } from '@nestjs-modules/mailer';
import { HttpException, HttpStatus } from '@nestjs/common';

// Verification code
export async function sendVerificationCode(
  from: string,
  to: string,
  code: string,
  mailerService: MailerService,
  subject: string,
): Promise<any> {
  const mailOptions = {
    to: to,
    from: from,
    subject: subject,
    text: createVerificationCodePlainText(code), // Plain text body
    html: createVerificationCodeHtmlBody(code), // HTML body
  };
  try {
    const info = await mailerService.sendMail(mailOptions);
    return {
      message: 'Email sent successfully',
      data: info,
    };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new HttpException('Internal error', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

/**
 * Creats a plain text for email.
 * @param code - The first number.
 * @returns The full text with message.
 */
function createVerificationCodePlainText(code: string): string {
  return `Your verification code is: ${code}\n\nPlease enter this code to complete your registration process.`;
}

/**
 * Creates an html content for code body
 * @param code - The verification code.
 * @returns The full html content with code and message.
 */

function createVerificationCodeHtmlBody(code: string): string {
  return `
        <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
            <h2>Your Verification Code</h2>
            <p>Please use the following code to complete your registration process:</p>
            <p style="font-size: 24px; color: #445577;"><strong>${code}</strong></p>
            <p>If you did not request this code, please ignore this email or contact support if you have questions.</p>
            <p>Thank you!<br>Skillami</p>
        </div>
    `;
}

//Child invite
export async function sendChildInviteToParent(
  from: string,
  to: string,
  inviteCode: string,
  mailerService: MailerService,
  subject: string,
): Promise<any> {
  const mailOptions = {
    to: to,
    from: from,
    subject: subject,
    text: createInviteChildPlainText(inviteCode), // Plain text body
    html: createInviteChildHtmlBody(inviteCode), // HTML body
  };
  try {
    const info = await mailerService.sendMail(mailOptions);
    return {
      message: 'Email sent successfully',
      data: info,
    };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new HttpException('Internal error', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

/**
 * Creats a plain text for email.
 * @param code - The invite code.
 * @returns The full text with message.
 */
function createInviteChildPlainText(code: string): string {
  return `Invite Your Child to Join Skillami!

  Hello!
  
  Your child has expressed interest in joining Skillami, a platform dedicated to fostering creativity and learning through engaging educational content. Skillami offers a safe, fun, and interactive environment where children can explore and grow their skills in various subjects.
  
  By joining Skillami, your child will have access to:
  
  Interactive learning activities tailored to their age and interests.
  A safe community of peers and educators.
  Resources that make learning fun and exciting.
  We believe that with your support, your child can benefit greatly from what Skillami has to offer. Please click the link below or paste it into your browser to officially invite your child to the platform:
  Invite Your Child Now
  <a href="http://localhost:3000/invite/${code}" class="button">Invite Your Child Now</a>
  If you have any questions or need further information, feel free to contact our support team.
  
  Thank you for encouraging your child's love of learning!
  The Skillami Team`;
}

/**
 * Creates an html content for code body
 * @param code - The invite code.
 * @returns The full html content with code and message.
 */

function createInviteChildHtmlBody(code: string): string {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invite Your Child to Join Skillami!</title>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      background-color: #f4f9ff;
      color: #333;
      padding: 20px;
      margin: 0;
    }
    .container {
      background-color: #ffffff;
      padding: 20px;
      max-width: 600px;
      margin: 20px auto;
      border-radius: 10px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    .button {
      display: block;
      width: max-content;
      background-color: #4CAF50;
      color: white;
      padding: 10px 20px;
      text-decoration: none;
      border-radius: 5px;
      text-align: center;
      margin: 20px auto;
    }
    h1 {
      color: #0056b3;
      text-align: center;
    }
    p {
      font-size: 16px;
      line-height: 1.5;
    }
  </style>
  </head>
  <body>
  <div class="container">
    <h1>Join Your Child on an Adventure of Learning!</h1>
    <p>Hello!</p>
    <p>Your child has expressed interest in joining <strong>Skillami</strong>, a platform dedicated to fostering creativity and learning through engaging educational content. GSF offers a safe, fun, and interactive environment where children can explore and grow their skills in various subjects.</p>
    <p>By joining Skillami, your child will have access to:</p>
    <ul>
      <li>Interactive learning activities tailored to their age and interests.</li>
      <li>A safe community of peers and educators.</li>
      <li>Resources that make learning fun and exciting.</li>
    </ul>
    <p>We believe that with your support, your child can benefit greatly from what Skillami has to offer. Please click the button below to officially invite your child to the platform:</p>
    <a href="http://localhost:3000/invite/${code}" class="button">Invite Your Child Now</a>
    <p>If you have any questions or need further information, feel free to contact our support team.</p>
    <p>Thank you for encouraging your child's love of learning!<br>The Skillami Team</p>
  </div>
  </body>
  </html>
  
    `;
}

export async function sendInviteToParent(
  from: string,
  to: string,
  mailerService: MailerService,
  subject: string,
): Promise<any> {
  const mailOptions = {
    to: to,
    from: from,
    subject: subject,
    text: createParentInvitePlainText(), // Plain text body
    html: createParentInviteHtmlBody(), // HTML body
  };
  try {
    const info = await mailerService.sendMail(mailOptions);
    return {
      message: 'Email sent successfully',
      data: info,
    };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new HttpException('Internal error', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

/**
 * Creats a plain text for email.
 * @param code - The invite code.
 * @returns The full text with message.
 */
function createParentInvitePlainText(): string {
  return `
  Subject: Join Us at Skillami and Enhance Your Child's Learning Experience!

Dear Parent,

Welcome to Skillami! We're thrilled to invite you to join our innovative learning platform designed specifically for families like yours. At Skillami, we offer a wide range of educational tools and resources that are perfect for enhancing both personal growth and your child's development.

**Get Started with Your Parent Account**
To begin, please sign up to create your parent account:
https://www.skillami.com/signup

Once your account is set up, you can easily invite your child to join Skillami by following the instructions provided within your dashboard.

If you have any questions or require assistance, our support team is always here to help at support@skillami.com.

Thank you for choosing to embark on this educational journey with Skillami. We are excited to support and enhance your family's learning experience.

Best regards,
The Skillami Team

    `;
}

/**
 * Creates an html content for code body
 * @param code - The invite code.
 * @returns The full html content with code and message.
 */

function createParentInviteHtmlBody(): string {
  return `
  <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Welcome to Skillami</title>
<style>
  body { font-family: Arial, sans-serif; background-color: #f4f4f4; color: #333; padding: 20px; margin: 0; }
  .container { background-color: #fff; padding: 20px; border-radius: 8px; width: 100%; max-width: 600px; margin: auto; box-shadow: 0 4px 8px rgba(0,0,0,0.05); }
  .button { background-color: #4CAF50; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px; text-align: center; display: inline-block; }
  h1 { color: #0056b3; }
</style>
</head>
<body>
<div class="container">
    <h1>Welcome to Skillami!</h1>
    <p>Dear Parent,</p>
    <p>We're excited to invite you to join Skillami, an innovative platform designed to enhance learning and development for both you and your child. As a family-focused platform, we provide a variety of educational tools and resources tailored to foster growth and creativity.</p>
    <p><strong>To get started, please create your parent account:</strong></p>
    <a href="https://www.skillami.com/signup" class="button">Sign Up Now</a>
    <p>Once you have created your account, you can invite your child to join Skillami by following the simple steps provided in your dashboard.</p>
    <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
    <p>Thank you for choosing Skillami! We look forward to supporting your family's educational journey.</p>
    <p>Warm regards,<br>The Skillami Team</p>
</div>
</body>
</html>

    `;
}
