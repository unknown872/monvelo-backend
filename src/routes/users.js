const prisma = require('../config/prisma');
const router = require("express").Router();

router.get("/", async (_req, res) => {
  try {
    const users = await prisma.user.findMany();

    if(users.length === 0) {
      return res.status(404).json({ error: "Aucun utilisateur trouvé" });
    }

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;