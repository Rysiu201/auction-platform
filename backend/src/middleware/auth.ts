import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type JwtUser = { id: string; role: "USER" | "ADMIN"; name: string };

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET!) as JwtUser;
    (req as any).user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as JwtUser | undefined;
  if (!user || user.role !== "ADMIN") return res.status(403).json({ message: "Forbidden" });
  next();
}
