/**
 * Order Confirmation HTML Template
 * Dynamic, mobile-first responsive template for order confirmations.
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
  const formatCurrency = (val) => `$${Number(val || 0).toFixed(2)}`;

  // Calculate items subtotal and build items table rows
  let subtotal = 0;
  const itemsHtml = (orderlineitems || []).map((item, index) => {
    const skuitem = item.skuitem || "Unknown Item";
    const skuid = item.skuid || "N/A";
    const qty = Number(item.skuquantity || 0);
    const price = Number(item.skuprice || 0);
    const lineTotal = qty * price;
    subtotal += lineTotal;

    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eeeeee; font-size: 14px; color: #333333; line-height: 1.4;">
          <div style="font-weight: bold; color: #333333;">${skuitem}</div>
          <div style="font-size: 12px; color: #777777; margin-top: 2px;">SKU: ${skuid}</div>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eeeeee; font-size: 14px; color: #666666; text-align: center;">
          ${qty}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eeeeee; font-size: 14px; color: #666666; text-align: right;">
          ${formatCurrency(price)}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eeeeee; font-size: 14px; color: #333333; font-weight: bold; text-align: right;">
          ${formatCurrency(lineTotal)}
        </td>
      </tr>
    `;
  }).join('');

  // Sanitize address components safely
  const addressParts = [
    addressline1,
    addressline2,
    `${city} - ${pincode}`
  ].filter(part => part && part.trim());

  const addressBlock = addressParts.map(part => `<div style="margin-bottom: 4px;">${part.trim()}</div>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Order Confirmation - ${orderid}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f5f7;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #333333;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 650px;
      margin: 30px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0,0,0,0.05);
    }
    .header {
      background: linear-gradient(135deg, #5b6cff, #7b42f6);
      color: white;
      text-align: center;
      padding: 45px 20px;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 10px 0 0 0;
      font-size: 16px;
      opacity: 0.9;
    }
    .content {
      padding: 40px 35px;
    }
    .greeting {
      font-size: 20px;
      font-weight: 600;
      color: #333333;
      margin-bottom: 15px;
    }
    .intro-text {
      font-size: 15px;
      line-height: 1.6;
      color: #666666;
      margin-bottom: 30px;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      background-color: #f8f9fa;
      border-radius: 8px;
      overflow: hidden;
    }
    .meta-table td {
      padding: 15px;
      font-size: 14px;
      border-bottom: 1px solid #edf2f7;
    }
    .meta-table tr:last-child td {
      border-bottom: none;
    }
    .meta-label {
      font-weight: bold;
      color: #5b6cff;
      width: 30%;
    }
    .meta-value {
      color: #333333;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .items-table th {
      background-color: #f8f9fa;
      color: #5b6cff;
      font-weight: bold;
      font-size: 13px;
      text-transform: uppercase;
      padding: 12px;
      text-align: left;
      border-bottom: 2px solid #edf2f7;
    }
    .summary-section {
      width: 50%;
      margin-left: auto;
      margin-bottom: 30px;
    }
    .summary-table {
      width: 100%;
      border-collapse: collapse;
    }
    .summary-table td {
      padding: 8px 12px;
      font-size: 14px;
      color: #666666;
    }
    .summary-total {
      font-size: 18px;
      font-weight: bold;
      color: #333333 !important;
      border-top: 2px solid #edf2f7;
      padding-top: 12px !important;
    }
    .address-card {
      background-color: #f8f9fa;
      border-left: 4px solid #7b42f6;
      padding: 20px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 35px;
      font-size: 14px;
      line-height: 1.6;
      color: #555555;
    }
    .address-card h3 {
      margin: 0 0 10px 0;
      color: #7b42f6;
      font-size: 15px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .footer {
      background-color: #f8f9fa;
      text-align: center;
      padding: 30px 20px;
      font-size: 13px;
      color: #999999;
      border-top: 1px solid #edf2f7;
    }
    .button-container {
      text-align: center;
      margin-top: 40px;
      margin-bottom: 20px;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #5b6cff, #7b42f6);
      color: white !important;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
      font-size: 15px;
      box-shadow: 0 4px 10px rgba(91, 108, 255, 0.25);
    }
    @media only screen and (max-width: 600px) {
      .container {
        margin: 0;
        border-radius: 0;
      }
      .content {
        padding: 30px 20px;
      }
      .summary-section {
        width: 100%;
      }
      .meta-table td {
        display: block;
        width: 100%;
        box-sizing: border-box;
      }
      .meta-table td:first-child {
        padding-bottom: 2px;
        font-weight: bold;
      }
      .meta-table td:last-child {
        padding-top: 2px;
        border-bottom: 1px solid #edf2f7;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>🛍️ Order Confirmed!</h1>
      <p>Thank you for your purchase. Your order is being processed.</p>
    </div>

    <!-- Content -->
    <div class="content">
      <div class="greeting">Hi ${fullName},</div>
      <p class="intro-text">
        We've received your order and are getting it ready for shipment. Below are your order details and delivery information.
      </p>

      <!-- Order Metadata -->
      <table class="meta-table">
        <tr>
          <td class="meta-label">Order Number</td>
          <td class="meta-value" style="font-family: monospace; font-weight: bold;">${orderid}</td>
        </tr>
        <tr>
          <td class="meta-label">Payment Method</td>
          <td class="meta-value">${payment}</td>
        </tr>
        <tr>
          <td class="meta-label">Order Date</td>
          <td class="meta-value">${new Date(order.syslastmodifieddt || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
      </table>

      <!-- Order Line Items -->
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 50%;">Item</th>
            <th style="width: 10%; text-align: center;">Qty</th>
            <th style="width: 20%; text-align: right;">Price</th>
            <th style="width: 20%; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <!-- Summary -->
      <div class="summary-section">
        <table class="summary-table">
          <tr>
            <td style="text-align: left;">Subtotal</td>
            <td style="text-align: right; font-weight: bold;">${formatCurrency(subtotal)}</td>
          </tr>
          <tr>
            <td style="text-align: left;">Tax</td>
            <td style="text-align: right;">+${formatCurrency(taxamount)}</td>
          </tr>
          <tr>
            <td style="text-align: left;">Discount</td>
            <td style="text-align: right; color: #e53e3e;">-${formatCurrency(discount)}</td>
          </tr>
          <tr class="summary-total">
            <td style="text-align: left; font-weight: bold; color: #333333;">Total Amount</td>
            <td style="text-align: right; font-weight: bold; color: #5b6cff; font-size: 18px;">${formatCurrency(totalamount)}</td>
          </tr>
        </table>
      </div>

      <!-- Shipping/Delivery Details -->
      <div class="address-card">
        <h3>Delivery Address</h3>
        ${addressBlock}
      </div>

      <div class="button-container">
        <a href="https://yourwebsite.com/orders/${orderid}" class="button">Track Your Order</a>
      </div>

      <p style="margin-top: 45px; font-size: 14px; color: #777777; line-height: 1.5;">
        If you have any questions regarding your order, feel free to reply directly to this email. We're here to help!
        <br/><br/>
        Warm regards,<br/>
        <strong>Take You Forward Team</strong>
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

module.exports = { generateOrderConfirmationHTML };
