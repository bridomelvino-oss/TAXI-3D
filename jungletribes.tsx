import { useState, useMemo, createElement, Fragment } from "react";
var React = { createElement, Fragment, useState, useMemo };
try { globalThis.React = React; } catch (e) {}
try { if (typeof window !== "undefined") window.React = React; } catch (e) {}

const G = 8, MAXT = 30;

// Terrains
const TC = {
  C:{bg:'#4d8a53',cost:1,def:0,icon:'',label:'Clairière'},
  F:{bg:'#265c20',cost:2,def:1,icon:'▲',label:'Forêt dense'},
  R:{bg:'#1a537a',cost:99,def:0,icon:'≈',label:'Rivière'},
  S:{bg:'#54611f',cost:2,def:0,icon:'~',label:'Marécage'},
  U:{bg:'#7a6040',cost:1,def:1,icon:'◆',label:'Ruines'}
};

// Unités
const UC = {
  camp:    {maxHp:20,atk:0,mov:0,rng:0,label:'Campement'},
  gatherer:{maxHp:3, atk:1,mov:3,rng:1,label:'Cueilleur', cost:{f:3,w:2,g:0}},
  warrior: {maxHp:6, atk:4,mov:2,rng:1,label:'Guerrier',  cost:{f:2,w:3,g:0}},
  blower:  {maxHp:3, atk:3,mov:2,rng:2,label:'Sarbacane', cost:{f:1,w:2,g:1}}
};

const RI={f:'🍌',w:'🪵',g:'💎'};
const RG={f:{f:2},w:{w:2},g:{g:1}};
const RT={f:'C',w:'F',g:'U'};

let _id=0;
const nid=()=>++_id;
const inB=(x,y)=>x>=0&&x<G&&y>=0&&y<G;
const adj4=(x,y)=>[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].filter(([a,b])=>inB(a,b));
const md=(x1,y1,x2,y2)=>Math.abs(x1-x2)+Math.abs(y1-y2);

// BFS de déplacement (coûts terrain, cases occupées bloquées)
function bfsR(x,y,mov,grid,units){
  if(!mov) return new Set();
  const occ=new Set(units.filter(u=>u.hp>0&&!(u.x===x&&u.y===y)).map(u=>`${u.x},${u.y}`));
  const vis=new Map([[`${x},${y}`,0]]);
  const q=[[x,y,0]],res=new Set();
  while(q.length){
    const[cx,cy,c]=q.shift();
    for(const[nx,ny]of adj4(cx,cy)){
      const k=`${nx},${ny}`,tc=TC[grid[ny][nx].terrain].cost,nc=c+tc;
      if(nc>mov||occ.has(k)) continue;
      if(!vis.has(k)||vis.get(k)>nc){vis.set(k,nc);res.add(k);q.push([nx,ny,nc]);}
    }
  }
  return res;
}

function getAtk(x,y,rng,owner,units){
  return rng>0?units.filter(u=>u.owner!==owner&&u.hp>0&&md(x,y,u.x,u.y)<=rng):[];
}

function mk(type,owner,x,y){
  return{id:nid(),type,owner,x,y,hp:UC[type].maxHp,maxHp:UC[type].maxHp,moved:false,acted:false};
}

// Cherche la case libre la plus proche (rayon BFS) — utilisé pour le recrutement
function findFreeNear(x,y,grid,units,maxR=2){
  const occ=new Set(units.filter(u=>u.hp>0).map(u=>`${u.x},${u.y}`));
  const vis=new Set([`${x},${y}`]);
  const q=[[x,y,0]];
  while(q.length){
    const[cx,cy,d]=q.shift();
    if(d>0&&d<=maxR&&!occ.has(`${cx},${cy}`)&&grid[cy][cx].terrain!=='R') return[cx,cy];
    if(d>=maxR) continue;
    for(const[nx,ny]of adj4(cx,cy)){
      const k=`${nx},${ny}`;
      if(!vis.has(k)){vis.add(k);q.push([nx,ny,d+1]);}
    }
  }
  return null;
}

