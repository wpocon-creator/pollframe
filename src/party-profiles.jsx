import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./pollframe-ui.jsx";

const tri = (de, en, es) => ({ de, en, es });

const POLICY_TEXT = {
  publicServices: tri("Öffentliche Dienste und soziale Sicherung stärken", "Strengthen public services and social protection", "Reforzar los servicios públicos y la protección social"),
  redistribution: tri("Höhere Belastung großer Vermögen und stärkerer sozialer Ausgleich", "Higher taxation of large wealth and greater redistribution", "Mayor tributación de los grandes patrimonios y más redistribución"),
  labour: tri("Arbeitnehmerrechte, Löhne und Tarifbindung stärken", "Strengthen employment rights, wages and collective bargaining", "Reforzar los derechos laborales, los salarios y la negociación colectiva"),
  housing: tri("Mehr bezahlbarer Wohnraum und stärkere Mieterschutzregeln", "More affordable housing and stronger tenant protections", "Más vivienda asequible y mayor protección del inquilino"),
  climate: tri("Schnellere Energiewende und stärkeren Klima- und Naturschutz", "Faster clean-energy transition and stronger climate and nature policy", "Acelerar la transición energética y reforzar la protección climática y natural"),
  greenIndustry: tri("Klimapolitik mit Investitionen in Industrie und Infrastruktur verbinden", "Link climate policy to investment in industry and infrastructure", "Vincular la política climática con inversión industrial y en infraestructuras"),
  marketEconomy: tri("Wettbewerb, private Investitionen und marktwirtschaftliche Instrumente", "Competition, private investment and market-based instruments", "Competencia, inversión privada e instrumentos de mercado"),
  lowerTax: tri("Steuern und Abgaben senken", "Lower taxes and levies", "Reducir impuestos y cotizaciones"),
  deregulation: tri("Bürokratie und Regulierung abbauen", "Reduce regulation and administrative burdens", "Reducir regulación y cargas administrativas"),
  publicInvestment: tri("Mehr staatliche Investitionen in Infrastruktur, Bildung und Digitalisierung", "More public investment in infrastructure, education and digitalisation", "Más inversión pública en infraestructuras, educación y digitalización"),
  fiscalDiscipline: tri("Haushaltsdisziplin und begrenzte Staatsverschuldung", "Fiscal discipline and limits on public borrowing", "Disciplina fiscal y límites al endeudamiento público"),
  civilLiberties: tri("Bürgerrechte, Datenschutz und gesellschaftliche Selbstbestimmung", "Civil liberties, privacy and personal autonomy", "Libertades civiles, privacidad y autonomía personal"),
  security: tri("Polizei, Justiz und Verteidigungsfähigkeit stärken", "Strengthen policing, justice and defence capacity", "Reforzar la policía, la justicia y la capacidad de defensa"),
  migrationControl: tri("Einwanderung stärker begrenzen und kontrollieren", "Tighter limits and controls on immigration", "Endurecer los límites y controles a la inmigración"),
  asylumRights: tri("Asylrechte und reguläre Einwanderungswege schützen", "Protect asylum rights and regular migration routes", "Proteger el derecho de asilo y las vías regulares de inmigración"),
  euIntegration: tri("Engere europäische Zusammenarbeit und Integration", "Closer European cooperation and integration", "Mayor cooperación e integración europea"),
  nationalSovereignty: tri("Mehr nationale Entscheidungsmacht gegenüber EU-Institutionen", "More national decision-making power relative to EU institutions", "Más capacidad de decisión nacional frente a las instituciones de la UE"),
  diplomacy: tri("Diplomatie, Rüstungskontrolle und Zurückhaltung bei Militäreinsätzen", "Diplomacy, arms control and restraint in military deployments", "Diplomacia, control de armamentos y contención en despliegues militares"),
  defence: tri("NATO-Zusammenarbeit und Unterstützung der Ukraine stärken", "Strengthen NATO cooperation and support for Ukraine", "Reforzar la cooperación en la OTAN y el apoyo a Ucrania"),
  localism: tri("Mehr Entscheidungen und Finanzmittel für Kommunen und Regionen", "More decisions and funding devolved to local and regional government", "Más decisiones y financiación para gobiernos locales y regionales"),
  rural: tri("Landwirtschaft, ländliche Räume und regionale Infrastruktur stärken", "Support farming, rural communities and regional infrastructure", "Apoyar la agricultura, el medio rural y las infraestructuras regionales"),
  minorityRights: tri("Nationale Minderheiten, Sprachen und kulturelle Rechte schützen", "Protect national minorities, languages and cultural rights", "Proteger las minorías nacionales, las lenguas y los derechos culturales"),
  politicalReform: tri("Wahlrecht, Transparenz und demokratische Institutionen reformieren", "Reform elections, transparency and democratic institutions", "Reformar las elecciones, la transparencia y las instituciones democráticas"),
  antiCorruption: tri("Korruption bekämpfen und öffentliche Institutionen stärker kontrollieren", "Tackle corruption and strengthen scrutiny of public institutions", "Combatir la corrupción y reforzar el control de las instituciones públicas"),
  traditionalValues: tri("Konservative Familien- und Gesellschaftspolitik", "Conservative family and social policy", "Políticas familiares y sociales conservadoras"),
  animalWelfare: tri("Tierschutz und Tierrechte deutlich ausbauen", "Substantially expand animal welfare and animal rights", "Ampliar sustancialmente el bienestar y los derechos de los animales"),
  scottishIndependence: tri("Schottische Unabhängigkeit und Rückkehr in die EU", "Scottish independence and re-entry to the EU", "Independencia de Escocia y reingreso en la UE"),
  welshIndependence: tri("Walisische Unabhängigkeit und mehr Kompetenzen für Wales", "Welsh independence and greater powers for Wales", "Independencia de Gales y mayores competencias para Gales"),
  irishUnity: tri("Ein vereintes Irland durch einen demokratischen Referendumsprozess", "Irish unity through a democratic referendum process", "Una Irlanda unida mediante un proceso democrático de referéndum"),
  ukUnion: tri("Nordirlands Platz im Vereinigten Königreich sichern", "Maintain Northern Ireland's place in the United Kingdom", "Mantener el lugar de Irlanda del Norte en el Reino Unido"),
  stormontReform: tri("Stabile Machtteilung und Reform der nordirischen Institutionen", "Stable power-sharing and reform of Northern Ireland's institutions", "Cogobierno estable y reforma de las instituciones norirlandesas"),
  spanishUnity: tri("Einheit Spaniens und stärkere gesamtstaatliche Regeln", "Spanish unity and stronger nationwide rules", "Unidad de España y reglas estatales más uniformes"),
  federalSpain: tri("Föderale oder plurinational ausgerichtete Weiterentwicklung Spaniens", "A more federal or plurinational model for Spain", "Un modelo de España más federal o plurinacional"),
  catalanIndependence: tri("Katalanische Unabhängigkeit und ein Selbstbestimmungsreferendum", "Catalan independence and a self-determination referendum", "Independencia catalana y referéndum de autodeterminación"),
  basqueSelfGovernment: tri("Mehr baskische Selbstverwaltung und das Recht auf Selbstbestimmung", "Greater Basque self-government and a right to self-determination", "Mayor autogobierno vasco y derecho de autodeterminación"),
  galicianSelfGovernment: tri("Mehr galicische Selbstverwaltung, Sprachschutz und faire Finanzierung", "Greater Galician self-government, language protection and fair funding", "Mayor autogobierno gallego, protección lingüística y financiación justa"),
  canaryAutonomy: tri("Kanarische Sonderinteressen, Autonomie und Finanzierung verteidigen", "Defend Canary Islands interests, autonomy and funding", "Defender los intereses, la autonomía y la financiación de Canarias"),
  navarreForal: tri("Navarras Foralordnung und eigenständige Institutionen verteidigen", "Defend Navarre's foral settlement and distinct institutions", "Defender el régimen foral y las instituciones propias de Navarra"),
  regionalFunding: tri("Mehr und verlässlichere Finanzierung für die eigene Region", "More and more reliable funding for its home nation or region", "Más financiación y mayor estabilidad para su territorio"),
};

