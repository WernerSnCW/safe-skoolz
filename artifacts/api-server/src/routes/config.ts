import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/config", (_req, res) => {
  res.json({
    demoEnabled: process.env.DEMO_MODE === "true",
  });
});

export default router;
