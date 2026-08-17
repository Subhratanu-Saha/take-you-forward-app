const validateCustomerId = (req, res, next) => {
    try {
        const paramCustomerId = req.params?.customerid;
        const bodyCustomerId = req.body?.customerid;

        // Get customer ID from URL or body
        const customerid = paramCustomerId || bodyCustomerId;

        // Customer ID is required
        if (!customerid) {
            return res.status(400).json({
                success: false,
                message: "customerid is required"
            });
        }

        // Customer ID must be a string
        if (typeof customerid !== "string") {
            return res.status(400).json({
                success: false,
                message: "customerid must be a string"
            });
        }

        // Remove unnecessary spaces
        const normalizedCustomerId = customerid.trim();

        // Customer ID cannot be empty
        if (normalizedCustomerId.length === 0) {
            return res.status(400).json({
                success: false,
                message: "customerid cannot be empty"
            });
        }

        if (paramCustomerId && bodyCustomerId) {
            const normalizedParamCustomerId =
                paramCustomerId.trim();

            const normalizedBodyCustomerId =
                bodyCustomerId.trim();

            if (
                normalizedParamCustomerId !==
                normalizedBodyCustomerId
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "customerid in URL and request body must match"
                });
            }
        }


        if (req.params?.customerid) {
            req.params.customerid =
                req.params.customerid.trim();
        }

        // Normalize body customerid
        if (req.body?.customerid) {
            req.body.customerid =
                req.body.customerid.trim();
        }

        next();
    } catch (error) {
        console.error(
            "[LOYALTY_VALIDATOR] Customer ID validation error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error during customerid validation"
        });
    }
};


const validateTotalPoints = (req, res, next) => {
    try {
        // totalpoints must exist
        if (
            !req.body ||
            !Object.prototype.hasOwnProperty.call(
                req.body,
                "totalpoints"
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "totalpoints is required"
            });
        }

        let totalpoints = req.body.totalpoints;

        // Reject null
        if (totalpoints === null) {
            return res.status(400).json({
                success: false,
                message: "totalpoints cannot be null"
            });
        }

        // Convert numeric strings to numbers
        if (typeof totalpoints === "string") {
            const trimmedValue = totalpoints.trim();

            // Empty string is invalid
            if (trimmedValue === "") {
                return res.status(400).json({
                    success: false,
                    message: "totalpoints cannot be empty"
                });
            }

            totalpoints = Number(trimmedValue);
        }

        // Must be a number
        if (
            typeof totalpoints !== "number" ||
            !Number.isFinite(totalpoints)
        ) {
            return res.status(400).json({
                success: false,
                message: "totalpoints must be a valid number"
            });
        }

        // Negative points are not allowed
        if (totalpoints < 0) {
            return res.status(400).json({
                success: false,
                message: "totalpoints cannot be negative"
            });
        }

        // Decimal points are not allowed
        if (!Number.isInteger(totalpoints)) {
            return res.status(400).json({
                success: false,
                message: "totalpoints must be a whole number"
            });
        }

        // Store normalized number back into request body
        req.body.totalpoints = totalpoints;

        next();
    } catch (error) {
        console.error(
            "[LOYALTY_VALIDATOR] Total points validation error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Internal server error during totalpoints validation"
        });
    }
};

const validateLoyaltyRequest = [
    validateCustomerId,
    validateTotalPoints
];

const validateLoyaltyFetchRequest = [
    validateCustomerId
];


module.exports = {
    validateCustomerId,
    validateTotalPoints,
    validateLoyaltyRequest,
    validateLoyaltyFetchRequest
};