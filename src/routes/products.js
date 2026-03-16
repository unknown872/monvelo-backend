const router = require("express").Router();
const prisma = require("../config/prisma");

// GET /api/products
router.get("/", async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      search,
      sort = "newest",
      minPrice,
      maxPrice,
      isNew,
    } = req.query;

    const where = { isActive: true };

    if (category) where.category = category;
    if (isNew === "true") where.isNew = true;
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = Number(minPrice);
      if (maxPrice) where.price.lte = Number(maxPrice);
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Tri
    let orderBy;
    switch (sort) {
      case "price-asc":
        orderBy = { price: "asc" };
        break;
      case "price-desc":
        orderBy = { price: "desc" };
        break;
      case "name":
        orderBy = { name: "asc" };
        break;
      default:
        orderBy = { createdAt: "desc" };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: Number(limit),
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      products,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      total,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/categories
router.get("/categories", async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ["category"],
    });

    const categories = products.map((p) => p.category);
    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:slug
router.get("/:slug", async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
    });

    if (!product || !product.isActive) {
      return res.status(404).json({ error: "Produit non trouvé" });
    }

    res.json({ product });
  } catch (err) {
    next(err);
  }
});

module.exports = router;