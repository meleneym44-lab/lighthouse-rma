// lib/email.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendRMAEmail(to, subject, html) {
  await transporter.sendMail({
    from: '"Lighthouse France" <noreplyfrance@golighthouse.com>',
    to,
    subject,
    html,
  });
}
