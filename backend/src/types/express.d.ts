import "express";

declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: number;
        email: string;
        accessLevel: number;
        type: string;
      };
    }
  }
}