const FAMILY_TEXT = {
  christianDemocratic: tri("christdemokratisch und konservativ, meist in der Mitte-rechts", "Christian democratic and conservative, generally on the centre-right", "democristiana y conservadora, generalmente de centroderecha"),
  conservativeCentreRight: tri("konservativ und in der Mitte-rechts", "conservative and on the centre-right", "conservadora y de centroderecha"),
  socialDemocratic: tri("sozialdemokratisch und in der Mitte-links", "social democratic and on the centre-left", "socialdemócrata y de centroizquierda"),
  greenProgressive: tri("grün und progressiv, meist in der Mitte-links", "green and progressive, generally on the centre-left", "verde y progresista, generalmente de centroizquierda"),
  marketLiberal: tri("liberal mit einem marktwirtschaftlichen Schwerpunkt", "liberal with a market-oriented economic outlook", "liberal, con una orientación económica de mercado"),
  democraticSocialist: tri("demokratisch-sozialistisch und links", "democratic socialist and on the left", "socialista democrática y de izquierdas"),
  nationalistRight: tri("nationalkonservativ und rechts", "national-conservative and on the right", "nacional-conservadora y de derechas"),
  leftEconomicRestrictive: tri("wirtschaftlich links und interventionistisch, gesellschaftspolitisch in Teilen restriktiver", "economically left and interventionist, while more restrictive on some social and migration questions", "económicamente de izquierdas e intervencionista, y más restrictiva en algunas cuestiones sociales y migratorias"),
  localConservative: tri("kommunal und regional orientiert, mit überwiegend bürgerlich-konservativem Profil", "localist and regionalist, with a broadly centrist-to-conservative profile", "localista y regionalista, con un perfil generalmente centrista o conservador"),
  minoritySocialLiberal: tri("regionalistisch sowie sozialliberal und auf Minderheitenrechte ausgerichtet", "regionalist and social-liberal, with a focus on minority rights", "regionalista y socioliberal, con énfasis en los derechos de las minorías"),
  regionalLocalist: tri("regionalistisch und kommunal orientiert", "regionalist and localist", "regionalista y localista"),
  socialLiberal: tri("sozialliberal und politisch in der Mitte", "social-liberal and broadly centrist", "socioliberal y generalmente centrista"),
  greenLeft: tri("grün und links", "green and on the left", "verde y de izquierdas"),
  civicNationalistLeft: tri("bürgerlich-nationalistisch und in der Mitte-links", "civic-nationalist and on the centre-left", "nacionalista cívica y de centroizquierda"),
  euroscepticRight: tri("EU-skeptisch und rechts", "Eurosceptic and on the right", "euroescéptica y de derechas"),
  communitarianSocialDemocratic: tri("gemeinschaftsorientiert und sozialdemokratisch, in gesellschaftlichen Fragen eher konservativ", "communitarian and social democratic, while relatively conservative on social questions", "comunitaria y socialdemócrata, y relativamente conservadora en cuestiones sociales"),
  centristProEuropean: tri("zentristisch, liberal und proeuropäisch", "centrist, liberal and pro-European", "centrista, liberal y proeuropea"),
  republicanLeft: tri("links und irisch-republikanisch", "left-wing and Irish republican", "de izquierdas y republicana irlandesa"),
  unionistConservative: tri("unionistisch und konservativ", "unionist and conservative", "unionista y conservadora"),
  unionistCentreRight: tri("unionistisch und in der Mitte-rechts", "unionist and on the centre-right", "unionista y de centroderecha"),
  nationalistLeft: tri("links und nationalistisch beziehungsweise für regionale Selbstbestimmung", "left-wing and nationalist or supportive of regional self-determination", "de izquierdas y nacionalista o partidaria de la autodeterminación territorial"),
  regionalChristianDemocratic: tri("regional-nationalistisch und christdemokratisch, meist in der Mitte bis Mitte-rechts", "regional-nationalist and Christian democratic, generally centrist to centre-right", "nacionalista territorial y democristiana, generalmente de centro o centroderecha"),
  liberalNationalist: tri("liberal bis Mitte-rechts und nationalistisch beziehungsweise unabhängigkeitsorientiert", "liberal to centre-right and nationalist or pro-independence", "liberal o de centroderecha y nacionalista o independentista"),
  centristRegionalist: tri("zentristisch und regionalistisch", "centrist and regionalist", "centrista y regionalista"),
  regionalConservative: tri("regionalistisch und konservativ, meist in der Mitte-rechts", "regionalist and conservative, generally on the centre-right", "regionalista y conservadora, generalmente de centroderecha"),
  antiEstablishment: tri("gegen das politische Establishment ausgerichtet; eine eindeutige Links-rechts-Einordnung greift zu kurz", "anti-establishment; a single left-right label does not describe it well", "contraria al establishment; una única etiqueta de izquierda-derecha no la describe bien"),
  animalRights: tri("auf Tierrechte und Umweltschutz spezialisiert und nicht eindeutig auf einer klassischen Links-rechts-Achse", "focused on animal rights and environmental protection rather than a clear place on the traditional left-right axis", "centrada en los derechos de los animales y el medio ambiente, más que en una posición clara en el eje izquierda-derecha"),
};

