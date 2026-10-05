const {spawnSync}=require('node:child_process');const path=require('node:path');
const engine=process.argv[2]||'chromium';const env={...process.env,TIERSCOPE_BROWSER:engine};
if(engine!=='chromium'){delete env.TIERSCOPE_CHROMIUM_PATH;delete env.TIERSCOPE_CHROMIUM_ARGS;}
for(const file of ['browser.cjs','pulse-browser.cjs','charts-browser.cjs','theme-browser.cjs','startup-browser.cjs','replay-pacing-browser.cjs','all-time-highs-browser.cjs','stop-browser.cjs','session-files-browser.cjs','session-tools-browser.cjs','library-book-browser.cjs','model-history-browser.cjs','library-analysis-browser.cjs','model-library-browser.cjs','library-capacity-browser.cjs','audience-browser.cjs','follow-live-browser.cjs','library-chart-controls-browser.cjs']){
 console.log('\nBrowser: '+engine+' — '+file);
 const child=spawnSync(process.execPath,[path.join(__dirname,file)],{env,stdio:'inherit'});
 if(child.status!==0)process.exit(child.status||1);
}
