// Filter analytics submissions only, never site access. Unknown/reduced user
// agents and single-page readers are not proof of automation. Do not log IPs.
const automation=/googlebot|bingbot|duckduckbot|yandexbot|baiduspider|applebot|gptbot|claudebot|bytespider|facebookexternalhit|headlesschrome|playwright|puppeteer|selenium|^curl\/|^wget\/|python-requests|pollframeinternalaudit|pollframeprivateviewer/i;
export function excludeAnalyticsRequest(request,env={}){
  if(request.cf?.botManagement?.verifiedBot===true)return true;
  if(automation.test(request.headers.get('user-agent')||''))return true;
  const ip=request.headers.get('cf-connecting-ip');
  // Optional secret, not a checked-in address list. Exact addresses only;
  // shared/dynamic IPs make browser opt-out the safer primary control.
  const excluded=String(env.ANALYTICS_EXCLUDED_IPS||'').split(',').map(x=>x.trim()).filter(Boolean);
  return !!ip&&excluded.includes(ip);
}
