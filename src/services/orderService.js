const prisma = require('../utils/db');

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
        items
    } = orderData;

    return await prisma.$transaction(async (tx) => {

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

        const finalAmount =
            subtotal +
            Number(taxamount) -
            Number(discount);

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

        // Credit loyalty points synchronously if order is marked for loyalty
        if (isloyalty) {
            const pointsToCredit = Math.floor(Number(finalAmount) / 10); // 1 point per $10 spent

            if (pointsToCredit > 0) {
                // Fetch customer's current loyalty record
                const existingLoyalty = await tx.loyalty.findFirst({
                    where: { customerid },
                    orderBy: { createdat: 'desc' }
                });

                const currentPoints = existingLoyalty ? Number(existingLoyalty.totalpoints || 0) : 0;
                const newTotalPoints = currentPoints + pointsToCredit;

                const { calculateTier } = require('../utils/loyalty');
                const newTier = calculateTier(newTotalPoints);

                // Create loyalty ledger entry (audit trail)
                await tx.loyaltyledger.create({
                    data: {
                        customerid,
                        orderid,
                        ledgertype: 'EARN',
                        points: pointsToCredit,
                        balanceafter: newTotalPoints,
                        expirydate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Expiry after 1 year
                        createdat: new Date()
                    }
                });

                // Update or Create loyalty record
                if (existingLoyalty) {
                    await tx.loyalty.update({
                        where: { loyaltyid: existingLoyalty.loyaltyid },
                        data: {
                            totalpoints: newTotalPoints,
                            tier: newTier,
                            lastearnedat: new Date(),
                            updatedat: new Date()
                        }
                    });
                } else {
                    await tx.loyalty.create({
                        data: {
                            customerid,
                            totalpoints: newTotalPoints,
                            tier: newTier,
                            isactive: true,
                            lastearnedat: new Date(),
                            lastredeemedat: new Date(),
                            createdat: new Date(),
                            updatedat: new Date()
                        }
                    });
                }
            }
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
        }
    });

    if (!existingOrder) {
        throw new Error("Order not found");
    }

    const {
        channel,
        payment,
        discount,
        taxamount,
        isloyalty
    } = orderData;

    return await prisma.orderheader.update({
        where: {
            orderid
        },
        data: {
            channel,
            payment,
            discount,
            taxamount,
            isloyalty,
            syslastmodifieddt: new Date()
        },
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