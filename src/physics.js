// Pure, versioned Minecraft movement engine (no DOM / Three.js). Units: blocks, blocks-per-tick, 20 TPS.
// Facing: yaw 0 looks toward -Z. Every constant below is documented; "game" = not a vanilla value.
export const PROFILE={
  id:'1.8.9',
  // --- vertical (EntityLivingBase.jump / moveEntityWithHeading) ---
  jumpV:.42, grav:.08, vdrag:.98, term:-3.92,
  // --- horizontal ---
  adrag:.91,            // air friction
  slip:.6, ice:.98, slime:.8,   // block slipperiness (ground friction = slip*0.91)
  gAcc:.1, aAcc:.02,    // walk speed attribute / jumpMovementFactor
  sprintM:1.3, sneakM:.3, boost:.2, // sprint modifier, sneak factor, sprint-jump boost (1.8)
  jumpCD:10,            // jumpTicks while holding jump
  thr:.005,             // motion threshold (anti-jitter)
  // --- body ---
  w:.6, h:1.8, stepH:.5, // 1.8.9 stepHeight (0.6 is the 1.10+ value)
  sneakProbe:1, sneakStep:.05, // sneak edge guard: probe box offset down 1.0, motion reduced in 0.05 steps
  // --- assists (off = vanilla) ---
  jumpBufferTicks:0,    // vanilla has no jump buffer; >0 is an assist
  sprintCancelAny:true, // vanilla cancels sprint on ANY horizontal collision
  stepWhileFalling:true,// vanilla 1.8.9: flag = onGround || (clipped && motionY<0)
  // --- game rules (not vanilla) ---
  voidY:-25, landEventSpeed:.25, // fall-out height; min impact speed that raises a 'landed' event
  slimeMinImpact:.1 // vanilla micro-bounces while standing on slime; ignoring impacts below this keeps jumping reliable
};
const EP=1e-6;
export const bounds=b=>[b.x-b.w/2,b.x+b.w/2,b.y-(b.th||1),b.y,b.z-b.d/2,b.z+b.d/2]; // y = TOP surface
export const createState=(x=0,y=0,z=0)=>({x,y,z,vx:0,vy:0,vz:0,ground:false,on:null,sprint:false,jcd:0,jumpBuffer:0});
function boxHit(P,world,x,y,z){const w=P.w/2;for(const b of world){const[x0,x1,y0,y1,z0,z1]=bounds(b);
  if(x+w>x0+EP&&x-w<x1-EP&&y+P.h>y0+EP&&y<y1-EP&&z+w>z0+EP&&z-w<z1-EP)return true}return false}
function clip(d,lo,hi,bl,bh){if(d>0&&hi<=bl+EP){const t=bl-hi;if(t<d)d=t}else if(d<0&&lo>=bh-EP){const t=bh-lo;if(t>d)d=t}return d}
// Swept AABB, vanilla order: Y, then X, then Z.
export function sweep(world,x,y,z,dx,dy,dz,P=PROFILE){const w=P.w/2,H=P.h;
 for(const b of world){const[x0,x1,y0,y1,z0,z1]=bounds(b);if(x+w>x0+EP&&x-w<x1-EP&&z+w>z0+EP&&z-w<z1-EP)dy=clip(dy,y,y+H,y0,y1)}y+=dy;
 for(const b of world){const[x0,x1,y0,y1,z0,z1]=bounds(b);if(y+H>y0+EP&&y<y1-EP&&z+w>z0+EP&&z-w<z1-EP)dx=clip(dx,x-w,x+w,x0,x1)}x+=dx;
 for(const b of world){const[x0,x1,y0,y1,z0,z1]=bounds(b);if(x+w>x0+EP&&x-w<x1-EP&&y+H>y0+EP&&y<y1-EP)dz=clip(dz,z-w,z+w,z0,z1)}z+=dz;
 return{x,y,z,dx,dy,dz}}
// Surface under the player's CENTER (vanilla samples the block at posX, minY-1, posZ), not the whole box.
const under=(world,x,y,z)=>world.find(b=>{const[x0,x1,,y1,z0,z1]=bounds(b);return Math.abs(y1-y)<1e-4&&x>x0&&x<x1&&z>z0&&z<z1})||null;

