import { Router, type IRouter } from "express";
import { authMiddleware, requireRole } from "../lib/auth";

const router: IRouter = Router();

const DATA_RETENTION_POLICY = {
  version: "1.0.0",
  lastUpdated: "2025-01-01",
  policies: [
    {
      dataCategory: "incident_reports",
      retentionPeriod: "7 years after the pupil turns 18 (or 25 years from date of report)",
      legalBasis: "LOPIVI Art. 16; Convivèxit Decree; statutory safeguarding duty",
      description: "Incident reports, investigations, and associated evidence are retained in line with child protection statutory guidance.",
    },
    {
      dataCategory: "safeguarding_protocols",
      retentionPeriod: "7 years after closure or until pupil turns 25, whichever is later",
      legalBasis: "LOPIVI Art. 16; institutional safeguarding obligations",
      description: "Safeguarding protocol records including assessments, referrals, and outcomes.",
    },
    {
      dataCategory: "behaviour_points",
      retentionPeriod: "Duration of enrolment plus 1 year",
      legalBasis: "Convivèxit Decree; school behaviour policy",
      description: "Behaviour point records are retained during enrolment and purged 1 year after the pupil leaves.",
    },
    {
      dataCategory: "messages",
      retentionPeriod: "1 academic year after sending",
      legalBasis: "Data minimisation (GDPR Art. 5(1)(c))",
      description: "Pupil-to-staff and staff-to-staff messages are retained for 1 academic year for safeguarding cross-reference.",
    },
    {
      dataCategory: "audit_logs",
      retentionPeriod: "3 years",
      legalBasis: "LOPIVI Art. 16; accountability and traceability obligations",
      description: "System audit logs recording who accessed or modified records.",
    },
    {
      dataCategory: "user_accounts",
      retentionPeriod: "Duration of role at school plus 1 year",
      legalBasis: "Legitimate interest; contractual necessity",
      description: "Staff, parent, and pupil accounts are retained while active and purged 1 year after departure.",
    },
    {
      dataCategory: "pta_data",
      retentionPeriod: "3 years from creation",
      legalBasis: "Legitimate interest; PTA governance",
      description: "PTA messages, concerns, co-design responses, and meeting reports.",
    },
    {
      dataCategory: "newsletter_subscriptions",
      retentionPeriod: "Until unsubscribe or 2 years of inactivity",
      legalBasis: "Consent (GDPR Art. 6(1)(a))",
      description: "Newsletter email addresses are removed on unsubscribe or after 2 years without engagement.",
    },
  ],
  dataSubjectRights: {
    accessRequest: "Parents and staff may request a copy of personal data held about them or their child via the school's data protection officer.",
    erasure: "Requests for erasure will be assessed against statutory retention requirements. Safeguarding data cannot be erased during the mandatory retention period.",
    portability: "Data portability requests are supported for parent-submitted data in machine-readable format.",
    complaint: "Complaints may be directed to the relevant Data Protection Authority.",
  },
};

router.get("/data-retention/policy", authMiddleware, requireRole("coordinator", "head_teacher", "senco", "pta"), (_req, res) => {
  res.json(DATA_RETENTION_POLICY);
});

export default router;
