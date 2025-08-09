import nodemailer from "nodemailer";

type WinnerMail = { to: string; auctionTitle: string; amountGrosze: number };

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return transporter;
}

export async function sendWinnerEmail({ to, auctionTitle, amountGrosze }: WinnerMail) {
  const t = getTransporter();
  const subject = `Wygrałeś aukcję: ${auctionTitle}`;
  const text = `Gratulacje! Wygrałeś aukcję "${auctionTitle}" z kwotą ${(amountGrosze/100).toFixed(2)} PLN.`;

  if (!t) {
    // dev fallback – log zamiast wysyłki
    console.log(`[MAIL:SIM] To: ${to} | ${subject} | ${text}`);
    return;
  }

  await t.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to,
    subject,
    text,
  });
}