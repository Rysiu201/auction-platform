import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const settingsRouter = Router();

async function loadSettings() {
  let s = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!s) {
    s = await prisma.settings.create({ data: { id: 1 } });
  }
  return s;
}

settingsRouter.get("/", async (_req, res) => {
  const s = await loadSettings();
  res.json({
    maxActiveAuctions: s.maxActiveAuctions,
    maxWonAuctions: s.maxWonAuctions,
    nextAuctionIso: s.nextAuctionIso,
    auctionCloseIso: s.auctionCloseIso,
    auctionCloseNoticeSec: s.auctionCloseNoticeSec,
  });
});

const saveHandler = async (req: any, res: any) => {
  const body = req.body ?? {};
  const data: any = {};
  if (body.maxActiveAuctions !== undefined)
    data.maxActiveAuctions = Number(body.maxActiveAuctions);
  if (body.maxWonAuctions !== undefined)
    data.maxWonAuctions = Number(body.maxWonAuctions);
  if (body.max_won_auctions !== undefined)
    data.maxWonAuctions = Number(body.max_won_auctions);
  const iso =
    body.nextAuctionIso ||
    body.nextAuctionAt ||
    body.nextAuctionDate ||
    body.nextAuction ||
    null;
  if (iso !== undefined) {
    data.nextAuctionIso = iso ? new Date(iso) : null;
  }
  const closeIso =
    body.auctionCloseIso ||
    body.auctionCloseAt ||
    body.auctionCloseDate ||
    body.auctionClose ||
    null;
  if (closeIso !== undefined) {
    data.auctionCloseIso = closeIso ? new Date(closeIso) : null;
  }
  if (body.auctionCloseNoticeSec !== undefined)
    data.auctionCloseNoticeSec = Number(body.auctionCloseNoticeSec);
  const s = await prisma.settings.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });
  res.json({
    maxActiveAuctions: s.maxActiveAuctions,
    maxWonAuctions: s.maxWonAuctions,
    nextAuctionIso: s.nextAuctionIso,
    auctionCloseIso: s.auctionCloseIso,
    auctionCloseNoticeSec: s.auctionCloseNoticeSec,
  });
};

settingsRouter.patch("/", requireAuth, requireAdmin, saveHandler);
settingsRouter.put("/", requireAuth, requireAdmin, saveHandler);
settingsRouter.post("/", requireAuth, requireAdmin, saveHandler);

