const nodemailer = require("nodemailer");


// ======================================================
// CREATE SMTP TRANSPORTER
// ======================================================

const createTransporter = () => {

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASSWORD,
    SMTP_FROM,
  } = process.env;


  // Validate configuration without printing secrets
  if (
    !SMTP_HOST ||
    !SMTP_PORT ||
    !SMTP_USER ||
    !SMTP_PASSWORD ||
    !SMTP_FROM
  ) {

    console.error(
      "Password reset email configuration is incomplete",
      {
        SMTP_HOST_SET: Boolean(SMTP_HOST),
        SMTP_PORT_SET: Boolean(SMTP_PORT),
        SMTP_USER_SET: Boolean(SMTP_USER),
        SMTP_PASSWORD_SET: Boolean(SMTP_PASSWORD),
        SMTP_FROM_SET: Boolean(SMTP_FROM),
      }
    );


    throw new Error(
      "SMTP configuration is incomplete"
    );

  }


  return nodemailer.createTransport({

    host: SMTP_HOST,

    port: Number(SMTP_PORT),

    secure:
      Number(SMTP_PORT) === 465,

    auth: {

      user: SMTP_USER,

      pass: SMTP_PASSWORD,

    },

  });

};


// ======================================================
// SEND RESET OTP
// ======================================================

const sendResetOtp = async ({
  to,
  otp,
}) => {

  const transporter =
    createTransporter();


  await transporter.sendMail({

    from: process.env.SMTP_FROM,

    to,

    subject:
      "Password Reset OTP - Personal Loan LMS",


    text: `
Your OTP for resetting your Personal Loan LMS password is:

${otp}

This OTP is valid for 10 minutes.

If you did not request a password reset, please ignore this email.

Regards,
Fintree Team
    `,


    html: `
      <div
        style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: auto;
          padding: 20px;
        "
      >

        <h2
          style="
            color: #111827;
            margin-bottom: 20px;
          "
        >
          Password Reset
        </h2>


        <p
          style="
            color: #4b5563;
            font-size: 14px;
          "
        >
          We received a request to reset your
          Personal Loan LMS password.
        </p>


        <p
          style="
            color: #4b5563;
            font-size: 14px;
          "
        >
          Your password reset OTP is:
        </p>


        <div
          style="
            margin: 25px 0;
            padding: 18px;
            background: #ecfdf5;
            border-radius: 10px;
            text-align: center;
            font-size: 30px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #059669;
          "
        >
          ${otp}
        </div>


        <p
          style="
            color: #4b5563;
            font-size: 14px;
          "
        >
          This OTP is valid for
          <strong>10 minutes</strong>.
        </p>


        <p
          style="
            color: #6b7280;
            font-size: 13px;
          "
        >
          If you did not request a password reset,
          please ignore this email.
        </p>


        <br />


        <p
          style="
            color: #4b5563;
            font-size: 14px;
          "
        >
          Regards,<br />
          <strong>Fintree Team</strong>
        </p>

      </div>
    `,

  });


  return true;

};


// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  sendResetOtp,
};