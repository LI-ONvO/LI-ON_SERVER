import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    this.from = this.configService.get<string>(
      'SMTP_FROM',
      'LI-ON <no-reply@li-on.app>',
    );

    this.transporter = createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: Number(this.configService.get<string>('SMTP_PORT')),
      secure: this.configService.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
    });
  }

  async sendVerificationCode(
    email: string,
    code: string,
    ttlSeconds: number,
  ): Promise<void> {
    const minutes = Math.floor(ttlSeconds / 60);

    await this.transporter.sendMail({
      from: this.from,
      to: email,
      subject: '[LI-ON] 이메일 인증코드',
      html: `
        <div style="font-family: sans-serif">
          <p>아래 인증코드를 입력해 주세요.</p>
          <h2 style="letter-spacing: 4px">${code}</h2>
          <p>유효 시간: ${minutes}분</p>
        </div>
      `,
    });
  }
}
