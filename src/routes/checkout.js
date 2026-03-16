const router = require("express").Router();
const prisma = require("../config/prisma");
const { authenticate } = require("../middleware/auth");
const https = require("https");

function paytechRequest(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);

    const options = {
      hostname: "paytech.sn",
      port: 443,
      path: "/api/payment/request-payment",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        "API_KEY": process.env.PAYTECH_API_KEY,
        "API_SECRET": process.env.PAYTECH_API_SECRET,
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          console.log("PayTech response:", body);
          resolve(JSON.parse(body));
        } catch {
          reject(new Error("Réponse PayTech invalide"));
        }
      });
    });

    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

// POST /api/checkout/create
router.post("/create", authenticate, async (req, res, next) => {
  try {
    const {
      deliveryZone,
      deliveryFee,
      deliveryAddress,
      instructions,
      firstName,
      lastName,
      phone,
    } = req.body;

    if (!deliveryZone || !deliveryAddress || !deliveryFee) {
      return res.status(400).json({ error: "Informations de livraison requises" });
    }

    const cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: "Votre panier est vide" });
    }

    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        return res.status(400).json({
          error: `Stock insuffisant pour ${item.product.name}`,
        });
      }
    }

    const subtotal = cart.items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    const total = subtotal + Number(deliveryFee);

    const order = await prisma.order.create({
      data: {
        userId: req.user.id,
        deliveryZone,
        deliveryFee: Number(deliveryFee),
        deliveryAddress,
        instructions: instructions || null,
        subtotal,
        total,
        items: {
          create: cart.items.map((item) => ({
            productId: item.product.id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            image: item.product.images[0] || null,
          })),
        },
      },
    });

    const refCommand = "CMD_" + Date.now();

    const paymentData = {
      item_name: "Commande Mon Vélo #" + order.id.slice(-8).toUpperCase(),
      item_price: total,
      currency: "XOF",
      ref_command: refCommand,
      command_name: "Commande de " + firstName + " " + lastName,
      env: process.env.PAYTECH_ENV || "test",
      ipn_url: process.env.BACKEND_URL + "/api/checkout/ipn",
      success_url: process.env.BACKEND_URL + "/api/checkout/success-redirect?order_id=" + order.id,
      cancel_url: process.env.BACKEND_URL + "/api/checkout/cancel-redirect?order_id=" + order.id,
      custom_field: JSON.stringify({
        orderId: order.id,
        phone: phone,
      }),
    };

    console.log("PayTech request:", paymentData);

    const paytechResponse = await paytechRequest(paymentData);

    if (paytechResponse.success === 1) {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentRef: paytechResponse.token },
      });

      res.json({
        paymentUrl: paytechResponse.redirect_url,
        token: paytechResponse.token,
        orderId: order.id,
      });
    } else {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", paymentStatus: "FAILED" },
      });

      res.status(400).json({
        error: "Erreur lors de l'initialisation du paiement",
        details: paytechResponse,
      });
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/checkout/success-redirect — redirection après paiement réussi
router.get("/success-redirect", async (req, res) => {
  const { order_id } = req.query;
  res.redirect(process.env.FRONTEND_URL + "/checkout/success?order_id=" + order_id);
});

// GET /api/checkout/cancel-redirect — redirection après annulation
router.get("/cancel-redirect", async (req, res) => {
  const { order_id } = req.query;
  res.redirect(process.env.FRONTEND_URL + "/cart");
});

// POST /api/checkout/ipn — notification PayTech
router.post("/ipn", async (req, res, next) => {
  try {
    const {
      ref_command,
      type_event,
      custom_field,
    } = req.body;

    let orderId;
    try {
      const custom = JSON.parse(custom_field);
      orderId = custom.orderId;
    } catch {
      orderId = ref_command;
    }

    if (type_event === "sale_complete") {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (order && order.paymentStatus !== "PAID") {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: "PAID",
            status: "CONFIRMED",
          },
        });

        for (const item of order.items) {
          await prisma.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }

        const cart = await prisma.cart.findUnique({
          where: { userId: order.userId },
        });
        if (cart) {
          await prisma.cartItem.deleteMany({
            where: { cartId: cart.id },
          });
        }
      }
    }

    if (type_event === "sale_canceled") {
      if (orderId) {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: "FAILED",
            status: "CANCELLED",
          },
        });
      }
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/checkout/verify/:orderId
router.get("/verify/:orderId", authenticate, async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id: req.params.orderId,
        userId: req.user.id,
      },
      include: { items: true },
    });

    if (!order) return res.status(404).json({ error: "Commande non trouvée" });

    res.json({
      orderId: order.id,
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: order.total,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/checkout/confirm/:orderId — confirmation manuelle après paiement
router.post("/confirm/:orderId", authenticate, async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id: req.params.orderId,
        userId: req.user.id,
      },
      include: { items: true },
    });

    if (!order) return res.status(404).json({ error: "Commande non trouvée" });

    if (order.paymentStatus === "PAID") {
      return res.json({ message: "Commande déjà confirmée", order });
    }

    // Mettre à jour la commande
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        status: "CONFIRMED",
      },
      include: { items: true },
    });

    // Décrémenter le stock
    for (const item of order.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    // Vider le panier
    const cart = await prisma.cart.findUnique({
      where: { userId: order.userId },
    });
    if (cart) {
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }

    res.json({ message: "Paiement confirmé", order: updatedOrder });
  } catch (err) {
    next(err);
  }
});

module.exports = router;