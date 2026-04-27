import express from "express";
import helmet from "helmet";
import cors from "cors";
import { pinoHttp } from "pino-http";
import { randomUUID } from "node:crypto";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import { createUsersRouter } from "./modules/users/users.routes.js";
import { createRestaurantsRouter } from "./modules/restaurants/restaurants.routes.js";
import { createMenuRouter } from "./modules/menu/menu.routes.js";
import { createOrdersRouter } from "./modules/orders/orders.routes.js";
import { createPromocodesRouter } from "./modules/promocodes/promocodes.routes.js";
import { createCouriersRouter } from "./modules/couriers/couriers.routes.js";
import { HttpError } from "./common/http-error.js";
import { logger } from "./common/logger.js";
import { metrics } from "./common/metrics.js";
export function createApp() {
    const app = express();
    app.set("trust proxy", 1);
    const httpLoggerOptions = {
        logger,
        genReqId: (req, res) => {
            const headerId = req.headers["x-request-id"];
            const id = typeof headerId === "string" ? headerId : randomUUID();
            res.setHeader("x-request-id", id);
            return id;
        },
        customLogLevel: (_req, res, err) => {
            if (err || res.statusCode >= 500)
                return "error";
            if (res.statusCode >= 400)
                return "warn";
            return "info";
        },
    };
    app.use(pinoHttp(httpLoggerOptions));
    app.use(helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
    }));
    app.use(cors({
        origin: process.env.CORS_ORIGIN?.split(",").map((v) => v.trim()) || "*",
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
        credentials: true,
    }));
    app.use(express.json({ limit: process.env.BODY_LIMIT || "256kb" }));
    app.use((req, res, next) => {
        metrics.requestsTotal += 1;
        res.on("finish", () => {
            if (res.statusCode >= 400)
                metrics.requestsErrors += 1;
        });
        next();
    });
    app.get("/health", (_req, res) => res.json({ ok: true }));
    app.get("/metrics", (_req, res) => res.json(metrics));
    app.use("/auth", createAuthRouter());
    app.use("/users", createUsersRouter());
    app.use("/restaurants", createRestaurantsRouter());
    app.use("/menu", createMenuRouter());
    app.use("/orders", createOrdersRouter());
    app.use("/promocodes", createPromocodesRouter());
    app.use("/couriers", createCouriersRouter());
    app.use((error, _req, res, _next) => {
        if (error instanceof HttpError) {
            res.status(error.status).json({ error: error.message, details: error.details ?? null });
            return;
        }
        logger.error({ error }, "Unhandled error");
        res.status(500).json({ error: "Internal server error" });
    });
    return app;
}
