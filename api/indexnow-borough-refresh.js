const {json}=require('../lib/server');
const {submitIndexNow}=require('../lib/indexnow');

const URLS=[
  'https://namdar.co.uk/areas/lewisham',
  'https://namdar.co.uk/areas/southwark',
  'https://namdar.co.uk/areas/lambeth',
  'https://namdar.co.uk/areas/wandsworth',
  'https://namdar.co.uk/areas/greenwich'
];

module.exports=async function handler(req,res){
  if(process.env.VERCEL_ENV!=='preview')return json(res,404,{ok:false,error:'Not found'});
  if(req.method!=='GET')return json(res,405,{ok:false,error:'Method not allowed'});
  const result=await submitIndexNow(URLS);
  return json(res,result.ok?200:502,{ok:result.ok,indexNow:result});
};