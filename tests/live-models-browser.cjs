const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {instrument, prepareSource} = require('./helpers/instrument.cjs');
const engine = process.env.TIERSCOPE_BROWSER || 'chromium';
const source = instrument(prepareSource(fs.readFileSync(path.join(__dirname, '../tierscope.user.js'), 'utf8'))
    .replaceAll('scheduleInit(2000);', '')
    .replace('downloadTrackingReport: downloadTrackingReport,', `__liveTest:{
        setup(values=[10,20,30],offset=0){
            const model=getModelName();
            if(model!=='unknown'){
                loadSession(model);
                if(values.length){
                const now=Date.now(),timestamps=values.map((_,i)=>now-(values.length-i)*60000+offset);
                const h={timestamps,breaks:timestamps.map(()=>false)};
                STORAGE_HISTORY_SERIES.forEach(k=>h[k]=values.map(()=>0));h.total=values.slice();h.red=values.slice();h.withTokens=values.slice();h.anonymous=values.map(()=>5);
                restoreSessionState(normalizeStoredSession({timestamp:now,history:h,sessionStartedAt:timestamps[0],sessionStartEstimated:false,isPaused:false,
                    roomTotalHigh:Math.max(...values)+5,roomTotalHighTime:timestamps[values.indexOf(Math.max(...values))],pausedElapsedTime:timestamps.at(-1)-timestamps[0]}));
                }
            }
            isMinimized=true;createPanel();toggleView();repaintLivePresentation();stopCountdown();
            if(model!=='unknown')saveSession(model);
            publishLiveModelSource();
        },
        scan:performScanThenReturn,publish:publishLiveModelSource,sources:readLiveModelSources,
        pause:pauseAutoRefresh,
        stop(){stopTracking('manual');stopCountdown();},
        resume(){toggleAutoRefresh();stopCountdown();},
        reset(){initializeLifecycle({scan:()=>Promise.resolve()});resetAllTracking();stopCountdown();},
        leave(){window.history.pushState({},'', '/female-cams/');checkUrlChange();publishLiveModelSource();},
        state:()=>({history:JSON.stringify(history),paused:isPaused,stopped:isStopped,mode:presentationMode}),
        library:()=>readSessionLibrary().entries.length
    },downloadTrackingReport: downloadTrackingReport,`));

