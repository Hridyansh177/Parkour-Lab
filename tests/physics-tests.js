import {PROFILE,PROFILE as CFG,createState,tick,sweep} from '../src/physics.js';
const BUF={...PROFILE,jumpBufferTicks:3};
import {COURSES,build} from '../src/courses.js';
let pass=0,fail=0;const ok=(n,c,i='')=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(i?'  '+i:''))};
const IDLE={yaw:0};
const slab={x:0,y:0,z:0,w:6,d:6,t:'n'};
const S0=()=>{const s=createState(0,.01,0);for(let i=0;i<3;i++)tick(s,IDLE,[slab]);return s};

// 1. Standing still: rests exactly on the surface and stays grounded
{const s=createState(0,.01,0);for(let i=0;i<20;i++)tick(s,IDLE,[slab]);ok('rests on platform',s.y===0&&s.ground,`y=${s.y}`)}
// 2. Jump apex ~1.25 blocks
{const s=S0();let max=0;tick(s,{...IDLE,jump:true,jumpPressed:true},[slab]);for(let i=0;i<20;i++){max=Math.max(max,s.y);tick(s,IDLE,[slab])}
 ok('jump apex ≈1.25',Math.abs(max-1.2522)<.01,`apex=${max.toFixed(4)}`)}
// 3. Airborne for 12 ticks on a flat jump
{const s=S0();let n=0;tick(s,{...IDLE,jump:true},[slab]);n=1;while(!s.ground&&n<40){tick(s,IDLE,[slab]);n++}ok('flat jump lasts 12 ticks',n===12,`ticks=${n}`)}
// 4. Hold jump respects the 10-tick cooldown (re-jumps on landing, never mid-air)
{const s=S0();let j=0;for(let i=0;i<60;i++)if(tick(s,{...IDLE,jump:true},[slab]).jumped)j++;ok('held jump auto-repeats on landing',j>=4&&j<=5,`jumps in 60 ticks=${j}`)}
// 5. No double jump in air
{const s=S0();tick(s,{...IDLE,jump:true,jumpPressed:true},[slab]);let extra=0;for(let i=0;i<6;i++)if(tick(s,{...IDLE,jump:true,jumpPressed:true},[slab]).jumped)extra++;ok('no air jump',extra===0)}
// 6. Jump buffer: press 2 ticks before landing still jumps
{const s=S0();tick(s,{...IDLE,jump:true},[slab]);while(s.y>.55||s.vy>0)tick(s,IDLE,[slab]);let jumped=false;
 // press while still airborne, a couple of ticks from landing
 tick(s,{...IDLE,jumpPressed:true},[slab],BUF);for(let i=0;i<4&&!jumped;i++)jumped=tick(s,IDLE,[slab],BUF).jumped;ok('assist: jump buffer fires on landing',jumped)}
{const s=S0();tick(s,{...IDLE,jump:true},[slab]);while(s.y>.55||s.vy>0)tick(s,IDLE,[slab]);let jumped=false;tick(s,{...IDLE,jumpPressed:true},[slab]);for(let i=0;i<4&&!jumped;i++)jumped=tick(s,IDLE,[slab]).jumped;ok('vanilla: early press does NOT jump (no buffer)',!jumped)}
// 7. Steady speeds: walk ≈ 4.3 b/s, sprint ≈ 5.6 b/s (Java: 4.317 / 5.612)
const run=(sp)=>{const s=createState(0,0,2);const big={x:0,y:0,z:-40,w:6,d:100,t:'n'};for(let i=0;i<40;i++)tick(s,{yaw:0,f:true,sprintKey:sp},[big]);return Math.hypot(s.vx,s.vz)/.546*20*.546+0};
{const s=createState(0,0,0),big={x:0,y:0,z:-60,w:6,d:140,t:'n'};let z0;for(let i=0;i<40;i++)tick(s,{yaw:0,f:true},[big]);z0=s.z;tick(s,{yaw:0,f:true},[big]);const w=(z0-s.z)*20;
 const q=createState(0,0,0);for(let i=0;i<40;i++)tick(q,{yaw:0,f:true,sprintKey:true},[big]);z0=q.z;tick(q,{yaw:0,f:true,sprintKey:true},[big]);const sp=(z0-q.z)*20;
 ok('walk speed ≈4.3 b/s',Math.abs(w-4.3)<.15,w.toFixed(2));ok('sprint speed ≈5.6 b/s',Math.abs(sp-5.6)<.2,sp.toFixed(2))}
