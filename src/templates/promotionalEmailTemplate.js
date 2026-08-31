function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


const generatePromotionalEmailHTML = (data = {}) => {
  const {
    firstname = data.firstName || "",
    lastname = data.lastName || "",
    city = "",

    // Campaign data
    promoCode = "WELCOME20",
    discountPercentage = 20,
    campaignHeadline = "An exclusive welcome offer",
    storeUrl = "https://yourwebsite.com/promotions",

    // Company / support
    logoUrl = "",
    companyAddress = "123 Example Street, Kolkata, West Bengal, India",
    supportUrl = "https://yourwebsite.com/support",
    unsubscribeUrl = "https://yourwebsite.com/unsubscribe",


    // Expiration
    expirationDate,
  } = data;

  const fullName =
    [firstname, lastname]
      .filter(Boolean)
      .join(" ") || "there";

  const safeFullName = escapeHtml(fullName);
  const safeCity = escapeHtml(city);
  const safePromoCode = escapeHtml(promoCode);
  const safeCampaignHeadline = escapeHtml(campaignHeadline);
  const safeStoreUrl = escapeHtml(storeUrl);
  const safeLogoUrl = escapeHtml(logoUrl);
  const safeCompanyAddress = escapeHtml(companyAddress);
  const safeSupportUrl = escapeHtml(supportUrl);
  const safeUnsubscribeUrl = escapeHtml(unsubscribeUrl);


  /*
   * Use the campaign supplied expiration date
   * when available.
   *
   * Otherwise create a default expiry date
   * 7 days from generation time.
   */
  const suppliedExpiryValue = expirationDate || data.expiresAt;
  const suppliedExpiry = suppliedExpiryValue ? new Date(suppliedExpiryValue) : null;
  const expiry = suppliedExpiry && !isNaN(suppliedExpiry.getTime())
    ? suppliedExpiry
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const formattedExpirationDate =
    expiry.toLocaleDateString("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return `
<!DOCTYPE html>
<html lang="en">

<head>

  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <meta
    name="color-scheme"
    content="light"
  />

  <meta
    name="supported-color-schemes"
    content="light"
  />

  <title>${safeCampaignHeadline}</title>

  <style>

    @media only screen and (max-width: 600px) {

      .email-container {
        width: 100% !important;
      }

      .mobile-padding {
        padding-left: 20px !important;
        padding-right: 20px !important;
      }

      .headline {
        font-size: 26px !important;
      }

      .discount {
        font-size: 38px !important;
      }

      .cta-button {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }

    }

  </style>

</head>

<body
  style="
    margin:0;
    padding:0;
    background-color:#f3f5f7;
    font-family:Arial, Helvetica, sans-serif;
    color:#17202a;
  "
>

<table
  role="presentation"
  width="100%"
  cellspacing="0"
  cellpadding="0"
  border="0"
  style="
    width:100%;
    background-color:#f3f5f7;
  "
>

<tr>

<td
  align="center"
  style="padding:24px 12px;"
>

<table
  role="presentation"
  width="100%"
  cellspacing="0"
  cellpadding="0"
  border="0"
  class="email-container"
  style="
    max-width:620px;
    width:100%;
    background-color:#ffffff;
  "
>

<!-- HEADER -->

<tr>

<td
  style="
    background-color:#123c35;
    padding:28px 24px;
    text-align:center;
  "
>
${
  safeLogoUrl
    ? `
<img
  src="${safeLogoUrl}"
  alt="Take You Forward"
  width="160"
  style="
    display:block;
    margin:0 auto 18px auto;
    max-width:160px;
    height:auto;
    border:0;
  "
/>
`
    : ""
}

<div
  style="
    color:#ffffff;
    font-size:20px;
    font-weight:bold;
  "
>
  TAKE YOU FORWARD
</div>

<div
  class="headline"
  style="
    margin-top:18px;
    color:#ffffff;
    font-size:30px;
    font-weight:bold;
  "
>
  ${safeCampaignHeadline}
</div>

<div
  style="
    display:inline-block;
    margin-top:18px;
    padding:9px 14px;
    background-color:#f3c969;
    color:#17202a;
    font-size:12px;
    font-weight:bold;
  "
>
  EXCLUSIVE 1-WEEK OFFER
</div>

</td>

</tr>


<!-- GREETING -->

<tr>

<td
  class="mobile-padding"
  style="padding:32px 28px 20px 28px;"
>

<div
  style="
    font-size:20px;
    font-weight:bold;
    color:#17202a;
  "
>
  Hi ${safeFullName},
</div>

<p
  style="
    margin:16px 0 0 0;
    font-size:16px;
    line-height:1.7;
    color:#424b52;
  "
>
  We have a special offer created just for you.
  Enjoy exclusive savings and make the most of your
  next shopping experience with
  <strong>Take You Forward</strong>.
</p>

${
  city
    ? `
<p
  style="
    margin:14px 0 0 0;
    font-size:16px;
    line-height:1.7;
    color:#424b52;
  "
>
  This special offer is available especially for
  customers in <strong>${safeCity}</strong>.
</p>
`
    : ""
}

</td>

</tr>


<!-- BENEFITS -->

<tr>

<td
  class="mobile-padding"
  style="padding:10px 28px 24px 28px;"
>

<div
  style="
    font-size:18px;
    font-weight:bold;
    color:#123c35;
    margin-bottom:14px;
  "
>
  Your Benefits
</div>

<ul
  style="
    padding-left:20px;
    margin:0;
    font-size:15px;
    line-height:1.6;
    color:#424b52;
  "
>

<li>Exclusive member-only savings</li>

<li>Special offers designed for you</li>

<li>Easy and rewarding shopping experience</li>

</ul>

</td>

</tr>


<!-- OFFER -->

<tr>

<td
  class="mobile-padding"
  style="padding:0 28px 28px 28px;"
>

<table
  role="presentation"
  width="100%"
  cellspacing="0"
  cellpadding="0"
  border="0"
  style="
    background-color:#eef7f3;
    border:1px solid #b8d9cb;
  "
>

<tr>

<td
  align="center"
  style="padding:28px 20px;"
>

<div
  style="
    font-size:13px;
    font-weight:bold;
    color:#53616b;
    letter-spacing:1px;
  "
>
  YOUR SPECIAL OFFER
</div>


<!-- DYNAMIC DISCOUNT -->

<div
  class="discount"
  style="
    margin-top:10px;
    font-size:44px;
    font-weight:bold;
    color:#123c35;
  "
>
  ${discountPercentage}% OFF
</div>


<div
  style="
    margin-top:18px;
    font-size:14px;
    color:#424b52;
  "
>
  Use promo code
</div>


<!-- DYNAMIC PROMO CODE -->

<div
  style="
    display:inline-block;
    margin-top:8px;
    padding:10px 16px;
    background-color:#ffffff;
    border:1px dashed #123c35;
    color:#123c35;
    font-size:20px;
    font-weight:bold;
    letter-spacing:1px;
  "
>
  ${safePromoCode}
</div>


<!-- DYNAMIC EXPIRATION -->

<div
  style="
    margin-top:16px;
    font-size:13px;
    color:#424b52;
  "
>
  Offer expires on
  <strong>${formattedExpirationDate}</strong>
</div>

</td>

</tr>

</table>

</td>

</tr>


<!-- CTA -->

<tr>

<td
  align="center"
  class="mobile-padding"
  style="padding:0 28px 36px 28px;"
>

<a
  href="${safeStoreUrl}"
  class="cta-button"
  style="
    display:inline-block;
    padding:14px 30px;
    background-color:#d85c3d;
    color:#ffffff;
    text-decoration:none;
    border-radius:5px;
    font-size:16px;
    font-weight:bold;
  "
>
  Shop Now
</a>

</td>

</tr>


<!-- FOOTER -->

<tr>

<td
  style="
    background-color:#f1f3f3;
    padding:24px;
    text-align:center;
    font-size:12px;
    line-height:1.6;
    color:#667078;
  "
>

<strong>
  Offer Terms & Conditions
</strong>

<br/>

Offer valid for 7 days from the campaign
trigger date.
Terms and conditions may apply.

<br/><br/>

TAKE YOU FORWARD

<br/>

${safeCompanyAddress}

<br/><br/>

For support, please 
<a
  href="${safeSupportUrl}"
  style="
  color:#123c35;
  text-decoration:underline;"
>
contact our customer support team
</a>.

<br/><br/>

You are receiving this email because you are subscribed
to promotional communications.

<br/>

<a
  href="${safeUnsubscribeUrl}"
  style="color:#667078;"
>
  Unsubscribe
</a>

</td>

</tr>

</table>

</td>

</tr>

</table>

</body>

</html>
  `;
};

module.exports = {
  generatePromotionalEmailHTML,
};