const PARTY_FAMILIES = {
  de: { union: "christianDemocratic", cdu: "christianDemocratic", csu: "christianDemocratic", spd: "socialDemocratic", greens: "greenProgressive", fdp: "marketLiberal", left: "democraticSocialist", afd: "nationalistRight", bsw: "leftEconomicRestrictive", "free-voters": "localConservative", ssw: "minoritySocialLiberal", "bvb-fw": "regionalLocalist" },
  uk: { labour: "socialDemocratic", conservative: "conservativeCentreRight", "liberal-democrats": "socialLiberal", green: "greenLeft", reform: "nationalistRight", snp: "civicNationalistLeft", plaid: "civicNationalistLeft", ukip: "euroscepticRight", sdp: "communitarianSocialDemocratic", "change-uk": "centristProEuropean", "sinn-fein": "republicanLeft", dup: "unionistConservative", alliance: "socialLiberal", uup: "unionistCentreRight", sdlp: "socialDemocratic", tuv: "unionistConservative" },
  es: { "podemos-up": "democraticSocialist", sumar: "greenProgressive", psoe: "socialDemocratic", pp: "christianDemocratic", vox: "nationalistRight", erc: "nationalistLeft", "eh-bildu": "nationalistLeft", bng: "nationalistLeft", pnv: "regionalChristianDemocratic", junts: "liberalNationalist", cca: "centristRegionalist", upn: "regionalConservative", salf: "antiEstablishment", alianca: "nationalistRight", adelante: "nationalistLeft", iu: "democraticSocialist", compromis: "greenProgressive", ciudadanos: "socialLiberal", cup: "democraticSocialist", pacma: "animalRights", upyd: "socialLiberal", "ciu-cdc": "liberalNationalist", "mas-pais": "greenProgressive" },
};

const SCOPE_TEXT = {
  de: tri("Deutschlandweit", "Across Germany", "En toda Alemania"),
  bavaria: tri("Nur in Bayern; bei Bundestagswahlen gemeinsam mit der CDU", "Bavaria only; contests federal elections alongside the CDU", "Solo en Baviera; concurre a las elecciones federales junto con la CDU"),
  schleswig: tri("Schleswig-Holstein; Partei der dänischen Minderheit und der Friesen", "Schleswig-Holstein; represents the Danish minority and Frisians", "Schleswig-Holstein; representa a la minoría danesa y a los frisones"),
  brandenburg: tri("Brandenburg", "Brandenburg", "Brandeburgo"),
  uk: tri("Im gesamten Vereinigten Königreich bzw. über verbundene Landesparteien", "Across the United Kingdom, including through affiliated national parties", "En todo el Reino Unido, incluidas organizaciones nacionales vinculadas"),
  greatBritain: tri("England, Schottland und Wales; nicht Nordirland", "England, Scotland and Wales; not Northern Ireland", "Inglaterra, Escocia y Gales; no Irlanda del Norte"),
  englandWales: tri("England und Wales", "England and Wales", "Inglaterra y Gales"),
  scotland: tri("Schottland", "Scotland", "Escocia"),
  wales: tri("Wales", "Wales", "Gales"),
  northernIreland: tri("Nordirland", "Northern Ireland", "Irlanda del Norte"),
  spain: tri("Spanienweit", "Across Spain", "En toda España"),
  catalonia: tri("Katalonien", "Catalonia", "Cataluña"),
  basqueNavarre: tri("Baskenland und Navarra", "Basque Country and Navarre", "País Vasco y Navarra"),
  galicia: tri("Galicien", "Galicia", "Galicia"),
  canaries: tri("Kanarische Inseln", "Canary Islands", "Canarias"),
  navarre: tri("Navarra", "Navarre", "Navarra"),
  andalusia: tri("Andalusien", "Andalusia", "Andalucía"),
  valencia: tri("Valencianische Gemeinschaft", "Valencian Community", "Comunitat Valenciana"),
  historical: tri("Historischer Eintrag in Pollframes Umfragearchiv", "Historical entry in Pollframe's polling archive", "Entrada histórica en el archivo de encuestas de Pollframe"),
  regionalSpain: tri("Regionale oder lokale Kandidatur in Spanien; das genaue Wahlgebiet steht in der verlinkten Wahlquelle", "Regional or local candidacy in Spain; consult the linked election source for its exact area", "Candidatura autonómica o local en España; la fuente electoral enlazada indica su ámbito exacto"),
};