function makeGrid(){
  const g=Array.from({length:G},(_,y)=>Array.from({length:G},(_,x)=>{
    const r=Math.random(),t=r<.35?'C':r<.58?'F':r<.70?'R':r<.82?'S':'U';
    return{terrain:t,res:null};
  }));
  [[0,0],[1,0],[0,1],[2,0],[0,2],[1,1]].forEach(([x,y])=>{g[y][x]={terrain:'C',res:null};});
  [[G-1,G-1],[G-2,G-1],[G-1,G-2],[G-3,G-1],[G-1,G-3],[G-2,G-2]].forEach(([x,y])=>{g[y][x]={terrain:'C',res:null};});
  for(const res of['f','f','f','w','w','w','g','g','g']){
    for(let a=0;a<200;a++){
      const rx=1+Math.floor(Math.random()*(G-2)),ry=1+Math.floor(Math.random()*(G-2));
      if(!g[ry][rx].res&&g[ry][rx].terrain!=='R'&&!(rx<=1&&ry<=1)&&!(rx>=G-2&&ry>=G-2)){
        g[ry][rx]={terrain:RT[res],res};break;
      }
    }
  }
  return g;
}

function initGame(){
  _id=0;
  return{
    grid:makeGrid(),
    units:[mk('camp','player',0,0),mk('gatherer','player',1,0),mk('gatherer','player',0,1),
           mk('camp','ai',G-1,G-1),mk('gatherer','ai',G-2,G-1),mk('gatherer','ai',G-1,G-2)],
    pr:{f:5,w:3,g:0},ar:{f:5,w:3,g:0},
    turn:1,phase:'player',sel:null,mode:null,
    log:['🌴 La tribu des bonnets cyan débarque dans la jungle !','Tape une unité verte pour commencer.'],
    winner:null
  };
}

// ── IA ──
function doAI(state){
  let{units,ar,grid,turn}=state;
  const logs=[];
  units=units.map(u=>u.owner==='ai'?{...u,moved:false,acted:false}:u);
  const aliveAI=()=>units.filter(u=>u.owner==='ai'&&u.hp>0&&u.type!=='camp');
  const aliveP=()=>units.filter(u=>u.owner==='player'&&u.hp>0);
  const aiCamp=()=>units.find(u=>u.owner==='ai'&&u.type==='camp'&&u.hp>0);

  for(const snap of aliveAI()){
    let u=units.find(x=>x.id===snap.id);
    if(!u||u.hp<=0) continue;
    const cfg=UC[u.type];
    const pts=aliveP();
    if(!pts.length) continue;
    const tgt=pts.reduce((b,t)=>md(u.x,u.y,t.x,t.y)<md(u.x,u.y,b.x,b.y)?t:b);
    // récolte sur place
    if(u.type==='gatherer'&&!u.acted&&grid[u.y][u.x].res){
      const gv=RG[grid[u.y][u.x].res];ar={...ar};
      for(const[k,v]of Object.entries(gv))ar[k]=(ar[k]||0)+v;
      units=units.map(x=>x.id===u.id?{...x,acted:true}:x);
      u=units.find(x=>x.id===snap.id);
    }
    // attaque sur place (cible la plus faible)
    if(u&&!u.acted){
      const atks=getAtk(u.x,u.y,cfg.rng,'ai',units);
      if(atks.length){
        const e=atks.reduce((b,t)=>t.hp<b.hp?t:b);
        const def=TC[grid[e.y][e.x].terrain].def,dmg=Math.max(1,cfg.atk-def);
        units=units.map(x=>x.id===e.id?{...x,hp:x.hp-dmg}:x);
        units=units.map(x=>x.id===u.id?{...x,acted:true}:x);
        units=units.filter(x=>x.type==='camp'||x.hp>0);
        logs.push(`⚔️ ${cfg.label} ennemi frappe ${UC[e.type].label} (−${dmg}PV)${e.hp-dmg<=0?' 💀':''}`);
        u=units.find(x=>x.id===snap.id);
        if(!u||u.hp<=0) continue;
      }
    }
    // déplacement vers le joueur
    if(u&&!u.moved){
      const reach=bfsR(u.x,u.y,cfg.mov,grid,units);
      let best=null,bestD=Infinity;
      for(const k of reach){
        const[nx,ny]=k.split(',').map(Number),d=md(nx,ny,tgt.x,tgt.y);
        if(d<bestD){bestD=d;best=[nx,ny];}
      }
      if(best){
        const[nx,ny]=best;
        units=units.map(x=>x.id===u.id?{...x,x:nx,y:ny,moved:true}:x);
        u=units.find(x=>x.id===snap.id);
        if(u&&!u.acted){
          const a2=getAtk(nx,ny,cfg.rng,'ai',units);
          if(a2.length){
            const e=a2.reduce((b,t)=>t.hp<b.hp?t:b);
            const def=TC[grid[e.y][e.x].terrain].def,dmg=Math.max(1,cfg.atk-def);
            units=units.map(x=>x.id===e.id?{...x,hp:x.hp-dmg}:x);
            units=units.map(x=>x.id===u.id?{...x,acted:true}:x);
            units=units.filter(x=>x.type==='camp'||x.hp>0);
            logs.push(`⚔️ ${cfg.label} attaque ${UC[e.type].label} (−${dmg}PV)${e.hp-dmg<=0?' 💀':''}`);
          }
        }
        if(u&&u.type==='gatherer'){
          u=units.find(x=>x.id===snap.id);
          const here=grid[ny]&&grid[ny][nx];
          if(u&&!u.acted&&here&&here.res){
            const gv=RG[here.res];ar={...ar};
            for(const[k,v]of Object.entries(gv))ar[k]=(ar[k]||0)+v;
            units=units.map(x=>x.id===u.id?{...x,acted:true}:x);
          }
        }
      }
    }
  }
  // production IA
  const camp=aiCamp();
  if(camp){
    const cnt=aliveAI().length,max=4+Math.floor(turn/4);
    if(cnt<max){
      const spot=findFreeNear(camp.x,camp.y,grid,units,2);
      if(spot){
        const[nx,ny]=spot;
        const aiGath=aliveAI().filter(u=>u.type==='gatherer').length;
        const order=aiGath<2?['gatherer','warrior','blower']:['warrior','blower','gatherer'];
        for(const t of order){
          const c=UC[t].cost;
          if(ar.f>=c.f&&ar.w>=c.w&&ar.g>=c.g){
            ar={...ar,f:ar.f-c.f,w:ar.w-c.w,g:ar.g-c.g};
            units=[...units,mk(t,'ai',nx,ny)];
            if(t!=='gatherer') logs.push(`⚠️ L'ennemi déploie un ${UC[t].label} !`);
            break;
          }
        }
      }
    }
  }
  return{...state,units,ar,log:[...state.log,...logs].slice(-20)};
}

