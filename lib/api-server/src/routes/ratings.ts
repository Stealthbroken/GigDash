import { Router, type IRouter } from "express";
import { and, eq, gte, sql } from "drizzle-orm";
import { db, ratingsTable } from "@workspace/db";
import { CreateRatingBody, GetRatingSummaryResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const COOLDOWN_DAYS = 30;

router.post("/ratings", async (req, res): Promise<void> => {
  const session = req.session as unknown as Record<string, unknown>;
  const userId = session["userId"] as number | undefined;
  const role = session["role"] as string | undefined;
  if (!userId || !role) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const parsed = CreateRatingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { targetType, targetId, score, comment } = parsed.data;

  if (role === "artist" && targetType !== "venue") {
    res.status(400).json({ error: "Artists can only rate venues." });
    return;
  }
  if (role === "venue" && targetType !== "artist") {
    res.status(400).json({ error: "Venues can only rate artists." });
    return;
  }

  const cooldownDate = new Date();
  cooldownDate.setDate(cooldownDate.getDate() - COOLDOWN_DAYS);

  const [existing] = await db
    .select()
    .from(ratingsTable)
    .where(
      and(
        eq(ratingsTable.raterUserId, userId),
        eq(ratingsTable.targetType, targetType),
        eq(ratingsTable.targetId, targetId),
        gte(ratingsTable.createdAt, cooldownDate),
      ),
    )
    .limit(1);

  if (existing) {
    res.status(429).json({
      error: `You already rated this ${targetType} recently. Try again after the ${COOLDOWN_DAYS}-day cooldown.`,
    });
    return;
  }

  const [rating] = await db
    .insert(ratingsTable)
    .values({
      raterUserId: userId,
      raterRole: role,
      targetType,
      targetId,
      score,
      comment: comment ?? null,
    })
    .returning();

  res.status(201).json({
    id: rating.id,
    targetType: rating.targetType,
    targetId: rating.targetId,
    score: rating.score,
    comment: rating.comment,
    createdAt: rating.createdAt,
  });
});

router.get("/ratings/:targetType/:targetId", async (req, res): Promise<void> => {
  const targetType = Array.isArray(req.params.targetType)
    ? req.params.targetType[0]
    : req.params.targetType;
  const rawId = Array.isArray(req.params.targetId) ? req.params.targetId[0] : req.params.targetId;
  const targetId = parseInt(rawId, 10);

  if (targetType !== "artist" && targetType !== "venue") {
    res.status(400).json({ error: "Invalid target type." });
    return;
  }
  if (isNaN(targetId)) {
    res.status(400).json({ error: "Invalid target ID." });
    return;
  }

  const [summary] = await db
    .select({
      average: sql<number>`COALESCE(AVG(${ratingsTable.score}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(ratingsTable)
    .where(and(eq(ratingsTable.targetType, targetType), eq(ratingsTable.targetId, targetId)));

  res.json(
    GetRatingSummaryResponse.parse({
      targetType,
      targetId,
      average: Number(summary?.average ?? 0),
      count: Number(summary?.count ?? 0),
    }),
  );
});

export default router;