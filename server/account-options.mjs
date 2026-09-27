// Shared production policy. No secret defaults and no hostname from request headers.
export function accountOptions({database, secret, send}) {
  if(typeof secret !== "string" || secret.length < 40) throw Error("Account secret missing");
  return {
    appName:"Pollframe", database, secret, baseURL:"https://pollframe.com",
    // Library errors can contain database arguments. Record a stable event,
    // never arbitrary error objects, email addresses, passwords or link tokens.
    logger:{level:"warn",log:level=>console.warn(level === "error" ? "[accounts] authentication_error" : "[accounts] authentication_warning")},
    trustedOrigins:["https://pollframe.com"],
    emailAndPassword:{enabled:true, requireEmailVerification:true, autoSignIn:false,
      minPasswordLength:15,maxPasswordLength:128,revokeSessionsOnPasswordReset:true,
      sendResetPassword:send("reset")},
    emailVerification:{sendOnSignUp:true,autoSignInAfterVerification:false,expiresIn:1800,
      sendVerificationEmail:send("verify")},
    session:{expiresIn:60*60*24*7,updateAge:86400,freshAge:300},
    rateLimit:{enabled:true,storage:"database",window:60,max:80,customRules:{
      "/sign-in/email":{window:60,max:5},"/sign-up/email":{window:3600,max:5},
      "/request-password-reset":{window:3600,max:3},"/send-verification-email":{window:3600,max:3}}},
    advanced:{cookiePrefix:"pollframe",useSecureCookies:true,
      defaultCookieAttributes:{httpOnly:true,sameSite:"lax"},
      ipAddress:{ipAddressHeaders:["cf-connecting-ip"]}},
    user:{deleteUser:{enabled:true}},
  };
}
