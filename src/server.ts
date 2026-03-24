import { app } from "./app";
import { env } from "./config/env";

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

server.on("error", (error) => {
  // eslint-disable-next-line no-console
  console.error("HTTP Server Error:", error);
});
