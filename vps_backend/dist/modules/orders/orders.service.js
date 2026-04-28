import { HttpError } from "../../common/http-error.js";
import { pgPool, withTransaction } from "../../db/pool.js";
function generatePickupCode() {
    return Math.floor(Math.random() * 10000).toString().padStart(4, "0");
}
function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
export class OrdersService {
    async createOrder(input, actor) {
        try {
            if (!input.restaurant_id)
                throw new HttpError(400, "restaurant_id is required");
            if (!isUuid(input.restaurant_id))
                throw new HttpError(400, "restaurant_id must be a valid UUID");
            if (!input.payment_method || input.payment_method.trim().length === 0) {
                throw new HttpError(400, "payment_method is required");
            }
            if (!Array.isArray(input.items) || input.items.length === 0) {
                throw new HttpError(400, "items must be a non-empty array");
            }
            if (!input.request_id || input.request_id.trim().length === 0 || input.request_id.length > 120) {
                throw new HttpError(400, "request_id is required");
            }
            if (input.address_id !== null && !isUuid(input.address_id)) {
                throw new HttpError(400, "address_id must be a valid UUID or null");
            }
            return await withTransaction(async (client) => this.createOrderTx(client, input, actor));
        }
        catch (error) {
            const requestId = typeof input.request_id === "string" ? input.request_id : null;
            console.error("[orders.service.createOrder] failed", {
                request_id: requestId,
                restaurant_id: input.restaurant_id ?? null,
                actor_id: actor?.id ?? null,
                error,
                stack: error instanceof Error ? error.stack : undefined,
            });
            throw error;
        }
    }
    async createOrderTx(client, input, actor) {
        const isGuest = !actor;
        const guestPhone = input.guest_phone?.trim() || null;
        const guestDeviceId = input.guest_device_id?.trim() || null;
        const reqId = input.request_id.trim();
        if (isGuest) {
            if (!guestPhone || input.guest_lat == null || input.guest_lng == null || !guestDeviceId) {
                throw new HttpError(400, "Guest checkout requires phone and location");
            }
        }
        const idempotent = await client.query("select id from orders where client_request_id = $1::text limit 1", [reqId]);
        if (idempotent.rowCount)
            return { order_id: idempotent.rows[0].id, idempotent: true };
        const restaurantRes = await client.query("select id, is_open, delivery_fee_cents, min_order_cents from restaurants where id = $1::uuid limit 1", [input.restaurant_id]);
        if (!restaurantRes.rowCount)
            throw new HttpError(404, "Restaurant not found");
        const restaurant = restaurantRes.rows[0];
        if (!restaurant.is_open)
            throw new HttpError(400, "Restaurant is closed");
        if (actor?.role && actor.role !== "user" && actor.role !== "admin") {
            throw new HttpError(403, "Forbidden");
        }
        let addressId = input.address_id;
        if (actor && !addressId) {
            throw new HttpError(400, "address_id is required for authenticated user");
        }
        if (actor && addressId) {
            const addr = await client.query("select id from addresses where id = $1::uuid and user_id = $2::uuid limit 1", [addressId, actor.id]);
            if (!addr.rowCount)
                throw new HttpError(400, "Invalid address");
        }
        else if (!actor) {
            addressId = null;
        }
        const pricedLines = await this.priceLines(client, input.restaurant_id, input.items);
        const subtotal = pricedLines.reduce((sum, line) => sum + line.unit_price_cents * line.quantity, 0);
        if (subtotal < restaurant.min_order_cents)
            throw new HttpError(400, "Below minimum order");
        const promo = await this.resolvePromo(client, {
            promoCode: input.promo_code || null,
            restaurantId: input.restaurant_id,
            userId: actor?.id || null,
            subtotal,
            delivery: restaurant.delivery_fee_cents,
            tax: 0,
        });
        const total = Math.max(0, subtotal - promo.discount + restaurant.delivery_fee_cents);
        const inserted = await client.query(`insert into orders (
        user_id, restaurant_id, address_id, status, payment_method,
        guest_phone, customer_phone, guest_lat, guest_lng, guest_device_id,
        subtotal_cents, delivery_fee_cents, tax_cents, total_cents,
        promo_code, promocode_id, promo_discount_cents, client_request_id, pickup_code
      ) values (
        $1::uuid,$2::uuid,$3::uuid,'placed',$4::text,$5::text,$6::text,$7::double precision,$8::double precision,$9::text,$10::int,$11::int,0,$12::int,$13::text,$14::uuid,$15::int,$16::text,$17::text
      ) returning id`, [
            actor?.id || null,
            input.restaurant_id,
            addressId,
            input.payment_method,
            guestPhone,
            actor?.phone || guestPhone,
            input.guest_lat ?? null,
            input.guest_lng ?? null,
            actor ? null : guestDeviceId,
            subtotal,
            restaurant.delivery_fee_cents,
            total,
            promo.promo_code,
            promo.promocode_id,
            promo.discount,
            reqId,
            generatePickupCode(),
        ]);
        const orderId = inserted.rows[0].id;
        const values = [];
        const tuples = [];
        pricedLines.forEach((line, idx) => {
            const base = idx * 5;
            values.push(orderId, line.menu_item_id, line.quantity, line.unit_price_cents, line.selected_option_ids);
            tuples.push(`($${base + 1}::uuid,$${base + 2}::uuid,$${base + 3}::int,$${base + 4}::int,$${base + 5}::uuid[])`);
        });
        await client.query(`insert into order_items (order_id, menu_item_id, quantity, unit_price_cents, selected_option_ids)
       values ${tuples.join(",")}`, values);
        await client.query(`insert into order_events_outbox (order_id, event_type, payload)
       values ($1::uuid,'notification',jsonb_build_object('order_id',$1::uuid)),
              ($1::uuid,'telegram',jsonb_build_object('order_id',$1::uuid)),
              ($1::uuid,'analytics',jsonb_build_object('order_id',$1::uuid,'request_id',$2::text))`, [orderId, reqId]);
        return { order_id: orderId, total_cents: total, idempotent: false };
    }
    async priceLines(client, restaurantId, items) {
        for (const line of items) {
            if (!line.menu_item_id)
                throw new HttpError(400, "menu_item_id is required");
            if (!isUuid(line.menu_item_id))
                throw new HttpError(400, "menu_item_id must be a valid UUID");
            if (!Number.isInteger(line.quantity) || line.quantity < 1)
                throw new HttpError(400, "quantity must be >= 1");
        }
        const itemIds = [...new Set(items.map((x) => x.menu_item_id))];
        const menuRes = await client.query("select id, price_cents, restaurant_id, is_available from menu_items where id = any($1::uuid[])", [itemIds]);
        if (menuRes.rowCount !== itemIds.length)
            throw new HttpError(400, "Invalid menu item");
        const menu = new Map(menuRes.rows.map((r) => [r.id, r]));
        for (const m of menuRes.rows) {
            if (m.restaurant_id !== restaurantId || !m.is_available)
                throw new HttpError(400, "Invalid menu item");
        }
        const optionIds = [...new Set(items.flatMap((x) => x.selected_option_ids || []))];
        const options = new Map();
        if (optionIds.length) {
            const optionsRes = await client.query("select id, menu_item_id, price_delta_cents from menu_item_options where id = any($1::uuid[])", [optionIds]);
            if (optionsRes.rowCount !== optionIds.length)
                throw new HttpError(400, "Invalid options");
            optionsRes.rows.forEach((o) => options.set(o.id, o));
        }
        return items.map((line) => {
            if (!line.menu_item_id || line.quantity < 1)
                throw new HttpError(400, "Invalid line item");
            const mi = menu.get(line.menu_item_id);
            if (!mi)
                throw new HttpError(400, "Invalid menu item");
            let unit = mi.price_cents;
            const selected = Array.isArray(line.selected_option_ids) ? line.selected_option_ids : [];
            for (const optionId of selected) {
                const o = options.get(optionId);
                if (!o || o.menu_item_id !== line.menu_item_id)
                    throw new HttpError(400, "Option mismatch");
                unit += o.price_delta_cents;
            }
            return {
                menu_item_id: line.menu_item_id,
                quantity: line.quantity,
                unit_price_cents: unit,
                selected_option_ids: selected,
            };
        });
    }
    async resolvePromo(client, args) {
        if (!args.promoCode)
            return { discount: 0, promocode_id: null, promo_code: null };
        const code = args.promoCode.trim().toUpperCase();
        const promoRes = await client.query(`select id, discount, discount_fixed_cents, restaurant_id, audience, min_subtotal_cents, expires_at, active
       from promocodes where code = $1 and active = true limit 1`, [code]);
        if (!promoRes.rowCount)
            throw new HttpError(400, "Invalid promo code");
        const promo = promoRes.rows[0];
        if (promo.expires_at && new Date(promo.expires_at).getTime() <= Date.now())
            throw new HttpError(400, "Promo code expired");
        if (promo.restaurant_id && promo.restaurant_id !== args.restaurantId)
            throw new HttpError(400, "Promo not valid");
        if (promo.min_subtotal_cents > args.subtotal)
            throw new HttpError(400, "Order subtotal below promo minimum");
        if (promo.audience === "first_order") {
            if (!args.userId)
                throw new HttpError(400, "Promo requires account");
            const firstOrder = await client.query("select id from orders where user_id = $1 limit 1", [args.userId]);
            if (firstOrder.rowCount)
                throw new HttpError(400, "Promo only for first order");
        }
        const discount = promo.discount_fixed_cents && promo.discount_fixed_cents > 0
            ? Math.min(promo.discount_fixed_cents, args.subtotal)
            : Math.floor((args.subtotal * (promo.discount ?? 0)) / 100);
        return { discount, promocode_id: promo.id, promo_code: code };
    }
    async getOrders(limit = 50) {
        const res = await pgPool.query(`select id, status, total_cents, restaurant_id, user_id, courier_id, created_at
       from orders order by created_at desc limit $1`, [Math.max(1, Math.min(limit, 200))]);
        return res.rows;
    }
    async getOrderById(id) {
        const orderRes = await pgPool.query(`select id, status, total_cents, subtotal_cents, delivery_fee_cents, tax_cents, created_at
       from orders where id = $1 limit 1`, [id]);
        if (!orderRes.rowCount)
            throw new HttpError(404, "Order not found");
        return orderRes.rows[0];
    }
}
