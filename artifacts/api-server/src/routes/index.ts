import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import schoolsRouter from "./schools";
import incidentsRouter from "./incidents";
import protocolsRouter from "./protocols";
import alertsRouter from "./alerts";
import notificationsRouter from "./notifications";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(schoolsRouter);
router.use(incidentsRouter);
router.use(protocolsRouter);
router.use(alertsRouter);
router.use(notificationsRouter);
router.use(dashboardRouter);

export default router;
