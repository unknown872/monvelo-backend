const router = require("express").Router();
const prisma = require("../config/prisma");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

// GET /api/cart
router.get("/", async (req, res, next) => {
  try {
    const cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                compareAtPrice: true,
                images: true,
                stock: true,
                category: true,
              },
            },
          },
        },
      },
    });

    res.json({ items: cart?.items || [] });
  } catch (err) {
    next(err);
  }
});

// POST /api/cart/items — ajouter ou mettre à jour
router.post("/items", async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    // Vérifier le produit
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: "Produit non trouvé" });
    if (product.stock < quantity) {
      return res.status(400).json({ error: "Stock insuffisant" });
    }

    // Créer le panier s'il n'existe pas
    let cart = await prisma.cart.findUnique({ where: { userId: req.user.id } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId: req.user.id } });
    }

    // Vérifier si le produit est déjà dans le panier
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
    });

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
        },
      });
    }

    // Retourner le panier mis à jour
    const updatedCart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                compareAtPrice: true,
                images: true,
                stock: true,
                category: true,
              },
            },
          },
        },
      },
    });

    res.json({ items: updatedCart.items });
  } catch (err) {
    next(err);
  }
});

// PUT /api/cart/items/:productId — modifier la quantité
router.put("/items/:productId", async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const { productId } = req.params;

    const cart = await prisma.cart.findUnique({ where: { userId: req.user.id } });
    if (!cart) return res.json({ items: [] });

    if (quantity <= 0) {
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id, productId },
      });
    } else {
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (product.stock < quantity) {
        return res.status(400).json({ error: "Stock insuffisant" });
      }

      await prisma.cartItem.update({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },
        data: { quantity },
      });
    }

    const updatedCart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                compareAtPrice: true,
                images: true,
                stock: true,
                category: true,
              },
            },
          },
        },
      },
    });

    res.json({ items: updatedCart?.items || [] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/cart/items/:productId — supprimer un article
router.delete("/items/:productId", async (req, res, next) => {
  try {
    const cart = await prisma.cart.findUnique({ where: { userId: req.user.id } });
    if (!cart) return res.json({ items: [] });

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id, productId: req.params.productId },
    });

    const updatedCart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                compareAtPrice: true,
                images: true,
                stock: true,
                category: true,
              },
            },
          },
        },
      },
    });

    res.json({ items: updatedCart?.items || [] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/cart — vider le panier
router.delete("/", async (req, res, next) => {
  try {
    const cart = await prisma.cart.findUnique({ where: { userId: req.user.id } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    res.json({ items: [] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;