const RELATION_TEXT = {
  union: tri("CDU und CSU sind rechtlich eigenständige Parteien. Die CSU tritt nur in Bayern an, die CDU in den übrigen Bundesländern. Im Bundestag bilden sie seit 1949 grundsätzlich eine gemeinsame Fraktion und veröffentlichen gemeinsame Bundestagswahlprogramme.", "The CDU and CSU are legally separate parties. The CSU contests only in Bavaria and the CDU in the other German states. They have normally formed one parliamentary group in the Bundestag since 1949 and publish joint federal-election programmes.", "CDU y CSU son partidos jurídicamente distintos. La CSU solo concurre en Baviera y la CDU en los demás estados. Normalmente forman un único grupo en el Bundestag desde 1949 y publican programas federales conjuntos."),
  bvb: tri("BVB/FW ist eine eigenständige Brandenburger politische Vereinigung und nicht mit der Bundespartei Freie Wähler identisch.", "BVB/FW is a separate Brandenburg political association and is not the same organisation as the national Free Voters party.", "BVB/FW es una asociación política propia de Brandeburgo y no es la misma organización que el partido federal Freie Wähler."),
  greenUk: tri("Der hier verwendete Wert bezieht sich in Westminster-Umfragen gewöhnlich auf die Green Party of England and Wales. Die Scottish Greens sind eine eigenständige Partei.", "In Westminster polling this label normally refers to the Green Party of England and Wales. The Scottish Greens are a separate party.", "En encuestas de Westminster esta etiqueta suele referirse al Green Party of England and Wales. Los Scottish Greens son un partido distinto."),
  sinnFein: tri("Gewählte Sinn-Féin-Abgeordnete nehmen ihre Sitze im britischen Unterhaus nicht ein, weil sie den Treueeid auf die Krone ablehnen.", "Sinn Féin MPs do not take their seats in the House of Commons because the party rejects the oath of allegiance to the Crown.", "Los diputados de Sinn Féin no ocupan sus escaños en los Comunes porque el partido rechaza el juramento de lealtad a la Corona."),
  podemos: tri("Unidas Podemos war ein Wahlbündnis, an dem Podemos und Izquierda Unida beteiligt waren. Pollframe führt ältere Umfragewerte deshalb gemeinsam; neuere Podemos-Werte können je nach Quelle separat ausgewiesen werden.", "Unidas Podemos was an electoral alliance including Podemos and Izquierda Unida. Pollframe therefore groups older polling under this label; newer Podemos figures may be reported separately where sources do so.", "Unidas Podemos fue una alianza electoral que incluía a Podemos e Izquierda Unida. Pollframe agrupa por ello encuestas antiguas bajo esta etiqueta; datos posteriores de Podemos pueden aparecer por separado cuando así lo hacen las fuentes."),
  sumar: tri("Sumar trat 2023 als Wahlkoalition mehrerer linker und grüner Parteien an. Movimiento Sumar ist zugleich eine eigene Partei; die genaue Zusammensetzung von Bündnissen kann sich zwischen Wahlen ändern.", "Sumar contested the 2023 election as a coalition of several left and green parties. Movimiento Sumar is also a party in its own right; the coalition's composition can change between elections.", "Sumar concurrió en 2023 como coalición de varios partidos de izquierda y verdes. Movimiento Sumar también es un partido propio; la composición de la coalición puede cambiar entre elecciones."),
  ciu: tri("Convergència i Unió war ein katalanisches Bündnis, das 2015 endete. Convergència Democràtica de Catalunya wurde 2016 aufgelöst; der Eintrag bleibt nur für historische Umfragen erhalten.", "Convergència i Unió was a Catalan alliance that ended in 2015. Convergència Democràtica de Catalunya was dissolved in 2016; this entry is retained only for historical polling.", "Convergència i Unió fue una alianza catalana que terminó en 2015. Convergència Democràtica de Catalunya se disolvió en 2016; la entrada se conserva solo para encuestas históricas."),
  psoe: tri("Der PSOE ist föderal organisiert. Der PSC ist eine eigenständige, autonome Partei in Katalonien, die über ein Einheitsprotokoll mit dem PSOE verbunden ist; andere regionale Kürzel bezeichnen territoriale Parteien oder Föderationen des PSOE.", "The PSOE has a federal structure. The PSC is a separate, autonomous party in Catalonia linked to the PSOE by a unity protocol; other regional labels identify the PSOE's territorial parties or federations.", "El PSOE tiene una estructura federal. El PSC es un partido propio y autónomo en Cataluña, vinculado al PSOE mediante un protocolo de unidad; las demás siglas regionales identifican partidos o federaciones territoriales del PSOE."),
  upn: tri("UPN ist eine rechtlich eigenständige Regionalpartei Navarras und keine Regionalorganisation des PP. Beide Parteien haben unter anderem im Bündnis Navarra Suma zusammengearbeitet; UPN entscheidet seine Positionen selbst.", "UPN is a legally separate Navarre regional party, not a regional organisation of the PP. The parties have cooperated, including in the Navarra Suma alliance; UPN determines its own positions.", "UPN es un partido regional navarro jurídicamente independiente, no una organización territorial del PP. Ambos han cooperado, entre otros, en la coalición Navarra Suma; UPN decide sus propias posiciones."),
  historical: tri("Diese Organisation tritt nicht mehr als aktuelle landesweite Partei in den hier gezeigten Wahlen an. Pollframe behält sie bei, damit ältere Umfragen korrekt lesbar bleiben.", "This organisation no longer contests the elections shown here as a current nationwide party. Pollframe retains it so historical polls remain legible.", "Esta organización ya no concurre como partido estatal vigente a las elecciones mostradas. Pollframe la conserva para que las encuestas históricas sigan siendo legibles."),
};

const source = (type, url, label = null) => ({ type, url, label });
const p = (fullName, founded, scope, policies, programmeYear, sources, relation = null, status = "current") => ({ fullName, founded, scope, policies, programmeYear, sources, relation, status });

