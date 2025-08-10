import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { prisma } from "./prisma";
import { authRouter } from "./routes/auth.routes";
import { auctionsRouter } from "./routes/auctions.routes";
import { settingsRouter } from "./routes/settings.routes";

const app = express();

// Utwórz folder na uploady, jeśli go nie ma
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Middlewares
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Serwowanie plików z katalogu uploads
app.use("/uploads", express.static(uploadDir));

// Test serwera
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Test połączenia z bazą
app.get("/api/db-ok", async (_req, res) => {
  const count = await prisma.auction.count();
  res.json({ db: "ok", auctions: count });
});

// Podpięcie routerów
app.use("/api/auth", authRouter);
app.use("/api/auctions", auctionsRouter);
app.use("/api/settings", settingsRouter);

export default app;
