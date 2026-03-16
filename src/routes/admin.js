const router = require("express").Router();
const prisma = require("../config/prisma");
const { authenticate, requireAdmin } = require("../middleware/auth");

router.use(authenticate, requireAdmin);

// GET /api/admin/stats
router.get("/stats", async (_req, res, next) => {
  try {
    const [totalOrders, revenueResult, totalProducts, totalCustomers] =
      await Promise.all([
        prisma.order.count(),
        prisma.order.aggregate({
          where: { paymentStatus: "PAID" },
          _sum: { total: true },
        }),
        prisma.product.count(),
        prisma.user.count({ where: { role: "CUSTOMER" } }),
      ]);

    res.json({
      totalOrders,
      totalRevenue: revenueResult._sum.total || 0,
      totalProducts,
      totalCustomers,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/products
router.get("/products", async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.product.count({ where }),
    ]);

    res.json({ products, total, page: Number(page) });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/products
router.post("/products", async (req, res, next) => {
  try {
    const { name, description, price, compareAtPrice, category, images, stock, isNew, specs } = req.body;

    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) {
      return res.status(409).json({ error: "Un produit avec ce nom existe déjà" });
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        price: Number(price),
        compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
        category,
        images: images || [],
        stock: Number(stock),
        isNew: isNew || false,
        specs: specs || null,
      },
    });

    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/products/:id
router.put("/products/:id", async (req, res, next) => {
  try {
    const { name, description, price, compareAtPrice, category, images, stock, isNew, isActive, specs } = req.body;

    const existing = await prisma.product.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ error: "Produit non trouvé" });
    }

    const data = {};
    if (name !== undefined) {
      data.name = name;
      data.slug = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    }
    if (description !== undefined) data.description = description;
    if (price !== undefined) data.price = Number(price);
    if (compareAtPrice !== undefined) data.compareAtPrice = compareAtPrice ? Number(compareAtPrice) : null;
    if (category !== undefined) data.category = category;
    if (images !== undefined) data.images = images;
    if (stock !== undefined) data.stock = Number(stock);
    if (isNew !== undefined) data.isNew = isNew;
    if (isActive !== undefined) data.isActive = isActive;
    if (specs !== undefined) data.specs = specs;

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ product });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/products/:id
router.delete("/products/:id", async (req, res, next) => {
  try {
    await prisma.product.delete({
      where: { id: req.params.id },
    });
    res.json({ message: "Produit supprimé" });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/orders
router.get("/orders", async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          items: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ orders, total, page: Number(page) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/orders/:id/status
router.put("/orders/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body;

    const validStatuses = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Statut invalide" });
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        items: true,
      },
    });

    res.json({ order });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/customers
router.get("/customers", async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [customers, total] = await Promise.all([
      prisma.user.findMany({
        where: { role: "CUSTOMER" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
    ]);

    res.json({ customers, total, page: Number(page) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;