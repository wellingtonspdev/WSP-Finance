import { config } from "dotenv";
import fs from "fs";
import { defineConfig } from "prisma/config";

if (fs.existsSync(".env")) {
  config({ path: ".env" });
} else {
  config({ path: ".env.example" });
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "ts-node prisma/seed.ts"
  }
});
