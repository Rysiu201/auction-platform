import { prisma } from "../prisma";
import { sendWinnerEmail } from "./mailer";

export function startCloseExpiredWorker() {
  setInterval(async () => {
    const now = new Date();

    const toClose = await prisma.auction.findMany({
      where: { status: "ACTIVE", endsAt: { lte: now } },
      include: {
        bids: { orderBy: { amount: "desc" }, take: 1 },
        seller: { select: { id: true, email: true, name: true } },
      },
      take: 20,
    });

    for (const a of toClose) {
      const topBid = a.bids[0];
      const winnerBidId = topBid?.id ?? null;

      await prisma.auction.update({
        where: { id: a.id },
        data: { status: "ENDED", winnerBidId },
      });

      await prisma.auditLog.create({
        data: {
          action: "AUCTION_END",
          userId: a.seller.id,
          meta: { auctionId: a.id, top: topBid?.amount ?? null },
        },
      });

      if (topBid) {
        const winner = await prisma.user.findUnique({ where: { id: topBid.userId } });
        if (winner) {
          await sendWinnerEmail({
            to: winner.email,
            auctionTitle: a.title,
            amountGrosze: topBid.amount,
          });
          console.log(
            `[MAIL] Winner -> ${winner.email} | ${a.title} | ${(topBid.amount/100).toFixed(2)} PLN`
          );
        }
      } else {
        console.log(`[AUCTION] ${a.title} zakończona bez ofert`);
      }
    }
  }, 30_000);
}