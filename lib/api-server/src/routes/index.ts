import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import settingsRouter from "./settings";
import geoRouter from "./geo";
import eventsRouter from "./events";
import fansRouter from "./fans";
import artistsRouter from "./artists";
import venuesRouter from "./venues";
import messagesRouter from "./messages";
import ratingsRouter from "./ratings";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(settingsRouter);
router.use(geoRouter);
router.use(eventsRouter);
router.use(fansRouter);
router.use(artistsRouter);
router.use(venuesRouter);
router.use(messagesRouter);
router.use(ratingsRouter);
router.use(storageRouter);

export default router;
