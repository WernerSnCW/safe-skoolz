import { useTranslation } from "react-i18next";

type CellKey =
  | "full"
  | "none"
  | "na"
  | "fullOwnChildren"
  | "fullOwnClass"
  | "fullOwnYear"
  | "fullOwnData"
  | "partialCaseload"
  | "partialOwnClass"
  | "partialOwnYear"
  | "partialAnonymised"
  | "partialView";

interface RoleRow {
  roleLabel: string;
  cells: [CellKey, CellKey, CellKey, CellKey, CellKey, CellKey, CellKey];
}

const COLUMN_KEYS = [
  "ownProfile",
  "ownChildren",
  "ownClassYear",
  "allSchoolData",
  "auditLog",
  "aggregatedStats",
  "policiesConfig",
] as const;

export default function PermissionsTab() {
  const { t, i18n } = useTranslation("admin");
  const { t: tTraining } = useTranslation("training");
  const today = new Date().toLocaleDateString(i18n.language, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const rows: RoleRow[] = [
    {
      roleLabel: tTraining("coordinator"),
      cells: ["full", "na", "full", "full", "full", "full", "partialView"],
    },
    {
      roleLabel: tTraining("headTeacher"),
      cells: ["full", "na", "full", "full", "full", "full", "partialView"],
    },
    {
      roleLabel: tTraining("senco"),
      cells: ["full", "na", "partialCaseload", "partialCaseload", "none", "partialCaseload", "none"],
    },
    {
      roleLabel: tTraining("teacher"),
      cells: ["full", "na", "fullOwnClass", "none", "none", "partialOwnClass", "none"],
    },
    {
      roleLabel: tTraining("headOfYear"),
      cells: ["full", "na", "fullOwnYear", "none", "none", "partialOwnYear", "none"],
    },
    {
      roleLabel: t("roles.parent"),
      cells: ["full", "fullOwnChildren", "none", "none", "none", "none", "none"],
    },
    {
      roleLabel: t("roles.pta"),
      cells: ["full", "none", "none", "none", "none", "partialAnonymised", "none"],
    },
    {
      roleLabel: t("roles.pupil"),
      cells: ["fullOwnData", "na", "none", "none", "none", "none", "none"],
    },
    {
      roleLabel: t("roles.dataController"),
      cells: ["full", "full", "full", "full", "full", "full", "full"],
    },
  ];

  const columnHeaders = COLUMN_KEYS.map((k) => t(`matrix.columns.${k}`));

  return (
    <section
      className="bg-card border border-border rounded-2xl shadow-sm p-6"
      aria-labelledby="permissions-card-title"
    >
      <h2 id="permissions-card-title" className="text-lg font-semibold mb-2">
        {t("permissionsCardTitle")}
      </h2>

      <p className="text-sm text-muted-foreground leading-relaxed mb-5">
        {t("permissionsExplainer")}
      </p>

      <div className="text-xs text-muted-foreground mb-4 flex flex-wrap gap-x-4 gap-y-1">
        <span>
          <span className="font-semibold">{t("legend.fullSymbol")}</span> {t("legend.full")}
        </span>
        <span>
          <span className="font-semibold">{t("legend.partialSymbol")}</span> {t("legend.partial")}
        </span>
        <span>
          <span className="font-semibold">{t("legend.noneSymbol")}</span> {t("legend.none")}
        </span>
        <span>
          <span className="font-semibold">{t("legend.naSymbol")}</span> {t("legend.na")}
        </span>
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left font-semibold py-2 pr-3 sticky left-0 bg-card">
                {t("matrix.roleColumn")}
              </th>
              {columnHeaders.map((h, i) => (
                <th key={i} className="text-left font-semibold py-2 px-2 text-xs">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
              >
                <td className="py-2 pr-3 font-medium sticky left-0 bg-card">
                  {row.roleLabel}
                </td>
                {row.cells.map((cell, j) => (
                  <td key={j} className="py-2 px-2 text-xs whitespace-nowrap">
                    {t(`matrix.cells.${cell}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="md:hidden flex flex-col gap-3">
        {rows.map((row, i) => (
          <li
            key={i}
            className="border border-border rounded-xl p-4 bg-muted/20"
          >
            <h3 className="font-semibold text-base mb-3">{row.roleLabel}</h3>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1.5 text-xs">
              {row.cells.map((cell, j) => (
                <div key={j} className="contents">
                  <dt className="text-muted-foreground">{columnHeaders[j]}</dt>
                  <dd className="font-medium">{t(`matrix.cells.${cell}`)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted-foreground italic mt-6 pt-4 border-t border-border">
        {t("permissionsFooter", { date: today })}
      </p>
    </section>
  );
}
