// Bundles the Vercel serverless handler into a single self-contained ESM file (api/index.js).
// Everything is bundled inline so the function never depends on Vercel tracing node_modules.
// Only dev-only / optional packages that are never loaded in production stay external.
import { build } from "esbuild";

const EXTERNAL = [
  "vite",
  "@vitejs/plugin-react",
  "@tailwindcss/vite",
  "lightningcss",
  "fsevents",
  "esbuild",
  "@electric-sql/pglite",
  "@electric-sql/pglite/*",
  "drizzle-orm/pglite",
  "drizzle-orm/pglite/*",
  "pg-native",
];

await build({
  entryPoints: ["src/vercel-handler.ts"],
  outfile: "api/index.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  external: EXTERNAL,
  banner: {
    js: [
      "import { createRequire as __cr } from 'module';",
      "import { fileURLToPath as __fu } from 'url';",
      "import { dirname as __dn } from 'path';",
      "const require = __cr(import.meta.url);",
      "const __filename = __fu(import.meta.url);",
      "const __dirname = __dn(__filename);",
    ].join(" "),
  },
  logLevel: "info",
});
