const fs=require('fs');
const assert=require('assert/strict');
const {performance}=require('perf_hooks');
const test=require('node:test');
const {GifReader}=require('omggif');
const {harness,source}=require('./helpers/harness.cjs');
const injected=source.replace('downloadTrackingReport: downloadTrackingReport,',`
  __gif: {formatSampleAge,createPlaybackSnapshot,createGifSurface,drawGifSummary,drawGifSparkline,
    getGifSampleIndex,GIF_WIDTH,GIF_HEIGHT,GIF_MAX_FRAMES,
    tiers: Object.keys(TIERS),
    palette: [0x14141e,0xffffff].concat(Object.keys(TIERS).map(t=>parseInt(TIERS[t].color.slice(1),16)),[0xff69b4,0x888888,0xe89b45,0x14141e,0x14141e,0x14141e]),
    seed: function(data){ history=data; activeSessionStorageKey=getStorageKey(getModelName()); },
    savedTime: function(){return restoredDisplayFrame && restoredDisplayFrame.timestamp;},
    setSavedAge: function(timestamp){restoredDisplayFrame={timestamp:timestamp};lastAcceptedAcquisition=null;},
    setLiveAge: function(source,timestamp){restoredDisplayFrame=null;lastAcceptedAcquisition={source:source,timestamp:timestamp};},
    playbackState: function(){return playback && {positionMs:playback.positionMs,playing:playback.playing,index:playback.snapshot.timeline.length};}
  },
  downloadTrackingReport: downloadTrackingReport,`);
