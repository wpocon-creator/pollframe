import { text, localText } from "./party-match-text.js";

// Original, neutral explanations, separate from party positions and scoring.
// Aliases are editorially chosen, not inferred from the visitor's answers.
// The first alias is the popup title. A scope prevents ambiguous terms such as
// "sanctions" from being explained as foreign policy in a welfare question.
const term = (id, aliases, body, source = null, scope = null) => ({
  id,
  aliases,
  body,
  source,
  scope,
});
export const POLICY_TERMS = [
  term(
    "corporation-tax",
    text(
      "Körperschaftsteuer|Kapitalgesellschaften|Gewerbesteuer",
      "Corporation tax|incorporated companies|local trade tax",
      "Impuesto sobre sociedades|sociedades|comercial municipal",
    ),
    text(
      "Kapitalgesellschaften sind etwa GmbHs und Aktiengesellschaften. Ihre Gewinne können unter anderem Körperschaftsteuer und kommunaler Gewerbesteuer unterliegen. Das sind verschiedene Steuern; nicht jede Unternehmensentlastung senkt beide.",
      "Incorporated companies include limited companies. Profits can face corporation tax and local trade tax, which are separate taxes. Not every business tax cut reduces both.",
      "Las sociedades incluyen las de responsabilidad limitada. Sus beneficios pueden pagar impuestos estatales y municipales distintos. No toda rebaja empresarial reduce ambos.",
    ),
  ),
  term(
    "transaction-tax",
    text(
      "Finanztransaktionssteuer|Derivategeschäfte|Wertpapiere|Wertpapieren",
      "Financial transaction tax|derivatives|securities",
      "Impuesto sobre transacciones financieras|derivados|valores",
    ),
    text(
      "Eine Finanztransaktionssteuer belastet bestimmte Käufe oder Verkäufe von Finanzprodukten. Wertpapiere sind etwa Aktien und Anleihen. Welche Geschäfte, Steuersätze und Ausnahmen gelten, hängt vom Vorschlag ab.",
      "A financial transaction tax charges certain purchases or sales of financial products, such as shares and bonds. Taxed transactions, rates and exemptions depend on the proposal.",
      "Este impuesto grava ciertas compras o ventas de productos financieros, como acciones y bonos. Operaciones, tipos y exenciones dependen de la propuesta.",
    ),
  ),
  term(
    "working-time-ceiling",
    text(
      "Höchstarbeitszeit",
      "Working-time law|daily maximum|weekly maximum",
      "Máximo semanal|máximo diario",
    ),
    text(
      "Die gesetzlich höchstens erlaubte Arbeitszeit. Sie ist nicht dasselbe wie die im Arbeitsvertrag vereinbarte Arbeitszeit. Ruhepausen und freie Zeit zwischen Arbeitseinsätzen sind zusätzliche Schutzregeln.",
      "The maximum hours allowed by law, not the hours agreed in an employment contract. Breaks and rest between shifts are additional safeguards.",
      "El máximo de horas permitido por ley, no la jornada pactada en el contrato. Pausas y descansos entre turnos son garantías adicionales.",
    ),
  ),
  term(
    "overtime-premium",
    text(
      "Überstundenzuschläge|Überstundenzuschlag",
      "Overtime premiums|overtime premium",
      "Complementos por horas extraordinarias",
    ),
    text(
      "Ein zusätzlicher Betrag auf die normale Bezahlung einer Überstunde. Eine Steuerbefreiung des Zuschlags bedeutet nicht, dass die gesamte Bezahlung der Überstunde steuerfrei ist.",
      "An extra amount on top of ordinary overtime pay. Exempting the premium does not exempt all the pay for that overtime hour.",
      "Una cantidad adicional a la remuneración normal de una hora extra. Eximir el complemento no significa eximir toda esa remuneración.",
    ),
  ),
  term(
    "procurement-wages",
    text(
      "Tariftreue|Tariflöhne|Bundestariftreuegesetz",
      "Collectively agreed wages|collective-pay requirements",
      "Salarios de convenio|salario de convenio",
    ),
    text(
      "Tariflöhne werden zwischen Gewerkschaften und Arbeitgebern vereinbart. Tariftreue bei öffentlichen Aufträgen verlangt eine entsprechende Bezahlung für diese Aufträge. Sie ist nicht automatisch eine Pflicht zur Mitgliedschaft in einem Arbeitgeberverband.",
      "Collectively agreed wages are negotiated by unions and employers. Procurement pay requirements make these wages a condition for public contracts, without automatically requiring membership of an employers’ association.",
      "Los salarios de convenio se negocian entre sindicatos y empresas. La contratación pública puede exigirlos sin obligar automáticamente a pertenecer a una patronal.",
    ),
  ),
  term(
    "care-full",
    text(
      "Pflegevollversicherung|Pflegeleistungen|Teilleistung",
      "Full care insurance|care services|partial coverage",
      "Seguro completo|cuidados necesarios|cobertura parcial",
    ),
    text(
      "Eine Pflegevollversicherung soll die versicherten Pflegeleistungen vollständig bezahlen. Eine Teilversicherung übernimmt nur einen Teil. Unterkunft und Essen im Pflegeheim sind eigene Kosten und nicht automatisch eingeschlossen.",
      "Full care insurance pays the insured care services in full. Partial insurance covers only part. Accommodation and meals in a care home are separate costs, not automatically included.",
      "El seguro completo paga íntegramente los cuidados asegurados; el parcial solo una parte. Alojamiento y comidas son costes separados, no incluidos automáticamente.",
    ),
  ),
  term(
    "pension-benchmark",
    text(
      "Rentenniveau",
      "Pension replacement benchmark",
      "Indicador de nivel de la pensión",
    ),
    text(
      "Das deutsche Rentenniveau vergleicht eine standardisierte Rente nach 45 Jahren mit Durchschnittsverdienst mit dem durchschnittlichen Arbeitseinkommen, jeweils vor Steuern und nach Sozialbeiträgen. Es ist kein Prozentsatz des persönlichen letzten Gehalts.",
      "Germany’s pension benchmark compares a standard pension after 45 years at average earnings with average employment income, before tax and after social contributions. It is not a percentage of your own final salary.",
      "El indicador alemán compara una pensión estándar tras 45 años con salario medio y el ingreso laboral medio, antes de impuestos y después de cotizaciones. No es un porcentaje de tu último sueldo.",
    ),
  ),
  term(
    "pension-age",
    text(
      "Regelaltersgrenze|Rentenabschlag|Versicherungsjahre",
      "Standard statutory retirement age|qualifying insurance years|pension deductions",
      "Edad ordinaria de jubilación|años de seguro reconocidos|reducción de pensión",
    ),
    text(
      "Die Regelaltersgrenze ist das reguläre Alter für die gesetzliche Altersrente. Bei früherem Beginn kann die monatliche Rente dauerhaft sinken. Für Ausnahmen zählen nur bestimmte Versicherungszeiten, nicht automatisch jedes Kalenderjahr.",
      "The standard age is the normal age for statutory retirement. Starting earlier can permanently reduce monthly payments. Exceptions count specified qualifying periods, not automatically every calendar year.",
      "Es la edad normal de jubilación pública. Adelantarla puede reducir permanentemente el pago mensual. Las excepciones cuentan períodos concretos, no automáticamente cada año natural.",
    ),
  ),
  term(
    "noncontributory",
    text(
      "Nicht beitragsgedeckte Leistungen|versicherungsfremde Leistungen|nicht beitragsgedeckten Leistungen",
      "Benefits not covered by contributions|non-contributory benefits",
      "Prestaciones de pensión pública no cubiertas por cotizaciones|prestaciones ajenas a las cotizaciones",
    ),
    text(
      "Leistungen der Sozialversicherung, denen keine entsprechenden eigenen Beiträge gegenüberstehen, etwa zusätzliche Rentenansprüche für Kindererziehung. Welche Aufgaben der Staat über Steuern statt über Versicherungsbeiträge bezahlen soll, ist umstritten.",
      "Social insurance benefits without matching personal contributions, such as additional pension entitlements for child-rearing. Which should be funded by taxes rather than contributions is contested.",
      "Prestaciones sin cotizaciones propias correspondientes, como derechos de pensión por crianza. Se debate cuáles deben financiarse con impuestos y no con cotizaciones.",
    ),
  ),
  term(
    "splitting",
    text(
      "Ehegattensplitting|Familiensplitting|Grundfreibetrag|individuelle Besteuerung",
      "Spousal income splitting|family income splitting|transferable personal allowances|individual taxation",
      "Tributación conjunta|mínimo transferible|tributación individual",
    ),
    text(
      "Beim Ehegattensplitting wird die Steuer auf die Hälfte des gemeinsamen Einkommens berechnet und verdoppelt. Bei ungleichen Einkommen kann das günstiger sein. Individuelle Besteuerung betrachtet die Einkommen getrennt; ein übertragbarer Grundfreibetrag lässt einen ungenutzten steuerfreien Mindestbetrag beim anderen Ehepartner zu.",
      "Spousal splitting doubles the tax on half a couple’s joint income, potentially benefiting unequal earners. Individual taxation treats incomes separately. A transferable personal allowance lets one spouse use the other’s unused tax-free minimum.",
      "El reparto conyugal duplica el impuesto de la mitad del ingreso común y puede favorecer ingresos desiguales. La tributación individual los separa. Un mínimo transferible permite usar la parte exenta no utilizada por el cónyuge.",
    ),
  ),
  term(
    "nonprofit-housing",
    text(
      "Wohngemeinnützigkeit|gemeinnütziger Mietwohnungen|gemeinnützigen Wohnraum",
      "Non-profit rental housing|non-profit housing",
      "Vivienda de alquiler permanentemente sin ánimo de lucro|vivienda sin ánimo de lucro",
    ),
    text(
      "Geförderte Wohnungen mit dauerhafter Bindung an bezahlbare Mieten und begrenzte Gewinne. Anders als Wohngeld unterstützt die Förderung hier den Anbieter beziehungsweise den Wohnungsbau, nicht unmittelbar den einzelnen Haushalt.",
      "Supported housing with lasting affordable-rent conditions and limited profits. Unlike housing benefits, this support goes to providers or construction rather than directly to individual households.",
      "Viviendas subvencionadas con alquileres asequibles duraderos y beneficios limitados. A diferencia de la ayuda al alquiler, el apoyo va al proveedor o la construcción, no directamente al hogar.",
    ),
  ),
  term(
    "bafog",
    text("BAföG", "BAföG", "BAföG"),
    text(
      "Staatliche Förderung für bestimmte Ausbildungen und Studiengänge. Ob Eltern- und eigenes Einkommen angerechnet werden und welcher Teil zurückgezahlt werden muss, hängt von der jeweiligen Regel ab.",
      "Public support for certain education and degree courses. Parental and personal means-testing and repayment depend on the applicable rules.",
      "Ayuda pública para determinadas formaciones y carreras. La renta parental y propia y la devolución dependen de las reglas aplicables.",
    ),
  ),
  term(
    "carbon-storage",
    text(
      "CO₂-Speicherung|abgeschiedenen CO₂|CCS",
      "Underground storage|captured CO₂|CCS",
      "Almacenar CO₂ capturado|almacenamiento de CO₂|CCS",
    ),
    text(
      "Bei CCS wird Kohlendioxid aus einem Abgasstrom getrennt und dauerhaft unterirdisch gespeichert. Das ist nicht dasselbe wie eine weitere Nutzung des CO₂ als Rohstoff (CCU). Die Frage bezieht sich nur auf schwer vermeidbare Industrieemissionen.",
      "CCS separates carbon dioxide from emissions and stores it underground permanently. This differs from reusing CO₂ as a raw material (CCU). The question concerns only hard-to-avoid industrial emissions.",
      "CCS separa dióxido de carbono de emisiones y lo almacena permanentemente bajo tierra. No es reutilizarlo como materia prima (CCU). La pregunta se limita a emisiones industriales difíciles de evitar.",
    ),
  ),
  term(
    "fracking",
    text("Fracking", "Fracking", "Fracking"),
    text(
      "Ein Verfahren, das Gestein mit unter Druck eingepresster Flüssigkeit aufbricht, damit eingeschlossenes Gas oder Öl austreten kann. Auswirkungen hängen unter anderem von Gestein, Tiefe und Schutzregeln ab.",
      "A process fracturing rock with pressurised fluid to release trapped gas or oil. Impacts depend on geology, depth and safeguards, among other factors.",
      "Un proceso que fractura roca con fluido a presión para liberar gas o petróleo. Sus efectos dependen, entre otros factores, de geología, profundidad y protección.",
    ),
  ),
  term(
    "eeg",
    text("EEG|EEG-Förderung", "EEG|Renewable-support", "EEG"),
    text(
      "Das Erneuerbare-Energien-Gesetz regelt unter anderem die finanzielle Förderung von Strom aus erneuerbaren Quellen. Förderung neuer Anlagen und bestehende vertragliche Ansprüche sind verschiedene Fragen.",
      "Germany’s Renewable Energy Sources Act governs financial support for renewable electricity, among other things. New-project support and existing contractual entitlements are distinct issues.",
      "La ley alemana de energías renovables regula, entre otras cosas, ayudas a su electricidad. Las nuevas ayudas y los derechos contractuales existentes son cuestiones distintas.",
    ),
  ),
  term(
    "heating-act",
    text(
      "Gebäudeenergiegesetz|Heizungstausch",
      "Building Energy Act|heating-replacement",
      "Ley energética de edificios|sustitución de calefacciones",
    ),
    text(
      "Regeln zur Energieeffizienz von Gebäuden und zur Wärmeversorgung. Die Aussage hier bezieht sich auf die 2023 beschlossenen Vorgaben und auf Parteipositionen vor der Wahl 2025, nicht auf eine Beschreibung des jeweils heutigen Rechts.",
      "Rules on building energy efficiency and heating. This statement concerns the requirements adopted in 2023 and party positions before the 2025 election, not a description of today’s law.",
      "Reglas de eficiencia energética y calefacción de edificios. Aquí se comparan los requisitos de 2023 y posturas previas a las elecciones de 2025, no se describe la legislación actual.",
    ),
  ),
  term(
    "wealth-basic",
    text(
      "Vermögen|Vermögenswerte",
      "Wealth|assets",
      "Patrimonio|bienes patrimoniales",
    ),
    text(
      "Was jemand besitzt, zum Beispiel Geld, Immobilien oder Unternehmensanteile. Beim Nettovermögen werden die Schulden abgezogen. Der Wert kann sich ändern, auch ohne laufendes Einkommen; Vermögen und Jahreseinkommen sind deshalb unterschiedliche Größen.",
      "What someone owns, such as money, property or business holdings. Net wealth subtracts debts. Its value can change without someone receiving income, so wealth and annual income are different quantities.",
      "Lo que una persona posee, como dinero, inmuebles o participaciones empresariales. El patrimonio neto descuenta las deudas. Su valor puede cambiar sin recibir ingresos; patrimonio e ingresos anuales son magnitudes distintas.",
    ),
  ),
  term(
    "reform",
    text("Reform|reformieren", "Reform|reforming", "Reforma|reformar"),
    text(
      "Eine gezielte Änderung bestehender Regeln oder Einrichtungen. Wie weit sie geht, muss der konkrete Vorschlag erklären. Eine Reform der Schuldenbremse kann zum Beispiel Ausnahmen schaffen, ohne die ganze Regel abzuschaffen. Reform heißt also nicht automatisch Abschaffung.",
      "A deliberate change to existing rules or institutions. Its extent depends on the particular proposal. Reforming borrowing limits might create exceptions without removing the entire rule. Reform therefore does not automatically mean abolition.",
      "Un cambio deliberado de reglas o instituciones existentes. Su alcance depende de la propuesta concreta. Reformar los límites de deuda puede crear excepciones sin eliminar la regla entera. Reforma no equivale automáticamente a supresión.",
    ),
  ),
  term(
    "tax-threshold",
    text("Freigrenze", "Tax-free threshold", "Umbral de exención"),
    text(
      "Eine Grenze, bis zu der ein Betrag nach einer bestimmten Steuerregel außer Ansatz bleibt. Wird eine Freigrenze überschritten, kann der gesamte Betrag steuerpflichtig werden. Bei einem Freibetrag bleibt dagegen der festgelegte Teil steuerfrei. Entscheidend ist immer die konkrete Steuerregel.",
      "A threshold below which an amount is excluded under a particular tax rule. Exceeding this kind of threshold can make the whole amount taxable. A tax-free allowance instead leaves the specified portion untaxed. The exact rule matters.",
      "Un límite hasta el cual una cantidad queda fuera según una regla fiscal concreta. Superarlo puede hacer tributar el importe completo. Un mínimo exento, en cambio, deja sin tributar la parte indicada. Siempre importa la regla específica.",
    ),
  ),
  term(
    "collective-bargaining",
    text(
      "Tarifautonomie|Tarifbindung|Tarifverträge",
      "Collective bargaining|collective agreements",
      "Negociación colectiva|convenios colectivos",
    ),
    text(
      "Gewerkschaften und Arbeitgeber handeln Arbeitsbedingungen aus, zum Beispiel Löhne und Arbeitszeiten. Tarifautonomie bedeutet, dass sie diese Vereinbarungen grundsätzlich selbst treffen. Tarifbindung beschreibt, für wen ein Tarifvertrag verbindlich gilt. Eine gesetzliche Lohnuntergrenze und Tarifverträge sind nicht dasselbe.",
      "Trade unions and employers negotiate working conditions such as pay and hours. Their bargaining autonomy means they generally make these agreements themselves. Coverage describes whom an agreement legally binds. A statutory wage floor and collectively negotiated pay are not the same thing.",
      "Los sindicatos y las empresas negocian condiciones como salarios y jornada. La autonomía de negociación significa que, por regla general, acuerdan estas condiciones por sí mismos. La cobertura indica a quién obliga el convenio. Un mínimo salarial legal y un salario negociado colectivamente son distintos.",
    ),
    [
      "Grundgesetz · Artikel 9",
      "https://www.gesetze-im-internet.de/gg/art_9.html",
    ],
  ),
  term(
    "income",
    text(
      "Einkommen|Jahreseinkommen",
      "Annual income|income",
      "Ingresos anuales|ingresos",
    ),
    text(
      "Geld oder andere Leistungen, die jemand in einem Zeitraum erhält, zum Beispiel Lohn, Mieteinnahmen oder Zinsen. Bei einer Steuer kann die genaue rechtliche Berechnung davon abweichen. Einkommen ist nicht dasselbe wie Vermögen: Vermögen ist das, was bereits vorhanden ist.",
      "Money or other benefits received over a period, such as wages, rent or interest. The precise legal calculation for a tax can differ. Income is not the same as wealth: wealth is what someone already owns.",
      "Dinero u otras prestaciones recibidas durante un período, como salarios, alquileres o intereses. El cálculo legal de un impuesto puede ser distinto. Los ingresos no son el patrimonio: el patrimonio es lo que ya se posee.",
    ),
  ),
  term(
    "inheritance",
    text(
      "Erbschaft|Erbschaften",
      "Inheritance|inheritances",
      "Herencia|herencias",
    ),
    text(
      "Vermögenswerte und gegebenenfalls Schulden, die nach dem Tod eines Menschen auf andere übergehen. Eine Schenkung ist dagegen eine Übertragung zu Lebzeiten. Ob und wie viel Steuer anfällt, hängt unter anderem vom Wert, Verwandtschaftsgrad und geltenden Freibeträgen ab.",
      "Assets, and potentially debts, passed to others when someone dies. A gift is a transfer during someone’s lifetime instead. Any tax depends on factors including value, family relationship and tax-free allowances.",
      "Bienes, y en su caso deudas, que pasan a otras personas tras una muerte. Una donación se hace en vida. La posible tributación depende, entre otras cosas, del valor, del parentesco y de los mínimos exentos.",
    ),
  ),
  term(
    "tax-rate",
    text(
      "Steuersatz|Steuersätze|Steuersätzen|Steuertarif|Steuertarife",
      "Tax rate|tax rates|tax schedule",
      "Tipo impositivo|tipos impositivos|tipo personal|tarifa fiscal|tipos progresivos",
    ),
    text(
      "Der Anteil, der auf einen steuerpflichtigen Betrag entfällt. Bei einem progressiven Tarif wird der zusätzliche Euro in höheren Einkommensbereichen stärker besteuert. Der höchste Satz gilt dann nicht automatisch für das gesamte Einkommen.",
      "The share charged on a taxable amount. Under a progressive schedule, an additional euro is taxed more heavily in higher income bands. The highest rate does not automatically apply to all of someone’s income.",
      "La proporción que se cobra sobre una cantidad sujeta a impuesto. En una tarifa progresiva, cada euro adicional tributa más en los tramos altos. El tipo máximo no se aplica automáticamente a todos los ingresos.",
    ),
    [
      "Einkommensteuergesetz · § 32a",
      "https://www.gesetze-im-internet.de/estg/__32a.html",
    ],
  ),
  term(
    "infrastructure",
    text(
      "Infrastruktur|Infrastrukturinvestitionen",
      "Infrastructure|infrastructure investment",
      "Infraestructuras|inversiones en infraestructuras",
    ),
    text(
      "Grundlegende Einrichtungen und Netze, die viele Menschen nutzen, etwa Bahnstrecken, Stromleitungen, Schulen oder Wasserleitungen. Eine Investition soll solche Einrichtungen aufbauen oder langfristig verbessern; nicht jede laufende Ausgabe ist deshalb eine Investition.",
      "Basic facilities and networks used by many people, such as railways, power lines, schools or water pipes. Investment builds or improves these for the longer term; not every day-to-day expense is an investment.",
      "Instalaciones y redes básicas utilizadas por muchas personas, como ferrocarriles, redes eléctricas, escuelas o tuberías. Invertir supone construirlas o mejorarlas a largo plazo; no todo gasto corriente es una inversión.",
    ),
  ),
  term(
    "investment",
    text(
      "Investitionen|Investitionsspielraum|Nettoinvestitionen",
      "Investment|investments|net investment",
      "Inversión|inversiones|inversión neta",
    ),
    text(
      "Ausgaben, mit denen etwas langfristig Nutzbares aufgebaut oder verbessert wird, zum Beispiel eine Schule. Nettoinvestitionen ziehen den Wertverlust bestehender Anlagen ab. Was politisch als Investition gelten soll, kann umstritten sein; eine Lockerung von Kreditregeln braucht deshalb eine genaue Definition.",
      "Spending to build or improve something useful over the longer term, such as a school. Net investment subtracts the loss of value of existing assets. Which spending should qualify can be disputed, so any relaxation of borrowing rules needs a precise definition.",
      "Gasto para crear o mejorar algo útil a largo plazo, como una escuela. La inversión neta descuenta la pérdida de valor de los bienes existentes. Qué gastos deben incluirse puede ser discutido; flexibilizar las reglas de deuda exige definirlo.",
    ),
  ),
  term(
    "borrowing",
    text(
      "Kredite|Kreditaufnahme|Neuverschuldung|Staatsanleihen",
      "Borrowing|government bonds|public debt",
      "Endeudamiento|endeudarse|deuda pública|bonos del Estado",
    ),
    text(
      "Der Staat leiht sich Geld, statt eine Ausgabe sofort vollständig durch Steuern oder andere Einnahmen zu bezahlen. Das Geld muss nach den vereinbarten Bedingungen zurückgezahlt werden; meist fallen Zinsen an. Staatsanleihen sind eine Form solcher Kredite.",
      "The state borrows money instead of paying for spending entirely from taxes or other revenue immediately. It must repay under the agreed terms and usually pay interest. Government bonds are one way of borrowing.",
      "El Estado toma dinero prestado en lugar de financiar de inmediato todo el gasto con impuestos u otros ingresos. Debe devolverlo según las condiciones acordadas y normalmente pagar intereses. Los bonos públicos son una forma de hacerlo.",
    ),
  ),
  term(
    "compensation",
    text(
      "sozialer Ausgleich|sozialen Ausgleich",
      "Financial compensation|financial support",
      "Compensaciones sociales|compensaciones económicas",
    ),
    text(
      "Eine Unterstützung, die Belastungen einer Maßnahme abfedern soll, zum Beispiel höhere Heizkosten durch einen CO₂-Preis. Wer Geld bekommt und wie viel, hängt vom Modell ab. Ein Ausgleich hebt weder automatisch die gesamte Belastung auf noch macht er die Maßnahme für alle gleich teuer.",
      "Support intended to soften the burden of a policy, such as higher heating costs from carbon pricing. Who receives it and how much depends on the scheme. It does not automatically remove the whole cost or make a policy equally expensive for everyone.",
      "Ayuda para reducir la carga de una medida, por ejemplo el aumento de la calefacción por un precio del carbono. Quién la recibe y cuánto depende del modelo. No elimina automáticamente todo el coste ni lo iguala para todas las personas.",
    ),
  ),
  term(
    "greenhouse-gases",
    text(
      "Treibhausgase|Treibhausgasemissionen|Treibhausgasen",
      "Greenhouse gases|greenhouse gas emissions",
      "Gases de efecto invernadero|emisiones de gases de efecto invernadero",
    ),
    text(
      "Gase in der Atmosphäre, die Wärme zurückhalten und dadurch zur Erwärmung beitragen. Dazu gehören CO₂ und Methan. Unterschiedliche Gase wirken unterschiedlich stark und lange; deshalb werden Klimawirkungen oft in CO₂-Äquivalente umgerechnet.",
      "Gases in the atmosphere that trap heat and contribute to warming, including carbon dioxide and methane. Different gases have different strengths and lifetimes, so their climate effects are often expressed as carbon-dioxide equivalents.",
      "Gases de la atmósfera que retienen calor y contribuyen al calentamiento, como el CO₂ y el metano. Su intensidad y duración son diferentes; por eso su efecto suele expresarse en equivalentes de CO₂.",
    ),
    [
      "Umweltbundesamt · Treibhausgase",
      "https://www.umweltbundesamt.de/themen/klima-energie/klimaschutz-energiepolitik-in-deutschland/treibhausgas-emissionen/die-treibhausgase",
    ],
  ),
  term(
    "emissions",
    text("Emissionen|Ausstoß", "Emissions|exhaust emissions", "Emisiones"),
    text(
      "Stoffe oder Energie, die in die Umwelt abgegeben werden. In den Klimafragen sind vor allem Treibhausgase gemeint. Abgase können aber auch andere Schadstoffe enthalten; weniger CO₂ bedeutet deshalb nicht automatisch weniger von jedem Schadstoff.",
      "Substances or energy released into the environment. In the climate questions this mainly means greenhouse gases. Exhaust can also contain other pollutants: less carbon dioxide does not automatically mean less of every pollutant.",
      "Sustancias o energía liberadas al medio ambiente. En las preguntas climáticas se trata sobre todo de gases de efecto invernadero. Los escapes también pueden contener otros contaminantes: menos CO₂ no significa reducirlos todos.",
    ),
  ),
  term(
    "rule-of-law",
    text(
      "rechtsstaatlichen Garantien|rechtsstaatliche Garantien|Rechtsstaat",
      "Rule-of-law safeguards|rule of law",
      "Garantías jurídicas|Estado de derecho",
    ),
    text(
      "Staatliche Stellen sind an Recht und Gesetz gebunden. Betroffene müssen Entscheidungen grundsätzlich von unabhängigen Gerichten überprüfen lassen können. Bei Asylverfahren geht es etwa um wirksamen Rechtsschutz und Schutz vor Rückführung in Verfolgung oder unmenschliche Behandlung.",
      "Public authorities are bound by law, and people must generally be able to challenge decisions before independent courts. In asylum procedures, this includes effective legal remedies and protection against return to persecution or inhuman treatment.",
      "Las autoridades están sometidas a la ley y las personas deben poder impugnar, por regla general, sus decisiones ante tribunales independientes. En el asilo incluye recursos efectivos y protección frente al retorno a persecución o trato inhumano.",
    ),
    [
      "Grundgesetz · Artikel 19",
      "https://www.gesetze-im-internet.de/gg/art_19.html",
    ],
  ),
  term(
    "deportation",
    text(
      "Abschiebung|Abschiebungen",
      "Deportation|deportations",
      "Expulsión|expulsiones",
    ),
    text(
      "Die zwangsweise Durchsetzung einer bestehenden Pflicht, ein Land zu verlassen. Sie ist nicht dasselbe wie die Entscheidung über einen Asylantrag. Ob sie zulässig und tatsächlich möglich ist, hängt unter anderem von rechtlichen Hindernissen und der Situation im Zielland ab.",
      "Enforcing an existing duty to leave a country by removing a person. This is different from deciding an asylum claim. Whether removal is lawful and possible depends on matters including legal obstacles and conditions in the destination country.",
      "Hacer cumplir por la fuerza una obligación de abandonar un país. No es lo mismo que resolver una solicitud de asilo. Su legalidad y posibilidad dependen, entre otras cosas, de los obstáculos legales y de la situación del país de destino.",
    ),
    [
      "Aufenthaltsgesetz · § 58",
      "https://www.gesetze-im-internet.de/aufenthg_2004/__58.html",
    ],
  ),
  term(
    "federal",
    text(
      "Bundesebene|Bund|Ländern|Länder|Bundesländer",
      "Federal level|federal government|federal states",
      "Nivel federal|Gobierno federal|estados federados",
    ),
    text(
      "Deutschland ist ein Bundesstaat. Der Bund ist die gesamtstaatliche Ebene; die 16 Länder haben eigene Parlamente und Regierungen. Das Grundgesetz legt fest, wer Gesetze machen, sie ausführen oder Bereiche finanzieren darf. Nicht jede politische Aufgabe liegt beim Bund.",
      "Germany is a federation. The federal level covers the country as a whole; its 16 states have their own parliaments and governments. The constitution divides powers to legislate, administer and fund services. Not every policy is a federal responsibility.",
      "Alemania es una federación. El nivel federal abarca todo el país; sus 16 estados tienen parlamentos y gobiernos propios. La Constitución reparte las competencias para legislar, administrar y financiar. No todas las políticas son federales.",
    ),
    [
      "Grundgesetz · Artikel 30",
      "https://www.gesetze-im-internet.de/gg/art_30.html",
    ],
    ["schools", "education-powers", "referendums", "vote16"],
  ),
  term(
    "statutory-health",
    text(
      "gesetzliche Krankenversicherung|gesetzlichen Krankenversicherung",
      "Statutory health insurance",
      "Seguro médico público|seguro de enfermedad obligatorio",
    ),
    text(
      "Ein gesetzlich geregeltes Versicherungssystem, das in Deutschland von Krankenkassen getragen wird. Beiträge richten sich überwiegend nach dem beitragspflichtigen Einkommen bis zu einer Obergrenze. Das ist nicht dasselbe wie eine vollständig aus Steuern finanzierte Behandlung durch den Staat.",
      "Germany’s legally regulated health-insurance system, run by statutory sickness funds. Contributions largely depend on covered income up to a ceiling. This is different from a system funded entirely through taxes with the state directly providing all treatment.",
      "El sistema alemán de seguro médico regulado por ley y gestionado por cajas de enfermedad. Las cuotas dependen principalmente de los ingresos sujetos a cotización hasta un límite. No equivale a atención prestada íntegramente por el Estado y financiada solo con impuestos.",
    ),
    [
      "Bundesgesundheitsministerium · Gesetzliche Krankenversicherung",
      "https://www.bundesgesundheitsministerium.de/gkv.html",
    ],
  ),
  term(
    "private-health",
    text(
      "private Krankenversicherung|privaten Krankenversicherung|Vollversicherung",
      "Private health insurance|full private cover",
      "Seguro médico privado|cobertura privada completa",
    ),
    text(
      "Ein Versicherungsvertrag mit einem privaten Anbieter. Bei einer privaten Vollversicherung hängen Beiträge unter anderem vom gewählten Tarif, Eintrittsalter und Gesundheitsrisiko beim Vertragsabschluss ab, nicht einfach vom Einkommen. Zusatzversicherungen ergänzen dagegen eine andere Absicherung.",
      "An insurance contract with a private provider. Full private-cover premiums depend on matters including the plan, age at entry and health risk when joining, rather than simply income. Supplementary insurance instead adds benefits to other cover.",
      "Un contrato con una aseguradora privada. En la cobertura completa, las primas dependen del plan, la edad de ingreso y el riesgo de salud al contratar, no simplemente de los ingresos. Un seguro complementario añade prestaciones a otra cobertura.",
    ),
  ),
  term(
    "civil-servants",
    text("Beamte|Beamter|Beamten", "Civil servants", "Funcionarios"),
    text(
      "Beschäftigte des Staates mit einem besonderen öffentlich-rechtlichen Dienstverhältnis. Nicht alle Beschäftigten im öffentlichen Dienst sind Beamte. Ihre Versorgung im Ruhestand folgt grundsätzlich anderen Regeln als die gesetzliche Rentenversicherung; die Frage betrifft eine Änderung für die Zukunft.",
      "Public officials with a special legal employment status. Not everyone working for the public sector is a civil servant in this sense. Their retirement provision generally follows different rules from statutory pension insurance; the question concerns a future change.",
      "Personal del Estado con una relación de servicio de derecho público especial. No todo trabajador público tiene este estatus. Su jubilación sigue, por regla general, otras normas que el seguro legal de pensiones; la pregunta trata de un cambio futuro.",
    ),
  ),
  term(
    "workers",
    text(
      "Erwerbstätige|Erwerbstätigen",
      "Workers|all workers",
      "Personas ocupadas|todos los trabajadores",
    ),
    text(
      "Menschen, die einer bezahlten Arbeit nachgehen, also Beschäftigte und Selbstständige. Welche Gruppen in eine bestimmte Sozialversicherung einzahlen müssen, ist eine eigene rechtliche Frage. Erwerbstätig bedeutet nicht automatisch sozialversicherungspflichtig beschäftigt.",
      "People doing paid work, including employees and the self-employed. Which groups must contribute to a particular social-insurance scheme is a separate legal question. Being in work does not automatically mean being an employee covered by every social-insurance scheme.",
      "Personas que realizan una actividad remunerada, tanto asalariadas como autónomas. Qué grupos deben cotizar a cada seguro social es una cuestión legal distinta. Tener trabajo no implica estar cubierto obligatoriamente por todos los seguros sociales.",
    ),
    null,
    ["pensions"],
  ),
  term(
    "legal-tender",
    text(
      "gesetzliches Zahlungsmittel|gesetzlichem Zahlungsmittel",
      "Legal tender",
      "Moneda de curso legal|medio de pago de curso legal",
    ),
    text(
      "Ein gesetzlich anerkanntes Mittel, um Geldschulden zu begleichen. Das bedeutet nicht, dass jede Kasse in jeder Situation jedes Zahlungsmittel ohne Ausnahme annehmen muss. Die politische Frage hier ist, ob Bargeld neben digitalen Zahlungen erhalten bleiben soll.",
      "A means of settling monetary debts recognised by law. It does not mean every shop must accept every form of payment in all circumstances without exception. The policy question here is whether cash should remain alongside digital payments.",
      "Un medio reconocido por la ley para saldar deudas monetarias. No implica que todo comercio deba aceptar cualquier medio en toda situación sin excepciones. Aquí se pregunta si debe mantenerse el efectivo junto a los pagos digitales.",
    ),
    [
      "Europäische Zentralbank · Bargeld",
      "https://www.ecb.europa.eu/euro/cash_strategy/html/index.en.html",
    ],
  ),
  term(
    "privatisation-basic",
    text(
      "privaten Anbietern|privater Anbieter",
      "Private provider|private providers",
      "Proveedor privado|proveedores privados",
    ),
    text(
      "Ein Unternehmen oder eine Organisation außerhalb der staatlichen Verwaltung, die eine Leistung anbietet. Privat bedeutet nicht zwingend gewinnorientiert: Auch gemeinnützige Träger können privat organisiert sein. Wer bezahlt, wer Eigentümer ist und wer die Leistung ausführt, sind unterschiedliche Fragen.",
      "A business or organisation outside government administration providing a service. Private does not necessarily mean for-profit: non-profit organisations can also be privately organised. Who pays, who owns a service and who operates it are different questions.",
      "Una empresa u organización ajena a la administración que presta un servicio. Privado no significa necesariamente lucrativo: también puede ser una entidad sin ánimo de lucro. Quién paga, quién posee y quién presta el servicio son cuestiones distintas.",
    ),
  ),
  term(
    "constitutional",
    text(
      "Grundgesetz|Verfassung|Verfassungsänderung",
      "Constitution|constitutional change",
      "Constitución|reforma constitucional",
    ),
    text(
      "Die grundlegenden Regeln des Staates. In Deutschland heißt die Bundesverfassung Grundgesetz; sie schützt Grundrechte und bestimmt staatliche Zuständigkeiten. Eine Änderung verlangt besondere Mehrheiten. Manche Grundsätze dürfen auch mit diesen Mehrheiten nicht abgeschafft werden.",
      "The state’s fundamental rules. Germany’s federal constitution, the Basic Law, protects basic rights and defines government powers. Amendments require special majorities, and some fundamental principles cannot be abolished even with those majorities.",
      "Las reglas fundamentales del Estado. La Constitución federal alemana, llamada Ley Fundamental, protege derechos y fija competencias. Su reforma requiere mayorías especiales y algunos principios no pueden suprimirse ni siquiera con esas mayorías.",
    ),
    [
      "Grundgesetz · Artikel 79",
      "https://www.gesetze-im-internet.de/gg/art_79.html",
    ],
  ),
  term(
    "education-powers",
    text(
      "Zuständigkeiten|Aufgabenverteilung",
      "powers|division of responsibilities",
      "competencias|reparto actual",
    ),
    text(
      "Welche staatliche Ebene für einen Bereich entscheiden, Regeln erlassen oder Geld bereitstellen darf. Hier geht es um die Rolle des Bundes gegenüber den Ländern bei Schulen. Bessere Zusammenarbeit ist nicht automatisch dasselbe wie eine Verlagerung dieser Befugnisse.",
      "Which level of government can decide, make rules or provide funding in an area. Here this concerns the federal role relative to the states in schools. Better cooperation is not automatically a transfer of these powers.",
      "Qué nivel de gobierno puede decidir, regular o financiar un ámbito. Aquí se trata del papel federal frente a los estados en las escuelas. Mejorar la cooperación no equivale automáticamente a trasladar esas competencias.",
    ),
    null,
    ["education-powers", "schools"],
  ),
  term(
    "e-fuels",
    text("E-Fuels", "e-fuels", "combustibles sintéticos"),
    text(
      "Synthetische Kraftstoffe, die mithilfe von Strom hergestellt werden können. Ihre Klimabilanz hängt unter anderem von Stromherkunft, Herstellung und eingesetztem Kohlenstoff ab. Bei ihrer Verbrennung entsteht weiterhin CO₂ am Auspuff; die politische Debatte betrifft auch die Bilanz über den gesamten Kreislauf.",
      "Synthetic fuels that can be produced using electricity. Their climate impact depends on the electricity source, production and carbon inputs. Burning them still produces exhaust CO₂; political debate also concerns the balance over the whole cycle.",
      "Combustibles sintéticos que pueden producirse con electricidad. Su impacto climático depende de la fuente eléctrica, la producción y el carbono utilizado. Al quemarlos sigue saliendo CO₂ por el escape; el debate también considera el balance del ciclo completo.",
    ),
  ),
  term(
    "ip-address",
    text(
      "IP-Adresse|IP-Adressen",
      "IP address|IP addresses",
      "Dirección IP|direcciones IP",
    ),
    text(
      "Eine technische Adresse für die Kommunikation im Internet. Zusammen mit Zeitpunkt und Anbieterdaten kann sie helfen, einen Anschluss zuzuordnen. Sie allein beweist nicht, welche Person einen Anschluss benutzt hat; sie ist auch nicht der Inhalt einer Nachricht.",
      "A technical address used for internet communication. With a timestamp and provider records it can help identify a connection. It alone does not prove who used that connection, and is not the contents of a message.",
      "Una dirección técnica para comunicarse por internet. Con la hora y los registros del proveedor puede ayudar a identificar una conexión. Por sí sola no demuestra quién la utilizó ni contiene los mensajes.",
    ),
  ),
  term(
    "quick-freeze",
    text("Quick Freeze", "Quick Freeze", "Quick Freeze"),
    text(
      "Bei einem konkreten Verdacht werden vorhandene oder künftig anfallende Verbindungsdaten gezielt gesichert, damit sie nicht gelöscht werden. Das unterscheidet sich von einer allgemeinen vorsorglichen Speicherung aller Anschlüsse. Sicherung und späterer Zugriff sind getrennte Schritte.",
      "Relevant existing or future connection records are preserved in a specific suspected case so they are not deleted. This differs from retaining everyone’s records in advance. Preservation and later access are separate steps.",
      "Se preservan registros de conexión relevantes, existentes o futuros, ante una sospecha concreta para evitar que se borren. No equivale a guardar preventivamente los registros de todos. Preservación y acceso posterior son pasos separados.",
    ),
  ),
  term(
    "wealth-tax",
    text(
      "Vermögensteuer|Vermögenssteuer",
      "Wealth tax|wealth taxes",
      "Impuesto sobre el patrimonio|impuesto anual sobre los grandes patrimonios|impuesto nacional sobre grandes patrimonios",
    ),
    text(
      "Eine Steuer auf angesammeltes Vermögen, etwa Immobilien, Geldanlagen oder Unternehmensanteile. Sie ist etwas anderes als eine Steuer auf das Einkommen eines Jahres. Welche Vermögenswerte, Schulden und Freibeträge berücksichtigt werden, hängt vom jeweiligen Modell ab.",
      "A tax on accumulated assets, such as property, investments or business holdings. It differs from taxing the income someone earns in a year. The assets, debts and tax-free allowances included depend on the particular proposal.",
      "Un impuesto sobre el patrimonio acumulado, como inmuebles, inversiones o participaciones empresariales. No es lo mismo que gravar los ingresos de un año. Los bienes, las deudas y los mínimos exentos que se tienen en cuenta dependen de cada propuesta.",
    ),
    [
      "Vermögensteuergesetz · § 4",
      "https://www.gesetze-im-internet.de/vstg_1974/__4.html",
    ],
  ),
  term(
    "allowance",
    text(
      "Freibetrag|Freibeträge|Freibeträgen",
      "Tax-free allowance|personal allowances|allowances",
      "Mínimo exento|mínimos exentos|minimos exentos|mínimos personales exentos",
    ),
    text(
      "Ein Betrag, der bei einer Steuer nicht mitbesteuert wird. Nur der darüber liegende Teil kann steuerpflichtig sein. Ein Freibetrag ist nicht dasselbe wie eine Freigrenze, bei deren Überschreiten unter Umständen der gesamte Betrag steuerpflichtig wird.",
      "An amount excluded from taxation: only the part above it may be taxed. This differs from a threshold whose breach can make the whole amount taxable. The amount of an allowance depends on the tax and the applicable rules.",
      "Una cantidad que queda fuera del cálculo del impuesto: solo la parte que la supera puede tributar. No es lo mismo que un umbral cuya superación puede hacer tributar el importe completo. La cuantía depende del impuesto y de sus reglas.",
    ),
    [
      "Erbschaftsteuergesetz · § 16",
      "https://www.gesetze-im-internet.de/erbstg_1974/__16.html",
    ],
    ["wealth", "inheritance", "capitaltax"],
  ),
  term(
    "tax-exemption",
    text(
      "Steuerbefreiung|Steuerbefreiungen|Ausnahmen",
      "Tax exemption|exemptions",
      "Exención fiscal|exenciones",
    ),
    text(
      "Eine Ausnahme, durch die ein bestimmter Vorgang, Vermögenswert oder Personenkreis nicht besteuert wird, wenn die gesetzlichen Bedingungen erfüllt sind. Anders als ein Freibetrag ist das nicht einfach ein pauschaler Betrag, der vom steuerpflichtigen Wert abgezogen wird.",
      "A rule excluding a particular transaction, asset or group of people from a tax when its conditions are met. Unlike an allowance, it is not simply a fixed amount deducted from the taxable value.",
      "Una regla que deja fuera de un impuesto una operación, un bien o un grupo de personas cuando se cumplen sus condiciones. A diferencia de un mínimo exento, no es simplemente una cantidad fija que se resta del valor sujeto al impuesto.",
    ),
    null,
    ["wealth", "inheritance", "capitaltax"],
  ),
  term(
    "conscription",
    text(
      "Wehrpflicht|verpflichtenden Wehrdienst|Dienstpflicht",
      "Conscription|compulsory military service|compulsory service",
      "Servicio militar obligatorio|servicio obligatorio",
    ),
    text(
      "Eine gesetzliche Pflicht, eine Zeit lang Dienst bei den Streitkräften zu leisten. Wer betroffen ist, wie lange der Dienst dauert und welche Ausnahmen oder Ersatzdienste gelten, muss das jeweilige Modell regeln. Eine Erfassung von Personen allein bedeutet noch keinen verpflichtenden Dienst.",
      "A legal requirement to serve in the armed forces for a period of time. A particular scheme must specify who is covered, its duration, exemptions and alternative service. Registering people alone does not amount to compulsory service.",
      "La obligación legal de prestar servicio en las fuerzas armadas durante un tiempo. Cada modelo debe definir a quién afecta, su duración, las excepciones y los servicios alternativos. Registrar a las personas no equivale por sí solo a obligarlas a servir.",
    ),
  ),
  term(
    "registration",
    text(
      "Wehrerfassung|verpflichtende Erfassung|verpflichtenden Erfassung",
      "Compulsory registration",
      "Registro obligatorio",
    ),
    text(
      "Dabei erfasst der Staat Angaben zu Personen, die für einen militärischen Dienst infrage kommen könnten. Das kann etwa Alter oder Kontaktdaten betreffen. Die Erfassung ist ein anderer Schritt als die tatsächliche Einberufung zum Dienst.",
      "The state records information about people who might be eligible for military service, such as age or contact details. Registration is a separate step from actually calling someone up to serve.",
      "El Estado registra datos de personas que podrían ser aptas para el servicio militar, como su edad o sus datos de contacto. Ese registro es distinto de la incorporación efectiva al servicio.",
    ),
    null,
    ["conscription"],
  ),
  term(
    "asylum",
    text(
      "Asylverfahren",
      "Asylum procedures|asylum procedure",
      "Procedimientos de asilo|procedimiento de asilo",
    ),
    text(
      "Ein Verfahren, in dem geprüft wird, ob jemand Schutz vor Verfolgung oder anderen schweren Gefahren erhalten soll. Die Frage hier betrifft, welches Land diese Prüfung durchführt und wo sie stattfindet – nicht automatisch, ob ein einzelner Antrag berechtigt ist.",
      "A process that examines whether someone should receive protection from persecution or other serious dangers. This question concerns which country handles that assessment and where it takes place, not whether an individual claim is justified.",
      "Un procedimiento que examina si una persona debe recibir protección frente a la persecución u otros peligros graves. Aquí se pregunta qué país realiza esa evaluación y dónde, no si una solicitud concreta está justificada.",
    ),
    [
      "BAMF · Asylum procedure",
      "https://www.bamf.de/SharedDocs/Anlagen/EN/AsylFluechtlingsschutz/Asylverfahren/das-deutsche-asylverfahren.html",
    ],
  ),
  term(
    "third-country",
    text(
      "Sichere Drittstaaten|sicheren Drittstaaten|Drittstaaten",
      "Safe third countries|third countries",
      "Terceros países seguros|terceros países",
    ),
    text(
      "Hier ist ein anderes Land als Deutschland und das Herkunftsland der schutzsuchenden Person gemeint. Für eine Auslagerung müssten dort die jeweils geltenden Anforderungen an Schutz und Verfahren erfüllt sein. Ein sicherer Drittstaat ist nicht dasselbe wie ein sicherer Herkunftsstaat. Die Bezeichnung allein beweist nicht, dass ein konkretes Modell rechtlich zulässig ist.",
      "Here this means a country other than Germany and the applicant’s country of origin. Any outsourcing arrangement must meet the applicable protection and procedural requirements. A safe third country is not the same as a safe country of origin. The label alone does not establish that a particular arrangement is lawful.",
      "Aquí se trata de un país distinto de Alemania y del país de origen de quien solicita protección. Una externalización debe cumplir los requisitos de protección y procedimiento aplicables. Un tercer país seguro no equivale a un país de origen seguro. La denominación no demuestra por sí sola que un modelo concreto sea legal.",
    ),
    [
      "BAMF · EMN glossary",
      "https://www.bamf.de/SharedDocs/Anlagen/DE/EMN/Glossary/emn-glossary2.pdf?__blob=publicationFile&v=7",
    ],
    ["asylum"],
  ),
  term(
    "debt-brake",
    text(
      "Schuldenbremse",
      "Debt brake|borrowing limits",
      "Freno de la deuda|límite de deuda|límite de endeudamiento",
    ),
    text(
      "Regeln im Grundgesetz, die begrenzen, wie viel neue Schulden Bund und Länder aufnehmen dürfen. Sie sehen auch Ausnahmen vor. Es geht um die Neuverschuldung, nicht um ein vollständiges Verbot staatlicher Schulden. Dieser Vergleich bezieht sich ausdrücklich auf die Wahlprogramme vor der Bundestagswahl 2025; spätere Änderungen sind nicht deren Maßstab.",
      "Constitutional rules limiting new borrowing by Germany’s federal and state governments, with exceptions. They limit new debt rather than prohibit all government debt. This comparison explicitly uses programmes written before the 2025 federal election, not subsequent changes to the rules.",
      "Reglas constitucionales que limitan el nuevo endeudamiento del Gobierno federal y de los estados alemanes, con excepciones. Limitan la nueva deuda, no prohíben toda deuda pública. Esta comparación utiliza los programas anteriores a las elecciones federales de 2025, no las modificaciones posteriores.",
    ),
    [
      "Grundgesetz · Art. 109",
      "https://www.gesetze-im-internet.de/gg/art_109.html",
    ],
    ["borrowing"],
  ),
  term(
    "carbon-price",
    text(
      "CO₂-Preis|CO2-Preis|CO₂-Bepreisung",
      "Carbon pricing|carbon price",
      "Precio del carbono",
    ),
    text(
      "Ein Preis für den Ausstoß von Kohlendioxid. Er kann etwa über eine Abgabe oder über handelbare Emissionsrechte entstehen. Bei Heiz- und Kraftstoffen können Anbieter diese Kosten an ihre Kunden weitergeben. Die Frage legt weder einen bestimmten Preis noch die Verwendung der Einnahmen fest.",
      "A price attached to releasing carbon dioxide, for example through a tax or tradable emissions permits. Fuel suppliers may pass these costs on to customers. This question does not specify a particular price or how the revenue should be used.",
      "Un precio asociado a emitir dióxido de carbono, por ejemplo mediante un impuesto o derechos de emisión negociables. Los proveedores de combustibles pueden trasladar ese coste a sus clientes. La pregunta no fija un precio concreto ni el destino de los ingresos.",
    ),
    [
      "Umweltbundesamt · CO₂-Bepreisung",
      "https://www.umweltbundesamt.de/themen/neue-infothek-emissionshandel-einfach-erklaert",
    ],
  ),
  term(
    "emissions-trading",
    text(
      "Emissionshandel",
      "Emissions trading",
      "Comercio de emisiones|comercio de derechos de emisión",
    ),
    text(
      "Unternehmen müssen für erfasste Emissionen Berechtigungen abgeben, die gehandelt werden können. In einem System mit einer festen Gesamtobergrenze begrenzt deren Anzahl die insgesamt erlaubten Emissionen. Der Marktpreis ist etwas anderes als ein dauerhaft festgelegter Steuersatz.",
      "Covered businesses must surrender permits for their emissions and can trade those permits. In a system with an overall cap, the number of permits limits total permitted emissions. A market price differs from a permanently fixed tax rate.",
      "Las empresas incluidas deben entregar derechos por sus emisiones y pueden negociarlos. En un sistema con un límite total, el número de derechos limita las emisiones permitidas. El precio de mercado es distinto de un tipo impositivo fijo.",
    ),
    [
      "Umweltbundesamt · Emissionshandel",
      "https://www.umweltbundesamt.de/themen/wie-funktioniert-der-emissionshandel",
    ],
  ),
  term(
    "inheritance-tax",
    text("Erbschaftsteuer", "Inheritance tax", "Impuesto sobre sucesiones"),
    text(
      "Eine Steuer auf Vermögen, das jemand nach dem Tod einer anderen Person erhält. Freibeträge, Verwandtschaftsverhältnis und besondere Regeln können beeinflussen, was tatsächlich besteuert wird. Sie ist keine jährlich wiederkehrende Vermögensteuer.",
      "A tax on assets someone receives after another person dies. Allowances, family relationships and special rules can affect what is taxed. It is not an annual wealth tax.",
      "Un impuesto sobre los bienes que una persona recibe tras el fallecimiento de otra. Los mínimos exentos, el parentesco y las reglas especiales pueden influir en lo que tributa. No es un impuesto anual sobre el patrimonio.",
    ),
  ),
  term(
    "self-determination",
    text(
      "Selbstbestimmungsgesetz|rechtlichen Geschlechtseintrag|Geschlechtseintrag",
      "Self-Determination Act|legal gender registration|registered gender",
      "Ley de Autodeterminación|registro legal del género|género registrado",
    ),
    text(
      "Das Gesetz regelt, wie Menschen ihren Geschlechtseintrag und ihre Vornamen beim Standesamt ändern können. Der Geschlechtseintrag ist eine amtliche Angabe im Personenstandsregister. Medizinische Behandlungen werden durch dieses Gesetz nicht geregelt.",
      "This German law governs changes to a person’s registered gender and first names through the registry office. Registered gender is an official entry in the civil-status register. The law does not regulate medical treatment.",
      "Esta ley alemana regula el cambio del género registrado y de los nombres ante el registro civil. El género registrado es un dato oficial del registro. La ley no regula los tratamientos médicos.",
    ),
    [
      "Selbstbestimmungsgesetz · §§ 1–2",
      "https://www.gesetze-im-internet.de/sbgg/BJNR0CE0B0024.html",
    ],
  ),
  term(
    "climate-neutral",
    text(
      "Klimaneutralität|klimaneutral|Treibhausgasbilanz",
      "Climate neutrality|net-zero greenhouse-gas emissions|net zero|net-zero",
      "Neutralidad climática|emisiones netas cero de gases de efecto invernadero",
    ),
    text(
      "Hier bedeutet das: Die ausgestoßenen Treibhausgase werden insgesamt durch die Entnahme von Treibhausgasen aus der Atmosphäre ausgeglichen. Es müssen also nicht sämtliche Emissionen auf null sinken. Die Bilanz, der Zeitpunkt und die zulässigen Entnahmen sind für ein konkretes Ziel wichtig.",
      "Here it means balancing greenhouse gases released with greenhouse gases removed from the atmosphere. It does not require every emission to fall to zero. The accounting rules, target date and permitted removals matter for a specific target.",
      "Aquí significa equilibrar los gases de efecto invernadero emitidos con los retirados de la atmósfera. No exige que cada emisión individual sea cero. Importan las reglas de cálculo, la fecha objetivo y las absorciones permitidas.",
    ),
  ),
  term(
    "minimum-wage",
    text("Mindestlohn", "Minimum wage|minimum-wage", "Salario mínimo"),
    text(
      "Eine gesetzliche Untergrenze für die Bezahlung einer Arbeitsstunde vor Steuern und Sozialabgaben. Sie ist nicht dasselbe wie der ausgezahlte Nettolohn. Die im Vergleich genannten 15 Euro sind eine politische Forderung aus dem Wahlkampf 2025, keine Auskunft über den heute geltenden Satz.",
      "A legal minimum hourly rate before tax and social contributions, not the amount a worker takes home. The €15 in this comparison is a policy proposal from the 2025 election campaign, not a statement of the current legal rate.",
      "Una remuneración mínima legal por hora antes de impuestos y cotizaciones, no el salario neto recibido. Los 15 euros de esta comparación son una propuesta de la campaña de 2025, no una indicación de la cuantía legal vigente.",
    ),
  ),
  term(
    "wage-commission",
    text(
      "Mindestlohnkommission",
      "Minimum-wage commission|minimum wage commission",
      "Comisión independiente",
    ),
    text(
      "Ein Gremium, das über Anpassungen des gesetzlichen Mindestlohns befindet. Dazu gehören Vertreter der Arbeitgeber und Gewerkschaften, ein Vorsitz und beratende Wissenschaftler ohne Stimmrecht. Die Streitfrage hier ist, wie weit die Politik der Kommission eine konkrete Lohnhöhe vorgeben soll.",
      "A commission deciding on adjustments to Germany’s statutory minimum wage. It includes employer and trade-union representatives, a chair and non-voting academic advisers. The question here is how far politicians should prescribe a specific rate.",
      "Una comisión que decide sobre los ajustes del salario mínimo legal alemán. Incluye representantes empresariales y sindicales, una presidencia y asesores académicos sin voto. Aquí se debate hasta qué punto la política debería fijarle una cuantía concreta.",
    ),
    [
      "Mindestlohngesetz · § 4",
      "https://www.gesetze-im-internet.de/milog/__4.html",
    ],
    ["wage"],
  ),
  term(
    "fission",
    text(
      "Kernspaltung|Kernspaltungsreaktoren|Atomkraftwerke|Atomkraftwerken|Kernkraft",
      "Nuclear fission|nuclear power stations|nuclear power",
      "Fisión nuclear|centrales nucleares",
    ),
    text(
      "Bei der Kernspaltung werden schwere Atomkerne gespalten. Die dabei freiwerdende Wärme kann zur Stromerzeugung genutzt werden. Auch kleine Kernreaktoren beruhen auf diesem Prinzip. Davon zu unterscheiden ist die Kernfusion, bei der leichte Atomkerne verschmelzen.",
      "Nuclear fission splits heavy atomic nuclei. The heat released can be used to generate electricity, including in small reactors. It differs from nuclear fusion, which joins light nuclei together.",
      "La fisión nuclear divide núcleos atómicos pesados. El calor liberado puede utilizarse para generar electricidad, también en reactores pequeños. Es distinta de la fusión nuclear, que une núcleos ligeros.",
    ),
  ),
  term(
    "fusion",
    text(
      "Kernfusion",
      "Nuclear fusion|fusion research",
      "Fusión nuclear|investigación en fusión",
    ),
    text(
      "Leichte Atomkerne verschmelzen zu schwereren; dabei kann Energie freiwerden. Das ist ein anderes physikalisches Verfahren als die Kernspaltung in herkömmlichen Atomkraftwerken. Forschung zur Fusion und der Bau neuer Kernspaltungsreaktoren sind deshalb getrennte politische Fragen.",
      "Light atomic nuclei combine into heavier ones, releasing energy. This is a different process from fission in conventional nuclear power stations. Supporting fusion research and permitting new fission reactors are therefore separate policy questions.",
      "Núcleos atómicos ligeros se unen formando otros más pesados y liberando energía. Es un proceso distinto de la fisión en centrales convencionales. Apoyar la investigación en fusión y permitir nuevos reactores de fisión son cuestiones políticas diferentes.",
    ),
  ),
  term(
    "partial-legalisation",
    text(
      "Teillegalisierung|Teillegalisierung von Cannabis",
      "Partial legalisation|partial legalisation of cannabis",
      "Legalización parcial|legalización parcial del cannabis",
    ),
    text(
      "Bestimmte Handlungen mit Cannabis werden innerhalb festgelegter Grenzen erlaubt, andere bleiben verboten. Teillegalisierung bedeutet also keine uneingeschränkte Freigabe von Besitz, Anbau und Verkauf. Die Frage bezieht sich auf die 2024 eingeführte Regelung, nicht auf eine Anleitung zum erlaubten Umgang mit Cannabis.",
      "Some activities involving cannabis are permitted within defined limits while others remain prohibited. Partial legalisation does not mean unrestricted possession, cultivation or sales. The question refers to the 2024 reform, not guidance on what cannabis use is legally permitted.",
      "Se permiten determinadas actividades con cannabis dentro de unos límites, mientras otras siguen prohibidas. No significa permitir sin restricciones la posesión, el cultivo y la venta. La pregunta se refiere a la reforma de 2024, no ofrece instrucciones sobre el uso legal del cannabis.",
    ),
  ),
  term(
    "rent-brake",
    text("Mietpreisbremse", "Rent brake|rent brakes", "Freno al alquiler"),
    text(
      "Eine Begrenzung der Miete bei der Wiedervermietung in bestimmten Gebieten mit angespanntem Wohnungsmarkt. Als Maßstab dient die ortsübliche Vergleichsmiete; Ausnahmen können gelten. Das ist nicht dasselbe wie ein allgemeines Einfrieren aller bestehenden Mieten.",
      "A restriction on starting rents when homes are re-let in designated areas with tight housing markets. It uses the local comparative rent as a benchmark and can have exceptions. It is not a general freeze on all existing rents.",
      "Una limitación de la renta inicial al volver a alquilar viviendas en determinadas zonas con un mercado tensionado. Toma como referencia el alquiler comparable local y puede tener excepciones. No es una congelación general de todos los alquileres existentes.",
    ),
    [
      "Bürgerliches Gesetzbuch · § 556d",
      "https://www.gesetze-im-internet.de/bgb/__556d.html",
    ],
  ),
  term(
    "rent-cap",
    text("Mietendeckel", "Rent cap|rent caps|caps", "Tope de alquiler|topes"),
    text(
      "Ein Sammelbegriff für Modelle, die Mieten mit Obergrenzen oder einem zeitweisen Mietenstopp begrenzen. Welche Wohnungen erfasst sind und wie Ausnahmen aussehen, hängt vom Modell ab. Der Begriff allein bezeichnet keine bestimmte, überall geltende Regelung.",
      "A broad term for policies limiting rent through ceilings or a temporary freeze. The homes covered and any exceptions depend on the proposal. The term alone does not describe one rule applying everywhere.",
      "Un término general para modelos que limitan los alquileres mediante topes o congelaciones temporales. Las viviendas incluidas y las excepciones dependen de la propuesta. El término no designa por sí solo una regla aplicable en todas partes.",
    ),
    null,
    ["rent"],
  ),
  term(
    "gdp",
    text(
      "Bruttoinlandsprodukt|Bruttoinlandsprodukts|Wirtschaftsleistung|BIP",
      "Gross domestic product|GDP",
      "Producto interior bruto|PIB",
    ),
    text(
      "Das Bruttoinlandsprodukt misst die wirtschaftliche Leistung innerhalb eines Landes in einem Zeitraum. Zwei Prozent davon sind nicht zwei Prozent der Steuereinnahmen oder des Staatshaushalts. Das BIP ist auch kein direktes Maß dafür, wie gut einzelne Menschen leben.",
      "Gross domestic product measures economic output produced within a country over a period. Two per cent of GDP is not two per cent of tax revenue or the government budget. GDP is not a direct measure of individual wellbeing either.",
      "El producto interior bruto mide la producción económica dentro de un país durante un periodo. El dos por ciento del PIB no equivale al dos por ciento de los impuestos recaudados ni del presupuesto público. Tampoco mide directamente el bienestar individual.",
    ),
    [
      "Destatis · Bruttoinlandsprodukt",
      "https://www.destatis.de/DE/Themen/Wirtschaft/Volkswirtschaftliche-Gesamtrechnungen-Inlandsprodukt/Methoden/bip.html",
    ],
  ),
  term(
    "nato",
    text("NATO", "NATO", "OTAN"),
    text(
      "Ein politisches und militärisches Bündnis europäischer und nordamerikanischer Staaten. Ein zentraler Grundsatz ist die gemeinsame Verteidigung im Fall eines bewaffneten Angriffs auf ein Mitglied. Die im Vergleich genannte Zwei-Prozent-Schwelle beschreibt die Debatte vor der Wahl 2025, nicht spätere Beschlüsse des Bündnisses.",
      "A political and military alliance of European and North American countries. Collective defence in the event of an armed attack on a member is a central principle. The two-per-cent threshold in this comparison reflects the pre-election 2025 debate, not later alliance decisions.",
      "Una alianza política y militar de países europeos y norteamericanos. Uno de sus principios centrales es la defensa colectiva ante un ataque armado contra un miembro. El umbral del dos por ciento refleja el debate anterior a las elecciones de 2025, no acuerdos posteriores de la alianza.",
    ),
  ),
  term(
    "ticket",
    text("Deutschlandticket", "Deutschlandticket", "Deutschlandticket"),
    text(
      "Ein Abonnement für den öffentlichen Nah- und Regionalverkehr in Deutschland. Fernzüge wie ICE und IC gehören grundsätzlich nicht dazu. Öffentliche Zuschüsse bedeuten, dass Bund und Länder einen Teil der Finanzierung tragen; die Frage legt keinen konkreten Fahrpreis fest.",
      "A subscription pass for public local and regional transport across Germany. Long-distance trains such as ICE and IC services are generally excluded. Public subsidies mean federal and state governments help fund it; the question does not set a specific fare.",
      "Un abono para el transporte público local y regional de Alemania. Por regla general, no incluye trenes de larga distancia como ICE e IC. Las subvenciones públicas significan que el Gobierno federal y los estados contribuyen a financiarlo; la pregunta no fija una tarifa.",
    ),
  ),
  term(
    "citizens-insurance",
    text(
      "Bürgerversicherung",
      "Citizens’ insurance|citizens' insurance",
      "Seguro ciudadano",
    ),
    text(
      "Ein Reformmodell, bei dem bisher gesetzlich und privat Versicherte in eine gemeinsame Finanzierung der Krankenversicherung einbezogen werden. Das muss nicht bedeuten, dass es nur noch eine Krankenkasse gibt. Welche Einkommen und Personen einbezogen werden, unterscheidet sich zwischen den Vorschlägen.",
      "A reform model bringing people currently in statutory and private health insurance into a shared funding system. It need not mean having just one insurer. Proposals differ on which people and income sources would be included.",
      "Un modelo de reforma que incorpora a quienes tienen seguro médico público y privado a una financiación compartida. No exige necesariamente una única aseguradora. Las propuestas difieren sobre las personas y los tipos de ingresos incluidos.",
    ),
    [
      "AOK · Bürgerversicherung",
      "https://www.aok.de/pp/lexikon/buergerversicherung/",
    ],
    ["health"],
  ),
  term(
    "multiple-citizenship",
    text(
      "Mehrstaatigkeit|doppelte Staatsbürgerschaft",
      "Multiple citizenship|dual citizenship",
      "Nacionalidad múltiple|doble nacionalidad",
    ),
    text(
      "Eine Person besitzt gleichzeitig die Staatsangehörigkeit von zwei oder mehr Ländern. Ob das möglich ist, hängt auch von den Regeln der anderen beteiligten Staaten ab. Mehrstaatigkeit sagt für sich genommen nichts darüber aus, wie lange jemand vor einer Einbürgerung im Land leben muss.",
      "A person holds citizenship of two or more countries at the same time. Whether this is possible also depends on the rules of the other countries involved. Multiple citizenship does not itself determine how long someone must live in a country before naturalisation.",
      "Una persona tiene simultáneamente la nacionalidad de dos o más países. Su posibilidad también depende de las normas de los otros estados implicados. La nacionalidad múltiple no determina por sí sola cuánto tiempo debe residir alguien antes de naturalizarse.",
    ),
  ),
  term(
    "naturalisation",
    text(
      "Einbürgerung",
      "Naturalisation|naturalization|becoming German citizens",
      "Naturalización|adquieran la nacionalidad alemana",
    ),
    text(
      "Der Erwerb einer Staatsangehörigkeit auf Antrag, nachdem die dafür geltenden Voraussetzungen geprüft wurden. Das ist etwas anderes als ein Aufenthaltstitel, der den Aufenthalt erlaubt, aber allein noch keine Staatsangehörigkeit verleiht.",
      "Acquiring citizenship by application after the relevant requirements have been checked. This differs from a residence permit, which allows a person to live in a country but does not itself give them citizenship.",
      "Adquirir una nacionalidad mediante una solicitud tras comprobar los requisitos aplicables. Es distinto de un permiso de residencia, que permite vivir en un país pero no concede por sí mismo su nacionalidad.",
    ),
  ),
  term(
    "criminal-law",
    text(
      "Strafrecht|Strafrechts|Entkriminalisierung|entkriminalisieren",
      "Criminal law|decriminalisation|decriminalization",
      "Derecho penal|despenalización",
    ),
    text(
      "Das Strafrecht legt fest, welche Handlungen Straftaten sind und welche Strafen darauf folgen können. Eine Regelung außerhalb des Strafrechts bedeutet nicht automatisch, dass es gar keine Regeln gibt: etwa medizinische Vorgaben, Fristen oder Beratung können gesondert geregelt werden.",
      "Criminal law defines offences and the punishments they can carry. Moving an issue outside criminal law does not automatically remove all rules: medical requirements, time limits or counselling can be regulated separately.",
      "El Derecho penal define los delitos y sus posibles penas. Regular una cuestión fuera de él no significa eliminar todas las reglas: pueden establecerse por separado requisitos médicos, plazos o asesoramiento.",
    ),
    null,
    ["abortion"],
  ),
  term(
    "intermediate-weapons",
    text(
      "Mittelstreckenwaffen",
      "Intermediate-range weapons",
      "Armas de alcance intermedio|armas estadounidenses de alcance intermedio",
    ),
    text(
      "Waffensysteme für Angriffe über große Entfernungen innerhalb einer Region. In dieser Frage geht es um die vor der Wahl 2025 angekündigte Stationierung amerikanischer Systeme in Deutschland. Der Begriff sagt nicht automatisch, dass ein System atomar bewaffnet ist.",
      "Weapons designed to strike over long distances within a region. This question concerns US systems whose deployment in Germany was announced before the 2025 election. The term does not automatically mean that a system carries nuclear warheads.",
      "Sistemas de armas para atacar a grandes distancias dentro de una región. Aquí se trata de sistemas estadounidenses cuyo despliegue en Alemania se anunció antes de las elecciones de 2025. El término no implica automáticamente que lleven armas nucleares.",
    ),
    [
      "Bundeswehr · US-Mittelstreckenwaffen",
      "https://www.bundeswehr.de/de/meldungen/stationierung-us-marschflugkoerpern-deutschland",
    ],
  ),
  term(
    "economic-sanctions",
    text(
      "Wirtschaftssanktionen|Sanktionen",
      "Economic sanctions|sanctions",
      "Sanciones económicas|sanciones",
    ),
    text(
      "Beschränkungen etwa für Handel, Finanzgeschäfte oder den Zugriff auf Vermögen, mit denen Staaten politischen Druck ausüben. Sie können ganze Wirtschaftszweige, einzelne Unternehmen oder Personen betreffen. Nicht jede Sanktion verbietet jeden wirtschaftlichen Austausch.",
      "Restrictions on activities such as trade, financial transactions or access to assets, used by governments to apply political pressure. They may target sectors, companies or individuals. A sanction does not necessarily prohibit all economic exchange.",
      "Restricciones al comercio, las operaciones financieras o el acceso a bienes, utilizadas por los gobiernos para ejercer presión política. Pueden afectar a sectores, empresas o personas. Una sanción no prohíbe necesariamente todo intercambio económico.",
    ),
    [
      "Council of the EU · Sanctions explained",
      "https://www.consilium.europa.eu/en/policies/sanctions-against-russia-explained/",
    ],
    ["russia"],
  ),
  term(
    "privatisation",
    text(
      "Privatisierung",
      "Privatisation|privatization|privatising",
      "Privatización|privatizar",
    ),
    text(
      "Die Übertragung staatlichen Eigentums oder staatlicher Aufgaben an private Akteure. Das ist nicht dasselbe wie die organisatorische Trennung von Schienennetz und Zugbetrieb: Beides kann getrennt organisiert und trotzdem öffentlich besessen sein.",
      "Transferring public ownership or responsibilities to private actors. This differs from organisationally separating the rail network and train operations: they can be separated while remaining publicly owned.",
      "Transferir propiedad o funciones públicas a actores privados. No es lo mismo que separar la organización de la red ferroviaria y la operación de trenes: ambas pueden separarse y seguir siendo de propiedad pública.",
    ),
    null,
    ["rail"],
  ),
  term(
    "cooperation-ban",
    text(
      "Kooperationsverbot",
      "Cooperation ban|federal–state cooperation",
      "Prohibición de cooperación|cooperación federal y regional",
    ),
    text(
      "Ein politischer Kurzbegriff für verfassungsrechtliche Grenzen der Zusammenarbeit von Bund und Ländern in der Bildung. Schulen fallen grundsätzlich in die Verantwortung der Länder. Es gibt aber Möglichkeiten der Bundesförderung; der Begriff bedeutet kein ausnahmsloses Verbot jeder Zusammenarbeit.",
      "Political shorthand for constitutional limits on federal–state cooperation in education. Schools are primarily a state responsibility, but some federal funding is possible. The term does not mean that every form of cooperation is prohibited.",
      "Una expresión política para los límites constitucionales a la cooperación educativa entre el Gobierno federal y los estados. Las escuelas son principalmente competencia de los estados, pero existen posibilidades de financiación federal. No significa una prohibición absoluta de toda cooperación.",
    ),
  ),
  term(
    "solidarity-surcharge",
    text(
      "Solidaritätszuschlag|Soli",
      "Solidarity surcharge",
      "Recargo de solidaridad",
    ),
    text(
      "Eine zusätzliche Abgabe auf bestimmte Einkommensteuer- und Körperschaftsteuerschulden. Sie ist keine eigenständige Steuer auf das gesamte Einkommen. Wer belastet wird, hängt von den gesetzlichen Regeln ab; der Name allein legt nicht fest, wofür die Einnahmen ausgegeben werden.",
      "An additional levy on certain income-tax and corporation-tax liabilities. It is not a separate tax on all income. The applicable rules determine who pays; its name alone does not earmark the revenue for a particular use.",
      "Un recargo sobre determinadas cuotas del impuesto sobre la renta y del impuesto sobre sociedades. No es un impuesto separado sobre todos los ingresos. Las reglas determinan quién paga; su nombre no asigna por sí solo la recaudación a un destino concreto.",
    ),
    [
      "Solidaritätszuschlaggesetz · § 1",
      "https://www.gesetze-im-internet.de/solzg_1995/__1.html",
    ],
  ),
  term(
    "basic-support",
    text(
      "Grundsicherung|Bürgergeld",
      "Basic income support|basic support",
      "Ayudas de subsistencia",
    ),
    text(
      "Hier geht es um bedarfsabhängige Unterstützung für erwerbsfähige Menschen, deren eigene Mittel nicht zum Lebensunterhalt reichen. Einkommen und Vermögen können bei der Prüfung berücksichtigt werden. Das ist kein bedingungsloses Grundeinkommen, das unabhängig von Bedürftigkeit gezahlt würde.",
      "Here this means means-tested support for working-age people able to work whose resources are insufficient for living costs. Income and assets can affect eligibility. It is not a universal basic income paid regardless of financial need.",
      "Aquí se trata de ayudas sujetas a necesidad económica para personas en edad y condiciones de trabajar cuyos recursos no cubren su sustento. Pueden tenerse en cuenta ingresos y patrimonio. No es una renta básica universal pagada sin comprobar la necesidad.",
    ),
    null,
    ["welfare"],
  ),
  term(
    "suitable-work",
    text(
      "Zumutbare Arbeit|zumutbarer Arbeit",
      "Suitable work",
      "Trabajo adecuado",
    ),
    text(
      "Arbeit, deren Annahme nach den gesetzlichen Regeln verlangt werden kann. Dabei können etwa gesundheitliche Einschränkungen, Kinderbetreuung oder die Pflege Angehöriger wichtig sein. Gemeint ist nicht, dass unter allen Umständen jede beliebige Arbeit angenommen werden muss.",
      "Work that a person can be required to accept under the applicable rules. Health limitations, childcare and caring for relatives can matter. It does not mean that everyone must accept any job in every circumstance.",
      "Un trabajo que puede exigirse aceptar según las reglas aplicables. Pueden importar las limitaciones de salud, el cuidado de menores y de familiares. No significa que deba aceptarse cualquier empleo en toda circunstancia.",
    ),
    ["SGB II · § 10", "https://www.gesetze-im-internet.de/sgb_2/__10.html"],
    ["welfare"],
  ),
  term(
    "pension",
    text(
      "Gesetzliche Rentenversicherung|gesetzlichen Rentenversicherung|Rentenversicherung|Bürgerversicherung",
      "Statutory pension scheme|statutory pensions|citizens’ insurance|citizens' insurance",
      "Régimen público común de pensiones|régimen público de pensiones|seguro ciudadano",
    ),
    text(
      "Die gesetzlich geregelte Altersversicherung, die in Deutschland überwiegend laufende Beiträge und staatliche Zuschüsse für laufende Rentenzahlungen verwendet. Das unterscheidet sie von einem persönlichen Ansparvertrag. Die Frage betrifft, wer einzahlen soll, nicht automatisch die Höhe späterer Renten.",
      "Germany’s statutory pension system mainly uses current contributions and public funding to pay current pensions. It differs from an individual savings contract. The question concerns who should contribute, not automatically the size of future pensions.",
      "El sistema legal alemán de pensiones utiliza principalmente las cotizaciones actuales y fondos públicos para pagar las pensiones actuales. Es distinto de un contrato de ahorro individual. La pregunta trata de quién debe cotizar, no determina por sí sola la cuantía futura de las pensiones.",
    ),
    null,
    ["pensions"],
  ),
  term(
    "referendum",
    text(
      "Volksentscheid|Volksentscheide|Volksentscheiden",
      "Referendum|referendums",
      "Referendo|referendos",
    ),
    text(
      "Eine direkte Abstimmung der Wahlberechtigten über eine Sachfrage, statt nur über ihre Vertreter. Die Aussage meint verbindliche Entscheidungen über Gesetze, die Bürger selbst anstoßen können. Welche Hürden, Themen und Mehrheiten gelten, müsste das konkrete Verfahren festlegen.",
      "A direct vote by the electorate on an issue rather than only on representatives. This statement means binding votes on legislation initiated by citizens. A specific scheme would need to define thresholds, eligible topics and required majorities.",
      "Una votación directa del electorado sobre una cuestión, no solo sobre sus representantes. La afirmación se refiere a decisiones vinculantes sobre leyes promovidas por la ciudadanía. El procedimiento concreto debe definir los requisitos, los temas admisibles y las mayorías.",
    ),
  ),
  term(
    "citizens-assembly",
    text(
      "Bürgerräte|Bürgerrat",
      "Citizens’ assemblies|citizens' assemblies|citizens’ assembly",
      "Asambleas ciudadanas|asamblea ciudadana",
    ),
    text(
      "Eine Gruppe von Bürgern, häufig per Los zusammengestellt, die sich informiert, miteinander berät und Empfehlungen formuliert. Solche Empfehlungen sind etwas anderes als eine verbindliche Abstimmung aller Wahlberechtigten über ein Gesetz.",
      "A group of citizens, often selected by lot, who learn about a topic, deliberate and make recommendations. Such recommendations differ from a binding vote by the whole electorate on legislation.",
      "Un grupo de ciudadanos, a menudo elegidos por sorteo, que se informa, delibera y formula recomendaciones. Esas recomendaciones son distintas de una votación vinculante de todo el electorado sobre una ley.",
    ),
  ),
  term(
    "active-vote",
    text(
      "Aktives Wahlrecht|aktiven Wahlrecht",
      "Voting in federal elections",
      "Voto en elecciones federales",
    ),
    text(
      "Das Recht, bei einer Wahl die eigene Stimme abzugeben. Davon unterscheidet sich das passive Wahlrecht: das Recht, selbst als Kandidat gewählt zu werden. Für beide können unterschiedliche Voraussetzungen gelten.",
      "The right to cast a vote in an election. It differs from the right to stand as a candidate and be elected. The conditions for voting and for candidacy can differ.",
      "El derecho a emitir el propio voto en unas elecciones. Es distinto del derecho a presentarse como candidato y ser elegido. Los requisitos para votar y para ser candidato pueden ser diferentes.",
    ),
    null,
    ["vote16"],
  ),
  term(
    "investment-income",
    text(
      "Kapitaleinkünfte|Kapitalerträge|Kapitaleinkommen|Dividenden",
      "Investment income|capital income|dividends",
      "Rentas del capital|rendimientos del capital|dividendos",
    ),
    text(
      "Einkünfte aus Geldanlagen, etwa Zinsen, Dividenden oder bestimmte Gewinne beim Verkauf von Wertpapieren. Gemeint sind die Erträge, nicht der gesamte Wert einer Geldanlage. Die Frage betrifft deren steuerliche Behandlung im Vergleich zu Arbeitseinkommen.",
      "Income from investments, such as interest, dividends or certain gains from selling securities. This means returns, not the full value of an investment. The question concerns how those returns should be taxed compared with earnings from work.",
      "Ingresos de inversiones, como intereses, dividendos o determinadas ganancias al vender valores. Se trata de los rendimientos, no del valor total de la inversión. La pregunta compara su tributación con la de los ingresos del trabajo.",
    ),
    [
      "Einkommensteuergesetz · § 20",
      "https://www.gesetze-im-internet.de/estg/__20.html",
    ],
  ),
  term(
    "taurus",
    text("Taurus", "Taurus", "Taurus"),
    text(
      "Ein von Flugzeugen gestarteter Marschflugkörper, der entfernte Bodenziele treffen kann. Ein Marschflugkörper fliegt mit eigenem Antrieb und wird zum Ziel gelenkt. Die allgemeine Zustimmung zu Waffenlieferungen bedeutet im Vergleich nicht automatisch Zustimmung zur Lieferung dieses bestimmten Systems.",
      "An air-launched cruise missile designed to strike distant ground targets. A cruise missile is powered and guided towards its target. In this comparison, supporting weapons supplies in general does not automatically mean supporting delivery of this particular system.",
      "Un misil de crucero lanzado desde un avión para alcanzar objetivos terrestres lejanos. Un misil de crucero tiene propulsión propia y se guía hasta su objetivo. En esta comparación, apoyar el suministro de armas en general no implica apoyar la entrega de este sistema concreto.",
    ),
    [
      "Bundeswehr · Taurus",
      "https://www.bundeswehr.de/de/ausruestung-technik-bundeswehr/ausruestung-bewaffnung/marschflugkoerper-taurus-kepd-350",
    ],
  ),
  term(
    "wealth-levy",
    text(
      "Vermögensabgabe",
      "Wealth levy|wealth levies",
      "Gravamen sobre el patrimonio|gravámenes sobre el patrimonio",
    ),
    text(
      "Eine Abgabe auf Vermögen, die beispielsweise einmalig erhoben und über längere Zeit bezahlt werden kann. Sie ist von einer regelmäßig wiederkehrenden Vermögensteuer zu unterscheiden. Welche Personen und Vermögenswerte betroffen wären, hängt vom Vorschlag ab.",
      "A levy on wealth that can, for example, be imposed once and paid in instalments over time. It differs from a recurring wealth tax. The people and assets covered depend on the proposal.",
      "Un gravamen sobre el patrimonio que puede, por ejemplo, exigirse una sola vez y pagarse a plazos. Es distinto de un impuesto periódico sobre el patrimonio. Las personas y los bienes afectados dependen de la propuesta.",
    ),
  ),
  term(
    "alternative-service",
    text("Ersatzdienst", "Alternative service", "Servicio alternativo"),
    text(
      "Ein Dienst, der an die Stelle des Wehrdienstes tritt, etwa bei anerkannter Verweigerung des Dienstes mit der Waffe aus Gewissensgründen. Tätigkeit und Dauer hängen von den gesetzlichen Regeln ab. Ein freiwilliges soziales Jahr ist nicht automatisch ein verpflichtender Ersatzdienst.",
      "Service that takes the place of military service, for example for recognised conscientious objectors. Its duties and duration depend on the legal scheme. A voluntary social-service year is not automatically compulsory alternative service.",
      "Un servicio que sustituye al militar, por ejemplo para objetores de conciencia reconocidos. Sus tareas y duración dependen de las reglas legales. Un año de voluntariado social no equivale automáticamente a un servicio alternativo obligatorio.",
    ),
  ),
  term(
    "paris",
    text(
      "Pariser Abkommen|Pariser Klimaschutzabkommen",
      "Paris Agreement",
      "Acuerdo de París",
    ),
    text(
      "Ein internationales Klimaschutzabkommen von 2015. Es soll die Erderwärmung gegenüber der vorindustriellen Zeit deutlich unter zwei Grad halten und Anstrengungen für eine Begrenzung auf 1,5 Grad fördern. Die Staaten legen dafür eigene Klimabeiträge vor. Das deutsche Zieljahr 2045 ist nicht für alle Staaten identisch im Abkommen vorgegeben.",
      "A 2015 international climate agreement seeking to keep warming well below two degrees above pre-industrial levels and pursue a 1.5-degree limit. Countries submit their own climate contributions. It does not impose Germany’s 2045 target year identically on every country.",
      "Un acuerdo climático internacional de 2015 que busca mantener el calentamiento muy por debajo de dos grados respecto a la era preindustrial y esforzarse por limitarlo a 1,5 grados. Los países presentan sus propias contribuciones. No impone a todos el año objetivo alemán de 2045.",
    ),
    [
      "UNFCCC · Paris Agreement",
      "https://www.unfccc.int/process-and-meetings/the-paris-agreement",
    ],
  ),
  term(
    "smr",
    text(
      "Kleine modulare Reaktoren|SMR",
      "Small modular reactors|SMR|SMRs",
      "Reactores modulares pequeños|SMR",
    ),
    text(
      "SMR steht für Small Modular Reactors: kleinere Kernspaltungsreaktoren, deren Bauteile möglichst standardisiert und modular gefertigt werden sollen. Das ist keine Kernfusion. Die Bezeichnung allein sagt noch nichts über die Sicherheit, Kosten oder Einsatzreife eines konkreten Reaktormodells aus.",
      "SMR means Small Modular Reactor: a smaller nuclear-fission reactor designed for standardised, modular construction. It is not nuclear fusion. The label alone does not establish a particular design’s safety, cost or readiness for use.",
      "SMR significa Small Modular Reactor: un reactor de fisión nuclear más pequeño, diseñado para una construcción modular y estandarizada. No es fusión nuclear. La denominación no demuestra por sí sola la seguridad, el coste o la madurez de un diseño concreto.",
    ),
    [
      "European Commission · SMR",
      "https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=celex%3A52026DC0117",
    ],
  ),
  term(
    "section-218",
    text("§ 218|§§ 218 ff.", "Section 218|§ 218", "Artículo 218|§ 218"),
    text(
      "Eine Vorschrift des deutschen Strafgesetzbuchs über Schwangerschaftsabbrüche. Ob ein Abbruch strafbar ist, lässt sich nicht aus § 218 allein ablesen: Die anschließenden Vorschriften, insbesondere § 218a, enthalten wichtige Bedingungen und Ausnahmen. Die Frage im Vergleich betrifft die grundsätzliche Einordnung im Strafrecht.",
      "A provision of Germany’s Criminal Code concerning abortion. Section 218 alone does not tell you whether a particular abortion is punishable: related provisions, especially section 218a, contain important conditions and exceptions. This comparison asks about the overall use of criminal law.",
      "Una disposición del Código Penal alemán sobre el aborto. El artículo 218 por sí solo no determina si un caso es punible: las disposiciones siguientes, especialmente el 218a, contienen condiciones y excepciones importantes. Esta comparación pregunta por la regulación general mediante el Derecho penal.",
    ),
    [
      "Strafgesetzbuch · § 218",
      "https://www.gesetze-im-internet.de/stgb/__218.html",
    ],
  ),
  term(
    "digital-euro",
    text("Digitaler Euro|digitalen Euro", "Digital euro", "Euro digital"),
    text(
      "Das Konzept eines digitalen Zahlungsmittels der Zentralbank für den Alltag. Es soll Bargeld ergänzen und unterscheidet sich von einem normalen Bankguthaben und von Kryptowährungen wie Bitcoin. Mit dem Begriff allein wird nicht gesagt, dass es bereits eingeführt ist oder welche technischen Regeln gelten.",
      "A proposed form of central-bank money for everyday digital payments, intended to complement cash. It differs from an ordinary bank deposit and from cryptocurrencies such as Bitcoin. The term alone does not mean it has already launched or specify its technical rules.",
      "Un proyecto de dinero del banco central para pagos digitales cotidianos, pensado para complementar el efectivo. Es distinto de un depósito bancario normal y de criptomonedas como Bitcoin. El término no significa que ya se haya implantado ni concreta sus reglas técnicas.",
    ),
    [
      "European Central Bank · Digital euro",
      "https://www.ecb.europa.eu/euro/digital_euro/faqs/html/ecb.faq_digital_euro.en.html",
    ],
  ),
  term(
    "citizens-initiative",
    text(
      "Volksbegehren",
      "Citizens’ initiative|citizens' initiative",
      "Iniciativa ciudadana",
    ),
    text(
      "Ein Verfahren, mit dem Bürger Unterstützung für ein bestimmtes politisches Vorhaben sammeln, typischerweise durch Unterschriften. Wenn die jeweiligen Hürden erfüllt sind, kann sich eine parlamentarische Behandlung oder eine Abstimmung anschließen. Das Begehren selbst ist noch nicht der abschließende Volksentscheid.",
      "A procedure for citizens to gather support for a proposal, typically through signatures. Meeting the relevant requirements can lead to parliamentary consideration or a public vote. The initiative itself is not the final referendum.",
      "Un procedimiento para reunir apoyo ciudadano a una propuesta, normalmente mediante firmas. Cumplir los requisitos puede dar lugar a un debate parlamentario o a una votación. La iniciativa en sí no es el referendo final.",
    ),
  ),
];

