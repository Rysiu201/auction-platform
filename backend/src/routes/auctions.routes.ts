import { Router } from "express";
import multer from "multer";
import path from "path";
import { prisma } from "../prisma";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const auctionsRouter = Router();

const uploadDir = path.join(process.cwd(), "uploads");
const upload = multer({ dest: uploadDir });

function toGrosze(v: string | number | undefined) {
  if (v === undefined || v === null) return 0;
  const n = typeof v === "string" ? v.replace(",", ".") : String(v);
  const parsed = parseFloat(n);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

// ----------------------------- LISTA -----------------------------
auctionsRouter.get("/", async (req, res) => {
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
  const orderBy =
    req.query.sort === "latest"
      ? { createdAt: "desc" as const }
      : { endsAt: "asc" as const };

  const auctions = await prisma.auction.findMany({
    where: { status: "ACTIVE" },
    include: { images: true, bids: true },
    orderBy,
    ...(limit ? { take: limit } : {}),
  });
  res.json(auctions);
});

// ------------------------ ADMIN OVERVIEW ------------------------
auctionsRouter.get(
  "/admin/overview",
  requireAuth,
  requireAdmin,
  async (_req, res) => {
    const ended = await prisma.auction.findMany({
      where: { status: "ENDED" },
      include: {
        bids: { orderBy: { amount: "desc" } },
        winnerBid: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { endsAt: "desc" },
    });

    const active = await prisma.auction.findMany({
      where: { status: "ACTIVE" },
      orderBy: { endsAt: "asc" },
    });

    const noBids = ended.filter((a) => a.bids.length === 0);
    const finished = ended.filter((a) => a.bids.length > 0);

    res.json({ active, ended: finished, noBids });
  }
);

// --------------------------- SZCZEGÓŁ ----------------------------
auctionsRouter.get("/:id", async (req, res) => {
  const a = await prisma.auction.findUnique({
    where: { id: req.params.id },
    include: {
      images: { orderBy: { position: "asc" } },
      bids: { orderBy: { amount: "desc" }, take: 1 },
    },
  });
  if (!a) return res.status(404).json({ message: "Not found" });
  res.json(a);
});

// --------------------------- UTWÓRZ ------------------------------
auctionsRouter.post(
  "/",
  requireAuth,
  requireAdmin,
  upload.array("images", 8),
  async (req, res) => {
    const user = (req as any).user as { id: string };

    const {
      title,
      description,
      basePricePLN,
      minIncrementPLN,
      reservePricePLN,
      condition,
      personalPickup,
      courierShipping,
      invoice,
      startsAt,
      endsAt,
    } = req.body ?? {};

    if (
      !title ||
      !description ||
      !basePricePLN ||
      !minIncrementPLN ||
      !startsAt ||
      !endsAt ||
      !condition
    ) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const images =
      ((req.files as Express.Multer.File[] | undefined) ?? []).map((f, i) => ({
        url: `/uploads/${f.filename}`,
        position: i,
      }));

    const auction = await prisma.auction.create({
      data: {
        title,
        description,
        basePrice: toGrosze(basePricePLN),
        minIncrement: toGrosze(minIncrementPLN),
        reservePrice: reservePricePLN ? toGrosze(reservePricePLN) : null,
        condition,
        personalPickup: personalPickup === "true",
        courierShipping: courierShipping === "true",
        invoice: invoice === "true",
        status: "ACTIVE",
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        sellerId: user.id,
        images: { create: images },
      },
    });

    res.json(auction);
  }
);

// ------------------------ WYSTAW PONOWNIE ----------------------
auctionsRouter.post(
  "/:id/relist",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const { id } = req.params;
    const { basePricePLN, minIncrementPLN, startsAt, endsAt } = req.body ?? {};
    if (!basePricePLN || !minIncrementPLN || !startsAt || !endsAt)
      return res.status(400).json({ message: "Missing fields" });

    const old = await prisma.auction.findUnique({
      where: { id },
      include: { images: true },
    });
    if (!old) return res.status(404).json({ message: "Not found" });

    const auction = await prisma.auction.create({
      data: {
        title: old.title,
        description: old.description,
        basePrice: toGrosze(basePricePLN),
        minIncrement: toGrosze(minIncrementPLN),
        reservePrice: old.reservePrice,
        condition: old.condition,
        personalPickup: old.personalPickup,
        courierShipping: old.courierShipping,
        invoice: old.invoice,
        status: "ACTIVE",
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        sellerId: old.sellerId,
        images: {
          create: old.images.map((img) => ({
            url: img.url,
            position: img.position,
          })),
        },
      },
    });

    res.json(auction);
  }
);

// --------- LEKKI STATUS (polling do odświeżania ofert) ----------
auctionsRouter.get("/:id/top", async (req, res) => {
  const a = await prisma.auction.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      basePrice: true,
      minIncrement: true,
      endsAt: true,
      status: true,
      bids: { orderBy: { amount: "desc" }, take: 1, select: { amount: true } },
    },
  });
  if (!a) return res.status(404).json({ message: "Not found" });

  const top = Math.max(a.basePrice, a.bids[0]?.amount || 0);
  res.json({
    topAmount: top,
    minIncrement: a.minIncrement,
    endsAt: a.endsAt,
    status: a.status,
  });
});

// -------------------------- ZŁÓŻ OFERTĘ -------------------------
auctionsRouter.post("/:id/bid", requireAuth, async (req, res) => {
  const user = (req as any).user as { id: string };
  const { amountPLN } = req.body ?? {};
  const amount = Math.round(
    parseFloat(String(amountPLN ?? "").replace(",", ".")) * 100
  );
  if (!Number.isFinite(amount))
    return res.status(400).json({ message: "Kwota nieprawidłowa" });

  const a = await prisma.auction.findUnique({
    where: { id: req.params.id },
    include: { bids: { orderBy: { amount: "desc" }, take: 1 } },
  });
  if (!a) return res.status(404).json({ message: "Not found" });

  const now = new Date();
  if (a.status !== "ACTIVE" || now < a.startsAt || now > a.endsAt) {
    return res.status(400).json({ message: "Aukcja nieaktywna" });
  }

  const top = Math.max(a.basePrice, a.bids[0]?.amount || 0);
  const min = top + a.minIncrement;
  if (amount < min) {
    return res
      .status(400)
      .json({ message: `Minimalna oferta to ${(min / 100).toFixed(2)} PLN` });
  }

  await prisma.bid.create({ data: { amount, userId: user.id, auctionId: a.id } });

  // anti-sniping: +2 min gdy < 120s do końca
  const secsLeft = (a.endsAt.getTime() - now.getTime()) / 1000;
  let endsAt = a.endsAt;
  if (secsLeft <= 120) {
    endsAt = new Date(a.endsAt.getTime() + 2 * 60 * 1000);
    await prisma.auction.update({ where: { id: a.id }, data: { endsAt } });
  }

  res.json({ ok: true, topAmount: amount, endsAt });

  // Zwycięzca i suma końcowa (po zakończeniu)
auctionsRouter.get("/:id/winner", async (req, res) => {
  const a = await prisma.auction.findUnique({
    where: { id: req.params.id },
    include: {
      winnerBid: { include: { user: { select: { id: true, name: true, email: true } } } }
    }
  });
  if (!a) return res.status(404).json({ message: "Not found" });
  if (a.status !== "ENDED") return res.status(400).json({ message: "Aukcja jeszcze trwa" });

  const amount = a.winnerBid?.amount ?? null;
  const user = a.winnerBid?.user ?? null;
  res.json({ amount, user });
});
});
