import "dotenv/config";
import { createApp } from "./app.js";
import { pgPool } from "./db/pool.js";
import { logger } from "./common/logger.js";
const app = createApp();
const port = Number(process.env.PORT || 8080);
const server = app.listen(port, async () => {
    await pgPool.query("select 1");
    logger.info({ port }, "API listening");
});
process.on("unhandledRejection", (error) => {
    logger.error({ error }, "Unhandled promise rejection");
});
process.on("uncaughtException", (error) => {
    logger.fatal({ error }, "Uncaught exception");
    server.close(() => process.exit(1));
});
