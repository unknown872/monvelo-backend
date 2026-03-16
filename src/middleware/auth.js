const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentification requise" });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
      },
    });

    if (!user) return res.status(401).json({ error: "Utilisateur non trouvé" });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Token invalide ou expiré" });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Accès administrateur requis" });
  }
  next();
};

module.exports = { authenticate, requireAdmin };