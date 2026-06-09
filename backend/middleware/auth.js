const jwt = require('jsonwebtoken');

const verifyTokenAndRole = (rolesArray) => {
    return (req, res, next) => {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: "Access Denied. No Token Provided." });
        }

        const token = authHeader.split(' ')[1];

        try {
            const verified = jwt.verify(token, process.env.JWT_SECRET);
            req.user = verified; // Attach user info to the request

            // Check if user's role is in the allowed roles array
            if (!rolesArray.includes(req.user.role)) {
                return res.status(403).json({ message: "Forbidden. Invalid Role permissions." });
            }

            next(); // User is verified and has the right role, proceed to route
        } catch (error) {
            res.status(400).json({ message: "Invalid Token" });
        }
    };
};

module.exports = verifyTokenAndRole;