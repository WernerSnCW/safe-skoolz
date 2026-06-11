import { Router, type IRouter } from "express";
import healthRouter from "./health";
import configRouter from "./config";
import authRouter from "./auth";
import schoolsRouter from "./schools";
import incidentsRouter from "./incidents";
import protocolsRouter from "./protocols";
import alertsRouter from "./alerts";
import notificationsRouter from "./notifications";
import dashboardRouter from "./dashboard";
import delegatedRolesRouter from "./delegatedRoles";
import annexTemplatesRouter from "./annexTemplates";
import referralBodiesRouter from "./referralBodies";
import caseTasksRouter from "./caseTasks";
import messagesRouter from "./messages";
import sencoRouter from "./senco";
import behaviourRouter from "./behaviour";
import ptaRouter from "./pta";
import ptaGovernanceRouter from "./ptaGovernance";
import voiceGroupsRouter from "./voiceGroups";
import newsletterRouter from "./newsletter";
import contactRouter from "./contact";
import communityDiagnosticRouter from "./communityDiagnostic";
import dataRetentionRouter from "./dataRetention";
import diagnosticsRouter from "./diagnostics";
import diaryRouter from "./diary";
import teacherPostsRouter from "./teacherPosts";
import lessonsRouter from "./lessons";
import exportRouter from "./export";
import trainingRouter from "./training";
import auditRouter from "./audit";
import passwordResetRouter from "./passwordReset";
import mfaRouter from "./mfa";
import meRouter from "./me";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(configRouter);
router.use(newsletterRouter);
router.use(contactRouter);
router.use(communityDiagnosticRouter);
router.use(authRouter);
router.use(passwordResetRouter);
router.use(mfaRouter);
router.use(meRouter);
router.use(schoolsRouter);
router.use(exportRouter);
router.use(incidentsRouter);
router.use(protocolsRouter);
router.use(alertsRouter);
router.use(notificationsRouter);
router.use(dashboardRouter);
router.use(delegatedRolesRouter);
router.use(annexTemplatesRouter);
router.use(referralBodiesRouter);
router.use(caseTasksRouter);
router.use(messagesRouter);
router.use(sencoRouter);
router.use(behaviourRouter);
// Governance routes BEFORE ptaRouter: ptaRouter applies ptaPiiMiddleware to all
// /pta/* (anonymises names). Governance manages the adult member roster and must
// keep names, so it resolves first and never hits the PII stripper.
router.use(ptaGovernanceRouter);
// VOICE collectives — own router, no PII stripping (adult parents, public ask).
router.use(voiceGroupsRouter);
router.use(ptaRouter);
router.use(dataRetentionRouter);
router.use(diagnosticsRouter);
router.use(diaryRouter);
router.use(teacherPostsRouter);
router.use(lessonsRouter);
router.use(trainingRouter);
router.use(auditRouter);
router.use(adminRouter);

export default router;
