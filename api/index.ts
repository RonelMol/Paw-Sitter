import app from "../server.ts";

export default function handler(req: any, res: any) {
  // If Vercel rewrites without /api prefix, add it so all Express routes match
  if (req.url && !req.url.startsWith("/api") && req.url !== "/") {
    req.url = "/api" + req.url;
  }
  return app(req, res);
}