export const PARTY_PROFILES = {
  de: {
    union: p("Christlich Demokratische Union Deutschlands / Christlich-Soziale Union in Bayern", null, "de", ["marketEconomy", "migrationControl", "security", "defence"], "2025", [source("programme", "https://www.cdu.de/wahlprogramm-von-cdu-und-csu/"), source("relationship", "https://www.cducsu.de/fraktion/organisation")], "union"),
    cdu: p("Christlich Demokratische Union Deutschlands", 1945, "de", ["marketEconomy", "migrationControl", "security", "defence"], "2025", [source("programme", "https://www.cdu.de/wahlprogramm-von-cdu-und-csu/"), source("principles", "https://www.cdu.de/grundsatzprogramm")], "union"),
    csu: p("Christlich-Soziale Union in Bayern", 1945, "bavaria", ["marketEconomy", "migrationControl", "rural", "traditionalValues"], "2025", [source("programme", "https://www.cdu.de/wahlprogramm-von-cdu-und-csu/"), source("principles", "https://www.csu.de/common/download/CSU_Grundsatzprogramm_2023.pdf")], "union"),
    spd: p("Sozialdemokratische Partei Deutschlands", 1863, "de", ["publicInvestment", "labour", "publicServices", "greenIndustry"], "2025", [source("programme", "https://www.spd.de/bundestagswahl/programm"), source("official", "https://www.spd.de/")]),
    greens: p("Bündnis 90/Die Grünen", "1980 / 1993", "de", ["climate", "greenIndustry", "publicInvestment", "euIntegration"], "2025", [source("programme", "https://www.gruene.de/artikel/zusammen-wachsen"), source("principles", "https://www.gruene.de/beschluesse-und-programme")]),
    fdp: p("Freie Demokratische Partei", 1948, "de", ["lowerTax", "deregulation", "civilLiberties", "fiscalDiscipline"], "2025", [source("programme", "https://www.fdp.de/das-wahlprogramm-der-freien-demokraten-zur-bundestagswahl-2025"), source("official", "https://www.fdp.de/")]),
    left: p("Die Linke", 2007, "de", ["redistribution", "housing", "publicServices", "diplomacy"], "2025", [source("programme", "https://www.die-linke.de/bundestagswahl-2025/wahlprogramm/"), source("official", "https://www.die-linke.de/")]),
    afd: p("Alternative für Deutschland", 2013, "de", ["migrationControl", "nationalSovereignty", "lowerTax", "traditionalValues"], "2025", [source("programme", "https://www.afd.de/wahlprogramm25/"), source("principles", "https://www.afd.de/grundsatzprogramm/")]),
    bsw: p("Bündnis Sahra Wagenknecht – Vernunft und Gerechtigkeit", 2024, "de", ["publicServices", "migrationControl", "diplomacy", "marketEconomy"], "2025", [source("programme", "https://bsw-vg.de/wp-content/themes/bsw/assets/downloads/BSW%20Wahlprogramm%202025.pdf"), source("official", "https://bsw-vg.de/")]),
    "free-voters": p("FREIE WÄHLER Bundesvereinigung", 2009, "de", ["localism", "rural", "marketEconomy", "publicInvestment"], "2025", [source("programme", "https://www.freiewaehler.eu/services/dokumente/"), source("official", "https://www.freiewaehler.eu/")]),
    ssw: p("Südschleswigscher Wählerverband", 1948, "schleswig", ["minorityRights", "regionalFunding", "publicServices", "climate"], "2025", [source("programme", "https://www.ssw.de/bundestagswahl"), source("official", "https://www.ssw.de/")]),
    "bvb-fw": p("Brandenburger Vereinigte Bürgerbewegungen / Freie Wähler", 2008, "brandenburg", ["localism", "rural", "publicInvestment", "politicalReform"], "2024", [source("programme", "https://bvb-fw.de/unser-programm/"), source("official", "https://bvb-fw.de/")], "bvb"),
  },
  uk: {
    labour: p("Labour Party", 1900, "greatBritain", ["publicInvestment", "labour", "publicServices", "greenIndustry"], "2024", [source("programme", "https://labour.org.uk/change/"), source("official", "https://labour.org.uk/")]),
    conservative: p("Conservative and Unionist Party", 1834, "uk", ["lowerTax", "marketEconomy", "migrationControl", "security"], "2024", [source("programme", "https://public.conservatives.com/static/documents/GE2024/Conservative-Manifesto-GE2024.pdf"), source("official", "https://www.conservatives.com/")]),
    "liberal-democrats": p("Liberal Democrats", 1988, "greatBritain", ["publicServices", "civilLiberties", "politicalReform", "euIntegration"], "2024", [source("programme", "https://www.libdems.org.uk/manifesto"), source("official", "https://www.libdems.org.uk/")]),
    green: p("Green Party of England and Wales", 1990, "englandWales", ["climate", "redistribution", "housing", "politicalReform"], "2024", [source("programme", "https://greenparty.org.uk/about/our-manifesto/"), source("official", "https://greenparty.org.uk/")], "greenUk"),
    reform: p("Reform UK", 2018, "greatBritain", ["migrationControl", "lowerTax", "deregulation", "nationalSovereignty"], "2024", [source("programme", "https://www.reformparty.uk/policies"), source("official", "https://www.reformparty.uk/")]),
    snp: p("Scottish National Party", 1934, "scotland", ["scottishIndependence", "publicServices", "euIntegration", "climate"], "2024", [source("programme", "https://www.snp.org/manifesto/"), source("official", "https://www.snp.org/")]),
    plaid: p("Plaid Cymru – The Party of Wales", 1925, "wales", ["welshIndependence", "regionalFunding", "publicServices", "minorityRights"], "2024", [source("programme", "https://www.partyof.wales/2024"), source("principles", "https://www.partyof.wales/constitution")]),
    ukip: p("UK Independence Party", 1993, "uk", ["nationalSovereignty", "migrationControl", "lowerTax", "traditionalValues"], null, [source("official", "https://www.ukip.org/"), source("register", "https://search.electoralcommission.org.uk/English/Registrations/PP90")]),
    sdp: p("Social Democratic Party", 1990, "uk", ["marketEconomy", "publicServices", "traditionalValues", "nationalSovereignty"], null, [source("programme", "https://sdp.org.uk/policies/"), source("official", "https://sdp.org.uk/")]),
    "change-uk": p("Change UK – The Independent Group", 2019, "historical", [], null, [source("parliament", "https://commonslibrary.parliament.uk/research-briefings/cbp-7529/")], "historical", "historical"),
    "sinn-fein": p("Sinn Féin", 1905, "northernIreland", ["irishUnity", "publicServices", "housing", "climate"], "2024", [source("programme", "https://sinnfein.ie/news/sinn-fein-launches-manifesto-for-positive-change/"), source("official", "https://sinnfein.ie/")], "sinnFein"),
    dup: p("Democratic Unionist Party", 1971, "northernIreland", ["ukUnion", "regionalFunding", "publicServices", "traditionalValues"], "2024", [source("programme", "https://mydup.com/news/speaking-up-for-northern-ireland"), source("official", "https://mydup.com/policies")]),
    alliance: p("Alliance Party of Northern Ireland", 1970, "northernIreland", ["stormontReform", "publicServices", "climate", "politicalReform"], "2024", [source("programme", "https://www.allianceparty.org/our_policies"), source("official", "https://www.allianceparty.org/")]),
    uup: p("Ulster Unionist Party", 1905, "northernIreland", ["ukUnion", "publicServices", "regionalFunding", "marketEconomy"], "2024", [source("programme", "https://www.uup.org/manifestos"), source("official", "https://www.uup.org/")]),
    sdlp: p("Social Democratic and Labour Party", 1970, "northernIreland", ["irishUnity", "publicServices", "labour", "stormontReform"], null, [source("principles", "https://www.sdlp.ie/about"), source("official", "https://www.sdlp.ie/")]),
    tuv: p("Traditional Unionist Voice", 2007, "northernIreland", ["ukUnion", "nationalSovereignty", "migrationControl", "lowerTax"], "2024", [source("programme", "https://tuv.org.uk/restore-the-union-tuv-manifesto-launch/"), source("official", "https://tuv.org.uk/")]),
  },
  es: {
    "podemos-up": p("Podemos / Unidas Podemos", "2014 / 2016", "spain", ["redistribution", "housing", "publicServices", "federalSpain"], null, [source("programme", "https://podemos.info/programa/"), source("official", "https://podemos.info/")], "podemos"),
    sumar: p("Movimiento Sumar / coalición Sumar", 2023, "spain", ["labour", "housing", "publicServices", "climate"], "2023", [source("programme", "https://movimientosumar.es/transparencia/"), source("official", "https://movimientosumar.es/")], "sumar"),
    psoe: p("Partido Socialista Obrero Español", 1879, "spain", ["publicServices", "labour", "greenIndustry", "euIntegration"], "2023", [source("programme", "https://www.psoe.es/transparencia/informacion-politica-organizativa/programa/"), source("official", "https://www.psoe.es/conocenos/estructura/territorial/")], "psoe"),
    pp: p("Partido Popular", 1989, "spain", ["marketEconomy", "lowerTax", "spanishUnity", "security"], "2023", [source("programme", "https://www.pp.es/actualidad/articulos/programa-electoral-propone-365-medidas-reconstruccion-economica-social-e/"), source("official", "https://www.pp.es/")]),
    vox: p("Vox", 2013, "spain", ["spanishUnity", "migrationControl", "lowerTax", "traditionalValues"], "2023", [source("programme", "https://www.voxespana.es/programa/programa-electoral-vox"), source("official", "https://www.voxespana.es/")]),
    erc: p("Esquerra Republicana de Catalunya", 1931, "catalonia", ["catalanIndependence", "redistribution", "publicServices", "minorityRights"], "2023", [source("programme", "https://static.esquerra.cat/uploads/20230905/e2023-programa.pdf"), source("official", "https://www.esquerra.cat/")]),
    "eh-bildu": p("Euskal Herria Bildu", 2012, "basqueNavarre", ["basqueSelfGovernment", "publicServices", "housing", "climate"], "Latest linked documents", [source("programme", "https://ehbildu.eus/es/documentos"), source("official", "https://ehbildu.eus/")]),
    bng: p("Bloque Nacionalista Galego", 1982, "galicia", ["galicianSelfGovernment", "publicServices", "regionalFunding", "climate"], null, [source("programme", "https://www.bng.gal/estaticas/programas-eleitorais.html"), source("official", "https://www.bng.gal/")]),
    pnv: p("Euzko Alderdi Jeltzalea – Partido Nacionalista Vasco", 1895, "basqueNavarre", ["basqueSelfGovernment", "marketEconomy", "publicServices", "euIntegration"], null, [source("programme", "https://www.eaj-pnv.eus/documentos/"), source("official", "https://www.eaj-pnv.eus/")]),
    junts: p("Junts per Catalunya", 2020, "catalonia", ["catalanIndependence", "regionalFunding", "marketEconomy", "minorityRights"], "2023", [source("programme", "https://junts.cat/programa-electoral/"), source("official", "https://junts.cat/")]),
    cca: p("Coalición Canaria", 1993, "canaries", ["canaryAutonomy", "regionalFunding", "publicServices", "rural"], null, [source("programme", "https://coalicioncanaria.org/programas-electorales/"), source("official", "https://coalicioncanaria.org/")]),
    upn: p("Unión del Pueblo Navarro", 1979, "navarre", ["navarreForal", "spanishUnity", "marketEconomy", "publicServices"], null, [source("programme", "https://elecciones.upn.org/programa/"), source("official", "https://www.upn.org/principios-y-valores/")], "upn"),
    salf: p("Se Acabó La Fiesta", 2024, "spain", ["antiCorruption", "politicalReform", "lowerTax"], "2024", [source("official", "https://seacabolafiesta.com/"), source("register", "https://infoelectoral.interior.gob.es/es/formaciones-politicas/registro-de-partidos-politicos/tramites-habituales/como-inscribir-una-formacion-politica/")]),
    alianca: p("Aliança Catalana", 2020, "catalonia", ["catalanIndependence", "migrationControl", "lowerTax", "traditionalValues"], null, [source("programme", "https://aliancacatalana.cat/programa/"), source("official", "https://aliancacatalana.cat/")]),
    adelante: p("Adelante Andalucía", 2021, "andalusia", ["regionalFunding", "publicServices", "housing", "climate"], null, [source("programme", "https://adelanteandalucia.org/programa/"), source("official", "https://adelanteandalucia.org/")]),
    iu: p("Izquierda Unida", 1986, "spain", ["redistribution", "publicServices", "housing", "federalSpain"], "2023", [source("programme", "https://izquierdaunida.org/2023/07/01/aportacion-de-iu-al-programa-de-las-elecciones-generales-del-23j/"), source("official", "https://izquierdaunida.org/")]),
    compromis: p("Compromís", 2010, "valencia", ["regionalFunding", "publicServices", "climate", "minorityRights"], null, [source("programme", "https://compromis.net/programa/"), source("official", "https://compromis.net/")]),
    ciudadanos: p("Ciudadanos – Partido de la Ciudadanía", 2006, "spain", ["marketEconomy", "civilLiberties", "spanishUnity", "politicalReform"], null, [source("official", "https://www.ciudadanos-cs.org/"), source("register", "https://infoelectoral.interior.gob.es/es/formaciones-politicas/registro-de-partidos-politicos/tramites-habituales/como-inscribir-una-formacion-politica/")]),
    cup: p("Candidatura d'Unitat Popular", 1986, "catalonia", ["catalanIndependence", "redistribution", "publicServices", "climate"], null, [source("programme", "https://cup.cat/programa/"), source("official", "https://cup.cat/")]),
    pacma: p("Partido Animalista Con el Medio Ambiente", 2003, "spain", ["animalWelfare", "climate", "publicServices"], null, [source("programme", "https://pacma.es/programa-electoral/"), source("official", "https://pacma.es/")]),
    upyd: p("Unión Progreso y Democracia", 2007, "historical", [], null, [source("register", "https://infoelectoral.interior.gob.es/es/formaciones-politicas/registro-de-partidos-politicos/tramites-habituales/como-inscribir-una-formacion-politica/")], "historical", "historical"),
    "ciu-cdc": p("Convergència i Unió / Convergència Democràtica de Catalunya", "1978 / 1974", "historical", [], null, [source("register", "https://infoelectoral.interior.gob.es/es/formaciones-politicas/registro-de-partidos-politicos/tramites-habituales/como-inscribir-una-formacion-politica/")], "ciu", "historical"),
    "mas-pais": p("Más País", 2019, "historical", [], null, [source("register", "https://infoelectoral.interior.gob.es/es/formaciones-politicas/registro-de-partidos-politicos/tramites-habituales/como-inscribir-una-formacion-politica/")], "historical", "historical"),
  },
};

