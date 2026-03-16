const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const prisma = require("../config/prisma");
const { authenticate } = require("../middleware/auth");

const formatPhone = (phone) => {
  // Supprime les espaces et tirets
  let cleaned = phone.replace(/[\s\-]/g, "");
  // Ajoute le préfixe +221 si absent
  if (!cleaned.startsWith("+221")) {
    if (cleaned.startsWith("221")) {
      cleaned = "+" + cleaned;
    } else if (cleaned.startsWith("0")) {
      cleaned = "+221" + cleaned.substring(1);
    } else {
      cleaned = "+221" + cleaned;
    }
  }
  return cleaned;
};

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// POST /api/auth/register
router.post(
  "/register",
  [
    body("firstName").trim().notEmpty().withMessage("Prénom requis"),
    body("lastName").trim().notEmpty().withMessage("Nom requis"),
    body("email").isEmail().withMessage("Email valide requis"),
    body("phone").trim().notEmpty().withMessage("Téléphone requis"),
    body("password").isLength({ min: 6 }).withMessage("Mot de passe minimum 6 caractères"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { firstName, lastName, email, phone, password } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ error: "Cet email est déjà utilisé" });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const formattedPhone = formatPhone(phone);

      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          phone: formattedPhone,
          password: hashedPassword,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
        },
      });

      const token = signToken(user.id);
      res.status(201).json({ token, user });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Email valide requis"),
    body("password").notEmpty().withMessage("Mot de passe requis"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ error: "Email ou mot de passe incorrect" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: "Email ou mot de passe incorrect" });
      }

      const token = signToken(user.id);
      res.json({
        token,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/auth/me
router.get("/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/auth/me
router.put("/me", authenticate, async (req, res, next) => {
  try {
    const { firstName, lastName, phone } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { firstName, lastName, phone },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
      },
    });

    res.json({ user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;