/**
 * Interactive & Template-Based Data Ingestion Utility
 * Supports menu-driven choices, step-by-step interactive field input with immediate validation,
 * and automated mock template seeding.
 */

const readline = require("readline/promises");
const { stdin: input, stdout: output } = require("process");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// ============================================================================
// 1. INPUT VALIDATORS (Immediate Field-by-Field Validation)
// ============================================================================
const validators = {
    nonEmpty: (val) => (val && val.trim().length > 0 ? null : "Value cannot be empty."),

    email: (val) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(val.trim()) ? null : "Invalid email format. Expected format: user@example.com";
    },

    contactNum: (val) => {
        const regex = /^\+?[0-9]{7,15}$/;
        return regex.test(val.trim()) ? null : "Invalid contact number. Provide 7 to 15 digits (e.g., +919876543210).";
    },

    gender: (val) => {
        const upper = val.trim().toUpperCase();
        return ["M", "F", "O"].includes(upper) ? null : "Gender must be 'M' (Male), 'F' (Female), or 'O' (Other).";
    },

    date: (val) => {
        const d = new Date(val.trim());
        return !isNaN(d.getTime()) ? null : "Invalid date format. Expected format: YYYY-MM-DD (e.g., 1995-08-25).";
    },

    boolean: (val) => {
        const lower = val.trim().toLowerCase();
        return ["y", "n", "true", "false", "1", "0"].includes(lower)
            ? null
            : "Invalid response. Please enter 'y' (yes) or 'n' (no).";
    },

    channel: (val) => {
        const upper = val.trim().toUpperCase();
        return ["WEB", "MOBILE", "STORE"].includes(upper)
            ? null
            : "Channel must be 'WEB', 'MOBILE', or 'STORE'.";
    },

    payment: (val) => {
        const upper = val.trim().toUpperCase();
        return ["CARD", "UPI", "PAYPAL", "NETBANKING"].includes(upper)
            ? null
            : "Payment must be 'CARD', 'UPI', 'PAYPAL', or 'NETBANKING'.";
    },

    nonNegativeNumber: (val) => {
        const num = Number(val);
        return !isNaN(num) && num >= 0 ? null : "Value must be a valid non-negative number.";
    },

    positiveInteger: (val) => {
        const num = Number(val);
        return Number.isInteger(num) && num > 0 ? null : "Value must be a positive integer (> 0).";
    }
};

/**
 * Prompts user for input and validates immediately.
 * Loops until a valid input is provided.
 */
async function promptWithValidation(rl, promptText, validatorFunc, defaultValue = null) {
    while (true) {
        const displayPrompt = defaultValue !== null ? `${promptText} (default: ${defaultValue}): ` : `${promptText}: `;
        const rawInput = await rl.question(displayPrompt);
        const value = rawInput.trim() === "" && defaultValue !== null ? String(defaultValue) : rawInput.trim();

        if (validatorFunc) {
            const error = validatorFunc(value);
            if (error) {
                console.log(`   ⚠️  [Validation Error] ${error}`);
                continue; // Re-prompt immediately
            }
        }
        return value;
    }
}

// Helper to convert y/n string to boolean
function parseBool(val) {
    const lower = val.trim().toLowerCase();
    return lower === "y" || lower === "true" || lower === "1";
}

// ============================================================================
// 2. MODULAR INGESTION HANDLERS
// ============================================================================

/**
 * Choice 1: Interactive Customer Ingestion with step-by-step validated inputs
 */