// 8. Wall blocks movement, step-up of 0.5 works, 1.0 does not
{const wall={x:0,y:3,z:-3,w:6,d:1,t:'wall',th:6};const s=createState(0,0,1);for(let i=0;i<30;i++)tick(s,{yaw:0,f:true},[slab,wall]);ok('wall stops player',s.z>-2.25,`z=${s.z.toFixed(2)}`)}
{const s=createState(0,0,1),st={x:0,y:.5,z:-4,w:6,d:3,t:'n'};for(let i=0;i<30;i++)tick(s,{yaw:0,f:true},[slab,st]);ok('auto-step 0.5 ledge',Math.abs(s.y-.5)<1e-6,`y=${s.y}`)}
{const s=createState(0,0,1),st={x:0,y:1,z:-4,w:6,d:3,t:'n'};for(let i=0;i<30;i++)tick(s,{yaw:0,f:true},[slab,st]);ok('1-block ledge blocks',s.y<.1&&s.z>-2.6,`y=${s.y} z=${s.z.toFixed(2)}`)}
// 9. Ceiling (underside at y=2): head stops at 2.0 and upward speed is cancelled
{const cl={x:0,y:3,z:0,w:6,d:6,t:'n',th:1},W=[slab,cl];const s=S0();s.x=0;let max=0,vyAtHit=null;tick(s,{...IDLE,jump:true},W);for(let i=0;i<8;i++){max=Math.max(max,s.y);tick(s,IDLE,W)}
 ok('ceiling stops head',max<=.2+1e-6,`max y=${max.toFixed(4)}`)}
// 10. Sneak never walks off an edge
{const s=createState(0,0,0);for(let i=0;i<80;i++)tick(s,{yaw:0,f:true,sneak:true},[slab]);ok('sneak stays on platform',s.y===0&&s.ground&&s.z>-3.4,`z=${s.z.toFixed(2)}`)}
// 11. Falling fast never tunnels through a 1-thick platform
{const s=createState(0,40,0);s.vy=-3.92;for(let i=0;i<30;i++)tick(s,IDLE,[slab]);ok('no tunnelling at terminal speed',s.y===0&&s.ground,`y=${s.y}`)}
// 12. Jump-distance limits (best jump timing is searched; the player runs up from 5 blocks away)
function crosses(gap,sprint,dy=0){const A={x:0,y:0,z:0,w:6,d:6,t:'n'},B={x:0,y:dy,z:-3-gap-1.5,w:3,d:3,t:'n'},W=[A,B];
 for(let th=-1.6;th>=-3.2;th-=.02){const s=createState(0,0,2.6);let jumped=false;
  for(let t=0;t<90;t++){const go=!jumped&&s.z<=th;const ev=tick(s,{yaw:0,f:true,sprintKey:sprint,jump:go},W);if(go)jumped=true;if(s.ground&&s.on===B)return true;if(s.y<-5)break}}return false}
const maxGap=(sp,dy)=>{let g=1;while(crosses(g+.1,sp,dy)&&g<8)g=+(g+.1).toFixed(2);return g};
const mSprint=maxGap(true),mWalk=maxGap(false),mUp=maxGap(true,1);
ok('sprint jump flat max gap 3.5–4.5',mSprint>=3.5&&mSprint<=4.5,`max=${mSprint}`);
ok('walk jump flat max gap 2–3',mWalk>=2&&mWalk<=3,`max=${mWalk}`);
ok('sprint jump +1 block reaches ≥2.5',mUp>=2.5,`max=${mUp}`);
// 13. Every course gap is within a safe margin of what the engine can do
for(const c of COURSES){let bad=[],prev='';c.steps.forEach(([g,dy,,,ty],i)=>{if(prev!=='slime'){const lim=dy>0?mUp:dy<0?mSprint+.4:mSprint;if(g>lim-.5)bad.push(`step ${i+1} gap ${g} (limit ${(lim-.5).toFixed(1)})`)}prev=ty});
 ok(`course "${c.name}" gaps leave ≥0.5 margin`,bad.length===0,bad.join('; '));
 const P=build(c);ok(`course "${c.name}" has start+finish+checkpoint`,P[0].t==='start'&&P.at(-1).t==='finish'&&P.some(p=>p.t==='cp'))}