// input: {f,b,l,r,jump,jumpPressed,sneak,sprintKey,yaw}. Mutates state `s`; returns events.
export function tick(s,inp,world,P=PROFILE){
 const ev={jumped:false,landed:false,landSpeed:0,bounced:false,fell:false};
 let fx=0,fz=0;if(inp.f)fz-=1;if(inp.b)fz+=1;if(inp.l)fx-=1;if(inp.r)fx+=1;
 const l=Math.hypot(fx,fz);if(l){fx/=l;fz/=l}
 const c=Math.cos(inp.yaw),sn=Math.sin(inp.yaw),wx=fx*c+fz*sn,wz=-fx*sn+fz*c,sneak=!!inp.sneak;
 if(!inp.f||sneak)s.sprint=false;if(inp.f&&!sneak&&inp.sprintKey)s.sprint=true;
 const Mt=sneak?P.sneakM:(s.sprint?P.sprintM:1),wasG=s.ground;
 if(inp.jumpPressed)s.jumpBuffer=Math.max(P.jumpBufferTicks,1); // 1 = "this tick only" (vanilla)
 const jh=s.jumpBuffer>0||!!inp.jump;if(!inp.jump)s.jcd=0;if(s.jcd>0)s.jcd--;
 const slip=wasG&&s.on?(s.on.t==='ice'?P.ice:s.on.t==='slime'?P.slime:P.slip):P.slip;
 // 1) acceleration (+ jump)
 if(jh&&wasG&&s.jcd<=0){s.vy=P.jumpV;s.jcd=P.jumpCD;s.jumpBuffer=0;ev.jumped=true;
  if(s.sprint){s.vx-=Math.sin(inp.yaw)*P.boost;s.vz-=Math.cos(inp.yaw)*P.boost}}
 const a=wasG?P.gAcc*Mt*Math.pow(.6/slip,3):P.aAcc*Mt,im=l>1?1:.98;s.vx+=wx*a*im;s.vz+=wz*a*im;
 // 2) move: sneak edge guard, swept clipping, step-up
 let vx=s.vx,vy=s.vy,vz=s.vz,land=0;
 if(sneak&&wasG){const E=(x,z)=>!boxHit(P,world,s.x+x,s.y-P.sneakProbe,s.z+z),q=P.sneakStep,sh=v=>Math.abs(v)<q?0:v-Math.sign(v)*q;
  while(vx!==0&&E(vx,0))vx=sh(vx);while(vz!==0&&E(0,vz))vz=sh(vz);while(vx!==0&&vz!==0&&E(vx,vz)){vx=sh(vx);vz=sh(vz)}}
 const mx=vx,mz=vz;let r=sweep(world,s.x,s.y,s.z,mx,vy,mz,P),stepped=false;
 if((r.dx!==mx||r.dz!==mz)&&(wasG||(P.stepWhileFalling&&vy<0&&r.dy!==vy))){
  const u=sweep(world,s.x,s.y,s.z,0,P.stepH,0,P),m=sweep(world,u.x,u.y,u.z,mx,0,mz,P),d=sweep(world,m.x,m.y,m.z,0,-(u.y-s.y),0,P);
  if(m.dx*m.dx+m.dz*m.dz>r.dx*r.dx+r.dz*r.dz+1e-9){r={x:d.x,y:d.y,z:d.z,dx:m.dx,dy:vy,dz:m.dz};stepped=true}}
 s.x=r.x;s.y=r.y;s.z=r.z;
 if(!stepped){let hit=false;if(r.dx!==mx){s.vx=0;hit=true}if(r.dz!==mz){s.vz=0;hit=true}
  if(hit&&(P.sprintCancelAny||(r.dx!==mx&&Math.abs(mx)>.15)||(r.dz!==mz&&Math.abs(mz)>.15)))s.sprint=false}
 if(vy>0&&r.dy!==vy)s.vy=0;
 if(stepped||(vy<=0&&r.dy!==vy)){land=Math.min(vy,0);s.vy=0;s.ground=true;s.on=under(world,s.x,s.y,s.z)}else{s.ground=false}
 // slime: vanilla negates the incoming vertical speed (no damping); sneaking disables it
 if(s.ground&&s.on&&s.on.t==='slime'&&!sneak&&!wasG&&land<-P.slimeMinImpact){s.vy=-land;s.ground=false;ev.bounced=true}
 if(!wasG&&s.ground&&land<-P.landEventSpeed){ev.landed=true;ev.landSpeed=land}
 // 3) drag + gravity
 const dr=(wasG?slip:1)*P.adrag;s.vx*=dr;s.vz*=dr;s.vy=Math.max((s.vy-P.grav)*P.vdrag,P.term);
 // 4) anti-jitter
 if(Math.abs(s.vx)<P.thr)s.vx=0;if(Math.abs(s.vz)<P.thr)s.vz=0;
 if(s.jumpBuffer>0)s.jumpBuffer--;
 if(s.y<P.voidY)ev.fell=true;
 return ev}
