const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "secret123";

function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ message: "Missing Authorization header" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, username, isAuthor }
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

module.exports = authMiddleware;
