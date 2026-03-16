require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const products = [
  {
    name: "Vélo Carbon Pro",
    slug: "velo-carbon-pro",
    description: "Le Carbon Pro représente l'excellence du cyclisme sur route. Son cadre en carbone haute performance offre un rapport rigidité/poids exceptionnel, tandis que sa géométrie optimisée garantit un confort inégalé sur les longues distances.",
    price: 1640000,
    category: "Route",
    images: [
      "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600",
      "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=600",
      "https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?w=600",
    ],
    stock: 12,
    isNew: true,
    specs: [
      { label: "Cadre", value: "Carbone T800" },
      { label: "Poids", value: "7.2 kg" },
      { label: "Groupe", value: "Shimano Ultegra Di2" },
      { label: "Roues", value: "Carbone 50mm" },
      { label: "Freins", value: "Disque hydraulique" },
      { label: "Tailles", value: "S, M, L, XL" },
    ],
  },
  {
    name: "VTT Enduro X",
    slug: "vtt-enduro-x",
    description: "L'Enduro X est conçu pour dévaler les sentiers les plus techniques avec une confiance absolue. Sa suspension de 170mm absorbe tous les obstacles tandis que sa géométrie agressive vous permet de garder le contrôle.",
    price: 1245000,
    compareAtPrice: 1442000,
    category: "VTT",
    images: [
      "https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=600",
      "https://images.unsplash.com/photo-1544191696-102dbdaeeaa0?w=600",
    ],
    stock: 8,
    isNew: true,
    specs: [
      { label: "Cadre", value: "Aluminium 6061" },
      { label: "Poids", value: "13.5 kg" },
      { label: "Suspension", value: "170mm / 160mm" },
      { label: "Groupe", value: "SRAM GX Eagle" },
      { label: "Freins", value: "SRAM Code RSC" },
      { label: "Tailles", value: "S, M, L, XL" },
    ],
  },
  {
    name: "Urban Glide",
    slug: "urban-glide",
    description: "Le Urban Glide redéfinit le vélo de ville. Léger, agile et élégant, il vous accompagne dans vos trajets quotidiens avec style.",
    price: 590000,
    category: "Urbain",
    images: ["https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=600"],
    stock: 25,
    isNew: true,
    specs: [
      { label: "Cadre", value: "Aluminium léger" },
      { label: "Poids", value: "10.8 kg" },
      { label: "Vitesses", value: "8 vitesses Shimano" },
      { label: "Pneus", value: "700x32c anti-crevaison" },
      { label: "Freins", value: "Disque mécanique" },
      { label: "Tailles", value: "S, M, L" },
    ],
  },
  {
    name: "Gravel Explorer",
    slug: "gravel-explorer",
    description: "Le Gravel Explorer est votre passeport pour l'aventure. Route, chemin, gravier — aucun terrain ne lui résiste.",
    price: 1049000,
    category: "Gravel",
    images: ["https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=600"],
    stock: 15,
    isNew: true,
    specs: [
      { label: "Cadre", value: "Carbone / Aluminium" },
      { label: "Poids", value: "9.1 kg" },
      { label: "Groupe", value: "Shimano GRX 810" },
      { label: "Pneus", value: "700x40c" },
      { label: "Freins", value: "Disque hydraulique" },
      { label: "Tailles", value: "S, M, L, XL" },
    ],
  },
  {
    name: "Titanium Elite",
    slug: "velo-titanium-elite",
    description: "Le Titanium Elite est l'aboutissement de notre savoir-faire. Son cadre en titane offre une qualité de conduite incomparable.",
    price: 2164000,
    category: "Route",
    images: ["https://images.unsplash.com/photo-1511994298241-608e28f14fde?w=600"],
    stock: 5,
    specs: [
      { label: "Cadre", value: "Titane 3Al/2.5V" },
      { label: "Poids", value: "8.1 kg" },
      { label: "Groupe", value: "Shimano Dura-Ace Di2" },
      { label: "Roues", value: "Carbone 40mm" },
      { label: "Freins", value: "Disque hydraulique" },
      { label: "Tailles", value: "S, M, L, XL" },
    ],
  },
  {
    name: "City Comfort+",
    slug: "city-comfort-plus",
    description: "Le City Comfort+ met l'accent sur le confort au quotidien. Sa position droite et ses pneus larges en font le compagnon idéal.",
    price: 492000,
    category: "Urbain",
    images: ["https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?w=600"],
    stock: 30,
    specs: [
      { label: "Cadre", value: "Aluminium step-through" },
      { label: "Poids", value: "12.5 kg" },
      { label: "Vitesses", value: "7 vitesses Shimano Nexus" },
      { label: "Pneus", value: "700x38c" },
      { label: "Freins", value: "V-brake" },
      { label: "Tailles", value: "M, L" },
    ],
  },
  {
    name: "Speedster Aero",
    slug: "speedster-aero",
    description: "Le Speedster Aero est né pour la vitesse. Chaque tube de son cadre a été profilé en soufflerie.",
    price: 1902000,
    compareAtPrice: 2295000,
    category: "Route",
    images: [
      "https://images.unsplash.com/photo-1596738901737-a39f0e5e5462?w=600",
      "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600",
    ],
    stock: 7,
    specs: [
      { label: "Cadre", value: "Carbone aéro UCI" },
      { label: "Poids", value: "7.8 kg" },
      { label: "Groupe", value: "SRAM Red eTap AXS" },
      { label: "Roues", value: "Carbone 60mm" },
      { label: "Freins", value: "Disque hydraulique" },
      { label: "Tailles", value: "S, M, L, XL" },
    ],
  },
  {
    name: "Mountain Beast",
    slug: "mountain-beast",
    description: "Le Mountain Beast est un monstre de capacité. Conçu pour les terrains les plus exigeants.",
    price: 1443000,
    category: "VTT",
    images: ["https://images.unsplash.com/photo-1544191696-102dbdaeeaa0?w=600"],
    stock: 10,
    specs: [
      { label: "Cadre", value: "Carbone full suspension" },
      { label: "Poids", value: "12.8 kg" },
      { label: "Suspension", value: "150mm / 140mm" },
      { label: "Groupe", value: "Shimano XT" },
      { label: "Freins", value: "Shimano XT 4 pistons" },
      { label: "Tailles", value: "S, M, L, XL" },
    ],
  },
  {
    name: "Electric Cruise",
    slug: "electric-cruise",
    description: "Le Electric Cruise combine puissance électrique et design épuré. Jusqu'à 120km d'autonomie.",
    price: 1312000,
    category: "Électrique",
    images: ["https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600"],
    stock: 18,
    isNew: true,
    specs: [
      { label: "Cadre", value: "Aluminium hydroformé" },
      { label: "Poids", value: "18.5 kg" },
      { label: "Moteur", value: "Shimano Steps E6100" },
      { label: "Batterie", value: "504Wh intégrée" },
      { label: "Autonomie", value: "Jusqu'à 120 km" },
      { label: "Tailles", value: "M, L, XL" },
    ],
  },
  {
    name: "Vintage Classic",
    slug: "vintage-classic",
    description: "Le Vintage Classic allie le charme rétro à la fiabilité moderne.",
    price: 853000,
    category: "Urbain",
    images: ["https://images.unsplash.com/photo-1505705694340-019e0d8a2e5c?w=600"],
    stock: 20,
    specs: [
      { label: "Cadre", value: "Acier chromoly" },
      { label: "Poids", value: "11.2 kg" },
      { label: "Vitesses", value: "3 vitesses Sturmey Archer" },
      { label: "Pneus", value: "700x35c" },
      { label: "Freins", value: "Caliper classique" },
      { label: "Tailles", value: "S, M, L" },
    ],
  },
  {
    name: "Trail Master",
    slug: "trail-master",
    description: "Le Trail Master est le vélo polyvalent par excellence.",
    price: 1705000,
    compareAtPrice: 1968000,
    category: "VTT",
    images: ["https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=600"],
    stock: 6,
    specs: [
      { label: "Cadre", value: "Carbone trail" },
      { label: "Poids", value: "12.0 kg" },
      { label: "Suspension", value: "140mm / 130mm" },
      { label: "Groupe", value: "SRAM GX Eagle AXS" },
      { label: "Freins", value: "SRAM G2 RSC" },
      { label: "Tailles", value: "S, M, L, XL" },
    ],
  },
  {
    name: "Aero Speed X",
    slug: "aero-speed-x",
    description: "L'Aero Speed X est notre machine de course ultime.",
    price: 2558000,
    category: "Route",
    images: ["https://images.unsplash.com/photo-1596738901737-a39f0e5e5462?w=600"],
    stock: 3,
    specs: [
      { label: "Cadre", value: "Carbone UHM aéro" },
      { label: "Poids", value: "6.9 kg" },
      { label: "Groupe", value: "Shimano Dura-Ace Di2" },
      { label: "Roues", value: "Carbone 65mm" },
      { label: "Freins", value: "Disque hydraulique" },
      { label: "Tailles", value: "S, M, L, XL" },
    ],
  },
];

async function seed() {
  try {
    console.log("🌱 Début du seeding...");

    // Nettoyer les tables
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();

    // Créer admin
    const adminPassword = await bcrypt.hash("admin123", 12);
    await prisma.user.create({
      data: {
        firstName: "Admin",
        lastName: "MonVélo",
        email: "admin@monvelo.com",
        phone: "+221770000000",
        password: adminPassword,
        role: "ADMIN",
      },
    });
    console.log("✅ Admin créé : admin@monvelo.com / admin123");

    // Créer client test
    const customerPassword = await bcrypt.hash("test123", 12);
    await prisma.user.create({
      data: {
        firstName: "Amadou",
        lastName: "Diallo",
        email: "amadou@test.com",
        phone: "+221771234567",
        password: customerPassword,
        role: "CUSTOMER",
      },
    });
    console.log("✅ Client créé : amadou@test.com / test123");

    // Créer les produits
    for (const product of products) {
      await prisma.product.create({ data: product });
    }
    console.log(`✅ ${products.length} produits créés`);

    console.log("\n🎉 Seeding terminé !");
  } catch (err) {
    console.error("❌ Erreur:", err);
  } finally {
    await prisma.$disconnect();
  }
}

seed();