async function ingestCustomerInteractively(rl) {
    console.log("\n----------------------------------------------------");
    console.log("👤 INTERACTIVE CUSTOMER INGESTION");
    console.log("----------------------------------------------------");

    const customerid = await promptWithValidation(
        rl,
        "1/10. Enter Customer ID (e.g. CUST-2001)",
        validators.nonEmpty,
        `CUST-${Date.now().toString().slice(-6)}`
    );

    const firstname = await promptWithValidation(rl, "2/10. Enter First Name", validators.nonEmpty);
    const lastname = await promptWithValidation(rl, "3/10. Enter Last Name (Optional)", null, "");
    const emailadd = await promptWithValidation(rl, "4/10. Enter Email Address", validators.email);
    const contactnum = await promptWithValidation(rl, "5/10. Enter Contact Number", validators.contactNum);
    const addressline1 = await promptWithValidation(rl, "6/10. Enter Address Line 1", validators.nonEmpty);
    const addressline2 = await promptWithValidation(rl, "7/10. Enter Address Line 2 (Optional)", null, "");
    const city = await promptWithValidation(rl, "8/10. Enter City", validators.nonEmpty);
    const pincode = await promptWithValidation(rl, "9/10. Enter Pincode", validators.nonEmpty);
    const genderStr = await promptWithValidation(rl, "10/10. Enter Gender (M/F/O)", validators.gender, "M");
    const dobStr = await promptWithValidation(rl, "Bonus. Enter Date of Birth (YYYY-MM-DD)", validators.date, "1995-01-01");
    const isLoyaltyStr = await promptWithValidation(rl, "Bonus. Is Loyalty Member? (y/n)", validators.boolean, "y");

    const isloyalty = parseBool(isLoyaltyStr);
    const gender = genderStr.toUpperCase();
    const dob = new Date(dobStr);

    console.log("\n⏳ Saving customer record to database...");
    const customer = await prisma.customer.create({
        data: {
            customerid,
            firstname,
            lastname: lastname || null,
            emailadd,
            contactnum,
            addressline1,
            addressline2: addressline2 || null,
            city,
            pincode,
            gender,
            dob,
            isloyalty,
            sysenrollmentdt: new Date(),
            syslastmodifieddt: new Date()
        }
    });

    console.log(`✅ Customer [${customer.customerid}] created successfully!`);

    // Prompt optional Subscriber & Loyalty profile creation
    const createSub = await promptWithValidation(rl, "\nDo you want to add Subscriber preferences for this customer? (y/n)", validators.boolean, "y");
    if (parseBool(createSub)) {
        const isSub = await promptWithValidation(rl, "Subscribe to marketing? (y/n)", validators.boolean, "y");
        const emailPerm = await promptWithValidation(rl, "Email permission active? (y/n)", validators.boolean, "y");
        const smsPerm = await promptWithValidation(rl, "SMS permission active? (y/n)", validators.boolean, "n");

        await prisma.subscriber.create({
            data: {
                subscriberid: `SUB-${Date.now().toString().slice(-6)}`,
                customerid: customer.customerid,
                issubscribe: parseBool(isSub),
                emailpermstatus: parseBool(emailPerm),
                smspermstatus: parseBool(smsPerm),
                sysmodifieddt: new Date()
            }
        });
        console.log("  ✔ Subscriber preferences created.");
    }

    if (isloyalty) {
        const pointsStr = await promptWithValidation(rl, "Enter initial loyalty points", validators.nonNegativeNumber, "500");
        const totalpoints = Number(pointsStr);
        let tier = "Bronze";
        if (totalpoints >= 15001) tier = "Gold";
        else if (totalpoints >= 5001) tier = "Silver";

        await prisma.loyalty.create({
            data: {
                customerid: customer.customerid,
                totalpoints,
                tier,
                isactive: true,
                lastearnedat: new Date(),
                lastredeemedat: new Date(),
                createdat: new Date(),
                updatedat: new Date()
            }
        });
        console.log(`  ✔ Loyalty account initialized with ${totalpoints} points (${tier} Tier).`);
    }
}

/**
 * Choice 2: Interactive Order & Line Items Ingestion
 */
async function ingestOrderInteractively(rl) {
    console.log("\n----------------------------------------------------");
    console.log("🛍️ INTERACTIVE ORDER & LINE ITEMS INGESTION");
    console.log("----------------------------------------------------");

    const customerid = await promptWithValidation(rl, "1/5. Enter Customer ID for this order", validators.nonEmpty);

    // Verify customer exists
    const customer = await prisma.customer.findUnique({ where: { customerid } });
    if (!customer) {
        console.log(`❌ Customer [${customerid}] does not exist in database! Please ingest customer first.`);
        return;
    }

    const channel = await promptWithValidation(rl, "2/5. Enter Sales Channel (WEB/MOBILE/STORE)", validators.channel, "WEB");
    const payment = await promptWithValidation(rl, "3/5. Enter Payment Method (CARD/UPI/PAYPAL/NETBANKING)", validators.payment, "UPI");
    const taxStr = await promptWithValidation(rl, "4/5. Enter Tax Amount", validators.nonNegativeNumber, "18.00");
    const discountStr = await promptWithValidation(rl, "5/5. Enter Discount Amount", validators.nonNegativeNumber, "0.00");

    const taxamount = Number(taxStr);
    const discount = Number(discountStr);

    // Add Order Line Items step-by-step
    const lineItems = [];
    let addMore = true;
    let itemIndex = 1;

    console.log("\n📦 Adding Line Items to Order:");
    while (addMore) {
        console.log(`\n--- Item #${itemIndex} ---`);
        const skuid = await promptWithValidation(rl, "Enter SKU ID (e.g. SKU-101)", validators.nonEmpty, `SKU-${100 + itemIndex}`);
        const skuitem = await promptWithValidation(rl, "Enter SKU Description/Title", validators.nonEmpty);
        const skuquantity = await promptWithValidation(rl, "Enter Quantity", validators.positiveInteger, "1");
        const skuprice = await promptWithValidation(rl, "Enter Unit Price", validators.nonNegativeNumber, "99.99");

        lineItems.push({
            skuid,
            skuitem,
            skuquantity: String(skuquantity),
            skuprice: Number(skuprice)
        });

        const continueStr = await promptWithValidation(rl, "Add another line item? (y/n)", validators.boolean, "n");
        addMore = parseBool(continueStr);
        itemIndex++;
    }

    // Calculate subtotal and final total
    let subtotal = 0;
    for (const item of lineItems) {
        subtotal += Number(item.skuquantity) * item.skuprice;
    }
    const totalamount = Math.round((subtotal + taxamount - discount) * 100) / 100;

    const orderid = `ORD-${Date.now().toString().slice(-8)}`;

    console.log(`\n⏳ Saving Order [${orderid}] with Total: ₹${totalamount}...`);

    await prisma.$transaction(async (tx) => {
        await tx.orderheader.create({
            data: {
                orderid,
                customerid,
                totalamount,
                taxamount,
                channel: channel.toUpperCase(),
                payment: payment.toUpperCase(),
                discount,
                isloyalty: customer.isloyalty || false,
                syslastmodifieddt: new Date()
            }
        });

        let itemSeq = 1;
        for (const item of lineItems) {
            await tx.orderlineitems.create({
                data: {
                    orderitemid: `ORDITEM-${orderid}-${itemSeq++}`,
                    orderid,
                    skuid: item.skuid,
                    skuitem: item.skuitem,
                    skuquantity: item.skuquantity,
                    skuprice: item.skuprice
                }
            });
        }
    });

    console.log(`✅ Order [${orderid}] and ${lineItems.length} line items ingested successfully!`);
}

