import { collect } from '../../lib/city-events.js';
export async function onRequest({request,env}) {
  const noStore={'Cache-Control':'no-store'};
  if(request.method!=='POST')return Response.json({error:'POST 요청만 허용됩니다.'},{status:405,headers:noStore});
  if(!env.CITY_COLLECTOR_SECRET || env.CITY_COLLECTOR_SECRET.length<32 || !env.ds)return Response.json({error:'수집 서버 설정이 필요합니다.'},{status:503,headers:noStore});
  const supplied=request.headers.get('Authorization')||'',expected='Bearer '+env.CITY_COLLECTOR_SECRET;
  let diff=supplied.length^expected.length;
  for(let i=0;i<expected.length;i++)diff|=expected.charCodeAt(i)^(supplied.charCodeAt(i)||0);
  if(diff)return Response.json({error:'인증이 필요합니다.'},{status:401,headers:noStore});
  try{return Response.json(await collect(env),{headers:noStore});}
  catch(e){return Response.json({error:e.message},{status:502,headers:noStore});}
}
