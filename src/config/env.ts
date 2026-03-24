import dotenv from "dotenv";

dotenv.config({ override: true });

export const env = {
  port: Number(process.env.PORT ?? 3000),
  jwtSecret: process.env.JWT_SECRET ?? "gestconv360-dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h"
};
