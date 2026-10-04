const test=require('node:test'),assert=require('node:assert/strict');
const exportsModule=import('../src/recording-export-data.js');
function archive(){
 const keys=['red','green','purple','pink','dark-blue','light-blue','gray','female-trans','withTokens','total','anonymous'];
 const history={timestamps:[1780000000000,1780000060000,1780007260000],breaks:[false,false,true]};
 const sessionHighs={};
 keys.forEach((key,i)=>{history[key]=[i+1,i+2,i+3];sessionHighs[key]={value:100+i,time:1779990000000};});
 return {room:'selected_room',producerVersion:'3.8.0',session:{history,sessionHighs,roomTotalHigh:300,roomTotalHighTime:1779990000000,
  sessionStartedAt:1779999900000,sessionStartEstimated:true,pausedElapsedTime:60000,isPaused:true,isStopped:false}};
}
test('recording CSV exports every selected sample, original columns and real elapsed time across a pause',async()=>{
 const {recordingCSV}=await exportsModule,a=archive(),before=JSON.stringify(a),csv=recordingCSV(a);
 assert(csv.startsWith('\ufeff'));assert(csv.endsWith('\r\n'));
 const rows=csv.slice(1).trim().split('\r\n').map(row=>row.split(',').map(c=>c.slice(1,-1)));
 assert.equal(rows.length,4);assert.equal(rows[0].length,16);
 assert.deepEqual(rows[0],['room','sample_index','timestamp_utc','elapsed_seconds','room_total','registered','anonymous','with_tokens','moderators','fan_club','dark_purple','light_purple','dark_blue','light_blue','grey','female_trans']);
 assert.deepEqual(rows.slice(1).map(r=>r[0]),Array(3).fill('selected_room'));
 assert.deepEqual(rows.slice(1).map(r=>Number(r[3])),[0,60,7260]);
 assert.equal(rows[3][2],new Date(a.session.history.timestamps[2]).toISOString());
 assert.deepEqual(rows[3].slice(4).map(Number),[25,12,13,11,3,4,5,6,7,8,9,10]);
 assert.equal(JSON.stringify(a),before);
});
test('CSV quotes text safely including names that could be interpreted as spreadsheet formulas',async()=>{
 const {recordingCSV}=await exportsModule,a=archive();a.room='-room';assert.match(recordingCSV(a),/"'-room"/);
 a.room='a"b';assert.match(recordingCSV(a),/"a""b"/);
});
test('recording TXT keeps original session timing and highs beyond retained history',async()=>{
 const {recordingText}=await exportsModule,a=archive(),before=JSON.stringify(a);
 a.session.sessionHighs.gray.time=null;
 const txt=recordingText(a,'3.9.0-beta.1',1780007300000);
 assert.match(txt,/Model: selected_room/);assert.match(txt,/Recording Producer Version: 3.8.0/);
 assert(txt.includes('Session Start: '+new Date(a.session.sessionStartedAt).toISOString()+' (estimated)'));
 assert.match(txt,/Recording State: Paused snapshot/);assert.match(txt,/Recorded Active Seconds: 60/);
 assert.match(txt,/Retained Samples: 3/);assert.match(txt,/Recording Gaps: 1/);
 assert(txt.includes('Room Total High: 300 at '+new Date(1779990000000).toISOString()));
 assert.match(txt,/Grey High: 106 at Not recorded/);assert.match(txt,/Room Total: 25/);
 a.session.sessionHighs.gray.time=1779990000000;assert.equal(JSON.stringify(a),before);
 a.session.isStopped=true;assert.match(recordingText(a,'v',1780007300000),/Recording State: Stopped/);
});
