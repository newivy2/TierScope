const fs = require('fs');
const {instrument, prepareSource} = require('./instrument.cjs');
const vm = require('vm');
const assert = require('assert/strict');
const path = require('path');
const source = prepareSource(fs.readFileSync(path.join(__dirname, '../../tierscope.user.js'), 'utf8'));
const key = 'tierscope:v1:testroom';
function harness(storage = new Map(), sourceText = source) {
  const elements = new Map(), timers = new Map(), logs = [], downloads = [];
  let now = 1780000000000, timerId = 0, bodyText = '5,testroom|o|f|0,viewer|t|m|0', fetchCount = 0;
  const noop = () => {};
  function element(tag = 'div') {
    let html = '', text = '', id = '';
    const e = {
      tagName: tag.toUpperCase(), style: {setProperty(k,v){ this[k] = v; }}, dataset: {},
      addEventListener: noop, removeEventListener: noop, setAttribute(k,v){this[k]=v;},
      getBoundingClientRect(){return {x:0,y:0,left:0,top:0,width:280,height:600};},
      appendChild(child){if(child.id) elements.set(child.id,child);}, removeChild: noop,
      querySelector(){return null;}, querySelectorAll(){return [];}, remove(){elements.delete(id);},
      getContext(){return {clearRect:noop,scale:noop,beginPath:noop,moveTo:noop,lineTo:noop,stroke:noop,fillRect:noop,save:noop,restore:noop,setLineDash:noop,rect:noop,clip:noop};},
      click(){if (tag === 'a') downloads.push(this.href);},
      get id(){return id;},set id(v){id=v;},
      get textContent(){return text;},set textContent(v){text=String(v);},
      get innerHTML(){return html;},set innerHTML(v){
        html=String(v);
        for (const m of html.matchAll(/<([a-z]+)\b[^>]*\bid="([^"]+)"/g)) {
          const child=element(m[1]); child.id=m[2]; elements.set(child.id, child);
        }
      }
    }; return e;
  }
  const document = {readyState:'loading',addEventListener:noop,removeEventListener:noop,
    getElementById:id=>elements.get(id)||null,querySelector:()=>null,querySelectorAll:()=>[],
    createElement:element,body:element('body')};
  class FakeDate extends Date {constructor(...a){super(...(a.length?a:[now]));}static now(){return now;}}
  const blobs=new Map(); let blobId=0;
  class FakeURL extends URL {static createObjectURL(b){const id='blob:test-'+(++blobId);blobs.set(id,b);return id;}static revokeObjectURL(){}}
  const context = {
    crypto:require("crypto").webcrypto, document, location:new URL('https://chaturbate.com/testroom/'), Date:FakeDate,
    console:{log:(...a)=>logs.push(a.join(' ')),warn:(...a)=>logs.push(a.join(' ')),error:(...a)=>logs.push(a.join(' '))},
    URL:FakeURL,Blob,AbortController, confirm:()=>true,alert:(x)=>logs.push('ALERT: '+x),
    GM_listValues:()=>Array.from(storage.keys()),GM_getValue:(k,d)=>storage.has(k)?storage.get(k):d,GM_setValue:(k,v)=>storage.set(k,v),GM_deleteValue:k=>storage.delete(k),
    setTimeout(fn,ms){const id=++timerId;timers.set(id,{fn,ms,repeat:false});return id;},
    setInterval(fn,ms){const id=++timerId;timers.set(id,{fn,ms,repeat:true});return id;},
    clearInterval:id=>timers.delete(id),clearTimeout:id=>timers.delete(id),
    addEventListener:noop,removeEventListener:noop,
    fetch:async()=>{fetchCount++; if(bodyText instanceof Error)throw bodyText; if (typeof bodyText === 'function') return bodyText();return {ok:true,text:async()=>bodyText};},
    innerWidth:1200,innerHeight:1000
  };
  context.window=context;
  const instrumented = sourceText.replace('downloadTrackingReport: downloadTrackingReport,', `
    __test: {init,
      // Tests that drive acquisition manually need a panel without a concurrent
      // startup request. Startup tests use the unmodified init function above.
      initPanel: function(){
        var scan=performScanThenReturn;
        performScanThenReturn=function(){return new Promise(function(){});};
        try {init();} finally {performScanThenReturn=scan;}
      },
      loadSession, updateDisplay, updateAcquisitionStatus, updateTrendDisplay,
      saveSession, readSavedSession, normalizeStoredSession, restoreSessionState, getSessionHigh,
      saveToHistory, getStorageReportStatus, createPlaybackSnapshot, getPlaybackFrame,
      stepPlayback, formatSampleAge, readRequestPolicy, retryAfterTime, recordRequestFailure, clearRequestFailures,
      buildChartPlot, getHistoryBreaks, getChartTimes, nearestChartSample, drawSparkline, validateStoredSession,
      pendingGap:()=>pendingHistoryGap, tickPlayback, paintPlayback,

      seed: function(data){loadSession(getModelName());restoreSessionState(normalizeStoredSession(data));},
      sample: function(count){users=new Map(Array.from({length:count},(_,i)=>['u'+i,{tier:'red',gender:'male'}]));saveToHistory();},
      highState: function(){return {sessionStartedAt,sessionStartEstimated,sessionHighs,sessionStorageNotice};},
      performScanThenReturn, toggleAutoRefresh, pauseTrackingTimer, resetAllTracking,
      stopTracking, startNewSession, getEffectiveScanIntervalSeconds, updateCountdownDisplay,
      adjustTimer, nextBroadcasterAbsence, startCountdown,
      startTrackingTimer, checkUrlChange, enterPlayback, leavePlayback, toggleView,
      repaintLivePresentation,
      state: function(){return {isPaused,isStopped,stoppedAt,stopReason,broadcasterAbsence,absencePausedAt,absenceOverrideActive,isAutoRefreshOn,trackingStartTime,pausedElapsedTime,
        countdownInterval,trackingTimerInterval,nextScanAt,countdownSeconds,history,users:Array.from(users.values()),roomTotal,
        lastAcceptedAcquisition,restoredDisplayFrame:typeof restoredDisplayFrame === 'undefined' ? null : restoredDisplayFrame,
        isScanning,presentationMode,roomTotalHigh,tierHighTimes};}},
    downloadTrackingReport: downloadTrackingReport,`);
  vm.createContext(context); vm.runInContext(instrument(instrumented),context);
  const api=context.ViewerTracker, t=api.__test;
  function runWhere(pred){for(const[id,tm]of [...timers])if(pred(tm)){if(!tm.repeat)timers.delete(id);tm.fn();}}
  return {t,api,storage,context,blobs,downloads,e:id=>elements.get(id),logs,timers,
    advance:ms=>now+=ms,setResponse:v=>bodyText=v,fetchCount:()=>fetchCount,
    runTimers:runWhere,
    async report(){api.downloadTrackingReport();return blobs.get(downloads.at(-1)).text();},
    async drain(){for(let i=0;i<30;i++)await Promise.resolve();}
  };
}

module.exports = { harness, source };
