const prisma = require('../utils/db');
const loyaltyService = require('./loyaltyService');
const { emitEvent } = require('../events/eventEmitter');


const generateOrderId = () => {
    return `ORD-${Date.now()}-${Math.floor(100000 + Math.random() * 900000)}`;
};

const generateOrderItemId = () => {
    return `ORDITEM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};


// Create Order
const createOrder = async (orderData) => {

    const {
        customerid,
        channel,
        payment,
        discount = 0,
        taxamount = 0,
        isloyalty = false,
        totalamount,
        items
    } = orderData;

    const eventId = orderData.eventId || orderData.eventid || loyaltyService.generateLoyaltyEventId({
        customerid,
        orderid: null,
    });

    let finalAmount = 0;
    let createdOrder = null;

    const order = await prisma.$transaction(async (tx) => {

        // Check customer exists
        const customer = await tx.customer.findUnique({
            where: {
                customerid
            }
        });

        if (!customer) {
            throw new Error("Customer not found");
        }

        // Check order items exist
        if (!items || items.length === 0) {
            throw new Error("Order must contain at least one item");
        }

        // Calculate subtotal
        let subtotal = 0;

        for (const item of items) {

            const quantity = Number(item.skuquantity);
            const price = Number(item.skuprice);

            if (quantity <= 0) {
                throw new Error("Quantity must be greater than zero");
            }

            if (price < 0) {
                throw new Error("Price cannot be negative");
            }

            subtotal += quantity * price;
        }

        finalAmount = subtotal + Number(taxamount) - Number(discount);

        if (totalamount !== undefined && totalamount !== null) {
            const incomingTotal = Number(totalamount);
            if (Math.abs(incomingTotal - finalAmount) > 0.01) {
                throw new prisma.ValidationError(
                    `Total amount mismatch. Provided: ${incomingTotal}, Calculated: ${finalAmount}`,
                    prisma.ERROR_CODES.ORDER_VALIDATION_FAILED || 'ORDER_VALIDATION_FAILED'
                );
            }
        }

        if (finalAmount < 0) {
            throw new Error("Order total cannot be negative");
        }

        // Generate order ID
        const orderid = generateOrderId();

        // Create order header
        await tx.orderheader.create({
            data: {
                orderid,
                customerid,
                totalamount: finalAmount,
                taxamount: Number(taxamount),
                channel,
                payment,
                discount: Number(discount),
                isloyalty,
                syslastmodifieddt: new Date()
            }
        });

        // Create order line items
        for (const item of items) {

            await tx.orderlineitems.create({
                data: {
                    orderitemid: generateOrderItemId(),
                    orderid,
                    skuid: item.skuid,
                    skuitem: item.skuitem,
                    skuquantity: String(item.skuquantity),
                    skuprice: Number(item.skuprice)
                }
            });
        }

        // Return created order
        return await tx.orderheader.findUnique({
            where: {
                orderid
            },
            include: {
                customer: true,
                orderlineitems: true
            }
        });

    });

    // Emit customer.purchase event after order successfully created
    if (order && order.orderid) {
        console.info('[ORDER_SERVICE] Emitting customer.purchase event', {
            eventId,
            customerId: order.customerid,
            orderId: order.orderid,
            totalpoints: order.totalamount,
        });

        emitEvent('customer.purchase', {
            eventId,
            customerId: order.customerid,
            orderId: order.orderid,
            totalpoints: order.totalamount,
        });
    }

    return order;
};


// Get All Orders
const getAllOrders = async () => {

    return await prisma.orderheader.findMany({
        include: {
            customer: true,
            orderlineitems: true
        },
        orderBy: {
            syslastmodifieddt: "desc"
        }
    });
};


// Get Order By ID
const getOrderById = async (orderid) => {

    const order = await prisma.orderheader.findUnique({
        where: {
            orderid
        },
        include: {
            customer: true,
            orderlineitems: true
        }
    });

    if (!order) {
        throw Object.assign(new Error("Order not found"), {
            statusCode: 404,
            errorCode: "ORDER_NOT_FOUND",
            isOperational: true
        });
    }

    return order;
};


// Update Order
const updateOrder = async (orderid, orderData) => {

    const existingOrder = await prisma.orderheader.findUnique({
        where: {
            orderid
        },
        include: {
            orderlineitems: true
        }
    });

    if (!existingOrder) {
        throw Object.assign(new Error("Order not found"), {
            statusCode: 404,
            errorCode: "ORDER_NOT_FOUND",
            isOperational: true
        });
    }

    const {
        channel,
        payment,
        discount,
        taxamount,
        isloyalty,
        totalamount
    } = orderData;

    // Calculate subtotal from existing order line items
    let subtotal = 0;
    const items = existingOrder.orderlineitems || [];
    for (const item of items) {
        const quantity = Number(item.skuquantity);
        const price = Number(item.skuprice);
        subtotal += quantity * price;
    }

    const effectiveTax = taxamount !== undefined ? Number(taxamount) : Number(existingOrder.taxamount || 0);
    const effectiveDiscount = discount !== undefined ? Number(discount) : Number(existingOrder.discount || 0);

    const calculatedTotal = subtotal + effectiveTax - effectiveDiscount;

    if (totalamount !== undefined && totalamount !== null) {
        const incomingTotal = Number(totalamount);
        if (Math.abs(incomingTotal - calculatedTotal) > 0.01) {
            throw new prisma.ValidationError(
                `Total amount mismatch. Provided: ${incomingTotal}, Calculated: ${calculatedTotal}`,
                prisma.ERROR_CODES?.ORDER_VALIDATION_FAILED || 'ORDER_VALIDATION_FAILED'
            );
        }
    }

    if (calculatedTotal < 0) {
        throw Object.assign(new Error("Order total cannot be negative"), {
            statusCode: 400,
            errorCode: prisma.ERROR_CODES?.ORDER_VALIDATION_FAILED || 'ORDER_VALIDATION_FAILED',
            isOperational: true,
        });
    }

    const updateData = {
        totalamount: calculatedTotal,
        syslastmodifieddt: new Date()
    };

    if (channel !== undefined) updateData.channel = channel;
    if (payment !== undefined) updateData.payment = payment;
    if (discount !== undefined) updateData.discount = Number(discount);
    if (taxamount !== undefined) updateData.taxamount = Number(taxamount);
    if (isloyalty !== undefined) updateData.isloyalty = isloyalty;

    return await prisma.orderheader.update({
        where: {
            orderid
        },
        data: updateData,
        include: {
            customer: true,
            orderlineitems: true
        }
    });
};


// Delete Order
const deleteOrder = async (orderid) => {

    const existingOrder = await prisma.orderheader.findUnique({
        where: {
            orderid
        }
    });

    if (!existingOrder) {
        throw new Error("Order not found");
    }

    return await prisma.$transaction(async (tx) => {

        // Delete order items first
        await tx.orderlineitems.deleteMany({
            where: {
                orderid
            }
        });

        // Delete order header
        return await tx.orderheader.delete({
            where: {
                orderid
            }
        });
    });
};


// Add Order Item
const addOrderItem = async (orderid, itemData) => {

    const order = await prisma.orderheader.findUnique({
        where: {
            orderid
        }
    });

    if (!order) {
        throw new Error("Order not found");
    }

    const quantity = Number(itemData.skuquantity);
    const price = Number(itemData.skuprice);

    const orderItem = await prisma.orderlineitems.create({
        data: {
            orderitemid: generateOrderItemId(),
            orderid,
            skuid: itemData.skuid,
            skuitem: itemData.skuitem,
            skuquantity: String(itemData.skuquantity),
            skuprice: price
        }
    });

    // Get all items for this order
    const items = await prisma.orderlineitems.findMany({
        where: {
            orderid
        }
    });

    // Recalculate subtotal
    let subtotal = 0;

    for (const item of items) {
        subtotal +=
            Number(item.skuquantity) *
            Number(item.skuprice);
    }

    const totalamount =
        subtotal +
        Number(order.taxamount || 0) -
        Number(order.discount || 0);

    // Update order total
    const updatedOrder = await prisma.orderheader.update({
        where: {
            orderid
        },
        data: {
            totalamount,
            syslastmodifieddt: new Date()
        },
        include: {
            customer: true,
            orderlineitems: true
        }
    });

    return updatedOrder;
};


// Remove Order Item
const removeOrderItem = async (orderitemid) => {

    const item = await prisma.orderlineitems.findUnique({
        where: {
            orderitemid
        }
    });

    if (!item) {
        throw new Error("Order item not found");
    }

    const orderid = item.orderid;

    await prisma.orderlineitems.delete({
        where: {
            orderitemid
        }
    });

    // Recalculate order total
    if (orderid) {

        const order = await prisma.orderheader.findUnique({
            where: {
                orderid
            }
        });

        if (order) {

            const items = await prisma.orderlineitems.findMany({
                where: {
                    orderid
                }
            });

            let subtotal = 0;

            for (const currentItem of items) {
                subtotal +=
                    Number(currentItem.skuquantity) *
                    Number(currentItem.skuprice);
            }

            const totalamount =
                subtotal +
                Number(order.taxamount || 0) -
                Number(order.discount || 0);

            await prisma.orderheader.update({
                where: {
                    orderid
                },
                data: {
                    totalamount,
                    syslastmodifieddt: new Date()
                }
            });
        }
    }

    return {
        message: "Order item deleted successfully"
    };
};


module.exports = {
    createOrder,
    getAllOrders,
    getOrderById,
    updateOrder,
    deleteOrder,
    addOrderItem,
    removeOrderItem
};