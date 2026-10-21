import { text as t } from "./party-match-text.js";

// Original short summaries of inspected primary publications. Research never
// supplies a party position or changes a score. No abstract/PDF is republished.
export const RESEARCH_REVIEWED = "2026-10-18";
export const MATCH_RESEARCH = [
  {
    id: "carbon-meta",
    questions: ["carbon"],
    year: 2024,
    kind: "review",
    authors: "Döbbeling-Hildebrandt et al. · Nature Communications",
    title:
      "Systematic review and meta-analysis of ex-post evaluations on the effectiveness of carbon pricing",
    url: "https://doi.org/10.1038/s41467-024-48512-w",
    finding: t(
      "Die Metaanalyse bündelt 80 kausale Auswertungen von 21 CO₂-Preissystemen. Für mindestens 17 Systeme findet sie unmittelbare Emissionsminderungen.",
      "The meta-analysis combines 80 causal evaluations of 21 carbon-pricing systems, finding immediate emissions reductions for at least 17.",
      "El metaanálisis reúne 80 evaluaciones causales de 21 sistemas de precios del carbono y encuentra reducciones inmediatas de emisiones en al menos 17.",
    ),
    limits: t(
      "Wirkungen unterscheiden sich nach System und Kontext. Für viele Systeme fehlen Auswertungen; daraus folgt kein optimaler deutscher Heiz- oder Spritpreis.",
      "Effects vary by system and context. Many systems lack evaluations; the study does not determine an optimal German heating or fuel price.",
      "Los efectos varían según sistema y contexto. Muchos carecen de evaluaciones; el estudio no fija un precio óptimo para calefacción o combustible en Alemania.",
    ),
  },
  {
    id: "wealth-oecd",
    questions: ["wealth"],
    year: 2018,
    kind: "policy-review",
    authors: "OECD · Tax Policy Studies 26",
    title: "The Role and Design of Net Wealth Taxes in the OECD",
    url: "https://www.oecd.org/en/publications/the-role-and-design-of-net-wealth-taxes-in-the-oecd_9789264290303-en.html",
    finding: t(
      "Der Bericht sieht wenig Zusatznutzen einer Vermögensteuer neben breiten Kapitaleinkommensteuern und gut gestalteten Erbschaftsteuern; bei schwacher Kapitalbesteuerung fällt die Bewertung anders aus.",
      "The review finds limited arguments for an additional wealth tax alongside broad capital-income and well-designed inheritance taxes; weaker capital taxation changes that assessment.",
      "La revisión ve argumentos limitados para otro impuesto patrimonial junto a impuestos amplios al capital y sucesiones bien diseñadas; con menor imposición del capital cambia la valoración.",
    ),
    limits: t(
      "Vergleichende Politikbewertung, kein kausaler Test des deutschen Vorschlags. Freibeträge, Bewertung, Ausweichreaktionen und bestehende Steuern sind entscheidend.",
      "A comparative policy assessment, not a causal test of Germany’s proposal. Allowances, valuation, avoidance and existing taxes matter.",
      "Es una evaluación comparada, no una prueba causal de la propuesta alemana. Importan mínimos exentos, valoración, elusión e impuestos existentes.",
    ),
  },
  {
    id: "inheritance-oecd",
    questions: ["inheritance"],
    year: 2021,
    kind: "policy-review",
    authors: "OECD · Tax Policy Studies 28",
    title: "Inheritance Taxation in OECD Countries",
    url: "https://www.oecd.org/en/publications/2021/05/inheritance-taxation-in-oecd-countries_2d33ceae/full-report.html",
    finding: t(
      "Die OECD beschreibt Chancen für mehr Chancengleichheit und Einnahmen. Breite Ausnahmen und Steuerplanung können Wirkung und Progressivität erheblich verringern.",
      "The OECD identifies potential gains in equality of opportunity and revenue. Broad exemptions and tax planning can substantially weaken effects and progressivity.",
      "La OCDE identifica posibles mejoras en igualdad de oportunidades y recaudación. Exenciones amplias y planificación fiscal pueden reducir efectos y progresividad.",
    ),
    limits: t(
      "Ländervergleich und Literaturauswertung, keine Messung einer deutschen Abschaffung. Unternehmensnachfolge, Gestaltung und Durchsetzung unterscheiden sich.",
      "Cross-country comparison and literature review, not an estimate of German abolition. Business succession, design and enforcement differ.",
      "Comparación internacional y revisión bibliográfica, no una estimación de suprimir el impuesto alemán. Sucesión empresarial, diseño y aplicación varían.",
    ),
  },
  {
    id: "minimum-wage",
    questions: ["wage"],
    year: 2022,
    kind: "causal",
    authors:
      "Dustmann, Lindner, Schönberg, Umkehrer & vom Berge · Quarterly Journal of Economics",
    title: "Reallocation Effects of the Minimum Wage",
    url: "https://doi.org/10.1093/qje/qjab028",
    finding: t(
      "Die Untersuchung des deutschen Mindestlohns von 2015 findet höhere Löhne ohne Rückgang der Gesamtbeschäftigung sowie Wechsel zu größeren, besser zahlenden Betrieben.",
      "The study of Germany’s 2015 minimum wage finds higher wages without lower overall employment, alongside moves toward larger, higher-paying employers.",
      "El estudio del salario mínimo alemán de 2015 encuentra mayores salarios sin menor empleo total, junto con traslados a empresas mayores y mejor remuneradas.",
    ),
    limits: t(
      "Untersucht wird die damalige Einführung, nicht jede spätere Höhe. Einzelne Betriebe oder Gruppen können anders betroffen sein.",
      "It evaluates the original introduction, not every subsequent wage level. Individual firms or groups can experience different effects.",
      "Evalúa la introducción original, no cualquier nivel posterior. Empresas o grupos concretos pueden experimentar efectos distintos.",
    ),
  },
  {
    id: "rent-control",
    questions: ["rent"],
    year: 2019,
    kind: "causal",
    authors: "Diamond, McQuade & Qian · American Economic Review",
    title:
      "The Effects of Rent Control Expansion on Tenants, Landlords, and Inequality: Evidence from San Francisco",
    url: "https://www.aeaweb.org/articles?id=10.1257/aer.20181289",
    finding: t(
      "Nach einer Reform in San Francisco wurden Bestandsmieter seltener verdrängt. Betroffene Vermieter reduzierten zugleich das Mietwohnungsangebot um rund 15 Prozent.",
      "Following a San Francisco reform, incumbent tenants faced less displacement. Affected landlords also reduced rental supply by about 15%.",
      "Tras una reforma en San Francisco, disminuyó el desplazamiento de inquilinos existentes. Los propietarios afectados también redujeron la oferta de alquiler aproximadamente un 15 %.",
    ),
    limits: t(
      "Ein bestimmtes US-Regelwerk und Marktumfeld. Keine direkte Schätzung der deutschen Mietpreisbremse; Neubauausnahmen und Umwandlungsregeln sind wichtig.",
      "A specific US policy and market, not a direct estimate of Germany’s rent brake. Construction exemptions and conversion rules matter.",
      "Una política y mercado estadounidenses concretos, no una estimación directa de la regulación alemana. Importan exenciones de obra nueva y normas de conversión.",
    ),
  },
  {
    id: "speed-model",
    questions: ["speed"],
    year: 2024,
    kind: "model",
    authors:
      "Friedrich, Bawidamann & Schmaus · Umweltbundesamt, Texte 176/2024",
    title:
      "Modellierung der Umweltwirkung von Tempolimit-Maßnahmen auf Autobahnen und außerorts",
    url: "https://www.umweltbundesamt.de/publikationen/modellierung-der-umweltwirkung-von-tempolimit",
    finding: t(
      "Das Verkehrsmodell vergleicht mehrere Tempolimits und berechnet geringeren Kraftstoffverbrauch und weniger Emissionen; die Szenarien unterscheiden Autobahnen und andere Außerortsstraßen.",
      "The transport model compares several speed limits and calculates lower fuel use and emissions, distinguishing motorways from other non-urban roads.",
      "El modelo compara varios límites de velocidad y calcula menor consumo y emisiones, distinguiendo autopistas de otras carreteras interurbanas.",
    ),
    limits: t(
      "Modellrechnung, kein Experiment nach einer Einführung. Fahrzeugflotte, Geschwindigkeiten und Routenwahl beeinflussen die Ergebnisse; Szenarien dürfen nicht vermischt werden.",
      "A model, not a post-introduction experiment. Fleet, speeds and route choice affect estimates; results from different scenarios must not be conflated.",
      "Es un modelo, no un experimento tras la introducción. Flota, velocidades y rutas afectan las estimaciones; no deben mezclarse escenarios.",
    ),
  },
  {
    id: "nuclear-ipcc",
    questions: ["nuclear-restart"],
    year: 2022,
    kind: "assessment",
    authors: "IPCC · AR6 Working Group III, Chapter 6",
    title: "Energy systems",
    url: "https://www.ipcc.ch/report/ar6/wg3/chapter/chapter-6/",
    finding: t(
      "Der IPCC zählt Kernenergie zu den CO₂-armen Stromquellen. Er beschreibt unterschiedliche Dekarbonisierungspfade mit Erneuerbaren, gesicherter Leistung, Netzen und Speichern.",
      "The IPCC classifies nuclear power as low-carbon electricity. It describes differing decarbonisation pathways involving renewables, firm capacity, grids and storage.",
      "El IPCC clasifica la energía nuclear como electricidad baja en carbono. Describe distintas vías con renovables, potencia firme, redes y almacenamiento.",
    ),
    limits: t(
      "Die globale Bewertung beantwortet nicht, ob ein stillgelegtes deutsches Kraftwerk technisch, sicher und wirtschaftlich wieder anlaufen kann.",
      "The global assessment does not establish whether a closed German plant can restart technically, safely or economically.",
      "La evaluación global no determina si una central alemana cerrada puede reabrir de forma técnica, segura o económicamente viable.",
    ),
  },
  {
    id: "abortion-review",
    questions: ["abortion"],
    year: 2022,
    kind: "review",
    authors: "de Londras et al. · BMJ Global Health",
    title:
      "The impact of criminalisation on abortion-related outcomes: a synthesis of legal and health evidence",
    url: "https://doi.org/10.1136/bmjgh-2022-010409",
    finding: t(
      "Die Auswertung verbindet Kriminalisierung mit Verzögerungen, erschwertem Zugang und Belastungen für Betroffene und Gesundheitsberufe. Sie betrachtet Gesundheitsbefunde und Menschenrechtsrecht gemeinsam.",
      "The synthesis links criminalisation to delays, barriers to care and burdens on patients and health professionals, examining health findings alongside human-rights law.",
      "La síntesis vincula criminalización con retrasos, barreras asistenciales y cargas para pacientes y profesionales, examinando resultados sanitarios junto al derecho de derechos humanos.",
    ),
    limits: t(
      "Die Rechtsordnungen und untersuchten Daten sind verschieden. Kein randomisierter Test einer deutschen Paragraphenänderung; ethische Abwägungen werden dadurch nicht entschieden.",
      "Legal systems and underlying data vary. This is not a randomised test of German legal reform and does not settle ethical judgements.",
      "Varían los sistemas jurídicos y datos. No es una prueba aleatoria de una reforma alemana ni resuelve valoraciones éticas.",
    ),
  },
  {
    id: "sanctions-review",
    questions: ["benefit-sanctions"],
    year: 2022,
    kind: "review",
    authors: "IAB · Forschungsbericht 17/2022",
    title: "Zentrale Befunde aus Studien zu Sanktionen im SGB II",
    url: "https://iab.de/publikationen/publikation/?id=12751424",
    finding: t(
      "Die Forschungsübersicht findet häufig schnellere Übergänge in Arbeit nach Sanktionen. Einige Studien zeigen zugleich schlechtere Beschäftigungsqualität und längerfristige Nachteile.",
      "The review often finds faster transitions into work following sanctions. Some studies also identify lower job quality and longer-term disadvantages.",
      "La revisión encuentra a menudo transiciones más rápidas al empleo tras sanciones. Algunos estudios también detectan menor calidad laboral y desventajas a largo plazo.",
    ),
    limits: t(
      "Sanktionstyp, Höhe und Zielgruppe unterscheiden sich. Frühere SGB-II-Regeln lassen sich nicht unverändert auf heutige Vorschläge übertragen.",
      "Sanction type, severity and target groups differ. Earlier benefit rules cannot be transferred unchanged to today’s proposals.",
      "Difieren tipo, intensidad y grupos afectados. Las reglas anteriores no se trasladan sin cambios a las propuestas actuales.",
    ),
  },
  {
    id: "sanctions-threat",
    questions: ["benefit-sanctions"],
    year: 2024,
    kind: "causal",
    authors: "IAB · Kurzbericht 15/2024",
    title: "Ex-ante-Effekte von Sanktionen in der Grundsicherung",
    url: "https://iab.de/publikationen/publikation/?id=14149077",
    finding: t(
      "Ein höheres Sanktionsrisiko beschleunigt Übergänge in Arbeit. Bei zunächst steigendem Risiko verbessern sich auch Einkommen und Jobqualität; eine noch intensivere Anwendung bringt kleinere Beschäftigungsgewinne und schlechtere Qualität.",
      "Higher sanction risk speeds transitions into work. Initial increases also improve earnings and job quality; still more intensive use brings smaller employment gains and poorer quality.",
      "Un mayor riesgo de sanción acelera el acceso al empleo. Al principio también mejoran ingresos y calidad laboral; una aplicación aún más intensa aporta menores ganancias de empleo y peor calidad.",
    ),
    limits: t(
      "Sanktionsandrohung und vollzogener Leistungsentzug sind verschiedene Eingriffe. Der Befund legt keine universell richtige Kürzungshöhe fest.",
      "Threat of sanction and actual benefit withdrawal are different interventions. The findings do not identify a universally correct reduction.",
      "La amenaza y la retirada efectiva de prestaciones son intervenciones distintas. Los hallazgos no fijan una reducción universalmente correcta.",
    ),
  },
];
export const researchForQuestion = (id) =>
  MATCH_RESEARCH.filter((entry) => entry.questions.includes(id));
export const RESEARCH_KINDS = {
  review: t(
    "Forschungsübersicht",
    "Research review",
    "Revisión de investigación",
  ),
  "policy-review": t(
    "Vergleichende Politikbewertung",
    "Comparative policy review",
    "Evaluación comparada",
  ),
  causal: t(
    "Kausale empirische Untersuchung",
    "Causal empirical study",
    "Estudio empírico causal",
  ),
  model: t("Modellrechnung", "Modelling study", "Estudio de modelización"),
  assessment: t(
    "Wissenschaftlicher Sachstandsbericht",
    "Scientific assessment",
    "Evaluación científica",
  ),
};
