import { Server } from "socket.io";
import { prisma } from "../prisma";

export function attachBidding(io: Server) {
  io.on("connection", (socket) => {
    // dołącz do pokoju aukcji
    socket.on("join-auction", (auctionId: string) => {
      socket.join(auctionId);
    });

    // złożenie oferty
    socket.on(
      "place-bid",
      async (payload: { auctionId: string; userId: string; amount: number }) => {
        try {
          const { auctionId, userId, amount } = payload;
          const auction = await prisma.auction.findUnique({
            where: { id: auctionId },
            include: { bids: { orderBy: { amount: "desc" }, take: 1 } }
          });
          if (!auction) return socket.emit("bid-error", "Aukcja nie istnieje");

          const now = new Date();
          if (
            auction.status !== "ACTIVE" ||
            now < auction.startsAt ||
            now > auction.endsAt
          ) {
            return socket.emit("bid-error", "Aukcja nieaktywna");
          }

          const currentTop = auction.bids[0]?.amount ?? auction.basePrice;
          const min = currentTop + auction.minIncrement;
          if (!Number.isFinite(amount) || amount < min) {
            return socket.emit("bid-error", `Minimalna oferta to ${(min/100).toFixed(2)} PLN`);
          }

          // zapis oferty
          const bid = await prisma.bid.create({
            data: { amount, userId, auctionId }
          });

          // (opcjonalnie) anti-sniping: przedłuż o 2 min jeśli < 120s do końca
          const secsLeft = (auction.endsAt.getTime() - now.getTime()) / 1000;
          let newEndsAt: Date | null = null;
          if (secsLeft <= 120) {
            newEndsAt = new Date(auction.endsAt.getTime() + 2 * 60 * 1000);
            await prisma.auction.update({
              where: { id: auctionId },
              data: { endsAt: newEndsAt }
            });
          }

          // broadcast
          io.to(auctionId).emit("new-bid", {
            amount: bid.amount,
            userId: bid.userId,
            createdAt: bid.createdAt
          });
          if (newEndsAt) {
            io.to(auctionId).emit("ends-at-updated", { endsAt: newEndsAt.toISOString() });
          }
        } catch (e) {
          console.error(e);
          socket.emit("bid-error", "Błąd serwera przy licytacji");
        }
      }
    );
  });
}