export const POLICY_TERM_BY_ID = new Map(
  POLICY_TERMS.map((item) => [item.id, item]),
);
export const glossaryCopy = {
  explain: text("Begriff erklären", "Explain term", "Explicar término"),
  hint: text(
    "Unterstrichene Begriffe antippen, um sie erklärt zu bekommen.",
    "Tap an underlined term for an explanation.",
    "Toca un término subrayado para ver su explicación.",
  ),
  source: text("Weiterlesen", "Read more", "Más información"),
};
export const termTitle = (item, locale) =>
  localText(item.aliases, locale).split("|")[0];
const matchers = new Map();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function policyTextParts(value, locale, questionId) {
  if (questionId === "benefit-sanctions") questionId = "welfare";
  const language = locale === "de" ? "de" : locale === "es" ? "es" : "en";
  // Only predefined question scopes are cached; arbitrary caller input cannot grow this cache.
  const scope = POLICY_TERMS.some((item) => item.scope?.includes(questionId))
    ? questionId
    : "general";
  const key = `${language}:${scope}`;
  if (!matchers.has(key)) {
    const aliases = POLICY_TERMS.filter(
      (item) => !item.scope || item.scope.includes(scope),
    )
      .flatMap((item) =>
        item.aliases[language]
          .split("|")
          .map((alias) => [alias.toLowerCase(), item.id]),
      )
      .sort((a, b) => b[0].length - a[0].length);
    matchers.set(key, {
      ids: new Map(aliases),
      // Unicode word boundaries protect compounds, accents, and adjacent punctuation.
      pattern: new RegExp(
        `(^|[^\\p{L}\\p{N}_])(${aliases.map(([alias]) => escapeRegex(alias)).join("|")})(?![\\p{L}\\p{N}_])`,
        "giu",
      ),
    });
  }
  const { pattern, ids } = matchers.get(key);
  const parts = [];
  let cursor = 0;
  for (const match of value.matchAll(pattern)) {
    const start = match.index + match[1].length;
    if (start > cursor) parts.push({ text: value.slice(cursor, start) });
    parts.push({ text: match[2], term: ids.get(match[2].toLowerCase()) });
    cursor = start + match[2].length;
  }
  if (cursor < value.length) parts.push({ text: value.slice(cursor) });
  return parts;
}
