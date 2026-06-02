import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import eventsRouter from "./events";
import fansRouter from "./fans";
import artistsRouter from "./artists";
import venuesRouter from "./venues";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(eventsRouter);
router.use(fansRouter);
router.use(artistsRouter);
router.use(venuesRouter);

export default router;
