const { PrismaClient } = require("@prisma/client");
const generateCustomerId = require("../src/utils/customerIdGenerator");
const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Starting mock data seeding for TUFDB...");

    // Clear existing data safely in reverse dependency order
    console.log("🧹 Cleaning up existing records...");
    await prisma.promotionaldlq.deleteMany({});
    await prisma.loyaltyledger.deleteMany({});
    await prisma.loyalty.deleteMany({});
    await prisma.orderlineitems.deleteMany({});
    await prisma.orderheader.deleteMany({});
    await prisma.interaction.deleteMany({});
    await prisma.subscriber.deleteMany({});
    await prisma.customer.deleteMany({});

    console.log("✅ Cleanup complete.");

    // Sample data templates
    const customerTemplates = [
        { firstname: "Aarav", lastname: "Sharma", emailadd: "aarav.sharma@example.com", contactnum: "+919876543210", addressline1: "42 MG Road", city: "Bengaluru", pincode: "560001", gender: "M", dob: new Date("1992-05-15"), isloyalty: true },
        { firstname: "Priya", lastname: "Patel", emailadd: "priya.patel@example.com", contactnum: "+919812345678", addressline1: "15 Park Street", city: "Kolkata", pincode: "700016", gender: "F", dob: new Date("1995-11-20"), isloyalty: true },
        { firstname: "Rohan", lastname: "Verma", emailadd: "rohan.verma@example.com", contactnum: "+919988776655", addressline1: "88 Connaught Place", city: "Delhi", pincode: "110001", gender: "M", dob: new Date("1988-03-10"), isloyalty: false },
        { firstname: "Ananya", lastname: "Sen", emailadd: "ananya.sen@example.com", contactnum: "+919765432109", addressline1: "12 Marine Drive", city: "Mumbai", pincode: "400020", gender: "F", dob: new Date("1998-07-25"), isloyalty: true },
        { firstname: "Vikram", lastname: "Singh", emailadd: "vikram.singh@example.com", contactnum: "+919654321098", addressline1: "74 Jubilee Hills", city: "Hyderabad", pincode: "500033", gender: "M", dob: new Date("1985-09-05"), isloyalty: true },
        { firstname: "Sanya", lastname: "Gupta", emailadd: "sanya.gupta@example.com", contactnum: "+919543210987", addressline1: "29 Anna Salai", city: "Chennai", pincode: "600002", gender: "F", dob: new Date("2000-01-18"), isloyalty: false },
        { firstname: "Kabir", lastname: "Mehta", emailadd: "kabir.mehta@example.com", contactnum: "+919432109876", addressline1: "10 Cross Cut Road", city: "Coimbatore", pincode: "641012", gender: "M", dob: new Date("1993-12-04"), isloyalty: true },
        { firstname: "Neha", lastname: "Deshmukh", emailadd: "neha.deshmukh@example.com", contactnum: "+919321098765", addressline1: "55 FC Road", city: "Pune", pincode: "411004", gender: "F", dob: new Date("1991-08-30"), isloyalty: true },
        { firstname: "Dev", lastname: "Nair", emailadd: "dev.nair@example.com", contactnum: "+919210987654", addressline1: "3 M.G. Marg", city: "Kochi", pincode: "682011", gender: "M", dob: new Date("1996-04-12"), isloyalty: false },
        { firstname: "Ishita", lastname: "Roy", emailadd: "ishita.roy@example.com", contactnum: "+919109876543", addressline1: "67 Salt Lake Sector V", city: "Kolkata", pincode: "700091", gender: "F", dob: new Date("1994-06-22"), isloyalty: true }
    ];

    // Assign standard system-formatted Customer IDs (CUST-{timestamp}-{10 alphanumeric chars})
    for (const c of customerTemplates) {
        c.customerid = generateCustomerId();
    }

    console.log(`👤 Ingesting ${customerTemplates.length} Customers...`);
    for (const c of customerTemplates) {
        const now = new Date();
        await prisma.customer.create({
            data: {
                ...c,
                sysenrollmentdt: new Date(now.getTime() - Math.random() * 90 * 24 * 60 * 60 * 1000),
                syslastmodifieddt: now
            }
        });
    }

    // 2. Ingest Subscribers
    console.log("✉️ Ingesting Subscriber Preferences...");
    let subIdx = 1;
    for (const c of customerTemplates) {
        await prisma.subscriber.create({
            data: {
                subscriberid: `SUB-${1000 + subIdx++}`,
                customerid: c.customerid,
                issubscribe: true,
                emailpermstatus: true,
                smspermstatus: Math.random() > 0.3,
                sysmodifieddt: new Date()
            }
        });
    }

    // 3. Ingest Interactions
    console.log("📱 Ingesting Customer Interactions...");
    const interactionModes = ["WEB", "APP", "EMAIL", "CALL_CENTER"];
    const interactionTypes = ["SIGNUP", "PAGE_VIEW", "CART_ADD", "SUPPORT_INQUIRY"];
    let intIdx = 1;
    for (const c of customerTemplates) {
        for (let i = 0; i < 2; i++) {
            const mode = interactionModes[Math.floor(Math.random() * interactionModes.length)];
            const type = interactionTypes[Math.floor(Math.random() * interactionTypes.length)];
            await prisma.interaction.create({
                data: {
                    interactionid: `INT-${2000 + intIdx++}`,
                    customerid: c.customerid,
                    interactionmode: mode,
                    interactionvalue: type === "SIGNUP" ? "ACCOUNT_CREATION" : `VIEW_ITEM_${Math.floor(Math.random() * 100)}`,
                    interactiontype: type,
                    syslastmodifieddt: new Date()
                }
            });
        }
    }

    // 4. Ingest Loyalty Profiles & Ledgers
    console.log("🏆 Ingesting Loyalty Tiers & Ledgers...");
    let ledgerIdx = 1;
    for (const c of customerTemplates) {
        if (!c.isloyalty) continue;

        const totalPoints = Math.floor(Math.random() * 8500) + 500;
        let tier = "Bronze";
        if (totalPoints >= 5000) tier = "Gold";
        else if (totalPoints >= 2000) tier = "Silver";

        await prisma.loyalty.create({
            data: {
                customerid: c.customerid,
                totalpoints: totalPoints,
                tier: tier,
                isactive: true,
                lastearnedat: new Date(),
                lastredeemedat: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                createdat: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
                updatedat: new Date()
            }
        });

        // Add ledger record
        await prisma.loyaltyledger.create({
            data: {
                customerid: c.customerid,
                orderid: `ORD-INIT-${c.customerid}`,
                ledgertype: "EARNED",
                points: totalPoints,
                balanceafter: totalPoints,
                expirydate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                createdat: new Date()
            }
        });
    }

    // 5. Products catalog mock pool for line items
    const skuCatalog = [
        { skuid: "SKU-ELEC-001", skuitem: "Wireless Noise-Canceling Headphones", skuprice: 199.99 },
        { skuid: "SKU-ELEC-002", skuitem: "Smart Fitness Watch V2", skuprice: 149.50 },
        { skuid: "SKU-ELEC-003", skuitem: "USB-C Fast Charging Hub 65W", skuprice: 39.99 },
        { skuid: "SKU-CLOT-101", skuitem: "Classic Slim Fit Denim Jacket", skuprice: 79.00 },
        { skuid: "SKU-CLOT-102", skuitem: "Organic Cotton Graphic Tee", skuprice: 24.99 },
        { skuid: "SKU-HOME-201", skuitem: "Ergonomic Memory Foam Pillow", skuprice: 45.00 },
        { skuid: "SKU-HOME-202", skuitem: "Stainless Steel Smart Water Bottle", skuprice: 29.99 }
    ];

    // 6. Ingest Orders & Line Items
    console.log("🛍️ Ingesting Orders & Line Items...");
    const channels = ["WEB", "MOBILE", "STORE"];
    const payments = ["CARD", "UPI", "PAYPAL", "NETBANKING"];
    let orderCounter = 5000;
    let itemCounter = 9000;

    for (const c of customerTemplates) {
        const numOrders = Math.floor(Math.random() * 3) + 1;

        for (let o = 0; o < numOrders; o++) {
            const orderid = `ORD-${orderCounter++}`;
            const channel = channels[Math.floor(Math.random() * channels.length)];
            const payment = payments[Math.floor(Math.random() * payments.length)];

            // Select 1 to 3 items
            const orderItemsCount = Math.floor(Math.random() * 3) + 1;
            let subtotal = 0;
            const selectedItems = [];

            for (let i = 0; i < orderItemsCount; i++) {
                const sku = skuCatalog[Math.floor(Math.random() * skuCatalog.length)];
                const quantity = Math.floor(Math.random() * 2) + 1;
                subtotal += sku.skuprice * quantity;
                selectedItems.push({ sku, quantity });
            }

            const taxamount = Math.round(subtotal * 0.18 * 100) / 100;
            const discount = c.isloyalty ? Math.round(subtotal * 0.10 * 100) / 100 : 0;
            const totalamount = Math.round((subtotal + taxamount - discount) * 100) / 100;

            await prisma.orderheader.create({
                data: {
                    orderid: orderid,
                    customerid: c.customerid,
                    totalamount: totalamount,
                    taxamount: taxamount,
                    channel: channel,
                    payment: payment,
                    discount: discount,
                    isloyalty: c.isloyalty,
                    syslastmodifieddt: new Date()
                }
            });

            for (const item of selectedItems) {
                await prisma.orderlineitems.create({
                    data: {
                        orderitemid: `ORDITEM-${itemCounter++}`,
                        orderid: orderid,
                        skuid: item.sku.skuid,
                        skuitem: item.sku.skuitem,
                        skuquantity: String(item.quantity),
                        skuprice: item.sku.skuprice
                    }
                });
            }
        }
    }

    // 7. Ingest Promotional DLQ records
    console.log("📬 Ingesting Promotional DLQ Test Records...");
    await prisma.promotionaldlq.create({
        data: {
            eventid: `EVT-DLQ-1001`,
            customerid: customerTemplates[2].customerid,
            emailaddress: "rohan.verma@example.com",
            subject: "Exclusive Weekend Flash Sale - 20% Off!",
            payload: { promoCode: "FLASH20", validTill: "2026-08-31" },
            errormessage: "SMTP connection timed out after 30000ms",
            attemptcount: 2,
            status: "PENDING",
            createdat: new Date(),
            nextretryat: new Date(Date.now() + 15 * 60 * 1000)
        }
    });

    console.log("🎉 All mock data populated successfully!");
}

if (require.main === module) {
    main()
        .catch((e) => {
            console.error("❌ Error seeding mock data:", e);
            process.exit(1);
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}

module.exports = main;
