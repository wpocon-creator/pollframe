import { text as t } from "./party-match-text.js";

// Scope is part of the statistic, not an editable headline. Keep these IDs
// stable in saved results and exports; never interpret a topic as overall fit.
export const TOPIC_ROUNDS = [
  {
    id: "economy",
    color: "#3d69d1",
    name: t("Wirtschaft", "Economy", "Economía"),
    description: t(
      "Steuern, Staatsfinanzen, Arbeit und Unternehmen",
      "Tax, public finances, work and business",
      "Impuestos, finanzas públicas, trabajo y empresas",
    ),
    resultTitle: t(
      "Deine Übereinstimmung zur Wirtschaftspolitik",
      "Your agreement on economic policy",
      "Tu coincidencia en política económica",
    ),
    groups: [
      {
        id: "econ-tax",
        label: t(
          "Steuern & Vermögen",
          "Tax & wealth",
          "Impuestos y patrimonio",
        ),
        ids: ["wealth", "inheritance", "soli", "capital-income-tax"],
      },
      {
        id: "econ-work",
        label: t("Arbeit & Löhne", "Work & wages", "Trabajo y salarios"),
        ids: ["wage", "weekly-hours", "overtime-tax", "procurement-pay"],
      },
      {
        id: "econ-public",
        label: t("Staat & Märkte", "Government & markets", "Estado y mercados"),
        ids: ["debt-abolition", "rent", "electricity-tax"],
      },
      {
        id: "econ-finance",
        label: t(
          "Unternehmen & Finanzsystem",
          "Business & finance",
          "Empresas y finanzas",
        ),
        ids: ["corporate-tax", "transaction-tax", "cash", "euro-exit"],
      },
    ],
  },
  {
    id: "social",
    color: "#a04488",
    name: t("Sozialpolitik", "Social policy", "Política social"),
    description: t(
      "Wohnen, Rente, Gesundheit, Familie und soziale Absicherung",
      "Housing, pensions, health, families and social protection",
      "Vivienda, pensiones, salud, familias y protección social",
    ),
    resultTitle: t(
      "Deine Übereinstimmung zur Sozialpolitik",
      "Your agreement on social policy",
      "Tu coincidencia en política social",
    ),
    groups: [
      {
        id: "social-security",
        label: t(
          "Löhne & Absicherung",
          "Wages & protection",
          "Salarios y protección",
        ),
        ids: ["wage", "benefit-sanctions", "wealth", "noncontributory-tax"],
      },
      {
        id: "social-pension",
        label: t(
          "Rente & Vorsorge",
          "Pensions & retirement",
          "Pensiones y jubilación",
        ),
        ids: [
          "pensions",
          "early-pension",
          "retirement-age",
          "pension-investment",
        ],
      },
      {
        id: "social-home",
        label: t(
          "Wohnen, Gesundheit & Pflege",
          "Housing, health & care",
          "Vivienda, salud y cuidados",
        ),
        ids: ["rent", "health", "care-full", "nonprofit-housing"],
      },
      {
        id: "social-family",
        label: t(
          "Familie & Betreuung",
          "Family & childcare",
          "Familia y cuidados",
        ),
        ids: ["childcare-fees", "school-meals", "marriage-splitting"],
      },
    ],
  },
  {
    id: "climate-energy",
    color: "#138471",
    name: t("Klima & Energie", "Climate & energy", "Clima y energía"),
    description: t(
      "Energieversorgung, Klimaziele, Heizen und Verkehr",
      "Energy supply, climate targets, heating and transport",
      "Suministro energético, objetivos climáticos, calefacción y transporte",
    ),
    resultTitle: t(
      "Deine Übereinstimmung zu Klima & Energie",
      "Your agreement on climate & energy",
      "Tu coincidencia en clima y energía",
    ),
    groups: [
      {
        id: "energy-targets",
        label: t(
          "Klimaziele & Instrumente",
          "Climate targets & tools",
          "Objetivos e instrumentos climáticos",
        ),
        ids: ["climate", "carbon", "climate-rebate", "carbon-storage"],
      },
      {
        id: "energy-supply",
        label: t("Energieversorgung", "Energy supply", "Suministro energético"),
        ids: ["nuclear-restart", "coal-2030", "gas-fracking", "nord-stream"],
      },
      {
        id: "energy-home",
        label: t(
          "Strom & Heizen",
          "Electricity & heating",
          "Electricidad y calefacción",
        ),
        ids: ["electricity-tax", "heating-repeal", "renewable-support"],
      },
      {
        id: "energy-transport",
        label: t("Verkehr", "Transport", "Transporte"),
        ids: ["ticket", "speed", "rail", "cars-2035"],
      },
    ],
  },
];
export const TOPIC_DIMENSIONS = TOPIC_ROUNDS.flatMap((r) => r.groups);
export const topicRound = (id) => TOPIC_ROUNDS.find((r) => r.id === id) || null;
export const roundScope = (id, locale) => {
  const round = topicRound(id),
    lang = locale === "de" ? "de" : locale === "es" ? "es" : "en";
  return round
    ? `${round.name[lang]} · 15 ${lang === "de" ? "Fragen" : lang === "es" ? "preguntas" : "questions"} · ${lang === "de" ? "Programme 2025" : lang === "es" ? "programas de 2025" : "2025 programmes"}`
    : null;
};
