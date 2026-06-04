import { Router, type IRouter } from "express";
import { SearchGeoPlacesResponse } from "@workspace/api-zod";
import { searchPlaces } from "../lib/geocode";

const router: IRouter = Router();

router.get("/geo/search", async (req, res): Promise<void> => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < 2) {
    res.json(SearchGeoPlacesResponse.parse({ places: [] }));
    return;
  }

  try {
    const places = await searchPlaces(q, 8);
    res.json(SearchGeoPlacesResponse.parse({ places }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Location lookup failed.";
    res.status(502).json({ error: message });
  }
});

export default router;