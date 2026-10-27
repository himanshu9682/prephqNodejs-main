require("dotenv").config();
const nodemailer = require('nodemailer');

const mailPort = Number(process.env.MAIL_PORT || 587);
const mailEncryption = String(process.env.MAIL_ENCRYPTION || '').toLowerCase();
const mailSecure = mailEncryption === 'ssl' || mailPort === 465;

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: mailPort,
    secure: mailSecure,
    requireTLS: mailEncryption === 'tls' || mailPort === 587,
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: false 
    }
});

function getFromAddress() {
  return process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USERNAME;
}

function getFromName() {
  return process.env.MAIL_FROM_NAME || 'PrepHQ';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildContactEmailHtml(data) {
  const name = escapeHtml(data.name || '');
  const lastname = escapeHtml(data.lastname || '');
  const countryCode = escapeHtml(data.countryCode || '');
  const phone = escapeHtml(data.phone || '');
  const email = escapeHtml(data.email || '');
  const message = escapeHtml(data.message || '').replace(/\n/g, '<br>');

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>prepHQ Contact Confirmation</title>
  </head>
  <body style="background:#f3f9f8;margin:0;padding:0;">
    <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;border-radius:8px;overflow:hidden;font-family:sans-serif;background-color:#f3f9f8;">
      <tr>
        <td style="background:#074568;padding:28px 0;text-align:center;">
          <img src="https://prephq.theiotacademy.co/email-template/img/logo.png" alt="prepHQ logo" style="max-height:46px;">
        </td>
      </tr>
      <tr>
        <td style="background:#E6FFF4;padding:0 24px;">
          <div style="width:100%;text-align:center;padding:27px 0 16px;">
            <img src="https://prephq.theiotacademy.co/email-template/img/envelope.png" alt="envlope email"/>
          </div>
          <h2 style="color:#074568;text-align:center;font-size:16px;margin:30px 0;">Hi ${name || 'there'},</h2>
          <p style="font-size:1rem;text-align:center;color:#000;">
            Thanks for contacting <b>PrepHQ</b>. We have received your message.
          </p>
          <p style="text-align:center;color:#000;padding:10px 0;">
            Our team will reach out to you soon.
          </p>
          <div style="background:#fff;border-radius:8px;padding:12px 16px;margin:18px 0;">
            <p style="margin:6px 0;color:#074568;"><strong>First Name:</strong> ${name}</p>
            <p style="margin:6px 0;color:#074568;"><strong>Last Name:</strong> ${lastname}</p>
            <p style="margin:6px 0;color:#074568;"><strong>Phone No:</strong> ${countryCode} ${phone}</p>
            <p style="margin:6px 0;color:#074568;"><strong>Email:</strong> ${email}</p>
            <p style="margin:6px 0;color:#074568;"><strong>Message:</strong><br>${message}</p>
          </div>
          <p style="text-align:center;color:#000;font-weight:bold;margin:10px 0;padding-bottom:10px;">
            Thanks,<br>
            The prepHQ Team
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;text-align:center;background:#57CC99;">
          <span style="display:block;font-size:12px;color:#fff;font-weight:bold;font-style:italic;padding-bottom:10px;">Follow On</span>
          <a href="https://www.instagram.com/prephq.tia/" style="margin:0 5px;"><img src="https://prephq.theiotacademy.co/email-template/img/instagram.png" width="21" alt="Instagram"></a>
          <a href="https://www.youtube.com/@prepHQ-b2k1r" style="margin:0 5px;"><img src="https://prephq.theiotacademy.co/email-template/img/youtube.png" width="21" alt="YouTube"></a>
          <a href="https://www.linkedin.com/company/prephqbytia" style="margin:0 5px;"><img src="https://prephq.theiotacademy.co/email-template/img/linkdin.png" width="21" alt="LinkedIn"></a>
          <a href="https://www.facebook.com/profile.php?id=61579814723823" style="margin:0 5px;"><img src="https://prephq.theiotacademy.co/email-template/img/facebook.png" width="21" alt="Facebook"></a>
          <a href="https://x.com/Prephq_tia" style="margin:0 5px;"><img src="https://prephq.theiotacademy.co/email-template/img/twiter.png" width="21" alt="Twitter"></a>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}

/* ================= VERIFY EMAIL ================= */
async function sendVerificationEmail(email, name, code) {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>prepHQ Verification Code</title>
    </head>
    <body style="background:#f3f9f8;margin:0;padding:0;">
      <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;border-radius:8px;overflow:hidden;font-family:sans-serif;background-color:#f3f9f8;">
        <tr>
          <td style="background:#074568;padding:28px 0;text-align:center;">
            <img src="https://prephq.theiotacademy.co/email-template/img/logo.png" alt="prepHQ logo" style="max-height:46px;">
          </td>
        </tr>
        <tr>
          <td style="background:#E6FFF4;padding:0 24px;">
            <div style="width:100%;text-align:center;padding:27px 0 16px;">
              <img src="https://prephq.theiotacademy.co/email-template/img/envelope.png" alt="envlope email"/>
            </div>
            <h2 style="color:#074568;text-align:center;font-size: 16px;margin: 30px 0;">
              Hello ${name},
            </h2>
            <p style="font-size:1rem;text-align:center;color:#000;">
              Use the code below to verify your sign-in to prepHQ.<br>
              <b>Verification code:</b>
            </p>
            <div style="width:100%;text-align:center;padding:10px 0;">
              <span style="display:inline-block;background: #57CC99;color:#074568;font-size:1rem;font-weight:bold;padding:5px 30px;border-radius:35px;letter-spacing:2px;">
                ${code}
              </span>
            </div>
            <p style="text-align:center;color:#000;padding:10px 0;">
              This code expires in 5 minutes. If this wasn't requested, please ignore this email and your account will remain secure.
            </p>
            <p style="text-align:center;color:#000;font-weight:bold; margin: 10px 0;padding-bottom: 10px;">
              Thanks,<br>
              The prepHQ Team
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;text-align:center;background: #57CC99;">
            <span style="display: block;font-size:12px;color:#fff;font-weight: bold;font-style: italic;padding-bottom: 10px;">Follow On</span>
            <a href="https://www.instagram.com/prephq.tia/"><img src="https://prephq.theiotacademy.co/email-template/img/instagram.png" width="21"></a>
            <a href="https://www.youtube.com/@prepHQ-b2k1r"><img src="https://prephq.theiotacademy.co/email-template/img/youtube.png" width="21"></a>
            <a href="https://www.linkedin.com/company/prephqbytia"><img src="https://prephq.theiotacademy.co/email-template/img/linkdin.png" width="21"></a>
            <a href="https://www.facebook.com/profile.php?id=61579814723823"><img src="https://prephq.theiotacademy.co/email-template/img/facebook.png" width="21"></a>
            <a href="https://x.com/Prephq_tia"><img src="https://prephq.theiotacademy.co/email-template/img/twiter.png" width="21"></a>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    try {
        await transporter.sendMail({
          from: `${getFromName()} <${getFromAddress()}>`,
            to: email,
            subject: 'Your Confirmation Code',
            html
        });
        return true;
    } catch (err) {
        console.error('Verification email failed:', err.message);
        return false;
    }
}

/* ================= RESET EMAIL ================= */
async function sendResetEmail(email, name, code) {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>prepHQ Verification Code</title>
    </head>
    <body style="background:#f3f9f8;margin:0;padding:0;">
      <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;border-radius:8px;overflow:hidden;font-family:sans-serif;background-color:#f3f9f8;">
        <tr>
          <td style="background:#074568;padding:28px 0;text-align:center;">
            <img src="https://prephq.theiotacademy.co/email-template/img/logo.png" alt="prepHQ logo" style="max-height:46px;">
          </td>
        </tr>
        <tr>
          <td style="background:#E6FFF4;padding:0 24px;">
            <div style="width:100%;text-align:center;padding:27px 0 16px;">
              <img src="https://prephq.theiotacademy.co/email-template/img/envelope.png" alt="envlope email"/>
            </div>
            <h2 style="color:#074568;text-align:center;font-size: 16px;margin: 30px 0;">Hello ${name},</h2>
            <p style="font-size:1rem;text-align:center;color:#000;">
              Use the code below to verify your sign-in to prepHQ.<br>
              <b>Password Reset Verification code:</b>
            </p>
            <div style="width:100%;text-align:center;padding:10px 0;">
              <span style="display:inline-block;background: #57CC99;color:#074568;font-size:1rem;font-weight:bold;padding:5px 30px;border-radius:35px;letter-spacing:2px;">
                ${code}
              </span>
            </div>
            <p style="text-align:center;color:#000;padding:10px 0;">
              This code expires in 5 minutes. If this wasn't requested, please ignore this email and your account will remain secure.
            </p>
            <p style="text-align:center;color:#000;font-weight:bold; margin: 10px 0;padding-bottom: 10px;">
              Thanks,<br>
              The prepHQ Team
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;text-align:center;background: #57CC99;">
            <span style="display: block;font-size:12px;color:#fff;font-weight: bold;font-style: italic;padding-bottom: 10px;">Follow On</span>
            <a href="https://www.instagram.com/prephq.tia/" style="margin:0 5px;"><img src="https://prephq.theiotacademy.co/email-template/img/instagram.png" alt="Instagram" width="21"></a>
            <a href="https://www.youtube.com/@prepHQ-b2k1r" style="margin:0 5px;"><img src="https://prephq.theiotacademy.co/email-template/img/youtube.png" alt="YouTube" width="21"></a>
            <a href="https://www.linkedin.com/company/prephqbytia" style="margin:0 5px;"><img src="https://prephq.theiotacademy.co/email-template/img/linkdin.png" alt="LinkedIn" width="21"></a>
            <a href="https://www.facebook.com/profile.php?id=61579814723823" style="margin:0 5px;"><img src="https://prephq.theiotacademy.co/email-template/img/facebook.png" alt="Facebook" width="21"></a>
            <a href="https://x.com/Prephq_tia" style="margin:0 5px;"><img src="https://prephq.theiotacademy.co/email-template/img/twiter.png" alt="Twitter" width="21"></a>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    try {
        await transporter.sendMail({
          from: `${getFromName()} <${getFromAddress()}>`,
            to: email,
            subject: 'Password Reset Code',
            html
        });
        return true;
    } catch (err) {
        console.error('Reset email failed:', err.message);
        return false;
    }
}

/* ================= CONTACT EMAIL ================= */
async function sendContactEmail({ fromEmail, toEmail, subject, data }) {
  const html = buildContactEmailHtml(data || {});

  try {
    await transporter.sendMail({
      from: `${getFromName()} <${getFromAddress()}>`,
      to: toEmail,
      replyTo: fromEmail || getFromAddress(),
      subject,
      html
    });
    return true;
  } catch (err) {
    console.error('Contact email failed:', err.message);
    return false;
  }
}

/* ================= NEWSLETTER EMAIL ================= */
async function sendNewsletterEmail(email) {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>prepHQ Subscription Confirmation</title>
    </head>
    <body style="background:#f3f9f8;margin:0;padding:0;">
      <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;border-radius:8px;overflow:hidden;font-family:sans-serif;background-color:#f3f9f8;">
        <tr>
          <td style="background:#074568;padding:28px 0;text-align:center;">
            <img src="https://prephq.theiotacademy.co/email-template/img/logo.png" alt="prepHQ logo" style="max-height:46px;">
          </td>
        </tr>
        <tr>
          <td style="background:#E6FFF4;padding:0 24px;">
            <div style="width:100%;text-align:center;padding:27px 0 16px;">
              <img src="https://prephq.theiotacademy.co/email-template/img/envelope.png" alt="envlope email"/>
            </div>
            <h2 style="color:#074568;text-align:center;font-size:16px;margin:30px 0;">Hi there,</h2>
            <p style="font-size:1rem;text-align:center;color:#000;">
              Thank you for subscribing to <b>PrepHQ</b> updates!
            </p>
            <p style="text-align:center;color:#000;padding:10px 0;">
              You'll now receive exclusive news, learning tips, and updates directly in your inbox.
            </p>
            <p style="text-align:center;color:#000;font-weight:bold;margin:10px 0;padding-bottom:10px;">
              Thanks,<br>
              The prepHQ Team
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;text-align:center;background:#57CC99;">
            <span style="display:block;font-size:12px;color:#fff;font-weight:bold;font-style:italic;padding-bottom:10px;">Follow On</span>
            <a href="https://www.instagram.com/prephq.tia/" style="margin:0 5px;"><img src="https://prephq.theiotacademy.co/email-template/img/instagram.png" width="21" alt="Instagram"></a>
            <a href="https://www.youtube.com/@prepHQ-b2k1r" style="margin:0 5px;"><img src="https://prephq.theiotacademy.co/email-template/img/youtube.png" width="21" alt="YouTube"></a>
            <a href="https://www.linkedin.com/company/prephqbytia" style="margin:0 5px;"><img src="https://prephq.theiotacademy.co/email-template/img/linkdin.png" width="21" alt="LinkedIn"></a>
            <a href="https://www.facebook.com/profile.php?id=61579814723823" style="margin:0 5px;"><img src="https://prephq.theiotacademy.co/email-template/img/facebook.png" width="21" alt="Facebook"></a>
            <a href="https://x.com/Prephq_tia" style="margin:0 5px;"><img src="https://prephq.theiotacademy.co/email-template/img/twiter.png" width="21" alt="Twitter"></a>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    try {
        await transporter.sendMail({
          from: `${getFromName()} <${getFromAddress()}>`,
            to: email,
          replyTo: getFromAddress(),
            subject: 'Subscription Confirmed - PrepHQ',
            html
        });
        return true;
    } catch (err) {
        console.error('Newsletter email failed:', err.message);
        return false;
    }
}

module.exports = {
    sendVerificationEmail,
  sendResetEmail,
  sendContactEmail,
  sendNewsletterEmail
};
