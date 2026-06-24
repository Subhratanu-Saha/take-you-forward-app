/**
 * Simple Onboarding HTML Template
 * Dynamic Welcome Template for First-Time Users
 */

const generateOnboardingHTML = (customerData = {}) => {
  const {
    firstname = "Customer",
    lastname = "",

    emailadd = "",
    city = "",
  } = customerData;

  const fullName = lastname ? `${firstname} ${lastname}` : firstname;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to Take You Forward</title>

  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
      font-family: Arial, sans-serif;
      color: #333333;
    }

    .container {
      max-width: 650px;
      margin: 30px auto;
      background-color: #ffffff;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .header {
      background: linear-gradient(135deg, #5b6cff, #7b42f6);
      color: white;
      text-align: center;
      padding: 40px 20px;
    }

    .header h1 {
      margin: 0;
      font-size: 30px;
    }

    .header p {
      margin-top: 10px;
      font-size: 16px;
    }

    .content {
      padding: 35px 30px;
    }

    .content h2 {
      color: #5b6cff;
      margin-bottom: 15px;
    }

    .content p {
      line-height: 1.8;
      font-size: 15px;
    }

    .info-box {
      background-color: #f7f9ff;
      border-left: 4px solid #5b6cff;
      padding: 20px;
      margin: 25px 0;
      border-radius: 6px;
    }

    .info-item {
      margin-bottom: 10px;
      font-size: 14px;
    }

    .info-item strong {
      color: #5b6cff;
    }

    .feature-box {
      margin-top: 30px;
    }

    .feature-title {
      font-size: 18px;
      color: #5b6cff;
      margin-bottom: 15px;
    }

    .feature-list {
      padding-left: 20px;
    }

    .feature-list li {
      margin-bottom: 12px;
      line-height: 1.6;
    }

    .button {
      display: inline-block;
      margin-top: 25px;
      background: linear-gradient(135deg, #5b6cff, #7b42f6);
      color: white;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
    }

    .footer {
      background-color: #f1f1f1;
      text-align: center;
      padding: 25px;
      font-size: 13px;
      color: #666666;
    }

    @media only screen and (max-width: 600px) {
      .content {
        padding: 25px 20px;
      }

      .header h1 {
        font-size: 24px;
      }

      .button {
        display: block;
        width: 100%;
        text-align: center;
        box-sizing: border-box;
      }
    }
  </style>
</head>

<body>

  <div class="container">

    <!-- Header -->
    <div class="header">
      <h1>🎉 Welcome to Take You Forward</h1>
      <p>Your journey with us starts today</p>
    </div>

    <!-- Main Content -->
    <div class="content">

      <h2>Hi ${fullName},</h2>

      <p>
        Thank you for choosing us to serve you. We are excited to welcome you to 
        <strong>Take You Forward</strong>. Your account has been successfully created.
      </p>

      <p>
        Start shopping, earning rewards, and exploring exciting offers specially designed for you.
      </p>

      <!-- Customer Details -->
      <div class="info-box">

       

        <div class="info-item">
          <strong>Email:</strong> ${emailadd || "Not Available"}
        </div>

        <div class="info-item">
          <strong>City:</strong> ${city || "Not Provided"}
        </div>

        <div class="info-item">
          <strong>Status:</strong> Active Member
        </div>

      </div>

      <!-- Extra Features -->
      <div class="feature-box">

        <div class="feature-title">
          ✨ Your Membership Benefits
        </div>

        <ul class="feature-list">
          <li> Access exclusive member-only discounts</li>
          <li> Track orders and delivery updates easily</li>
          <li> Get birthday and festival special offers</li>
        </ul>

      </div>

      <!-- CTA Button -->
      <a href="https://yourwebsite.com" class="button">
        Start Shopping
      </a>

      <p style="margin-top: 40px;">
        Regards,<br/>
        <strong>TUF Team</strong>
      </p>

    </div>

    <!-- Footer -->
    <div class="footer">
      © ${new Date().getFullYear()} Take You Forward. All Rights Reserved.
    </div>

  </div>

</body>
</html>
  `;
};

module.exports = { generateOnboardingHTML,
  html: generateOnboardingHTML(),
  body: generateOnboardingHTML() };