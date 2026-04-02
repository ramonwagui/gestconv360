import { app } from "./app";
import { env } from "./config/env";
import { startTicketsEmailPolling } from "./modules/tickets-email/tickets-email.scheduler";
import { ensureTransferenciasDiscricionariasStorage } from "./modules/transferencias-discricionarias/transferencias-discricionarias.service";
import { startTransferenciasDiscricionariasPolling } from "./modules/transferencias-discricionarias/transferencias-discricionarias.scheduler";

process.on("unhandledRejection", (reason) => {
  // eslint-disable-next-line no-console
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  // eslint-disable-next-line no-console
  console.error("Uncaught Exception:", error);
});

const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Gestconv360 API running on http://localhost:${env.port}`);
});

const stopTicketsEmailPolling = startTicketsEmailPolling();
const stopTransferenciasDiscricionariasPolling = startTransferenciasDiscricionariasPolling();

void ensureTransferenciasDiscricionariasStorage().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("[transferencias-discricionarias] falha ao preparar armazenamento", error);
});

server.on("error", (error) => {
  // eslint-disable-next-line no-console
  console.error("HTTP Server Error:", error);
});

process.on("SIGINT", () => {
  stopTicketsEmailPolling();
  stopTransferenciasDiscricionariasPolling();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopTicketsEmailPolling();
  stopTransferenciasDiscricionariasPolling();
  process.exit(0);
});
