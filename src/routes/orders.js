const router = require("express").Router();
const prisma = require("../config/prisma");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

// GET /api/orders
router.get("/", async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: {
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id
router.get("/:id", async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
      include: {
        items: true,
      },
    });

    if (!order) return res.status(404).json({ error: "Commande non trouvée" });

    res.json({ order });
  } catch (err) {
    next(err);
  }
});

module.exports = router;