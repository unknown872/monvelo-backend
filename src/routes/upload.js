const router = require("express").Router();
const multer = require("multer");
const supabase = require("../config/supabase");
const { authenticate, requireAdmin } = require("../middleware/auth");

// Multer en mémoire (pas de fichier sur disque)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Seules les images sont acceptées"), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// POST /api/upload — upload une ou plusieurs images
router.post("/", authenticate, requireAdmin, upload.array("images", 5), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Aucune image envoyée" });
    }

    const uploadedUrls = [];

    for (const file of req.files) {
      const fileName = `${Date.now()}-${file.originalname.replace(/\s/g, "-")}`;
      const filePath = `products/${fileName}`;

      const { data, error } = await supabase.storage
        .from("products")
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        console.error("Upload error:", error);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("products")
        .getPublicUrl(filePath);

      uploadedUrls.push(urlData.publicUrl);
    }

    if (uploadedUrls.length === 0) {
      return res.status(500).json({ error: "Erreur lors de l'upload des images" });
    }

    res.json({ urls: uploadedUrls });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/upload — supprimer une image
router.delete("/", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL requise" });

    // Extraire le chemin depuis l'URL
    const path = url.split("/storage/v1/object/public/products/")[1];
    if (!path) return res.status(400).json({ error: "URL invalide" });

    const { error } = await supabase.storage
      .from("products")
      .remove([path]);

    if (error) {
      return res.status(500).json({ error: "Erreur lors de la suppression" });
    }

    res.json({ message: "Image supprimée" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;