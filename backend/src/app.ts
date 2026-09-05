import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import authRoutes from "./modules/auth/auth.routes";
import urdbRoutes from "./modules/urdb/urdb.routes";
import rateEngineRoutes from "./modules/rate-engine/rateEngine.routes";
import greenDataRoutes from "./modules/green-data/green-data.routes";
import lookupsRoutes from "./modules/lookups/lookups.routes";
import adminUsersRoutes from "./modules/admin-users/admin-users.routes";
import appUsersRoutes from "./modules/app-users/app-users.routes";
import surveysRoutes from "./modules/surveys/surveys.routes";
import feedbackRoutes from "./modules/feedback/feedback.routes";
import homepageContentRoutes from "./modules/homepage-content/homepage-content.routes";
import csvRoutes from "./modules/csv/csv.routes";

export function createApp() {
  const app = express();

  app.use(cors({ origin: '*' }));
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/urdb-rates", urdbRoutes);
  app.use("/api/rate-engine", rateEngineRoutes);
  app.use("/api/green-data", greenDataRoutes);
  app.use("/api/lookups", lookupsRoutes);
  app.use("/api/admin-users", adminUsersRoutes);
  app.use("/api/app-users", appUsersRoutes);
  app.use("/api/surveys", surveysRoutes);
  app.use("/api/feedback", feedbackRoutes);
  app.use("/api/homepage-content", homepageContentRoutes);
  app.use("/api/csv", csvRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
