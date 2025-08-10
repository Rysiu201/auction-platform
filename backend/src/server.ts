import http from "http";
import { Server } from "socket.io";
import app from "./app";
import { attachBidding } from "./services/bidding";
import { startCloseExpiredWorker } from "./services/closeExpired";
import { prisma } from "./prisma";
import bcrypt from "bcrypt";

const port = Number(process.env.PORT || 4000);
const server = http.createServer(app);

startCloseExpiredWorker(); // <-- DODANE

const io = new Server(server, {
  cors: { origin: true, credentials: true }
});

attachBidding(io);

async function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL || "admin@local.test";
  const password = process.env.ADMIN_PASSWORD || "Admin123!";
  const name = "Admin";
  const exists = await prisma.user.findUnique({ where: { email } });
  if (!exists) {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: { email, name, passwordHash, role: "ADMIN" }
    });
    console.log(`Created default admin ${email}`);
  }
}

(async () => {
  await ensureAdmin().catch((e) => console.error("Admin seed failed", e));
  server.listen(port, () => {
    console.log(`API listening on :${port}`);
  });
})();
