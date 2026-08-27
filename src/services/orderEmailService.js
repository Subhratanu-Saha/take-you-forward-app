const { transporter, EMAIL_USER_ID, EMAIL_USER_PASSCODE } = require('../config/email');
const interactionModel = require('../models/interaction');
const { generateOrderConfirmationHTML } = require('../templates/orderConfirmationTemplate');

/**
 * Sends an order confirmation email to the customer.
 *
 * Handles errors gracefully: logs the outcome and does not propagate the error to avoid
 * disrupting the main order flow.
 *
 * @param {Object} order - The full order object containing customer and line items.
 * @returns {Promise<Object>} Object indicating status of the operation
 */
const sendOrderConfirmationEmail = async (order) => {
  try {
    if (!order || !order.orderid) {
      console.warn('[ORDER_EMAIL] Skip sending email: invalid or missing order details.');
      return { success: false, message: 'Invalid or missing order' };
    }

    const customer = order.customer;
    if (!customer || !customer.emailadd) {
      console.warn(`[ORDER_EMAIL] Skip sending email for order=${order.orderid}: no customer email found.`);
      return { success: false, message: 'Missing customer email' };
    }

    console.info(`[ORDER_EMAIL] Generating confirmation email for order=${order.orderid} to email=${customer.emailadd}`);

    if (!EMAIL_USER_ID || !EMAIL_USER_PASSCODE) {
      console.warn(`[ORDER_EMAIL] Skip sending email: SMTP configuration missing.`);
      return { success: false, message: 'SMTP configuration missing' };
    }

    const emailHtml = generateOrderConfirmationHTML(order);

    const mailOptions = {
      from: EMAIL_USER_ID,
      to: customer.emailadd,
      subject: `Order Confirmation - ${order.orderid}`,
      html: emailHtml,
    };

    const result = await transporter.sendMail(mailOptions);

    console.info(`[ORDER_EMAIL] Order confirmation email sent successfully for order=${order.orderid}. messageId=${result?.messageId || 'N/A'}`);

    // Log transactional interaction
    try {
      await interactionModel.createInteraction({
        customerid: customer.customerid,
        interactionmode: 'EMAIL',
        interactiontype: 'TRANSACTIONAL',
        interactionvalue: `ORDER_CONFIRMATION_${order.orderid}`,
      });
      console.info(`[ORDER_EMAIL] Logged interaction for customer=${customer.customerid}`);
    } catch (interactionError) {
      console.error(`[ORDER_EMAIL] Failed to log interaction for customer=${customer.customerid}: ${interactionError.message}`);
    }

    return { success: true, messageId: result?.messageId };
  } catch (error) {
    console.error(`[ORDER_EMAIL] Gracefully handled error sending order confirmation email for order=${order?.orderid}: ${error.message}`);
    return { success: false, error: error.message };
  }
};

module.exports = { sendOrderConfirmationEmail };
