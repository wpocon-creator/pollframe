import {
  text as t,
  position as p,
  unresolved as u,
} from "./party-match-text.js";
import { MATCH_SOURCES as S } from "./party-match-sources.js";

// Distinguish the reach of a policy, not just its direction. New IDs prevent
// an answer to investment exceptions from becoming an answer to abolition.
// The archived questions remain in the original bank for editorial review.
export function scopeQuestions(bank) {
  const borrowing = bank.find((q) => q.id === "borrowing"),
    wage = bank.find((q) => q.id === "wage");
  const abolition = {
    ...borrowing,
    replaces: "borrowing",
    id: "debt-abolition",
    title: t(
      "Die Schuldenbremse im Grundgesetz soll vollständig abgeschafft werden.",
      "The debt brake in Germany’s constitution should be abolished entirely.",
      "Debería suprimirse por completo el freno de la deuda de la Constitución alemana.",
    ),
    context: t(
      "Eine Ausnahme für Investitionen oder eine Reform ist nicht dasselbe wie eine vollständige Abschaffung. Gefragt ist nach den Positionen vor der Bundestagswahl 2025, nicht nach späteren Beschlüssen.",
      "Investment exceptions or reform are not the same as complete abolition. This asks about positions before the 2025 federal election, not subsequent decisions.",
      "Las excepciones para inversiones o una reforma no equivalen a la supresión completa. Se pregunta por las posturas anteriores a las elecciones federales de 2025, no por decisiones posteriores.",
    ),
    positions: {
      afd: { ...borrowing.positions.afd, value: -1 },
      union: { ...borrowing.positions.union, value: -1 },
      fdp: { ...borrowing.positions.fdp, value: -1 },
      left: { ...borrowing.positions.left, value: 1 },
      bsw: u(15),
      greens: p(
        -1,
        null,
        "Die Grünen unterscheiden ausdrücklich zwischen ihrer Reformforderung und einer Abschaffung. Sie wollen Kreditgrenzen grundsätzlich beibehalten.",
        "The Greens explicitly distinguish their proposed reform from abolition and support retaining borrowing limits in principle.",
        "Los Verdes distinguen expresamente su reforma de la supresión y defienden mantener límites al endeudamiento.",
        S.greensDebtScope,
      ),
      spd: p(
        -1,
        null,
        "Olaf Scholz erklärt vor der Wahl ausdrücklich, dass es um eine begrenzte Reform für Investitionen geht, nicht um Abschaffung oder Aussetzung.",
        "Before the election, Olaf Scholz explicitly calls for limited investment reform, not abolition or suspension.",
        "Antes de las elecciones, Olaf Scholz pide expresamente una reforma limitada a inversiones, no la supresión ni la suspensión.",
        S.spdDebtScope,
      ),
    },
  };
  const floor = {
    replaces: "schools",
    id: "minimum-wage-abolition",
    category: t("Lohnregeln", "Wage rules", "Reglas salariales"),
    title: t(
      "Der gesetzliche Mindestlohn soll vollständig abgeschafft werden.",
      "The statutory minimum wage should be abolished entirely.",
      "Debería suprimirse por completo el salario mínimo legal.",
    ),
    context: t(
      "Es geht um die allgemeine gesetzliche Lohnuntergrenze, nicht um ihre Höhe oder darum, ob die Politik oder eine Kommission sie festlegt. Eine Frage darf auch einen belegten Konsens sichtbar machen: Sie hilft, eine begrenzte Reform von einer vollständigen Abschaffung zu unterscheiden.",
      "This concerns the general legal wage floor, not its amount or whether politicians or a commission set it. A question can also reveal documented consensus: it helps distinguish limited reform from complete abolition.",
      "Se trata del mínimo salarial general fijado por ley, no de su cuantía ni de si lo determina la política o una comisión. Una pregunta también puede mostrar un consenso documentado: permite distinguir una reforma limitada de la supresión completa.",
    ),
    positions: Object.fromEntries(
      Object.entries(wage.positions).map(([slug, position]) => [
        slug,
        {
          ...position,
          value: -1,
          note: t(
            ["afd", "fdp", "union"].includes(slug)
              ? "Setzt bei der Höhe auf die Mindestlohnkommission, nicht auf die Abschaffung der gesetzlichen Lohnuntergrenze."
              : "Fordert eine gesetzliche Lohnuntergrenze von mindestens 15 Euro statt ihrer Abschaffung.",
            ["afd", "fdp", "union"].includes(slug)
              ? "Backs the Minimum Wage Commission setting the rate, not abolition of the legal wage floor."
              : "Calls for a legal wage floor of at least €15 rather than abolishing it.",
            ["afd", "fdp", "union"].includes(slug)
              ? "Defiende que la comisión determine la cuantía, no suprimir el mínimo legal."
              : "Propone un mínimo legal de al menos 15 euros, en lugar de suprimirlo.",
          ),
        },
      ]),
    ),
  };
  return [abolition, floor];
}
