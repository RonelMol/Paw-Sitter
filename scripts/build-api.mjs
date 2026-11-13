// Bundles the Vercel serverless handler into a single ESM file (api/index.js).
// Most npm packages stay external (loaded from node_modules at runtime), but
// packages that break under Vercel's loader (CJS jwks-rsa requiring ESM-only jose)
// are bundled inline so no require() of an ES module happens at runtime.
import { build } from "esbuild";

const BUNDLE_INLINE = /^(firebase-admin|jwks-rsa|jose)(\/|$)/;

await build({
  entryPoints: ["src/vercel-handler.ts"],
  outfile: "api/index.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
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
  plugins: [
    {
      name: "selective-externals",
      setup(b) {
        b.onResolve({ filter: /^[^./]|^\.[^./]|^\.\.[^/]/ }, (args) => {
          const p = args.path;
          if (p.startsWith("node:")) return { path: p, external: true };
          if (BUNDLE_INLINE.test(p)) return undefined; // bundle it
          return { path: p, external: true };
        });
      },
    },
  ],
  logLevel: "info",
});

