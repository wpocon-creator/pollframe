// Transactional only: accessible HTML + complete plain text, no pixels,
// remotely loaded images/fonts, marketing or third-party links.
export function accountMessage(kind, { url, otp, newEmail }, language = "en") {
  const locale = language.toLowerCase().split(/[-,;]/)[0];
  const messages = {
    de: {
      "email-change": [
        "Änderung deiner Pollframe-E-Mail bestätigen",
        `Für dein Pollframe-Konto wurde die Änderung der E-Mail-Adresse zu ${newEmail} angefordert. Bestätige sie nur, wenn du das selbst angefordert hast:\n\n${url}\n\nAnschließend muss auch die neue Adresse bestätigt werden. Wenn du diese Änderung nicht angefordert hast, ändere dein Passwort und prüfe deine Sitzungen.`,
      ],
      code: [
        `${otp} ist dein Bestätigungscode`,
        `${otp}\n\nMit diesem Code geht es bei Pollframe weiter. Er gilt zehn Minuten. Gib ihn nur auf pollframe.com ein und teile ihn mit niemandem.`,
      ],
      codeHeading: "Dein Bestätigungscode",
      verify: [
        "Dein Pollframe-Konto bestätigen",
        `Fast geschafft. Bestätige deine E-Mail-Adresse, um dein Pollframe-Konto zu nutzen:\n\n${url}`,
      ],
      reset: [
        "Dein Pollframe-Passwort zurücksetzen",
        `Du hast ein neues Passwort für dein Pollframe-Konto angefordert. Über diesen Link kannst du es festlegen:\n\n${url}\n\nNach der Änderung werden deine bisherigen Sitzungen abgemeldet.`,
      ],
      footer:
        "Wenn du diese Nachricht nicht angefordert hast, kannst du sie ignorieren.",
    },
    en: {
      "email-change": [
        "Confirm a change to your Pollframe email",
        `A change of your Pollframe email address to ${newEmail} was requested. Approve only if you requested it yourself:\n\n${url}\n\nThe new address must then also be verified. If you did not request this change, change your password and review your sessions.`,
      ],
      code: [
        `${otp} is your verification code`,
        `${otp}\n\nUse this code to continue to Pollframe. It expires in ten minutes. Enter it only on pollframe.com and never share it.`,
      ],
      codeHeading: "Your verification code",
      verify: [
        "Confirm your Pollframe account",
        `You are almost there. Confirm your email address to use your Pollframe account:\n\n${url}`,
      ],
      reset: [
        "Reset your Pollframe password",
        `You requested a new password for your Pollframe account. Use this link to choose one:\n\n${url}\n\nChanging it will sign out your existing sessions.`,
      ],
      footer: "If you did not request this message, you can ignore it.",
    },
    es: {
      "email-change": [
        "Confirma el cambio de correo de Pollframe",
        `Se solicitó cambiar tu correo de Pollframe a ${newEmail}. Confirma solo si lo has solicitado tú:\n\n${url}\n\nTambién será necesario verificar la nueva dirección. Si no solicitaste el cambio, cambia tu contraseña y revisa tus sesiones.`,
      ],
      code: [
        `${otp} es tu código de verificación`,
        `${otp}\n\nUsa este código para continuar en Pollframe. Caduca en diez minutos. Introdúcelo solo en pollframe.com y no lo compartas.`,
      ],
      codeHeading: "Tu código de verificación",
      verify: [
        "Confirma tu cuenta de Pollframe",
        `Ya casi está. Confirma tu correo para usar tu cuenta de Pollframe:\n\n${url}`,
      ],
      reset: [
        "Restablece tu contraseña de Pollframe",
        `Has solicitado una contraseña nueva para tu cuenta de Pollframe. Puedes crearla con este enlace:\n\n${url}\n\nAl cambiarla se cerrarán tus sesiones anteriores.`,
      ],
      footer: "Si no has solicitado este mensaje, puedes ignorarlo.",
    },
  };
  const copy = messages[locale] || messages.en;
  if (!["code", "verify", "reset", "email-change"].includes(kind))
    throw Error("Unsupported account message");
  const [subject, content] = copy[kind];
  const escape = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  if (kind !== "code" && (!url || new URL(url).protocol !== "https:"))
    throw Error("Invalid mail link");
  if (kind === "code" && !/^\d{6}$/.test(otp))
    throw Error("Invalid confirmation code");
  const action =
    locale === "de"
      ? "Weiter zu Pollframe"
      : locale === "es"
        ? "Continuar en Pollframe"
        : "Continue to Pollframe";
  const paragraphs = content
    .split("\n\n")
    .map((paragraph) => {
      if (kind === "code" && paragraph === otp)
        return `<p style="margin:28px 0;padding:20px;border:1px solid #dfe4ec;border-radius:12px;font:700 32px/1.3 ui-monospace,monospace;letter-spacing:4px;text-align:center;color:#1b263b">${otp}</p>`;
      if (paragraph === url)
        return `<p style="margin:28px 0"><a href="${escape(url)}" style="display:inline-block;padding:14px 22px;background:#2459cc;color:#fff;border-radius:9px;text-decoration:none;font-weight:600">${action}</a></p><p style="font-size:12px;line-height:1.6;overflow-wrap:anywhere;word-break:break-all"><a href="${escape(url)}" style="color:#506078">${escape(url)}</a></p>`;
      return `<p style="margin:16px 0;line-height:1.65;color:#334155">${escape(paragraph)}</p>`;
    })
    .join("");
  // Mail clients infer security codes from the subject and visible text. Keep
  // the numeric token before the brand, contiguous, and adjacent to its label.
  // This improves the message structure; client-specific AutoFill is heuristic.
  const heading = kind === "code" ? copy.codeHeading : subject;
  const brand =
    kind === "code"
      ? ""
      : '<p style="margin:0 0 28px;font-size:15px;font-weight:800;letter-spacing:2px;color:#2459cc">POLLFRAME</p>';
  const html = `<!doctype html><html lang="${["de", "es"].includes(locale) ? locale : "en"}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head><body style="margin:0;padding:24px 12px;background:#f3f5f8;font-family:Arial,Helvetica,sans-serif;color:#172033"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="480" cellspacing="0" cellpadding="0" style="width:100%;max-width:480px;background:#fff;border:1px solid #e3e8ef;border-radius:16px"><tr><td style="padding:28px">${brand}<h1 style="margin:0 0 20px;font-size:25px;line-height:1.3;letter-spacing:-.5px">${escape(heading)}</h1>${paragraphs}<p style="border-top:1px solid #e3e8ef;margin:28px 0 0;padding-top:20px;font-size:13px;line-height:1.6;color:#64748b">${escape(copy.footer)}</p></td></tr></table><p style="font-size:12px;color:#64748b">Pollframe · pollframe.com</p></td></tr></table></body></html>`;
  const text = `${kind === "code" ? `${copy.codeHeading}: ${content}` : content}\n\n${copy.footer}\n\nPollframe`;
  return { subject, text, html };
}
