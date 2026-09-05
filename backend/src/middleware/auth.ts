import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AdminTokenPayload {
  id: number;
  email: string;
  accessLevel: number;
  type: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid Authorization header" });
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, env.jwtSecret) as AdminTokenPayload;
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireAccessLevel(minLevel: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin || req.admin.accessLevel < minLevel) {
      return res.status(403).json({ message: "Insufficient access level" });
    }
    next();
  };
}