function makeHistory(count,kind='normal'){
  const keys=['red','green','purple','pink','dark-blue','light-blue','gray','female-trans','withTokens','total','anonymous'];
  const data={timestamps:Array.from({length:count},(_,i)=>1780000000000+i*60000)};
  for(const [t,key]of keys.entries())data[key]=Array.from({length:count},(_,i)=>{
    if(kind==='flat')return 23;
    if(kind==='zero')return 0;
    if(kind==='large')return 9999999999+(i%3===0?999999999999:0);
    return Math.max(0,Math.round((t+1)*12 + Math.sin(i*.27+t)*5 + Math.cos(i*.13-t)*7 + (i>20&&i<40?9:0)));
  });
  if(kind==='normal'){
    data.withTokens=data.timestamps.map((_,i)=>keys.slice(0,6).reduce((sum,k)=>sum+data[k][i],0));
    data.total=data.timestamps.map((_,i)=>data.withTokens[i]+data.gray[i]+1);
    data.anonymous=data.timestamps.map((_,i)=>Math.round(420+Math.sin(i*.13)*40+Math.cos(i*.47)*12));
  }
  if(kind==='gaps'){
    data.timestamps=data.timestamps.map((t,i)=>t+(i>=20?20*60000:0));
    data.breaks=data.timestamps.map((_,i)=>i===20||i===21||i===40);
  }
  return data;
}
function fresh(){const h=harness(new Map(),injected);h.t.initPanel();for(const id of ['btn-export-gif','gif-export-controls','gif-export-status','btn-cancel-gif']){const e=h.context.document.createElement('div');e.id=id;h.context.document.body.appendChild(e);}return h;}
async function exportGif(h){
  const count=h.downloads.length;let done=false;
  const before=h.api.__gif.playbackState();
  const promise=h.api.generateGifFromHistory().finally(()=>done=true);
  for(let i=0;!done&&i<300;i++){h.runTimers(tm=>!tm.repeat&&tm.ms===0);await h.drain();}
  await promise;assert.equal(h.downloads.length,count+1,h.logs.join('\n'));
  assert.deepEqual(h.api.__gif.playbackState(),before);
  return Buffer.from(await h.blobs.get(h.downloads.at(-1)).arrayBuffer());
}
test('GIF export decodes with exact pixels, bounded drawing, fixed duration, and cancellation', async()=>{
  const h=fresh(),g=h.api.__gif, now=h.context.Date.now();
  for(const [seconds,label]of [[0,'0s'],[59,'59s'],[60,'1m'],[3599,'59m'],[3600,'1h'],[3900,'1h 5m'],[7200,'2h'],[86399,'23h 59m'],[86400,'1d'],[176400,'2d 1h'],[-5,'0s']])
    assert.equal(g.formatSampleAge(now-seconds*1000),label);
  g.setSavedAge(now-7200000);h.t.updateAcquisitionStatus();
  assert.equal(h.e('acquisition-status').textContent,'Saved • 2h');
  assert.match(h.e('acquisition-status').title,/sample time, not the session save time/);
  for(const type of ['API','DOM']){g.setLiveAge(type,now-7500000);h.t.updateAcquisitionStatus();assert.equal(h.e('acquisition-status').textContent,type+' • 2h 5m');}
  console.log('PASS age boundaries, future timestamps, saved/API/DOM labels and timestamp explanation');

  // Verify actual drawing calls stay in the canvas, label/count columns and each row.
  for(const kind of ['normal','flat','zero','large','gaps']){
    const snapshot=g.createPlaybackSnapshot(makeHistory(60,kind));
    for(const index of [0,1,59]){
      const surface=g.createGifSurface(g.palette), rect=surface.rect, text=surface.text;
      surface.rect=(x,y,w,ht,c)=>{assert(x>=0&&y>=0&&x+w<=480&&y+ht<=640,`bounds ${[x,y,w,ht]}`);rect(x,y,w,ht,c);};
      surface.text=(s,x,y,c,scale,align)=>{
        const width=(String(s).length*6-1)*scale,left=align?x-width:x;
        assert(left>=0&&left+width<=480&&y+7*scale<=640);
        if(y>=90)assert(align?left>=394:left+width<=176,`${s}: ${left} .. ${left+width}`);
        text(s,x,y,c,scale,align);
      };
      g.drawGifSummary(surface,snapshot,index,g.tiers);
      for(let row=0;row<12;row++){
        const top=90+row*44+(row>=8?12:0);
        const nonBackground=[];
        for(let y=top;y<top+40;y++)for(let x=176;x<384;x++)if(surface.pixels[y*480+x]!==0)nonBackground.push([x,y]);
        assert(nonBackground.length>0,`empty chart row ${row}`);
        assert(nonBackground.every(([x,y])=>x>=176&&x<384&&y>=top+2&&y<top+38));
        if(index===59&&kind==='normal')assert.equal(Math.max(...nonBackground.map(p=>p[1]))-Math.min(...nonBackground.map(p=>p[1]))+1,36);
      }
    }
  }
  console.log('PASS all 12 chart rows, full 36px vertical range, long labels, zero/flat data and large counts fit');

  const metrics=[];
  for(const [name,count,kind]of [['sample',60,'normal'],['single',1,'normal'],['dense',10000,'normal'],['flat',60,'flat'],['zero',1,'zero'],['gaps',60,'gaps']]){
    const env=fresh();env.api.__gif.seed(makeHistory(count,kind));assert.equal(env.t.enterPlayback(),true);
    const start=performance.now(),buffer=await exportGif(env),elapsed=performance.now()-start;
    const reader=new GifReader(buffer);
    assert.equal(reader.width,480);assert.equal(reader.height,640);assert.equal(reader.numFrames(),Math.min(count,60));
    let delay=0;const rgba=new Uint8Array(480*640*4);
    if(kind==='gaps'){
      for(const [frame,expected]of [[0,false],[19,false],[20,true]]){
        reader.decodeAndBlitFrameRGBA(frame,rgba);
        let orange=0;for(let p=0;p<rgba.length;p+=4)if(rgba[p]===232&&rgba[p+1]===155&&rgba[p+2]===69)orange++;
        assert.equal(orange>0,expected,'decoded GIF only introduces orange when the far endpoint becomes available');
      }
    }
    for(let f=0;f<reader.numFrames();f++){delay+=reader.frameInfo(f).delay;reader.decodeAndBlitFrameRGBA(f,rgba);}
    assert.equal(delay,1000);assert.equal(reader.loopCount(),0);
    // Compare a decoded final frame with the actual indexed-color renderer.
    const snap=env.api.__gif.createPlaybackSnapshot(makeHistory(count,kind));
    const surface=env.api.__gif.createGifSurface(env.api.__gif.palette);
    env.api.__gif.drawGifSummary(surface,snap,count-1,env.api.__gif.tiers);
    for(let p=0;p<surface.pixels.length;p++){
      const rgb=env.api.__gif.palette[surface.pixels[p]];
      assert.equal(rgba[p*4],(rgb>>16)&255);assert.equal(rgba[p*4+1],(rgb>>8)&255);assert.equal(rgba[p*4+2],rgb&255);assert.equal(rgba[p*4+3],255);
    }

    metrics.push({name,samples:count,frames:reader.numFrames(),bytes:buffer.length,encodeMs:Math.round(elapsed)});
  }
  console.log('PASS real omggif exports decode to matching pixels, at most 60 frames and exactly 10 seconds',JSON.stringify(metrics));

  const cancelled=fresh();cancelled.api.__gif.seed(makeHistory(60));cancelled.t.enterPlayback();
  const promise=cancelled.api.generateGifFromHistory();cancelled.api.cancelGifExport();
  cancelled.runTimers(tm=>!tm.repeat&&tm.ms===0);await promise;
  assert.equal(cancelled.downloads.length,0);assert.equal(cancelled.e('btn-export-gif').disabled,false);
  await exportGif(cancelled);
  console.log('PASS cancellation releases export state and allows retry');
});

test('GIF gap connectors are dashed, use a dedicated color, and preserve recorded endpoints',()=>{
 const h=fresh(),g=h.api.__gif,s=g.createGifSurface(g.palette);
 const values=[5,5,5,5],times=[0,10,90,100],breaks=[false,false,true,false];
 g.drawGifSparkline(s,values,3,2,{left:176,top:90,width:102,height:36},times,breaks);
 const pixel=(x,y)=>s.pixels[y*480+x];
 assert.equal(pixel(181,107),2);assert.equal(pixel(270,107),2);
 for(let x=190;x<260;x++){
  assert.equal(pixel(x,107),(x-186)%10<6?12:0,'known flat gap has orange dashes separated by background');
  assert.equal(pixel(x,108),0,'connector is thinner than the measured line');
 }
 assert.equal(pixel(186,107),2);assert.equal(pixel(266,107),2,'real endpoint retains tier color');
 assert.deepEqual(values,[5,5,5,5]);assert.deepEqual(times,[0,10,90,100]);assert.deepEqual(breaks,[false,false,true,false]);
 const before=g.createGifSurface(g.palette);g.drawGifSparkline(before,values,1,2,{left:176,top:90,width:102,height:36},times,breaks);
 assert(!before.pixels.includes(12),'no connector or extrapolation before both endpoints are in the frame');
});