function language(locale) {
  if (locale === "de") return "de";
  if (locale === "es") return "es";
  return "en";
}

function copyFor(locale) {
  const lang = language(locale);
  const sets = {
    de: { title: "Parteiprofil", founded: "Gegründet", scope: "Wo sie antritt", overview: "Allgemeine Einordnung", priorities: "Politische Schwerpunkte", basis: "Zusammengefasst aus dem neuesten verlinkten Programm", historical: "Historischer Eintrag", sources: "Quellen und Originaldokumente", close: "Schließen", programme: "Partei- oder Wahlprogramm", principles: "Grundsatzprogramm", official: "Offizielle Parteiseite", relationship: "CDU/CSU-Erklärung", register: "Amtliches Parteien- oder Wahlregister", election: "Wahl- und Ergebnisquelle", parliament: "Parlamentsquelle", archive: "Archiviertes Wahlprogramm", note: "Pollframe fasst sachlich zusammen und übernimmt keine Formulierungen oder Wertungen der Partei. Positionen können sich ändern; maßgeblich sind die verlinkten Originalquellen.", reviewed: "Quellen geprüft am 16. August 2026", unknown: "Pollframe hat für diese historische, aggregierte oder nur regional erfasste Kandidatur noch keine ausreichend belegte eigenständige Zusammenfassung veröffentlicht. Die verlinkte Wahlquelle zeigt, in welcher Wahl sie erfasst wurde." },
    en: { title: "Party profile", founded: "Founded", scope: "Where it contests", overview: "General position", priorities: "Policy priorities", basis: "Summarised from the latest programme linked below", historical: "Historical entry", sources: "Sources and original documents", close: "Close", programme: "Party or election programme", principles: "Statement of principles", official: "Official party website", relationship: "CDU/CSU relationship", register: "Official party or election register", election: "Election and results source", parliament: "Parliamentary source", archive: "Archived election programme", note: "Pollframe provides a neutral summary and does not adopt the party's wording or assessment. Positions can change; consult the linked original sources for the authoritative text.", reviewed: "Sources reviewed 16 August 2026", unknown: "Pollframe has not yet published a sufficiently sourced separate summary for this historical, aggregate or regional-only candidacy. The linked election source shows the election in which it was recorded." },
    es: { title: "Perfil del partido", founded: "Fundado", scope: "Dónde se presenta", overview: "Posición general", priorities: "Prioridades políticas", basis: "Resumen del programa más reciente enlazado abajo", historical: "Entrada histórica", sources: "Fuentes y documentos originales", close: "Cerrar", programme: "Programa del partido o electoral", principles: "Declaración de principios", official: "Web oficial del partido", relationship: "Relación CDU/CSU", register: "Registro oficial de partidos o elecciones", election: "Fuente electoral y de resultados", parliament: "Fuente parlamentaria", archive: "Programa electoral archivado", note: "Pollframe ofrece un resumen neutral y no adopta la redacción ni la valoración del partido. Las posiciones pueden cambiar; el texto de referencia es el de las fuentes originales enlazadas.", reviewed: "Fuentes revisadas el 16 de agosto de 2026", unknown: "Pollframe aún no ha publicado un resumen propio suficientemente documentado para esta candidatura histórica, agregada o solo regional. La fuente electoral enlazada muestra la elección en la que fue registrada." },
  };
  return sets[lang];
}

