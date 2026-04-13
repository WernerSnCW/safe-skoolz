import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "@/locales/en/common.json";
import enNav from "@/locales/en/nav.json";
import enLogin from "@/locales/en/login.json";
import enDashboard from "@/locales/en/dashboard.json";
import enIncidents from "@/locales/en/incidents.json";
import enProtocols from "@/locales/en/protocols.json";
import enDiary from "@/locales/en/diary.json";
import enMessages from "@/locales/en/messages.json";
import enAlerts from "@/locales/en/alerts.json";
import enLearn from "@/locales/en/learn.json";
import enSettings from "@/locales/en/settings.json";
import enPta from "@/locales/en/pta.json";
import enBehaviour from "@/locales/en/behaviour.json";
import enCaseload from "@/locales/en/caseload.json";
import enDiagnostics from "@/locales/en/diagnostics.json";
import enTraining from "@/locales/en/training.json";

import esCommon from "@/locales/es/common.json";
import esNav from "@/locales/es/nav.json";
import esLogin from "@/locales/es/login.json";
import esDashboard from "@/locales/es/dashboard.json";
import esIncidents from "@/locales/es/incidents.json";
import esProtocols from "@/locales/es/protocols.json";
import esDiary from "@/locales/es/diary.json";
import esMessages from "@/locales/es/messages.json";
import esAlerts from "@/locales/es/alerts.json";
import esLearn from "@/locales/es/learn.json";
import esSettings from "@/locales/es/settings.json";
import esPta from "@/locales/es/pta.json";
import esBehaviour from "@/locales/es/behaviour.json";
import esCaseload from "@/locales/es/caseload.json";
import esDiagnostics from "@/locales/es/diagnostics.json";
import esTraining from "@/locales/es/training.json";

import nlCommon from "@/locales/nl/common.json";
import nlNav from "@/locales/nl/nav.json";
import nlLogin from "@/locales/nl/login.json";
import nlDashboard from "@/locales/nl/dashboard.json";
import nlIncidents from "@/locales/nl/incidents.json";
import nlProtocols from "@/locales/nl/protocols.json";
import nlDiary from "@/locales/nl/diary.json";
import nlMessages from "@/locales/nl/messages.json";
import nlAlerts from "@/locales/nl/alerts.json";
import nlLearn from "@/locales/nl/learn.json";
import nlSettings from "@/locales/nl/settings.json";
import nlPta from "@/locales/nl/pta.json";
import nlBehaviour from "@/locales/nl/behaviour.json";
import nlCaseload from "@/locales/nl/caseload.json";
import nlDiagnostics from "@/locales/nl/diagnostics.json";
import nlTraining from "@/locales/nl/training.json";

import frCommon from "@/locales/fr/common.json";
import frNav from "@/locales/fr/nav.json";
import frLogin from "@/locales/fr/login.json";
import frDashboard from "@/locales/fr/dashboard.json";
import frIncidents from "@/locales/fr/incidents.json";
import frProtocols from "@/locales/fr/protocols.json";
import frDiary from "@/locales/fr/diary.json";
import frMessages from "@/locales/fr/messages.json";
import frAlerts from "@/locales/fr/alerts.json";
import frLearn from "@/locales/fr/learn.json";
import frSettings from "@/locales/fr/settings.json";
import frPta from "@/locales/fr/pta.json";
import frBehaviour from "@/locales/fr/behaviour.json";
import frCaseload from "@/locales/fr/caseload.json";
import frDiagnostics from "@/locales/fr/diagnostics.json";
import frTraining from "@/locales/fr/training.json";

i18n.use(initReactI18next).init({
  lng: localStorage.getItem("safeskoolz_lang") ?? "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  defaultNS: "common",
  resources: {
    en: {
      common: enCommon,
      nav: enNav,
      login: enLogin,
      dashboard: enDashboard,
      incidents: enIncidents,
      protocols: enProtocols,
      diary: enDiary,
      messages: enMessages,
      alerts: enAlerts,
      learn: enLearn,
      settings: enSettings,
      pta: enPta,
      behaviour: enBehaviour,
      caseload: enCaseload,
      diagnostics: enDiagnostics,
      training: enTraining,
    },
    es: {
      common: esCommon,
      nav: esNav,
      login: esLogin,
      dashboard: esDashboard,
      incidents: esIncidents,
      protocols: esProtocols,
      diary: esDiary,
      messages: esMessages,
      alerts: esAlerts,
      learn: esLearn,
      settings: esSettings,
      pta: esPta,
      behaviour: esBehaviour,
      caseload: esCaseload,
      diagnostics: esDiagnostics,
      training: esTraining,
    },
    nl: {
      common: nlCommon,
      nav: nlNav,
      login: nlLogin,
      dashboard: nlDashboard,
      incidents: nlIncidents,
      protocols: nlProtocols,
      diary: nlDiary,
      messages: nlMessages,
      alerts: nlAlerts,
      learn: nlLearn,
      settings: nlSettings,
      pta: nlPta,
      behaviour: nlBehaviour,
      caseload: nlCaseload,
      diagnostics: nlDiagnostics,
      training: nlTraining,
    },
    fr: {
      common: frCommon,
      nav: frNav,
      login: frLogin,
      dashboard: frDashboard,
      incidents: frIncidents,
      protocols: frProtocols,
      diary: frDiary,
      messages: frMessages,
      alerts: frAlerts,
      learn: frLearn,
      settings: frSettings,
      pta: frPta,
      behaviour: frBehaviour,
      caseload: frCaseload,
      diagnostics: frDiagnostics,
      training: frTraining,
    },
  },
});

export default i18n;
