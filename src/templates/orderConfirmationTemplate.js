/**
 * Order Confirmation HTML Template
 * Modern, clean e-commerce receipt template matching the warm cream & coral theme.
 * Features progress tracker, coral CTA button, white order details card with split layout,
 * and 4-grid warm cream support cards.
 */

const generateOrderConfirmationHTML = (order = {}) => {
  const {
    orderid = "N/A",
    totalamount = 0,
    taxamount = 0,
    discount = 0,
    payment = "N/A",
    customer = {},
    orderlineitems = []
  } = order || {};

  const {
    firstname = "Valued Customer",
    lastname = "",
    addressline1 = "N/A",
    addressline2 = "",
    city = "N/A",
    pincode = "N/A"
  } = customer || {};

  const fullName = lastname ? `${firstname.trim()} ${lastname.trim()}` : firstname.trim();

  // Arithmetic formatting helper: returns currency string with 2 decimal places
  const formatCurrency = (val) => `₹${Number(val || 0).toFixed(2)}`;

  // Calculate items subtotal and build items list
  let subtotal = 0;
  let totalItemsQty = 0;
  const itemsHtml = (orderlineitems || []).map((item, index) => {
    const skuitem = item.skuitem || "Unknown Item";
    const skuid = item.skuid || "N/A";
    const qty = Number(item.skuquantity || 0);
    const price = Number(item.skuprice || 0);
    const lineTotal = qty * price;
    subtotal += lineTotal;
    totalItemsQty += qty;
    const isLast = index === (orderlineitems.length - 1);
    const borderStyle = isLast ? '' : 'border-bottom: 1px solid #f0ece6; padding-bottom: 16px; margin-bottom: 16px;';

    const icons = ['👕', '📦', '👟', '🕶️', '🛍️'];
    const itemIcon = icons[index % icons.length];

    return `
      <div style="${borderStyle}">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="width: 60px; vertical-align: top; padding-right: 14px;">
              <div style="width: 56px; height: 56px; background-color: #f4ede4; border-radius: 10px; text-align: center; line-height: 56px; font-size: 24px;">
                ${itemIcon}
              </div>
            </td>
            <td style="vertical-align: top;">
              <div style="font-size: 14px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">
                ${skuitem}
              </div>
              <div style="font-size: 12px; color: #707070; margin-top: 3px;">
                SKU: ${skuid}
              </div>
              <div style="font-size: 12px; color: #707070; margin-top: 2px;">
                Quantity: ${qty}
              </div>
            </td>
            <td style="vertical-align: top; text-align: right; white-space: nowrap;">
              <div style="font-size: 14px; font-weight: 700; color: #1a1a1a;">
                ${formatCurrency(lineTotal)}
              </div>
              <div style="font-size: 12px; color: #707070; margin-top: 2px;">
                ${formatCurrency(price)} each
              </div>
            </td>
          </tr>
        </table>
      </div>
    `;
  }).join('');

  // Fallback total count if no items array
  if (totalItemsQty === 0 && orderlineitems.length === 0) {
    totalItemsQty = 0;
  }

  // Sanitize address components safely
  const addressParts = [
    addressline1,
    addressline2,
    `${city} - ${pincode}`
  ].filter(part => part && part.trim());

  const addressBlock = addressParts.map((part, idx) => `
    <div style="margin-bottom: ${idx === addressParts.length - 1 ? '0' : '2px'}; color: #555555; font-size: 12px; line-height: 1.4;">
      ${part.trim()}
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="color-scheme" content="light"/>
  <meta name="supported-color-schemes" content="light"/>
  <title>Order Confirmation - ${orderid}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #fdfaf6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1a1a1a;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    table {
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      border: 0;
      outline: none;
      text-decoration: none;
    }
    .email-wrapper {
      width: 100%;
      background-color: #fdfaf6;
      padding: 30px 10px;
    }
    .email-container {
      max-width: 520px;
      margin: 0 auto;
      background-color: #fdfaf6;
    }
    .hero-heading {
      margin: 0 0 10px 0;
      font-size: 26px;
      font-weight: 800;
      color: #1a1a1a;
      text-align: center;
      line-height: 1.25;
      letter-spacing: -0.4px;
    }
    .hero-subtext {
      margin: 0 auto 24px auto;
      font-size: 13px;
      line-height: 1.55;
      color: #707070;
      text-align: center;
      max-width: 440px;
    }
    .view-order-btn {
      display: inline-block;
      background-color: #ff5745;
      color: #ffffff !important;
      padding: 13px 38px;
      text-decoration: none;
      border-radius: 25px;
      font-weight: 700;
      font-size: 14px;
      box-shadow: 0 4px 14px rgba(255, 87, 69, 0.3);
    }
    .detail-heading {
      margin: 32px 0 4px 0;
      font-size: 22px;
      font-weight: 800;
      color: #1a1a1a;
      text-align: center;
      letter-spacing: -0.3px;
    }
    .order-card {
      background-color: #ffffff;
      border: 1px solid #ede8e1;
      border-radius: 12px;
      padding: 20px;
      margin-top: 18px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
    }
    @media only screen and (max-width: 600px) {
      .email-wrapper {
        padding: 15px 8px !important;
      }
      .split-col {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      .split-col-first {
        margin-bottom: 16px !important;
        padding-bottom: 16px !important;
        border-bottom: 1px solid #f0ece6 !important;
        padding-right: 0 !important;
      }
      .split-col-second {
        padding-left: 0 !important;
      }
      .support-col {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
        padding: 0 0 10px 0 !important;
      }
      .view-order-btn {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
        text-align: center !important;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td align="center">
          <div class="email-container">
            <!-- Header Greeting -->
            <h1 class="hero-heading">Hooray! Your order has been confirmed.</h1>
            <p class="hero-subtext">
              Take You Forward will commence work on this immediately. You'll receive an email notification once it's shipped.
            </p>

            <!-- 3-Step Progress Tracker -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto 24px auto; width: 100%; max-width: 380px;">
              <tr>
                <td align="center" style="width: 30%; vertical-align: top; text-align: center;">
                  <div style="width: 34px; height: 34px; border-radius: 50%; background-color: #ff5745; color: #ffffff; line-height: 34px; font-size: 15px; font-weight: bold; margin: 0 auto 6px auto; box-shadow: 0 2px 8px rgba(255, 87, 69, 0.3);">
                    ✓
                  </div>
                  <div style="font-size: 11px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">
                    Order<br/>Confirmed
                  </div>
                </td>
                <td style="vertical-align: top; padding-top: 16px; width: 15%;">
                  <div style="height: 2px; background-color: #d8d3cc; width: 100%;"></div>
                </td>
                <td align="center" style="width: 25%; vertical-align: top; text-align: center;">
                  <div style="width: 34px; height: 34px; border-radius: 50%; background-color: #f2ece4; border: 1.5px solid #d8d3cc; color: #707070; line-height: 32px; font-size: 14px; margin: 0 auto 6px auto;">
                    🚚
                  </div>
                  <div style="font-size: 11px; font-weight: 600; color: #707070; line-height: 1.3;">
                    Shipped
                  </div>
                </td>
                <td style="vertical-align: top; padding-top: 16px; width: 15%;">
                  <div style="height: 2px; background-color: #d8d3cc; width: 100%;"></div>
                </td>
                <td align="center" style="width: 30%; vertical-align: top; text-align: center;">
                  <div style="width: 34px; height: 34px; border-radius: 50%; background-color: #f2ece4; border: 1.5px solid #d8d3cc; color: #707070; line-height: 32px; font-size: 14px; margin: 0 auto 6px auto;">
                    📦
                  </div>
                  <div style="font-size: 11px; font-weight: 600; color: #707070; line-height: 1.3;">
                    Expected<br/>Delivered
                  </div>
                </td>
              </tr>
            </table>

            <!-- CTA Button -->
            <div style="text-align: center; margin-bottom: 16px;">
              <a href="https://yourwebsite.com/orders/${orderid}" class="view-order-btn" target="_blank" rel="noopener noreferrer">
                View Your Order
              </a>
            </div>
            <p style="margin: 0 0 28px 0; font-size: 11px; color: #888888; text-align: center; line-height: 1.4;">
              Estimated delivery times. Reach out to the seller for any order concerns. Additional information is accessible.
            </p>

            <!-- Order Details Heading -->
            <h2 class="detail-heading">Order details</h2>
            <div style="font-size: 13px; color: #707070; text-align: center; margin-bottom: 18px;">
              Confirmation number : <span style="color: #ff5745; font-weight: 700;">#${orderid}</span>
            </div>

            <!-- White Order Card -->
            <div class="order-card">
              <!-- Item List -->
              <div style="margin-bottom: 16px;">
                ${itemsHtml}
              </div>

              <!-- Shipping & Payment Breakdown in 2 Columns -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td class="split-col split-col-first" width="50%" style="vertical-align: top; padding-right: 14px;">
                    <div style="font-weight: 700; font-size: 13px; color: #1a1a1a; margin-bottom: 6px;">
                      Shipping address
                    </div>
                    <div style="font-size: 12px; color: #555555; line-height: 1.45;">
                      <div style="font-weight: 600; color: #1a1a1a; margin-bottom: 2px;">${fullName}</div>
                      ${addressBlock}
                    </div>
                  </td>
                  <td class="split-col split-col-second" width="50%" style="vertical-align: top; padding-left: 14px;">
                    <div style="font-weight: 700; font-size: 13px; color: #1a1a1a; margin-bottom: 6px;">
                      Paid with ${payment}
                    </div>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size: 12px; color: #555555;">
                      <tr>
                        <td style="padding: 2px 0;">Subtotal</td>
                        <td style="padding: 2px 0; text-align: right; font-weight: 600; color: #1a1a1a;">${formatCurrency(subtotal)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 2px 0;">Sales tax</td>
                        <td style="padding: 2px 0; text-align: right;">+${formatCurrency(taxamount)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 2px 0;">Discount</td>
                        <td style="padding: 2px 0; text-align: right; color: #ff5745; font-weight: 600;">-${formatCurrency(discount)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 2px 0;">Shipping</td>
                        <td style="padding: 2px 0; text-align: right;">Standard Delivery</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Total Row -->
              <div style="margin-top: 16px; padding-top: 14px; border-top: 1px solid #f0ece6;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="font-size: 14px; font-weight: 700; color: #1a1a1a;">
                      Total (${totalItemsQty} ${totalItemsQty === 1 ? 'item' : 'items'})
                    </td>
                    <td style="text-align: right; font-size: 18px; font-weight: 800; color: #1a1a1a;">
                      ${formatCurrency(totalamount)}
                    </td>
                  </tr>
                </table>
              </div>
            </div>

            <!-- 4 Support Cards (2x2 Grid) -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 24px;">
              <tr>
                <td class="support-col" width="50%" style="padding: 0 6px 12px 0;">
                  <div style="background-color: #fff9f0; border: 1px solid #f6ecdc; border-radius: 10px; padding: 13px 14px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align: middle; padding-right: 10px; font-size: 18px; color: #ff5745;">
                          💬
                        </td>
                        <td style="vertical-align: middle;">
                          <div style="font-weight: 700; font-size: 13px; color: #1a1a1a;">Chat With Us</div>
                          <div style="font-size: 11px; color: #707070; margin-top: 2px;">takeyouforward.com</div>
                        </td>
                      </tr>
                    </table>
                  </div>
                </td>
                <td class="support-col" width="50%" style="padding: 0 0 12px 6px;">
                  <div style="background-color: #fff9f0; border: 1px solid #f6ecdc; border-radius: 10px; padding: 13px 14px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align: middle; padding-right: 10px; font-size: 18px; color: #ff5745;">
                          📞
                        </td>
                        <td style="vertical-align: middle;">
                          <div style="font-weight: 700; font-size: 13px; color: #1a1a1a;">Call Us</div>
                          <div style="font-size: 11px; color: #707070; margin-top: 2px;">1-800-555-0199</div>
                        </td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>
              <tr>
                <td class="support-col" width="50%" style="padding: 0 6px 0 0;">
                  <div style="background-color: #fff9f0; border: 1px solid #f6ecdc; border-radius: 10px; padding: 13px 14px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align: middle; padding-right: 10px; font-size: 18px; color: #ff5745;">
                          ✉
                        </td>
                        <td style="vertical-align: middle;">
                          <div style="font-weight: 700; font-size: 13px; color: #1a1a1a;">Email Us</div>
                          <div style="font-size: 11px; color: #707070; margin-top: 2px;">support@takeyouforward.com</div>
                        </td>
                      </tr>
                    </table>
                  </div>
                </td>
                <td class="support-col" width="50%" style="padding: 0 0 0 6px;">
                  <div style="background-color: #fff9f0; border: 1px solid #f6ecdc; border-radius: 10px; padding: 13px 14px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align: middle; padding-right: 10px; font-size: 18px; color: #ff5745;">
                          📱
                        </td>
                        <td style="vertical-align: middle;">
                          <div style="font-weight: 700; font-size: 13px; color: #1a1a1a;">Text Us</div>
                          <div style="font-size: 11px; color: #707070; margin-top: 2px;">Send "Help" to 243-205</div>
                        </td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>
            </table>

            <!-- Footer -->
            <div style="text-align: center; padding: 24px 0 10px 0; font-size: 11px; color: #999999;">
              &copy; ${new Date().getFullYear()} Take You Forward. All rights reserved.
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
  `;
};

module.exports = { generateOrderConfirmationHTML };
