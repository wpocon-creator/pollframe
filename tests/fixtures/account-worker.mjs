// Test-only transport. Never imported by the production Worker.
import {createAccountService} from '../../worker/accounts.js';
let service;
export default {async fetch(request,env){
  service ||= createAccountService(env,{fetchMail:async(_url,options)=>{
    await env.ACCOUNTS_DB.prepare('INSERT INTO test_mail(payload) VALUES(?)').bind(options.body).run();
    return Response.json({id:'intercepted-locally'});
  }});
  return service(request);
}};
