const checkControlLayout = require('./helpers/control-layout.cjs');
const {instrument, prepareSource} = require('./helpers/instrument.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const engine=process.env.TIERSCOPE_BROWSER||'chromium';
const source=prepareSource(fs.readFileSync(path.join(__dirname,'../tierscope.user.js'),'utf8'))
 .replaceAll('scheduleInit(2000);','')
 .replace('downloadTrackingReport: downloadTrackingReport,',`
 __theme:{
  setup:function(){
   loadSession(getModelName());var now=Date.now();
   var h={timestamps:Array.from({length:50},(_,i)=>now-(49-i)*60000)};
   STORAGE_HISTORY_SERIES.forEach((k,j)=>h[k]=h.timestamps.map((_,i)=>Math.round(30+j*17+Math.sin(i*.3+j)*12)));
   restoreSessionState(normalizeStoredSession({timestamp:now,isPaused:true,history:h}));
   restoredDisplayFrame.playbackNewHighTiers={purple:true,green:true};isAutoRefreshOn=false;isMinimized=true;
   createPanel();toggleView();updateDisplay();drawAllSparklines();updateTrendDisplay();
  },
  state:()=>({history:JSON.stringify(history),mode:presentationMode,position:playback&&playback.positionMs,playing:playback&&playback.playing}),
  pause:function(){if(playback&&playback.playing)togglePlayback();},
  theme:function(bright){document.getElementById('dark-mode-toggle').checked=!bright;document.getElementById('dark-mode-toggle').dispatchEvent(new Event('change'));}
 },downloadTrackingReport: downloadTrackingReport,`);
(async()=>{
 const browser=await require('playwright')[engine].launch({headless:true,executablePath:process.env.TIERSCOPE_CHROMIUM_PATH,args:JSON.parse(process.env.TIERSCOPE_CHROMIUM_ARGS||'[]')});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:1100}}),errors=[];let scans=0;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://tierscope.test/**',r=>{
   if(r.request().url().includes('/api/')){scans++;return r.fulfill({body:'0,viewer|t|m|0'});}
   return r.fulfill({contentType:'text/html',body:'<!doctype html><html><body style="margin:0;background:#cdd3dc;"></body></html>'});
  });
  await page.addInitScript(()=>{
   window.GM_listValues=()=>Object.keys(localStorage);window.GM_getValue=(k,d)=>localStorage.getItem(k)===null?d:JSON.parse(localStorage.getItem(k));
   window.GM_setValue=(k,v)=>localStorage.setItem(k,JSON.stringify(v));window.GM_deleteValue=k=>localStorage.removeItem(k);window.confirm=()=>true;
  });
  const setup=async(url)=>{await page.goto(url);await page.addScriptTag({content:instrument(source)});await page.evaluate(()=>ViewerTracker.__theme.setup());await page.waitForTimeout(350);};
  const styles=()=>page.evaluate(()=>{
   const s=id=>getComputedStyle(document.getElementById(id)),c=id=>document.getElementById(id).getContext('2d').strokeStyle;
   return {panel:s('tracker-container').backgroundColor,text:s('count-total').color,purple:s('count-purple').color,blue:s('count-dark-blue').color,
    purpleLine:c('spark-purple'),blueLine:c('spark-dark-blue'),totalLine:c('spark-total'),highlight:s('tier-row-purple').backgroundColor,
    collapsedHigh:s('restore-row-green').backgroundColor,row:s('tier-row-dark-blue').backgroundColor,highText:s('high-purple').color};
  });
  await setup('https://tierscope.test/testroom/');
  const checkbox=page.getByRole('switch',{name:'Dark mode'}),panel=page.locator('#tracker-container');
  assert(await checkbox.isChecked());assert.equal(await panel.getAttribute('data-theme'),'dark');
  const switchAppearance=()=>page.evaluate(()=>{
    const track=document.getElementById('dark-mode-track'),thumb=document.getElementById('dark-mode-thumb');
    const t=track.getBoundingClientRect(),b=thumb.getBoundingClientRect();
    return {trackColor:getComputedStyle(track).backgroundColor,left:b.left-t.left,right:t.right-b.right,
      moonOpacity:getComputedStyle(document.getElementById('dark-mode-moon')).opacity,
      sunOpacity:getComputedStyle(document.getElementById('dark-mode-sun')).opacity};
  });
  const darkSwitch=await switchAppearance();
  assert(darkSwitch.left<darkSwitch.right,'dark indicator sits toward the moon');
  assert.equal(darkSwitch.moonOpacity,'1');
  const before=await page.evaluate(()=>ViewerTracker.__theme.state()),bounds=await panel.boundingBox();
  await checkControlLayout(page);
  assert.equal(await page.locator('#tierscope-version').textContent(),require('../package.json').version);
  const versionLayout=await page.evaluate(()=>{
    const rect=id=>document.getElementById(id).getBoundingClientRect(),version=rect('tierscope-version'),logo=rect('tierscope-logo'),footer=rect('tracker-footer'),slider=rect('background-slider-controls');
    const brand=document.querySelector('#tierscope-logo>div').getBoundingClientRect();
    return {inside:version.left>=logo.left&&version.right<=logo.right&&version.top>=brand.bottom&&version.bottom<=footer.bottom,
      separate:slider.right<=logo.left,footerHeight:document.getElementById('tracker-footer').clientHeight};
  });
  assert(versionLayout.inside&&versionLayout.separate,'version fits below the logo without touching the opacity controls');
  assert.equal(versionLayout.footerHeight,14,'version fits the existing footer height');
  const dark=await styles();assert.equal(dark.panel,'rgba(20, 20, 30, 0.95)');assert.equal(dark.totalLine,'#ffffff');
  const controls=await page.locator('#control-field').boundingBox(),toggle=await page.locator('#dark-mode-control').boundingBox(),actions=await page.locator('#control-action-buttons').boundingBox();
  assert(toggle.x>=actions.x+actions.width,'toggle does not overlap centered action buttons');
  assert(Math.abs(toggle.x+toggle.width-(controls.x+controls.width-5))<2,'toggle sits at right edge');
  assert(toggle.y+toggle.height<=controls.y+controls.height&&controls.y+controls.height-toggle.y-toggle.height<10,'toggle sits at bottom');
  if(process.env.TIERSCOPE_THEME_SHOTS)await panel.screenshot({path:path.join(process.env.TIERSCOPE_THEME_SHOTS,'dark-expanded.png')});
  await checkbox.click();assert(!(await checkbox.isChecked()));assert.equal(await panel.getAttribute('data-theme'),'bright');
  assert.deepEqual(await panel.boundingBox(),bounds,'theme switch preserves panel size and position');
  assert.deepEqual(await page.evaluate(()=>ViewerTracker.__theme.state()),before,'theme switch preserves tracking state');assert.equal(scans,0);
  await checkControlLayout(page);
  await page.waitForFunction(()=>getComputedStyle(document.getElementById('dark-mode-thumb')).transform==='matrix(1, 0, 0, 1, 10, 0)');
  const brightSwitch=await switchAppearance();
  assert(brightSwitch.right<brightSwitch.left,'bright indicator sits toward the sun');
  assert.notEqual(brightSwitch.trackColor,darkSwitch.trackColor,'track color identifies the active theme');
  assert.equal(brightSwitch.sunOpacity,'1');
  const bright=await styles();assert.equal(bright.panel,'rgba(248, 249, 252, 0.95)');assert.equal(bright.text,'rgb(32, 35, 48)');assert.equal(bright.totalLine,'#202330');
  for(const key of ['purple','blue','purpleLine','blueLine','highlight','collapsedHigh'])assert.equal(bright[key],dark[key],key+' stays unchanged');
  assert.equal(bright.purpleLine,'#804baa');assert.equal(bright.blueLine,'#393993');assert.equal(bright.highText,'rgb(35, 117, 31)');
  if(process.env.TIERSCOPE_THEME_SHOTS)await panel.screenshot({path:path.join(process.env.TIERSCOPE_THEME_SHOTS,'bright-expanded.png')});
  await page.locator('#opacity-slider').evaluate(e=>{e.value='30';e.dispatchEvent(new Event('input'));});
  const translucent=await styles();assert.equal(translucent.panel,'rgba(248, 249, 252, 0.3)');assert.notEqual(translucent.row,bright.row);assert.equal(translucent.highlight,bright.highlight);assert.equal(translucent.text,bright.text);
  await page.locator('#btn-main-reset').focus();await page.keyboard.press('Tab');
  assert(await checkbox.evaluate(e=>e===document.activeElement),'Tab reaches the theme switch after Reset');
  await page.keyboard.press('Space');
  assert.equal(await page.locator('#dark-mode-track').evaluate(e=>getComputedStyle(e).outlineStyle),'solid','keyboard focus stays visible');assert(await checkbox.isChecked());assert.equal((await styles()).panel,'rgba(20, 20, 30, 0.3)');
  await page.keyboard.press('Space');assert(!(await checkbox.isChecked()));
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('#dark-mode-thumb').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
  await checkbox.check();assert((await switchAppearance()).left<(await switchAppearance()).right);
  await checkbox.uncheck();assert((await switchAppearance()).right<(await switchAppearance()).left);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('#opacity-slider').evaluate(e=>{e.value='95';e.dispatchEvent(new Event('input'));});
  await page.locator('#spark-purple').focus();await page.keyboard.press('End');
  assert.equal(await page.locator('#tierscope-chart-tooltip').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
  await page.click('#btn-replay');await page.evaluate(()=>ViewerTracker.__theme.pause());
  const replay=await page.evaluate(()=>ViewerTracker.__theme.state());
  await page.evaluate(()=>ViewerTracker.__theme.theme(false));await page.evaluate(()=>ViewerTracker.__theme.theme(true));
  assert.deepEqual(await page.evaluate(()=>ViewerTracker.__theme.state()),replay,'theme repaint preserves exact Replay frame');
  assert.equal((await styles()).totalLine,'#202330');
  if(process.env.TIERSCOPE_THEME_SHOTS)await panel.screenshot({path:path.join(process.env.TIERSCOPE_THEME_SHOTS,'bright-replay.png')});
  await page.click('#playback-return');await page.click('#btn-toggle');await page.waitForTimeout(350);
  await page.click('#mini-metric');await page.click('#mini-metric');
  assert.equal(await page.locator('#mini-chart').evaluate(c=>c.getContext('2d').strokeStyle),'#202330');
  await page.click('#mini-settings-toggle');
  assert.equal(await page.locator('#mini-settings').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(240, 242, 247)');
  if(process.env.TIERSCOPE_THEME_SHOTS)await panel.screenshot({path:path.join(process.env.TIERSCOPE_THEME_SHOTS,'bright-compact.png')});
  await setup('https://tierscope.test/anotherroom/');assert(!(await checkbox.isChecked()),'theme survives reload and another room');
  await page.click('#btn-main-reset');assert(!(await checkbox.isChecked()),'Reset retains the theme');
  await page.evaluate(()=>{window.GM_setValue=()=>{throw new Error('fixture storage failure');};});
  await checkbox.check();assert.equal(await panel.getAttribute('data-theme'),'dark','storage failures do not block local switching');
  await page.evaluate(()=>localStorage.setItem('tierscope:ui:theme:v1',JSON.stringify({bad:true})));
  await setup('https://tierscope.test/thirdroom/');assert(await checkbox.isChecked(),'invalid preference defaults to dark');
  assert.deepEqual(errors,[]);
  console.log('PASS moon/sun switch position/color, visible keyboard focus, reduced motion, placement, default/persistence, keyboard, opacity, original tier colors, highlights, tooltips, compact/Replay rendering, state preservation and storage failure');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