function checkW(units){
  const pc=units.find(u=>u.owner==='player'&&u.type==='camp');
  const ac=units.find(u=>u.owner==='ai'&&u.type==='camp');
  if(!pc||pc.hp<=0) return 'ai';
  if(!ac||ac.hp<=0) return 'player';
  return null;
}

// ── Sprite du bonhomme / du camp ──
function Spr({type,owner,sz=22}){
  const p=owner==='player';
  if(type==='camp'){
    return(
      <svg width={sz} height={sz} viewBox="0 0 24 24" style={{display:'block',overflow:'visible'}}>
        <polygon points="12,2 22,22 2,22" fill={p?'#3cb371':'#c0392b'} stroke={p?'#0e5024':'#7b241c'} strokeWidth="1"/>
        <polygon points="12,7 18,21 6,21" fill={p?'#00d4e0':'#e67e22'} stroke={p?'#0e5024':'#7b241c'} strokeWidth=".5"/>
        <rect x="10.5" y="14" width="3" height="8" fill={p?'#0e5024':'#7b241c'}/>
        {p
          ?<polygon points="12,3.5 12.9,5.5 15,5.5 13.3,7 14,9.2 12,7.9 10,9.2 10.7,7 9,5.5 11.1,5.5" fill="#ffd700" stroke="#0e5024" strokeWidth=".3"/>
          :<g><circle cx="12" cy="10" r="1.6" fill="#fff200" stroke="#7b241c" strokeWidth=".4"/><circle cx="12" cy="10" r=".7" fill="#7b241c"/></g>}
      </svg>
    );
  }
  const body=p?'#3cb371':'#c0392b',hat=p?'#00d4e0':'#e67e22',outl=p?'#0e5024':'#7b241c';
  return(
    <svg width={sz} height={sz*1.4} viewBox="0 0 20 28" style={{display:'block',overflow:'visible'}}>
      <polygon points="10,1 3,11 17,11" fill={hat} stroke={outl} strokeWidth=".8"/>
      <ellipse cx="10" cy="11" rx="7.5" ry="1.6" fill={hat} stroke={outl} strokeWidth=".5"/>
      <circle cx="10" cy="18" r="7" fill={body} stroke={outl} strokeWidth=".8"/>
      <circle cx="7.5" cy="17" r="1.4" fill="white"/>
      <circle cx="12.5" cy="17" r="1.4" fill="white"/>
      <circle cx="8" cy="17.4" r=".7" fill="#222"/>
      <circle cx="13" cy="17.4" r=".7" fill="#222"/>
      <path d="M7.5,21.3 Q10,24 12.5,21.3" stroke={outl} strokeWidth=".9" fill="none" strokeLinecap="round"/>
      {type==='warrior'&&<g><line x1="15" y1="11" x2="21" y2="4" stroke="#8B4513" strokeWidth="1.8"/><polygon points="21,2 23.5,5 19,5" fill="#d8d8d8" stroke="#999" strokeWidth=".3"/></g>}
      {type==='blower'&&<g><line x1="14" y1="18" x2="23" y2="14.5" stroke="#8B4513" strokeWidth="2"/><circle cx="23.5" cy="14.3" r="1" fill="#444"/></g>}
      {type==='gatherer'&&<g><line x1="15" y1="20" x2="20" y2="27" stroke="#8B4513" strokeWidth="1.4"/><circle cx="20.5" cy="28" r="2.2" fill="#ffd700" stroke="#b8860b" strokeWidth=".5"/></g>}
    </svg>
  );
}

