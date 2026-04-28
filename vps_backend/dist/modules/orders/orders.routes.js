import { Router } from "express";
import { z } from "zod";
import { ZodError } from "zod";
import { authOptional } from "../auth/auth.middleware.js";
import { OrdersService } from "./orders.service.js";
import { HttpError } from "../../common/http-error.js";
import { orderRateLimit, requestDedupe } from "./orders.guard.js";
import { metrics } from "../../common/metrics.js";
const createOrderSchema = z.object({
    restaurant_id: z.string().uuid(),
    address_id: z.string().uuid().nullable(),
    payment_method: z.string().min(1),
    guest_phone: z.string().nullable().optional(),
    guest_lat: z.number().nullable().optional(),
    guest_lng: z.number().nullable().optional(),
    guest_device_id: z.string().nullable().optional(),
    request_id: z.string().min(1),
    promo_code: z.string().nullable().optional(),
    items: z
        .array(z.object({
        menu_item_id: z.string().uuid(),
        quantity: z.number().int().min(1),
        selected_option_ids: z.array(z.string().uuid()).default([]),
    }))
        .min(1),
});
const enableRateLimit = process.env.ENABLE_RATE_LIMIT === "true";
export function createOrdersRouter() {
    const router = Router();
    const service = new OrdersService();
    router.post("/", authOptional, ...(enableRateLimit ? [orderRateLimit] : []), requestDedupe, async (req, res, next) => {
        const requestId = typeof req.body?.request_id === "string" ? req.body.request_id : null;
        try {
            metrics.ordersPostTotal += 1;
            console.info("[orders.route] POST /orders incoming", {
                request_id: requestId,
                restaurant_id: req.body?.restaurant_id ?? null,
                items_count: Array.isArray(req.body?.items) ? req.body.items.length : 0,
                actor_id: req.user?.sub ?? null,
            });
            const parsed = createOrderSchema.parse(req.body);
            const result = await service.createOrder(parsed, req.user ? { id: req.user.sub, role: req.user.role, phone: req.user.phone } : null);
            res.status(200).json(result);
        }
        catch (error) {
            metrics.ordersPostErrors += 1;
            console.error("[orders.route] POST /orders failed", {
                request_id: requestId,
                error,
                stack: error instanceof Error ? error.stack : undefined,
            });
            next(error);
        }
    });
    router.get("/", async (req, res, next) => {
        try {
            const limit = Number(req.query.limit || 50);
            const result = await service.getOrders(limit);
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    });
    router.get("/:id", async (req, res, next) => {
        try {
            const id = z.string().uuid().parse(req.params.id);
            const result = await service.getOrderById(id);
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    });
    router.use((error, _req, res, _next) => {
        if (error instanceof ZodError) {
            res.status(400).json({
                error: "Invalid request payload",
                details: error.issues.map((issue) => ({
                    path: issue.path.join("."),
                    message: issue.message,
                })),
            });
            return;
        }
        if (error instanceof HttpError) {
            res.status(error.status).json({ error: error.message, details: error.details ?? null });
            return;
        }
        const genericMessage = error instanceof Error ? error.message : "Internal server error";
        res.status(500).json({ error: genericMessage });
    });
    return router;
}
