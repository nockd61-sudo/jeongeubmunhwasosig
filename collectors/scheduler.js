// Cron invokes the Pages collector; it never needs an AI binding.
export default {
  async scheduled(controller,env,ctx) {
    ctx.waitUntil((async()=>{
      if(!env.CITY_COLLECTOR_SECRET || env.CITY_COLLECTOR_SECRET.length<32)throw new Error('CITY_COLLECTOR_SECRET 설정 필요');
      const r=await fetch('https://www.jeongeup-art.com/api/city-collect',{
        method:'POST',redirect:'error',headers:{Authorization:'Bearer '+env.CITY_COLLECTOR_SECRET}
      });
      if(!r.ok)throw new Error('행사 수집 실패: '+r.status);
      const report=await r.json();console.log(JSON.stringify(report));
      if(report.errors?.length)throw new Error('일부 수집 실패: '+report.errors.join('; '));
    })());
  }
};