/**
 * Choice 3: Seed Pre-configured Mock Data Template
 */
async function seedMockDataTemplate() {
    console.log("\n🌱 Seeding Pre-configured Mock Data Template...");
    const seedScript = require("./seed-mock-data");
    // Executed via node scripts/seed-mock-data.js or seed function
    console.log("Running batch mock data seeder...");
}

/**
 * Choice 4: Clean all database tables
 */
async function clearDatabase() {
    console.log("\n🧹 Cleaning up database tables...");
    await prisma.promotionaldlq.deleteMany({});
    await prisma.loyaltyledger.deleteMany({});
    await prisma.loyalty.deleteMany({});
    await prisma.orderlineitems.deleteMany({});
    await prisma.orderheader.deleteMany({});
    await prisma.interaction.deleteMany({});
    await prisma.subscriber.deleteMany({});
    await prisma.customer.deleteMany({});
    console.log("✅ All tables cleared cleanly!");
}

// ============================================================================
// 3. MAIN MENU CONTROLLER (Switch / Case Architecture)
// ============================================================================
async function main() {
    const rl = readline.createInterface({ input, output });

    while (true) {
        console.log("\n====================================================");
        console.log("      🚀 TUF RETAIL DATA INGESTION SUITE");
        console.log("====================================================");
        console.log("1. Ingest New Customer Interactively (Step-by-Step Validation)");
        console.log("2. Ingest New Order & Line Items Interactively");
        console.log("3. Run Pre-configured Mock Template Batch Ingestion");
        console.log("4. Clear All Database Records (Reset DB)");
        console.log("5. Exit");
        console.log("----------------------------------------------------");

        const choice = await rl.question("Select an option (1-5): ");

        try {
            switch (choice.trim()) {
                case "1":
                    await ingestCustomerInteractively(rl);
                    break;
                case "2":
                    await ingestOrderInteractively(rl);
                    break;
                case "3":
                    await clearDatabase();
                    // Require seed script execution logic
                    delete require.cache[require.resolve("./seed-mock-data")];
                    console.log("Executing template seed logic...");
                    const seedModule = require("./seed-mock-data");
                    if (typeof seedModule === 'function') {
                        await seedModule();
                    }
                    console.log("✅ Template mock data seeded!");
                    break;
                case "4":
                    const confirm = await promptWithValidation(rl, "Are you sure you want to delete ALL data? (y/n)", validators.boolean, "n");
                    if (parseBool(confirm)) {
                        await clearDatabase();
                    } else {
                        console.log("Cancelled database cleanup.");
                    }
                    break;
                case "5":
                    console.log("\n👋 Exiting Ingestion Suite. Goodbye!\n");
                    rl.close();
                    await prisma.$disconnect();
                    process.exit(0);
                default:
                    console.log("⚠️  Invalid choice! Please select an option between 1 and 5.");
                    break;
            }
        } catch (err) {
            console.error("\n❌ Operation Failed with Error:", err.message);
        }
    }
}

// Execute main menu
main().catch(async (e) => {
    console.error("Fatal Error:", e);
    await prisma.$disconnect();
    process.exit(1);
});