function naturalList(items, lang) {
  if (items.length < 2) return items[0] ?? "";
  const conjunction = lang === "de" ? " und " : lang === "es" ? " y " : " and ";
  return `${items.slice(0, -1).join(", ")}${conjunction}${items.at(-1)}`;
}

function lowerFirst(value, lang) {
  if (!value) return value;
  const locale = lang === "en" ? "en-GB" : lang;
  return `${value.charAt(0).toLocaleLowerCase(locale)}${value.slice(1)}`;
}

function partyOverview(profile, selected, lang) {
  const familyKey = PARTY_FAMILIES[selected.country]?.[selected.party.slug];
  const family = FAMILY_TEXT[familyKey]?.[lang];
  if (!family) return null;
  const priorities = profile.policies.map((key) => lowerFirst(POLICY_TEXT[key]?.[lang], lang)).filter(Boolean);
  if (!priorities.length) {
    if (lang === "de") return `Diese historische Formation lässt sich grob als ${family} einordnen. Sie wird hier nur gezeigt, damit frühere Umfragen verständlich bleiben.`;
    if (lang === "es") return `Esta formación histórica se puede situar, a grandes rasgos, como ${family}. Aquí solo aparece para que las encuestas antiguas sigan siendo comprensibles.`;
    return `This historical formation can broadly be described as ${family}. It appears here only so older polling remains understandable.`;
  }
  const list = naturalList(priorities, lang);
  if (lang === "de") return `Politisch lässt sich die Partei grob als ${family} einordnen. Bei den großen Sachfragen stellt das verlinkte Programm vor allem ${list} in den Vordergrund. Das ist eine Orientierung, kein exakter Punkt auf einer eindimensionalen Links-rechts-Skala.`;
  if (lang === "es") return `En términos generales, el partido puede situarse como ${family}. En los grandes debates, el programa enlazado prioriza sobre todo ${list}. Es una orientación, no una posición exacta en un único eje izquierda-derecha.`;
  return `Broadly, the party can be described as ${family}. On the country’s major policy questions, the linked programme chiefly prioritises ${list}. This is an orientation, not an exact point on a one-dimensional left-right scale.`;
}