(async () => {
    const browser = await require('playwright')[engine].launch({headless:true, executablePath:process.env.TIERSCOPE_CHROMIUM_PATH,
        args:JSON.parse(process.env.TIERSCOPE_CHROMIUM_ARGS || '[]')});
    try {
        const context = await browser.newContext({viewport:{width:1250,height:1050},timezoneId:'America/Sao_Paulo'});
        context.setDefaultTimeout(10000);
        const errors = [], calls = [], audiences = new Map([['alpha_model', 100], ['beta_model', 60]]);
        await context.addInitScript(() => {
            const prefix = 'test:gm:', handlers = new Map(); let sequence = 0;
            window.__gmListeners = handlers; window.__axisLabels = []; window.__testIntervals = new Map();
            Date.now = () => Number(localStorage.getItem('test:now') || Date.UTC(2026,9,24,3,1));
            const decode = value => value === null ? undefined : JSON.parse(value);
            const notify = (key, old, value, remote) => {
                for (const handler of handlers.values()) if (handler.key === key) handler.callback(key,old,value,remote);
            };
            window.GM_getValue = (key, fallback) => localStorage.getItem(prefix+key) === null ? fallback : decode(localStorage.getItem(prefix+key));
            window.GM_setValue = (key, value) => {
                const old=decode(localStorage.getItem(prefix+key));localStorage.setItem(prefix+key,JSON.stringify(value));notify(key,old,value,false);
            };
            window.GM_deleteValue = key => {const old=decode(localStorage.getItem(prefix+key));localStorage.removeItem(prefix+key);notify(key,old,undefined,false);};
            window.GM_listValues = () => Object.keys(localStorage).filter(key=>key.startsWith(prefix)).map(key=>key.slice(prefix.length));
            window.GM_addValueChangeListener = (key, callback) => {const id=++sequence;handlers.set(id,{key,callback});return id;};
            window.GM_removeValueChangeListener = id => handlers.delete(id);
            window.addEventListener('storage', event => {if(event.key?.startsWith(prefix))notify(event.key.slice(prefix.length),decode(event.oldValue),decode(event.newValue),true);});
            const fill = CanvasRenderingContext2D.prototype.fillText;
            CanvasRenderingContext2D.prototype.fillText = function(text,...args){window.__axisLabels.push(String(text));return fill.call(this,text,...args);};
            const interval=window.setInterval;
            window.setInterval=(callback,ms,...args)=>{const id=interval(callback,ms,...args);window.__testIntervals.set(id,ms);return id;};
        });
        await context.route('https://tierscope.test/**', route => {
            const url = new URL(route.request().url());
            if (url.pathname === '/api/getchatuserlist/') {
                const room=url.searchParams.get('roomname');calls.push({room,at:Date.now()});
                const total=audiences.get(room) || 40;
                return route.fulfill({body:'5,'+room+'|o|f|0,'+Array.from({length:total},(_,i)=>'viewer'+i+'|m|m|0').join(',')});
            }
            return route.fulfill({contentType:'text/html',body:'<!doctype html><body style="background:#26303a"></body>'});
        });
        const open = async (room, values=[10,20,30], offset=0) => {
            const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
            await page.goto('https://tierscope.test/'+room+(room?'/':''));await page.addScriptTag({content:source});
            await page.evaluate(({values,offset})=>ViewerTracker.__liveTest.setup(values,offset),{values,offset});return page;
        };
        const alpha=await open('alpha_model'), beta=await open('beta_model',[20,30,40],60000), viewer=await open('');
        const sources = () => viewer.evaluate(()=>ViewerTracker.__liveTest.sources().sources);
        const sourceFor = async (room, predicate=()=>true) => (await sources()).find(item=>item.room===room&&predicate(item));
        const group = room => viewer.locator('.tools-live-source[data-live-room="'+room+'"]');
        const check = room => group(room).locator('input[data-live-source]');
        const rowStatus = room => group(room).locator('[data-live-status]').textContent();
        const inspection = () => viewer.locator('#tools-chart-inspection tbody tr td').allTextContents();
        const end = async () => {await viewer.locator('#tools-analysis-chart').focus();await viewer.keyboard.press('End');};
        const refresh = async () => {await viewer.click('#tools-live-refresh');};
        // Playwright's immediate tab close can skip unload in Firefox. Drive the
        // production handler explicitly before destroying the fixture page.
        const closePublisher = async page => {await page.evaluate(()=>{
            window.dispatchEvent(new Event('beforeunload'));window.dispatchEvent(new Event('pagehide'));
        });await page.close();};
        const advance = async ms => viewer.evaluate(ms=>localStorage.setItem('test:now',String(Date.now()+ms)),ms);
        const waitText = async (locator, pattern) => {for(let i=0;i<60;i++){if(pattern.test(await locator.textContent()))return;await viewer.waitForTimeout(50);}assert.match(await locator.textContent(),pattern);};

        const baselineListeners = await viewer.evaluate(()=>window.__gmListeners.size);
        await viewer.click('#btn-control-library');await viewer.click('[data-tools-tab=compare]');await viewer.click('#tools-compare-live');
        await viewer.waitForSelector('#tools-live-models');
        assert.equal(calls.length,0,'opening a live comparison performs no API requests');
        assert.equal(await viewer.evaluate(()=>ViewerTracker.__liveTest.library()),0,'live comparison does not keep sessions automatically');
        assert.equal(await group('alpha_model').count(),1);assert.equal(await group('beta_model').count(),1);
        assert(await check('alpha_model').isChecked());assert(await check('beta_model').isChecked());
        try {await viewer.waitForSelector('#tools-analysis-chart');}
        catch(error) {throw Error(error.message+'\nLive view:\n'+await viewer.locator('#tools-live-models').innerText()+'\nSources: '+JSON.stringify(await sources()));}
        await viewer.selectOption('#tools-live-window','Infinity');
        assert(!(await viewer.locator('#tools-live-chooser').evaluate(element=>element.open)),'model choices start folded so the chart has priority');
        assert.match(await rowStatus('alpha_model'),/tracking/i);
        assert.equal(await viewer.locator('#tools-chart-inspection tbody tr').count(),2);
        assert.match(await viewer.locator('#tools-analysis-chart').getAttribute('aria-label'),/clock|timestamp|local time/i);
        await end();let values=await inspection();
        assert.equal(values[0],'—','the earlier-ending model has no invented sample at the other model’s endpoint');
        assert.equal(values[2],'45');
        assert(await viewer.evaluate(()=>{
            const label=time=>new Date(time).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
            return window.__axisLabels.includes(label(Date.now()-180000))&&window.__axisLabels.includes(label(Date.now()));
        }),'one real timeline crosses local midnight');
        assert.equal(await viewer.locator('.tools-series-swatch').evaluateAll(elements=>elements.filter(element=>element.style.borderTopStyle==='solid').length),2,'live models are separate solid traces');
        const alphaSource=await sourceFor('alpha_model'), alphaId=alphaSource.id;
        await viewer.evaluate(()=>window.liveModelCanvas=document.getElementById('tools-analysis-chart'));
        await advance(60000);await alpha.evaluate(()=>ViewerTracker.__liveTest.scan());
        await viewer.waitForFunction(()=>document.querySelector('.tools-live-source[data-live-room="alpha_model"]')?.dataset.liveSampleCount==='4');
        await end();values=await inspection();assert.equal(values[0],'106');
        assert.equal(calls.length,1,'only the explicit room scan adds an API request');
        assert(await viewer.evaluate(()=>window.liveModelCanvas===document.getElementById('tools-analysis-chart')),'accepted samples update the existing chart');

        await viewer.click('#tools-chart-zoom-in');await end();
        const zoom=await viewer.locator('#tools-chart-range').textContent(), cursor=await viewer.locator('#tools-chart-inspection caption').textContent();
        const alphaSamples=()=>viewer.locator('#tools-live-samples [data-live-report="alpha_model"] td').nth(2).textContent();
        const displayedBeforeFreeze=await alphaSamples();
        await viewer.click('#tools-live-freeze');const frozen=await inspection();
        await advance(60000);await alpha.evaluate(()=>ViewerTracker.__liveTest.scan());await refresh();
        assert.deepEqual(await inspection(),frozen,'Freeze keeps displayed samples and cursor fixed');
        assert.equal(await alphaSamples(),displayedBeforeFreeze,'Freeze keeps the reported snapshot fixed');
        assert.equal(await viewer.locator('#tools-chart-range').textContent(),zoom);
        assert.equal(await viewer.locator('#tools-chart-inspection caption').textContent(),cursor);
        await viewer.click('#tools-live-freeze');await end();assert.equal((await inspection())[0],'106');
        assert.equal(Number(await alphaSamples()),Number(displayedBeforeFreeze)+1,'Resume catches up to samples accepted while frozen');
        await viewer.click('#tools-live-metric-total');await end();assert.equal((await inspection())[0],'101');
        await viewer.click('#tools-live-metric-room');
        await alpha.evaluate(()=>ViewerTracker.__liveTest.pause());await waitText(group('alpha_model').locator('[data-live-status]'),/paused/i);
        assert.equal((await sourceFor('alpha_model')).id,alphaId,'Pause retains the same session source');
        await alpha.evaluate(()=>ViewerTracker.__liveTest.resume());await waitText(group('alpha_model').locator('[data-live-status]'),/tracking/i);
        await alpha.evaluate(()=>ViewerTracker.__liveTest.publish());await beta.evaluate(()=>ViewerTracker.__liveTest.publish());

        const originalSampleCount=(await sourceFor('alpha_model')).sampleCount;
        const duplicate=await open('alpha_model',[70,80,90,100,110,120,130]);await refresh();
        const dominantId=(await sources()).find(source=>source.room==='alpha_model'&&source.id!==alphaId).id;
        assert.equal(await group('alpha_model').count(),1,'two tabs of the same model share one model row');
        const selector=group('alpha_model').locator('select[data-live-tab="alpha_model"]');
        assert.equal(await selector.locator('option').count(),2);
        assert.equal(await check('alpha_model').getAttribute('data-live-source'),dominantId,'a longer recording automatically supplies the model’s one line');
        assert.equal(await alphaSamples(),'7','duplicate tab samples are selected, never added together');
        assert.equal(await viewer.locator('#tools-chart-inspection tbody tr').count(),2,'the model is never double-counted');
        const tied=await open('alpha_model',[1,2,3,4,5,6,7]);await refresh();
        assert.equal(await check('alpha_model').getAttribute('data-live-source'),dominantId,'an equal-length duplicate keeps the current source');
        await closePublisher(tied);await refresh();
        await closePublisher(duplicate);await refresh();
        await viewer.waitForFunction(id=>document.querySelector('.tools-live-source[data-live-room="alpha_model"] input[data-live-source]')?.dataset.liveSource===id,alphaId);
        assert.equal(await check('alpha_model').getAttribute('data-live-source'),alphaId,'closing the longer tab falls back to the remaining recording');
        assert.equal(await alphaSamples(),String(originalSampleCount));

        // Freeze just the publisher heartbeat to reproduce a suspended tab.
        await beta.evaluate(()=>{for(const [id,ms] of window.__testIntervals)if(ms===30000)clearInterval(id);});
        await advance(181000);await alpha.evaluate(()=>ViewerTracker.__liveTest.publish());await refresh();
        await waitText(group('beta_model').locator('[data-live-status]'),/stale|unavailable/i);
        assert.match(await rowStatus('alpha_model'),/tracking/i,'an open tab heartbeat is separate from an older sample');
        await beta.evaluate(()=>ViewerTracker.__liveTest.publish());await refresh();await waitText(group('beta_model').locator('[data-live-status]'),/tracking/i);

        const waiting=await open('waiting_model',[]);await refresh();
        assert.match(await rowStatus('waiting_model'),/waiting.*first sample/i);
        assert(await check('waiting_model').isDisabled(),'a zero-sample source cannot supply an invented chart');
        await waiting.evaluate(()=>ViewerTracker.__liveTest.scan());await refresh();
        assert(!(await check('waiting_model').isDisabled()),'the first accepted sample makes a source available');
        assert(!(await check('waiting_model').isChecked()),'a newly available source does not change an existing selection');
        await viewer.locator('#tools-live-chooser > summary').click();
        await check('waiting_model').check();assert.equal(await viewer.locator('#tools-chart-inspection tbody tr').count(),3);
        await check('waiting_model').uncheck();assert.equal(await viewer.locator('#tools-chart-inspection tbody tr').count(),2);
        await closePublisher(waiting);await refresh();
        await beta.evaluate(()=>ViewerTracker.__liveTest.stop());await waitText(group('beta_model').locator('[data-live-status]'),/stopped/i);

        const historyBefore=await beta.evaluate(()=>ViewerTracker.__liveTest.state());
        await viewer.locator('#tools-live-chooser > summary').click();
        for(const bright of [false,true]){
            await viewer.locator('#dark-mode-toggle').setChecked(!bright);await refresh();
            await viewer.screenshot({path:'/tmp/tierscope-live-models-'+engine+'-'+(bright?'bright':'dark')+'.png'});
            await viewer.setViewportSize({width:380,height:900});
            assert(await viewer.locator('#tools-content').evaluate(element=>element.scrollWidth<=element.clientWidth+1),'live source controls fit a narrow Library');
            await viewer.setViewportSize({width:1250,height:1050});
        }
        assert.deepEqual(await beta.evaluate(()=>ViewerTracker.__liveTest.state()),historyBefore,'viewing and metric/theme changes cannot mutate a publisher session');
        await viewer.locator('#tools-live-chooser > summary').click();
        alpha.once('dialog',dialog=>dialog.accept());await alpha.evaluate(()=>ViewerTracker.__liveTest.reset());await refresh();
        const resetSource=await sourceFor('alpha_model',source=>source.publisherId===alphaSource.publisherId&&source.id!==alphaId);
        assert(resetSource,'Reset publishes a separate source identity');
        assert.equal(await check('alpha_model').getAttribute('data-live-source'),alphaId,'Reset cannot silently substitute a different session');
        await waitText(group('alpha_model').locator('[data-live-status]'),/unavailable|changed|reset/i);
        await advance(60000);await alpha.evaluate(()=>ViewerTracker.__liveTest.scan());await refresh();
        const newest=await sourceFor('alpha_model',source=>source.publisherId===alphaSource.publisherId&&source.sampleCount>0&&source.status!=='reset');
        await group('alpha_model').locator('select[data-live-tab="alpha_model"]').selectOption(newest.id);
        assert.equal(await check('alpha_model').getAttribute('data-live-source'),newest.id,'the replacement session requires an explicit choice');
        await alpha.evaluate(()=>ViewerTracker.__liveTest.leave());await refresh();
        await waitText(group('alpha_model').locator('[data-live-status]'),/unavailable|changed|left/i);
        const callCount=calls.length;
        await viewer.click('#tools-close');
        assert.equal(await viewer.evaluate(()=>window.__gmListeners.size),baselineListeners,'closing Library releases live-source listeners');
        await viewer.click('#btn-control-library');await viewer.click('[data-tools-tab=compare]');await viewer.click('#tools-compare-saved');
        assert.equal(await viewer.locator('#tools-live-models').count(),0);assert.equal(calls.length,callCount);
        assert.equal(await viewer.evaluate(()=>ViewerTracker.__liveTest.library()),0);
        assert.deepEqual(errors,[]);
        console.log(engine+': cross-tab live models use existing samples, absolute clock alignment, no synthetic tails, Freeze/catch-up, most-samples duplicate selection, waiting/paused/stopped/stale status, reset/navigation, themes, narrow layout and cleanup passed');
        await context.close();
    } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