// ---- Phase 2 audit fixes ----
{const st={x:0,y:.6,z:-4,w:6,d:3,t:'n'},s=createState(0,0,1);for(let i=0;i<30;i++)tick(s,{yaw:0,f:true},[slab,st]);ok('stepHeight 0.5: a 0.6 ledge blocks',s.y<.1,`y=${s.y}`)}
{const wall={x:0,y:3,z:-3,w:6,d:1,t:'wall',th:6},s=S0();s.z=1;for(let i=0;i<14;i++)tick(s,{yaw:0,f:true,sprintKey:true},[slab,wall]);ok('sprint cancels on wall contact',s.sprint===false)}
{const wall={x:1.2,y:3,z:-1,w:1,d:8,t:'wall',th:6},a={...PROFILE,sprintCancelAny:false};
 const run=(P)=>{const s=S0();s.x=-1;s.z=2;let moved=false;for(let i=0;i<25;i++){tick(s,{yaw:-.25,f:true,sprintKey:true},[slab,wall],P)}return s};
 ok('vanilla: sprint cancels on a shallow wall scrape',run(PROFILE).sprint===false);ok('assist: sprint survives a shallow scrape',run(a).sprint===true)}
{const slime={x:0,y:0,z:0,w:6,d:6,t:'slime'},s=createState(0,6,0);let vIn=0,vOut=0;for(let i=0;i<80;i++){const v0=s.vy,ev=tick(s,IDLE,[slime]);if(ev.bounced){vIn=v0;vOut=(s.vy/.98+.08);break}}
 ok('slime negates incoming vertical speed',vIn<0&&Math.abs(vOut+vIn*1)<.02,`in=${vIn.toFixed(3)} out=${vOut.toFixed(3)}`)}
{const slime={x:0,y:0,z:0,w:6,d:6,t:'slime'},s=createState(0,.01,0);for(let i=0;i<30;i++)tick(s,IDLE,[slime]);ok('standing on slime settles (impacts below slimeMinImpact do not bounce)',s.ground&&s.y===0)}
{const run=(ty)=>{const w={x:0,y:0,z:-12,w:6,d:30,t:ty},s=createState(0,.01,2);for(let i=0;i<4;i++)tick(s,IDLE,[w]);s.vz=-.3;for(let i=0;i<10;i++)tick(s,IDLE,[w]);return Math.abs(s.vz)};
 const ice=run('ice'),stone=run('n'),sl=run('slime');ok('slipperiness ordering: stone < slime < ice',stone<sl&&sl<ice,`stone=${stone.toExponential(1)} slime=${sl.toFixed(4)} ice=${ice.toFixed(3)}`)}
{const A={x:0,y:0,z:0,w:6,d:6,t:'n'},ic={x:0,y:0,z:-6,w:6,d:6,t:'ice'},s=createState(0,0,-2.9);s.ground=true;s.vy=-.0784;tick(s,IDLE,[A,ic]);ok('surface type = block under the player CENTER (not the box)',s.on===A,'center over stone while box overlaps ice')}
// Slime courses: a bounce returns you to ~ the height you fell from, minus a block or so (vanilla negation + drag).
const slimeRate=(drop,g,up,w)=>{const P=build({steps:[[3,-drop,0,2,'slime'],[g,up,0,w,'n']]}),T=P.at(-1);let k=0,n=0;
 for(let th=-1.6;th>=-3.2;th-=.05){n++;const s=createState(0,0,2.6);let j=false;for(let t=0;t<120;t++){const go=!j&&s.z<=th;tick(s,{yaw:0,f:true,sprintKey:true,jump:go},P);if(go)j=true;if(s.ground&&s.on===T){k++;break}if(s.y<-12)break}}return Math.round(k/n*100)}
{const a=slimeRate(3,2,2,3),b=slimeRate(2,2,1,3);ok('slime pattern "drop 3 → bounce up 2" is completable',a>=60,`${a}% of jump timings`);ok('slime pattern "drop 2 → bounce up 1" is completable',b>=60,`${b}% of jump timings`)}
console.log(`\n${pass} passed, ${fail} failed, max gaps: sprint ${mSprint}, walk ${mWalk}, sprint +1 ${mUp}`);process.exit(fail?1:0);