function inferredCountry(party) {
  const id = Number(party?.id);
  if (id >= 400) return "es";
  if (id >= 200) return "uk";
  return "de";
}

export function regionalSpainPartyProfile(party, electionSource) {
  if (!party || !electionSource) return null;
  return p(party.name, null, "regionalSpain", [], null, [source("election", electionSource)], null, "regional");
}

export function PartyInfoButton({ party, country = inferredCountry(party), children, className = "", includeDot = false, as = "button", fallbackProfile = null }) {
  const profile = PARTY_PROFILES[country]?.[party?.slug] ?? fallbackProfile;
  if (!party || !profile) return children ?? party?.name ?? null;
  const open = (event) => {
    event.preventDefault();
    event.stopPropagation();
    window.dispatchEvent(new CustomEvent("pollframe:party-profile", { detail: { party, country, fallbackProfile } }));
  };
  const keyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    open(event);
  };
  const Tag = as;
  return <Tag type={as === "button" ? "button" : undefined} className={`party-info-trigger ${className}`.trim()} role={as === "button" ? undefined : "button"} tabIndex={as === "button" ? undefined : 0} onClick={open} onKeyDown={as === "button" ? undefined : keyDown} data-party-profile={`${country}:${party.slug ?? party.id}`}>{includeDot && <i aria-hidden="true" style={{ background: party.color }} />}{children ?? party.name}</Tag>;
}

function useStableModalLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const stableGutter = window.CSS?.supports?.("scrollbar-gutter: stable");
    if (!stableGutter) {
      const width = Math.max(0, window.innerWidth - root.clientWidth);
      const padding = Number.parseFloat(getComputedStyle(body).paddingRight) || 0;
      if (width) body.style.paddingRight = `${padding + width}px`;
    }
    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, [active]);
}

function PartyProfileModal({ selected, locale, onClose }) {
  const dialogRef = useRef(null);
  const lang = language(locale);
  const text = copyFor(locale);
  const profile = PARTY_PROFILES[selected.country]?.[selected.party.slug] ?? selected.fallbackProfile;
  useStableModalLock(Boolean(profile));
  useEffect(() => {
    if (!profile) return undefined;
    const previous = document.activeElement;
    requestAnimationFrame(() => dialogRef.current?.querySelector("button")?.focus());
    const key = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const focusable = [...dialogRef.current.querySelectorAll("button,a[href]")];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); previous?.focus?.(); };
  }, [profile, onClose]);
  if (!profile) return null;
  const sourceLabel = (entry) => entry.label ?? text[entry.type] ?? text.official;
  const relation = profile.relation ? RELATION_TEXT[profile.relation]?.[lang] : null;
  const overview = partyOverview(profile, selected, lang);
  return createPortal(
    <div className="overlay modal-overlay party-profile-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="party-profile-modal" role="dialog" aria-modal="true" aria-labelledby="party-profile-title" ref={dialogRef}>
        <header>
          <div><p className="section-label">{profile.status === "historical" ? text.historical : text.title}</p><h2 id="party-profile-title"><i style={{ background: selected.party.color }} />{selected.party.name}</h2><p>{profile.fullName}</p></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label={text.close}><Icon name="close" /></button>
        </header>
        <div className="party-profile-facts">
          {profile.founded && <div><span>{text.founded}</span><strong>{profile.founded}</strong></div>}
          <div><span>{text.scope}</span><strong>{SCOPE_TEXT[profile.scope]?.[lang] ?? profile.scope}</strong></div>
        </div>
        {relation && <p className="party-profile-relation">{relation}</p>}
        {overview && <section className="party-profile-overview"><h3>{text.overview}</h3><p>{overview}</p></section>}
        {profile.policies.length ? <section className="party-profile-policies"><header><h3>{text.priorities}</h3><p>{text.basis}{profile.programmeYear ? ` · ${profile.programmeYear}` : ""}</p></header><ul>{profile.policies.map((key) => <li key={key}>{POLICY_TEXT[key]?.[lang] ?? key}</li>)}</ul></section> : <p className="party-profile-relation">{text.unknown}</p>}
        <section className="party-profile-sources"><h3>{text.sources}</h3><div>{profile.sources.map((entry) => <a key={entry.url} href={entry.url} target="_blank" rel="noreferrer"><span>{sourceLabel(entry)}</span><Icon name="external" size={15} /></a>)}</div></section>
        <footer><p>{text.note}</p><small>{text.reviewed}</small></footer>
      </section>
    </div>,
    document.body,
  );
}

export function PartyInfoModalHost({ locale }) {
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    const open = (event) => setSelected(event.detail);
    window.addEventListener("pollframe:party-profile", open);
    return () => window.removeEventListener("pollframe:party-profile", open);
  }, []);
  return selected ? <PartyProfileModal selected={selected} locale={locale} onClose={() => setSelected(null)} /> : null;
}
