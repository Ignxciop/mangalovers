import jwt from "jsonwebtoken";

export const authenticate = async (req, res, next) => {
    try {
        const token =
            req.headers.authorization?.split(" ")[1] || req.cookies?.token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Token no proporcionado",
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { userId: decoded.userId };
        next();
    } catch (error) {
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                success: false,
                message: "Token inválido",
            });
        }
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Token expirado",
            });
        }
        next(error);
    }
};
