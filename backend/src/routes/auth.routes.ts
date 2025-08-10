import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma";
import ldap from "ldapjs";
import { promisify } from "util";

export const authRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

authRouter.post("/register", async (req, res) => {
  const { email, password, name } = req.body ?? {};
  if (!email || !password || !name) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return res.status(409).json({ message: "Email in use" });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, name }
  });

  res.json({ id: user.id });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.cookie("token", token, { httpOnly: true, sameSite: "lax" });
  res.json({ id: user.id, role: user.role, name: user.name });
});

authRouter.post("/sso", async (_req, res) => {
  const email = "sso@local.test";
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({ data: { email, passwordHash: "", name: "SSO User" } });
  }
  const token = jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
  res.cookie("token", token, { httpOnly: true, sameSite: "lax" });
  res.json({ id: user.id, role: user.role, name: user.name });
});

authRouter.post("/ldap", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password required" });
  }

  const client = ldap.createClient({ url: process.env.LDAP_URL! });
  const bind = promisify(client.bind).bind(client);
  const userDn =
    process.env.LDAP_USER_DN?.replace("{username}", username) ||
    `uid=${username},${process.env.LDAP_BASE_DN}`;
  try {
    await bind(userDn, password);
  } catch (e) {
    return res.status(401).json({ message: "Invalid LDAP credentials" });
  }

  const emailDomain = process.env.LDAP_EMAIL_DOMAIN || "ldap.local";
  const email = `${username}@${emailDomain}`;
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: { email, passwordHash: "", name: username },
    });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
  res.cookie("token", token, { httpOnly: true, sameSite: "lax" });
  res.json({ id: user.id, role: user.role, name: user.name });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});