export default function App(){
  const[S,setS]=useState(initGame);
  const{grid,units,pr,ar,turn,phase,sel,mode,log,winner}=S;
  const selU=sel!=null?units.find(u=>u.id===sel&&u.hp>0):null;

  const movCells=useMemo(
    ()=>(selU&&mode==='move'&&!selU.moved&&UC[selU.type].mov>0)
      ?bfsR(selU.x,selU.y,UC[selU.type].mov,grid,units):new Set(),
    [selU,mode,grid,units]
  );
  const atkTgts=useMemo(
    ()=>(selU&&!selU.acted&&UC[selU.type].rng>0)
      ?getAtk(selU.x,selU.y,UC[selU.type].rng,'player',units):[],
    [selU,units]
  );
  const atkCells=useMemo(
    ()=>mode==='atk'?new Set(atkTgts.map(t=>`${t.x},${t.y}`)):new Set(),
    [mode,atkTgts]
  );
  const cu=(x,y)=>units.filter(u=>u.x===x&&u.y===y&&u.hp>0);

  const tap=(x,y)=>{
    if(phase!=='player') return;
    const key=`${x},${y}`;
    if(mode==='move'&&movCells.has(key)){
      return setS(s=>({...s,
        units:s.units.map(u=>u.id===s.sel?{...u,x,y,moved:true}:u),
        mode:null,
        log:[...s.log,'🚶 Déplacement effectué.'].slice(-20)}));
    }
    if(mode==='atk'&&atkCells.has(key)){
      return setS(s=>{
        const atker=s.units.find(u=>u.id===s.sel);
        const def=s.units.find(u=>u.x===x&&u.y===y&&u.owner!=='player'&&u.hp>0);
        if(!atker||!def) return s;
        const td=TC[s.grid[y][x].terrain].def,dmg=Math.max(1,UC[atker.type].atk-td);
        let nu=s.units.map(u=>u.id===def.id?{...u,hp:u.hp-dmg}:u);
        nu=nu.map(u=>u.id===atker.id?{...u,acted:true}:u);
        nu=nu.filter(u=>u.type==='camp'||u.hp>0);
        const w=checkW(nu);
        return{...s,units:nu,mode:null,
          log:[...s.log,`⚔️ ${UC[atker.type].label} → ${UC[def.type].label} −${dmg}PV${def.hp-dmg<=0?' 💀':''}`].slice(-20),
          winner:w,phase:w?'over':s.phase,sel:w?null:s.sel};
      });
    }
    const pu=cu(x,y).find(u=>u.owner==='player');
    if(pu){setS(s=>({...s,sel:pu.id===s.sel?null:pu.id,mode:null}));return;}
    setS(s=>({...s,sel:null,mode:null}));
  };

  const gather=()=>setS(s=>{
    const u=s.units.find(x=>x.id===s.sel);
    if(!u||u.acted||u.type!=='gatherer') return s;
    const cell=s.grid[u.y][u.x];
    if(!cell.res) return{...s,log:[...s.log,'❌ Aucune ressource sur cette case.'].slice(-20)};
    const gv=RG[cell.res],np={...s.pr};
    for(const[k,v]of Object.entries(gv))np[k]=(np[k]||0)+v;
    return{...s,pr:np,units:s.units.map(x=>x.id===u.id?{...x,acted:true}:x),
      log:[...s.log,`🌿 Récolte : ${Object.entries(gv).map(([k,v])=>`+${v}${RI[k]}`).join(' ')}`].slice(-20)};
  });

  const build=t=>setS(s=>{
    const c=UC[t].cost;
    if(s.pr.f<c.f||s.pr.w<c.w||s.pr.g<c.g) return{...s,log:[...s.log,'❌ Ressources insuffisantes.'].slice(-20)};
    const camp=s.units.find(u=>u.owner==='player'&&u.type==='camp'&&u.hp>0);
    if(!camp) return s;
    const spot=findFreeNear(camp.x,camp.y,s.grid,s.units,2);
    if(!spot) return{...s,log:[...s.log,'❌ Pas de place libre près du camp.'].slice(-20)};
    const[nx,ny]=spot;
    return{...s,pr:{...s.pr,f:s.pr.f-c.f,w:s.pr.w-c.w,g:s.pr.g-c.g},
      units:[...s.units,mk(t,'player',nx,ny)],
      log:[...s.log,`✅ ${UC[t].label} formé !`].slice(-20)};
  });

  const endTurn=()=>setS(s=>{
    if(s.phase!=='player') return s;
    const ai=doAI(s);
    let w=checkW(ai.units);
    if(w||s.turn>=MAXT){
      if(!w){
        const pCnt=ai.units.filter(u=>u.owner==='player'&&u.hp>0).length;
        const aCnt=ai.units.filter(u=>u.owner==='ai'&&u.hp>0).length;
        w=pCnt>=aCnt?'player':'ai'; // égalité → joueur
      }
      return{...ai,winner:w,phase:'over',sel:null,mode:null};
    }
    return{...ai,
      units:ai.units.map(u=>u.owner==='player'?{...u,moved:false,acted:false}:u),
      turn:s.turn+1,phase:'player',sel:null,mode:null,
      log:[...ai.log,`── Tour ${s.turn+1}/${MAXT} ──`].slice(-20)};
  });

  const restart=()=>setS(initGame());

  // ── Écran de fin ──
  if(winner||phase==='over') return(
    <div style={{minHeight:'100dvh',background:'#0d1a0d',display:'flex',flexDirection:'column',
      alignItems:'center',justifyContent:'center',fontFamily:'monospace',color:'#cef7ce',
      padding:20,textAlign:'center',gap:16}}>
      <div style={{fontSize:72}}>{winner==='player'?'🏆':'💀'}</div>
      <div style={{fontSize:24,fontWeight:'bold',color:winner==='player'?'#7cfc00':'#ff5555'}}>
        {winner==='player'?'VICTOIRE !':'DÉFAITE...'}
      </div>
      <div style={{fontSize:13,color:'#8fbc8f',maxWidth:270,lineHeight:1.6}}>
        {winner==='player'
          ?'La tribu aux bonnets cyan règne sur la jungle touffue ! 🌴'
          :'Les envahisseurs ont renversé ton campement... 💀'}
      </div>
      <button onClick={restart} style={{padding:'12px 28px',background:'#1a5a1a',
        border:'2px solid #3cb371',borderRadius:8,color:'#cef7ce',fontSize:15,
        fontFamily:'monospace',cursor:'pointer',fontWeight:'bold',marginTop:8}}>
        🌿 Nouvelle Partie
      </button>
    </div>
  );

  const canMov=!!(selU&&!selU.moved&&UC[selU.type].mov>0);
  const canAtk=atkTgts.length>0&&!!selU&&!selU.acted;
  const canGath=!!(selU&&selU.type==='gatherer'&&!selU.acted&&grid[selU.y][selU.x].res);

  return(
    <div style={{maxWidth:440,margin:'0 auto',background:'#0d1a0d',minHeight:'100dvh',
      fontFamily:'monospace',color:'#cef7ce',display:'flex',flexDirection:'column',
      userSelect:'none',WebkitUserSelect:'none',touchAction:'manipulation'}}>

      {/* Titre */}
      <div style={{background:'#030803',textAlign:'center',padding:'3px',fontSize:11,
        color:'#2d8a4d',letterSpacing:3,flexShrink:0,fontWeight:'bold'}}>
        🌴 TRIBU&nbsp;JUNGLE 🌴
      </div>

      {/* Header ressources / tour / phase */}
      <div style={{background:'#060f06',padding:'5px 10px',flexShrink:0,
        borderBottom:'2px solid #1a3a1a',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',gap:9,fontSize:13}}>
          <span>🍌<b style={{color:'#7cfc00'}}>{pr.f}</b></span>
          <span>🪵<b style={{color:'#7cfc00'}}>{pr.w}</b></span>
          <span>💎<b style={{color:'#7cfc00'}}>{pr.g}</b></span>
        </div>
        <div style={{fontSize:11,color:'#8fbc8f'}}>Tour<b style={{color:turn>MAXT-5?'#ff6b6b':'#ffd700',marginLeft:4}}>{turn}</b>/{MAXT}</div>
        <div style={{fontSize:11,fontWeight:'bold',color:phase==='player'?'#00e5ff':'#ff6b6b'}}>
          {phase==='player'?'🟢 À TOI':'⏳ IA...'}
        </div>
      </div>

      {/* GRILLE */}
      <div style={{display:'grid',gridTemplateColumns:`repeat(${G},1fr)`,
        gridTemplateRows:`repeat(${G},1fr)`,gap:1,background:'#030803',
        padding:2,flexShrink:0,width:'100%',aspectRatio:'1',boxSizing:'border-box'}}>
        {Array.from({length:G*G},(_,i)=>{
          const x=i%G,y=Math.floor(i/G),cell=grid[y][x],key=`${x},${y}`;
          const cellUs=cu(x,y),u0=cellUs[0],isSelC=!!(selU&&selU.x===x&&selU.y===y);
          const isMov=movCells.has(key),isAtk=atkCells.has(key);
          let bg=TC[cell.terrain].bg;
          if(isMov) bg='#2d6e4a';
          if(isAtk) bg='#7a2d2d';
          return(
            <div key={key} onClick={()=>tap(x,y)} style={{
              backgroundColor:bg,
              border:`1px solid ${isSelC?'#ffd700':isMov?'#5cd98c':isAtk?'#ff5555':'rgba(0,0,0,0.22)'}`,
              display:'flex',alignItems:'center',justifyContent:'center',
              cursor:'pointer',position:'relative',overflow:'hidden',boxSizing:'border-box'}}>
              {cell.res&&<span style={{position:'absolute',fontSize:'clamp(8px,2vw,14px)',
                opacity:u0?.35:.95,pointerEvents:'none',lineHeight:1}}>{RI[cell.res]}</span>}
              {!cell.res&&TC[cell.terrain].icon&&!u0&&(
                <span style={{opacity:.22,fontSize:'clamp(7px,1.6vw,11px)',color:'#fff',lineHeight:1}}>
                  {TC[cell.terrain].icon}
                </span>)}
              {u0&&(
                <div style={{position:'absolute',top:0,left:1,transform:'scale(.82)',transformOrigin:'top left',
                  display:'flex',flexDirection:'column',alignItems:'center',pointerEvents:'none'}}>
                  <Spr type={u0.type} owner={u0.owner} sz={22}/>
                  <div style={{width:13,height:2.5,background:'#1a1a1a',borderRadius:1,marginTop:1}}>
                    <div style={{width:`${Math.round((u0.hp/u0.maxHp)*100)}%`,height:'100%',
                      background:u0.owner==='player'?'#5cd98c':'#ff5a4a',borderRadius:1}}/>
                  </div>
                </div>)}
              {isSelC&&<div style={{position:'absolute',inset:0,border:'2px solid #ffd700',borderRadius:1,pointerEvents:'none'}}/>}
              {u0&&u0.owner==='player'&&u0.moved&&u0.acted&&(
                <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.42)',pointerEvents:'none'}}/>)}
            </div>
          );
        })}
      </div>

      {/* Info unité sélectionnée */}
      <div style={{background:'#060f06',padding:'3px 8px',flexShrink:0,
        borderTop:'1px solid #1a3a1a',display:'flex',alignItems:'center',gap:8,minHeight:32}}>
        {selU?(<div style={{display:'flex',alignItems:'center',gap:8,flex:1}}>
          <Spr type={selU.type} owner={selU.owner} sz={17}/>
          <div style={{flex:1,fontSize:11}}>
            <b style={{color:'#7cfc00'}}>{UC[selU.type].label}</b>
            <span style={{color:'#5a8a5a',marginLeft:5}}>❤{selU.hp}/{selU.maxHp}</span>
            {selU.type!=='camp'&&<span style={{color:'#4a7a4a',marginLeft:5,fontSize:10}}>⚔{UC[selU.type].atk}</span>}
            {(selU.moved||selU.acted)&&<span style={{color:'#3a5a3a',marginLeft:5,fontSize:10}}>
              {selU.moved?'✓mvt ':''}{selU.acted?'✓action':''}</span>}
          </div>
          {mode&&<span style={{fontSize:10,color:'#00e5ff'}}>
            {mode==='move'?'→ case verte':'→ ennemi rouge'}</span>}
        </div>):(
          <span style={{fontSize:11,color:'#2d5a2d',fontStyle:'italic'}}>Tape un bonhomme vert 🟢</span>
        )}
      </div>

      {/* Actions + production + fin de tour */}
      <div style={{background:'#060f06',padding:'4px 5px',flexShrink:0,display:'flex',flexDirection:'column',gap:3}}>
        {selU&&selU.type!=='camp'&&(
          <div style={{display:'flex',gap:3}}>
            <Btn label="🚶 Déplacer" active={mode==='move'} disabled={!canMov}
              onClick={()=>setS(s=>({...s,mode:s.mode==='move'?null:'move'}))} flex/>
            <Btn label="⚔️ Attaquer" active={mode==='atk'} disabled={!canAtk}
              onClick={()=>setS(s=>({...s,mode:s.mode==='atk'?null:'atk'}))} flex/>
            {selU.type==='gatherer'&&
              <Btn label="🌿 Récolter" disabled={!canGath} onClick={gather} flex/>}
          </div>
        )}
        <div style={{display:'flex',gap:3}}>
          {[{t:'gatherer',ico:'🌿',lbl:'Cueilleur'},{t:'warrior',ico:'⚔️',lbl:'Guerrier'},{t:'blower',ico:'🎯',lbl:'Sarbacane'}].map(({t,ico,lbl})=>{
            const c=UC[t].cost,ok=pr.f>=c.f&&pr.w>=c.w&&pr.g>=c.g;
            return<Btn key={t} label={`${ico} ${lbl}\n${c.f}🍌 ${c.w}🪵${c.g?' '+c.g+'💎':''}`}
              disabled={!ok} onClick={()=>build(t)} flex small/>;
          })}
        </div>
        <button onClick={endTurn} style={{padding:'9px 0',background:'#16401a',
          color:'#cef7ce',border:'1px solid #2d7a2d',borderRadius:5,
          fontSize:13,fontFamily:'monospace',fontWeight:'bold',cursor:'pointer',letterSpacing:1}}>
          ▶ FIN DE TOUR
        </button>
      </div>

      {/* Journal */}
      <div style={{background:'#020602',padding:'3px 8px',flex:1,overflow:'hidden',minHeight:46}}>
        {[...log].reverse().slice(0,5).map((l,i)=>(
          <div key={`${log.length-i}`} style={{fontSize:10,lineHeight:1.5,color:i===0?'#aed6ae':'#2a4a2a'}}>{l}</div>
        ))}
      </div>
    </div>
  );
}

function Btn({label,active,disabled,onClick,flex,small}){
  return(
    <button onClick={disabled?undefined:onClick} disabled={!!disabled} style={{
      flex:flex?1:undefined,padding:small?'4px 2px':'7px 6px',
      background:active?'#13455f':disabled?'#070f07':'#0f1f0f',
      color:active?'#00e5ff':disabled?'#1a2a1a':'#86c486',
      border:`1px solid ${active?'#00bcd4':disabled?'#0d1a0d':'#2a5a2a'}`,
      borderRadius:4,fontSize:small?9.5:11,fontFamily:'monospace',
      cursor:disabled?'default':'pointer',whiteSpace:'pre-line',
      lineHeight:1.3,textAlign:'center',minWidth:0,fontWeight:600}}>
      {label}
    </button>
  );
}
