#!/usr/bin/env node
'use strict';
// Safe, reviewed, BOROUGH-ONLY rollback preparation. Never deploys or resets Git history.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const {verified}=require('../lib/area-seo-publication');
function prepare(area,sha,root=path.resolve(__dirname,'..')){
 assert(/^(lambeth|lewisham|southwark|wandsworth|greenwich)$/.test(area),'Unsupported borough');
 assert(/^[a-f0-9]{40}$/.test(sha),'Require full reviewed Git commit SHA');
 const old=(ext)=>execFileSync('git',['show',sha+':areas/'+area+ext],{cwd:root,encoding:'utf8',maxBuffer:2_000_000});
 const html=old('.html'),manifestText=old('.publication.json'),manifest=JSON.parse(manifestText);
 assert(verified(manifest,html,area),'Historical page and manifest must cryptographically match');
 assert(manifest.draftRevision&&manifest.approvedAt&&manifest.approvedBy,'Historical approval provenance required');
 // No reset/revert of repository, other boroughs, payment or booking files.
 fs.writeFileSync(path.join(root,'areas',area+'.html'),html);
 fs.writeFileSync(path.join(root,'areas',area+'.publication.json'),manifestText);
 return {area,sourceGitCommit:sha,restoredDraftRevision:manifest.draftRevision,files:['areas/'+area+'.html','areas/'+area+'.publication.json']};
}
if(require.main===module){
 if(process.argv.length!==4){console.error('Usage: node scripts/prepare-area-seo-rollback.cjs BOROUGH VERIFIED_FULL_GIT_SHA');process.exit(2);}
 const result=prepare(process.argv[2],process.argv[3]);
 console.log(JSON.stringify(result,null,2));
 console.log('PREPARATION ONLY: Inspect both file diffs, verify source deployment and run tests. Open PR for human review. No production rollback has occurred.');
}
module.exports={prepare};
