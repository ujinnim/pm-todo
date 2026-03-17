import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

const COLORS = [
  "#1E3A5F","#2E5280","#3B6EA8","#4A90D9",
  "#2563EB","#7C3AED","#DB2777","#DC2626",
  "#EA580C","#D97706","#65A30D","#16A34A",
  "#0891B2","#0284C7","#4F46E5","#BE185D",
  "#854D0E","#166534","#1D4ED8","#7E22CE",
];
const tk = {
  accent:    "#88BFB0",
  accentSub: "#6AA99A",
  accentBg:  "#F0F8F6",
  // semantic
  blue:   "#3B82F6",
  red:    "#F04452",
  orange: "#F5A623",
  // neutrals (SEED palette 참고)
  gray1: "#6B7280",
  gray2: "#9CA3AF",
  gray3: "#D1D5DB",
  gray4: "#E5E7EB",
  gray5: "#F3F4F6",
  label:    "#1B1D1F",
  labelSub: "#4D5159",
  bg:        "#F5F6F7",
  bgCard:    "#FFFFFF",
  radius:    "8px",
  radiusLg:  "12px",
  radiusPill:"999px",
  shadow:    "0 1px 2px rgba(0,0,0,0.05)",
  shadowMd:  "0 2px 8px rgba(0,0,0,0.07)",
};
const font = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif';

function today() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}
function fmtDate(d) {
  if (!d) return "";
  const p = d.split("-");
  return parseInt(p[1]) + "/" + parseInt(p[2]);
}
function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}
function diffDays(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }

function getEff(task, ts) {
  if (task.schedule === "today") return "today";
  if (task.schedule === "date" && task.schedule_date) return task.schedule_date <= ts ? "today" : "backlog";
  if (task.schedule === "tomorrow") return "backlog";
  return "none";
}

function Confetti({ onDone }) {
  const ref = useRef(null);
  useEffect(function() {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const cx = canvas.width/2, cy = canvas.height/2;
    const cols = ["#111111","#444444","#888888","#2563EB","#D97706","#16A34A"];
    const pts = [];
    function burst(ox, oy, n) {
      for (let i=0; i<n; i++) {
        const a=(Math.PI*2*i)/n+Math.random()*0.3, sp=Math.random()*8+3;
        pts.push({x:ox,y:oy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-2,color:cols[Math.floor(Math.random()*cols.length)],size:Math.random()*6+2,shape:Math.random()>0.5?"r":"c",alpha:1,rot:Math.random()*Math.PI*2,rs:(Math.random()-0.5)*0.3,g:0.18,drag:0.97});
      }
    }
    burst(cx,cy*0.5,60);
    setTimeout(()=>burst(cx*0.4,cy*0.6,40),200);
    setTimeout(()=>burst(cx*1.6,cy*0.6,40),350);
    let frame;
    function draw() {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      let alive=false;
      for (let i=0;i<pts.length;i++) {
        const p=pts[i];
        if(p.alpha<=0)continue;
        alive=true;
        p.vx*=p.drag;p.vy*=p.drag;p.vy+=p.g;
        p.x+=p.vx;p.y+=p.vy;p.rot+=p.rs;p.alpha-=0.012;
        ctx.save();ctx.globalAlpha=Math.max(0,p.alpha);ctx.fillStyle=p.color;
        ctx.translate(p.x,p.y);ctx.rotate(p.rot);
        if(p.shape==="c"){ctx.beginPath();ctx.arc(0,0,p.size/2,0,Math.PI*2);ctx.fill();}
        else{ctx.fillRect(-p.size/2,-p.size/2*1.6,p.size,p.size*1.6);}
        ctx.restore();
      }
      if(alive){frame=requestAnimationFrame(draw);}else{onDone();}
    }
    frame=requestAnimationFrame(draw);
    return ()=>cancelAnimationFrame(frame);
  },[]);
  return <canvas ref={ref} style={{position:"fixed",top:0,left:0,width:"100vw",height:"100vh",pointerEvents:"none",zIndex:9999}}/>;
}

function ColorPicker({value,onChange}) {
  const [open,setOpen]=useState(false);
  return (
    <div style={{position:"relative",flexShrink:0}}>
      <button onClick={()=>setOpen(v=>!v)} style={{width:20,height:20,borderRadius:4,background:value,border:"1.5px solid "+tk.gray3,cursor:"pointer",padding:0}}/>
      {open&&(
        <div style={{position:"fixed",zIndex:1000,background:tk.bgCard,border:"1px solid "+tk.gray4,borderRadius:tk.radius,padding:"10px",display:"flex",gap:7,flexWrap:"wrap",width:184,boxShadow:tk.shadowMd}}>
          {COLORS.map(c=><button key={c} onClick={()=>{onChange(c);setOpen(false);}} style={{width:22,height:22,borderRadius:4,background:c,border:"2px solid "+(value===c?"#fff":c),outline:value===c?"2px solid "+c:"none",outlineOffset:1,cursor:"pointer",padding:0}}/>)}
        </div>
      )}
    </div>
  );
}

const rowBase = {display:"flex",alignItems:"center",gap:12,padding:"12px 16px",minHeight:46,textAlign:"left"};
function GroupCard({children}){
  return <div style={{background:tk.bgCard,borderRadius:tk.radiusLg,overflow:"hidden",marginBottom:8,border:"1px solid "+tk.gray4}}>{children}</div>;
}
function Row({children,last}){
  return <div style={{...rowBase,borderBottom:last?"none":"1px solid "+tk.gray4}}>{children}</div>;
}
function SectionHeader({children}){
  return <div style={{fontSize:12,fontWeight:700,color:tk.label,padding:"20px 2px 6px",display:"flex",alignItems:"center",gap:6,textAlign:"left"}}>{children}</div>;
}
function Badge({color,bg,children}){
  return <span style={{display:"inline-flex",alignItems:"center",height:18,padding:"0 7px",borderRadius:tk.radiusPill,fontSize:10,fontWeight:600,background:bg||tk.gray5,color:color||tk.gray1,letterSpacing:"0.02em",border:"1px solid "+(bg||tk.gray4)}}>{children}</span>;
}
const IconPinned  = () => <span style={{fontSize:14,opacity:1  }}>📌</span>;
const IconUnpinned= () => <span style={{fontSize:14,opacity:0.3}}>📌</span>;

const sel = {fontSize:13,border:"none",background:"transparent",color:tk.accentSub,outline:"none",cursor:"pointer",fontFamily:font,textAlign:"left"};
const btnLink = (color=tk.accentSub)=>({background:"none",color,border:"none",fontSize:13,cursor:"pointer",padding:"0 6px",fontFamily:font,display:"flex",alignItems:"center",textAlign:"left"});

// ── Draggable Calendar ─────────────────────────────────────────
function DraggableCalendar({phases,projects,calDate,setCalDate,onUpdatePhase}) {
  const [dragging,setDragging]=useState(null);
  const [hoverDay,setHoverDay]=useState(null);
  const y=calDate.y,m=calDate.m;
  const firstDay=new Date(y,m,1).getDay();
  const daysInMonth=new Date(y,m+1,0).getDate();
  const monthStr=y+"-"+String(m+1).padStart(2,"0");
  const ts=today();
  const cells=[];
  for(let i=0;i<firstDay;i++)cells.push(null);
  for(let d=1;d<=daysInMonth;d++)cells.push(d);
  const vis=phases.filter(ph=>ph.start_date&&ph.end_date&&ph.start_date.slice(0,7)<=monthStr&&ph.end_date.slice(0,7)>=monthStr);
  const dayNames=["일","월","화","수","목","금","토"];
  function ds(d){return y+"-"+String(m+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");}
  function prev(ph){
    if(!dragging||dragging.phaseId!==ph.id||!hoverDay)return{start:ph.start_date,end:ph.end_date};
    const delta=diffDays(dragging.startDayStr,hoverDay);
    return{start:addDays(dragging.origStart,delta),end:addDays(dragging.origEnd,delta)};
  }
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <button onClick={()=>setCalDate(c=>c.m===0?{y:c.y-1,m:11}:{y:c.y,m:c.m-1})} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:tk.accentSub,padding:"0 4px",lineHeight:1}}>{"‹"}</button>
        <span style={{fontSize:14,fontWeight:600,color:tk.label,letterSpacing:"0.02em"}}>{y}{"."}{String(m+1).padStart(2,"0")}</span>
        <button onClick={()=>setCalDate(c=>c.m===11?{y:c.y+1,m:0}:{y:c.y,m:c.m+1})} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:tk.accentSub,padding:"0 4px",lineHeight:1}}>{"›"}</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:6}}>
        {dayNames.map(d=><div key={d} style={{textAlign:"center",fontSize:10,fontWeight:600,color:tk.gray2,padding:"2px 0",letterSpacing:"0.05em"}}>{d}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {cells.map((d,i)=>{
          if(!d)return <div key={"e"+i}/>;
          const dateStr=ds(d);
          const isT=dateStr===ts;
          const dph=vis.filter(ph=>{const p=prev(ph);return p.start<=dateStr&&p.end>=dateStr;});
          return(
            <div key={d}
              onDragOver={e=>{e.preventDefault();setHoverDay(dateStr);}}
              onDrop={e=>{e.preventDefault();if(!dragging)return;const delta=diffDays(dragging.startDayStr,dateStr);if(delta!==0)onUpdatePhase(dragging.phaseId,{start_date:addDays(dragging.origStart,delta),end_date:addDays(dragging.origEnd,delta)});setDragging(null);setHoverDay(null);}}
              style={{minHeight:58,padding:"3px 2px",background:isT?tk.gray5:"transparent",borderRadius:6,border:isT?"1px solid "+tk.gray3:"1px solid transparent"}}>
              <div style={{textAlign:"center",fontSize:12,fontWeight:isT?700:400,color:isT?tk.label:tk.labelSub,marginBottom:2}}>{d}</div>
              <div style={{display:"flex",flexDirection:"column",gap:1}}>
                {dph.slice(0,3).map(ph=>{
                  const p=prev(ph);
                  return(
                    <div key={ph.id} draggable
                      onDragStart={e=>{e.stopPropagation();setDragging({phaseId:ph.id,startDayStr:dateStr,origStart:ph.start_date,origEnd:ph.end_date});e.dataTransfer.effectAllowed="move";}}
                      onDragEnd={()=>{setDragging(null);setHoverDay(null);}}
                      style={{background:ph.color,color:"#fff",fontSize:9,fontWeight:500,padding:"1px 4px",borderRadius:p.start===dateStr&&p.end===dateStr?3:p.start===dateStr?"3px 0 0 3px":p.end===dateStr?"0 3px 3px 0":0,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",cursor:"grab",opacity:dragging&&dragging.phaseId===ph.id?0.4:1,userSelect:"none"}}>
                      {p.start===dateStr?ph.name:"\u00A0"}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {vis.length>0&&(
        <div style={{marginTop:14,display:"flex",flexWrap:"wrap",gap:8,textAlign:"left"}}>
          {vis.map(ph=>{
            const proj=projects.find(p=>p.id===ph.project_id);
            const p=prev(ph);
            return(
              <div key={ph.id} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:tk.gray1}}>
                <span style={{width:8,height:8,borderRadius:2,background:ph.color,flexShrink:0}}/>
                <span style={{color:tk.labelSub}}>{proj?proj.name+" · ":""}{ph.name}</span>
                <span>{fmtDate(p.start)}{"~"}{fmtDate(p.end)}</span>
              </div>
            );
          })}
        </div>
      )}
      <p style={{fontSize:10,color:tk.gray3,marginTop:10,textAlign:"left",letterSpacing:"0.02em"}}>{"막대를 드래그해서 날짜를 이동할 수 있어요"}</p>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────
export default function App() {
  const [tasks,setTasks]=useState([]);
  const [projects,setProjects]=useState([]);
  const [phases,setPhases]=useState([]);
  const [appTitle,setAppTitle]=useState("할 일");
  const [loading,setLoading]=useState(true);
  const [editingTitle,setEditingTitle]=useState(false);
  const [form,setForm]=useState({title:"",memo:"",due:"",schedule:"today",schedule_date:"",project_id:""});
  const [editId,setEditId]=useState(null);
  const [view,setView]=useState("all");
  const [showForm,setShowForm]=useState(false);
  const [showProjMgr,setShowProjMgr]=useState(false);
  const [showNewProjForm,setShowNewProjForm]=useState(false);
  const [newProjName,setNewProjName]=useState("");
  const [newProjColor,setNewProjColor]=useState(COLORS[0]);
  const [newProjOpenDate,setNewProjOpenDate]=useState("");
  const [editingProjId,setEditingProjId]=useState(null);
  const [editingProjName,setEditingProjName]=useState("");
  const [editingProjColor,setEditingProjColor]=useState("");
  const [editingProjOpenDate,setEditingProjOpenDate]=useState("");
  const [calDate,setCalDate]=useState(()=>{const d=new Date();return{y:d.getFullYear(),m:d.getMonth()};});
  const [selProj,setSelProj]=useState("");
  const [showPhaseForm,setShowPhaseForm]=useState(false);
  const [phaseForm,setPhaseForm]=useState({name:"",start_date:"",end_date:"",color:COLORS[0]});
  const [editPhaseId,setEditPhaseId]=useState(null);
  const [showConfetti,setShowConfetti]=useState(false);

  useEffect(()=>{
    async function fetchAll() {
      setLoading(true);
      const [p,t,ph]=await Promise.all([
        supabase.from("projects").select("*").order("id"),
        supabase.from("tasks").select("*").order("id"),
        supabase.from("phases").select("*").order("id"),
      ]);
      if(p.data)setProjects(p.data);
      if(t.data)setTasks(t.data);
      if(ph.data)setPhases(ph.data);
      setLoading(false);
    }
    fetchAll();
  },[]);

  const ts=today();
  const isOD=d=>d&&d<ts;
  const isTD=d=>d===ts;
  const isDS=d=>{if(!d)return false;const diff=(new Date(d)-new Date(ts))/86400000;return diff>0&&diff<=3;};
  const projOf=id=>projects.find(p=>p.id===id);

  async function addProject() {
    const name=newProjName.trim();if(!name)return;
    const id=Date.now();
    const row={id,name,color:newProjColor,open_date:newProjOpenDate||null,done:false};
    setProjects(ps=>[...ps,row]);
    await supabase.from("projects").insert(row);
    setNewProjName("");setNewProjColor(COLORS[0]);setNewProjOpenDate("");setShowNewProjForm(false);
  }
  async function deleteProject(id) {
    if(!window.confirm("과제를 삭제할까요?"))return;
    setProjects(ps=>ps.filter(p=>p.id!==id));
    setTasks(t2=>t2.map(t=>t.project_id===id?{...t,project_id:null}:t));
    await supabase.from("projects").delete().eq("id",id);
  }
  async function toggleProjDone(id) {
    const proj=projects.find(p=>p.id===id);if(!proj)return;
    if(!proj.done)setShowConfetti(true);
    const updated={...proj,done:!proj.done};
    setProjects(ps=>ps.map(p=>p.id===id?updated:p));
    await supabase.from("projects").update({done:!proj.done}).eq("id",id);
  }
  async function saveEditProj(id) {
    const name=editingProjName.trim();if(!name)return;
    const updates={name,color:editingProjColor,open_date:editingProjOpenDate||null};
    setProjects(ps=>ps.map(p=>p.id===id?{...p,...updates}:p));
    await supabase.from("projects").update(updates).eq("id",id);
    setEditingProjId(null);
  }
  async function submit() {
    if(!form.title.trim())return;
    const id=Date.now();
    const row={id,title:form.title,memo:form.memo||null,due:form.due||null,schedule:form.schedule,schedule_date:form.schedule!=="date"?null:form.schedule_date||null,project_id:form.project_id||null,done:false,created_at:ts};
    if(editId){
      const{id:_,...updates}=row;
      setTasks(t2=>t2.map(t=>t.id===editId?{...t,...updates}:t));
      await supabase.from("tasks").update(updates).eq("id",editId);
      setEditId(null);
    }else{
      setTasks(t2=>[...t2,row]);
      await supabase.from("tasks").insert(row);
    }
    setForm(f=>({title:"",memo:"",due:"",schedule:"today",schedule_date:"",project_id:f.project_id}));
    setShowForm(false);
  }
  async function toggleDone(id) {
    const t=tasks.find(x=>x.id===id);if(!t)return;
    if(!t.done)setShowConfetti(true);
    setTasks(t2=>t2.map(x=>x.id===id?{...x,done:!x.done}:x));
    await supabase.from("tasks").update({done:!t.done}).eq("id",id);
  }
  async function moveTask(t) {
    const eff=getEff(t,ts);
    const updates=eff==="today"?{schedule:"tomorrow",schedule_date:null}:{schedule:"today",schedule_date:null};
    setTasks(t2=>t2.map(x=>x.id===t.id?{...x,...updates}:x));
    await supabase.from("tasks").update(updates).eq("id",t.id);
  }
  async function deleteTask(id) {
    if(!window.confirm("할 일을 삭제할까요?"))return;
    setTasks(t2=>t2.filter(t=>t.id!==id));
    await supabase.from("tasks").delete().eq("id",id);
  }
  function startEdit(t) {
    setForm({title:t.title,memo:t.memo||"",due:t.due||"",schedule:t.schedule||"none",schedule_date:t.schedule_date||"",project_id:t.project_id||""});
    setEditId(t.id);setShowForm(true);
  }
  function cancelForm() {
    setForm(f=>({title:"",memo:"",due:"",schedule:"today",schedule_date:"",project_id:f.project_id}));
    setEditId(null);setShowForm(false);
  }
  async function submitPhase() {
    if(!phaseForm.name.trim()||!phaseForm.start_date||!phaseForm.end_date||!selProj)return;
    if(editPhaseId){
      const updates={name:phaseForm.name,start_date:phaseForm.start_date,end_date:phaseForm.end_date,color:phaseForm.color};
      setPhases(ps=>ps.map(p=>p.id===editPhaseId?{...p,...updates}:p));
      await supabase.from("phases").update(updates).eq("id",editPhaseId);
      setEditPhaseId(null);
    }else{
      const id=Date.now();
      const row={id,...phaseForm,project_id:Number(selProj)};
      setPhases(ps=>[...ps,row]);
      await supabase.from("phases").insert(row);
    }
    setPhaseForm({name:"",start_date:"",end_date:"",color:COLORS[0]});
    setShowPhaseForm(false);
  }
  async function deletePhase(id) {
    if(!window.confirm("단계를 삭제할까요?"))return;
    setPhases(ps=>ps.filter(p=>p.id!==id));
    await supabase.from("phases").delete().eq("id",id);
  }
  async function updatePhase(id,updates) {
    setPhases(ps=>ps.map(p=>p.id===id?{...p,...updates}:p));
    await supabase.from("phases").update(updates).eq("id",id);
  }

  const undone=tasks.filter(t=>!t.done);
  const done=tasks.filter(t=>t.done);
  const todayCnt=undone.filter(t=>getEff(t,ts)==="today").length;
  const backlogCnt=undone.filter(t=>getEff(t,ts)==="backlog").length;

  function getFiltered() {
    if(view==="today")return undone.filter(t=>getEff(t,ts)==="today");
    if(view==="backlog")return undone.filter(t=>getEff(t,ts)==="backlog");
    if(view==="all")return undone;
    return done;
  }

  function groupByProject(list) {
    const groups={};
    for(const t of list){const key=t.project_id?String(t.project_id):"__none__";if(!groups[key])groups[key]=[];groups[key].push(t);}
    const order=[...projects.map(p=>String(p.id)),"__none__"];
    return order.filter(k=>groups[k]).map(k=>({key:k,tasks:groups[k]}));
  }

  // ── Task row ──────────────────────────────────────────────────
  function renderTask(t,idx,arr) {
    const eff=getEff(t,ts);
    const hasMemo=t.memo&&t.memo.trim();
    const pinned=eff==="today";
    return(
      <div key={t.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 16px",borderBottom:idx===arr.length-1?"none":"1px solid "+tk.gray4,textAlign:"left"}}>
        <button onClick={()=>toggleDone(t.id)} style={{width:18,height:18,borderRadius:3,border:"1.5px solid "+(t.done?tk.accent:tk.gray3),background:t.done?tk.accent:"transparent",flexShrink:0,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,marginTop:2}}>
          {t.done&&<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 3.5L3.8 6.5L9 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </button>
        <div style={{flex:1,minWidth:0,opacity:t.done?0.38:1}}>
          <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap",marginBottom:hasMemo?3:0}}>
            <span style={{fontSize:14,color:tk.labelSub,fontWeight:500,textDecoration:t.done?"line-through":"none",lineHeight:1.4}}>{t.title}</span>
            {t.schedule==="date"&&t.schedule_date&&(
              <Badge color={t.schedule_date<=ts?tk.orange:tk.accentSub} bg={t.schedule_date<=ts?"#FEF3C7":tk.gray5}>{fmtDate(t.schedule_date)}</Badge>
            )}
            {t.due&&(
              isOD(t.due)?<Badge color={tk.red} bg={"#FEE2E2"}>{fmtDate(t.due)} 초과</Badge>:
              isTD(t.due)?<Badge color={tk.orange} bg={"#FEF3C7"}>오늘 마감</Badge>:
              isDS(t.due)?<Badge color={tk.orange} bg={"#FEF3C7"}>~{fmtDate(t.due)}</Badge>:
              <Badge>~{fmtDate(t.due)}</Badge>
            )}
          </div>
          {hasMemo&&<p style={{fontSize:12,color:tk.gray3,margin:0,whiteSpace:"pre-line",lineHeight:1.5,textAlign:"left"}}>{t.memo}</p>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:0,flexShrink:0}}>
          {!t.done&&(
            <button onClick={()=>moveTask(t)} title={pinned?"백로그로":"오늘로"} style={{background:"none",border:"none",cursor:"pointer",padding:"0 6px",display:"flex",alignItems:"center"}}>
              {pinned?<IconPinned/>:<IconUnpinned/>}
            </button>
          )}
          <button onClick={()=>startEdit(t)} style={btnLink(tk.gray1)}>편집</button>
          <button onClick={()=>deleteTask(t.id)} style={btnLink(tk.gray3)}>삭제</button>
        </div>
      </div>
    );
  }

  function renderGroups(list) {
    const groups=groupByProject(list);
    if(groups.length===0) return(
      <div style={{textAlign:"left",padding:"60px 0 40px",color:tk.gray3,fontSize:14}}>
        <div style={{fontSize:24,marginBottom:10}}>·</div>
        할 일이 없어요
      </div>
    );
    return groups.map(g=>{
      const proj=g.key==="__none__"?null:projOf(Number(g.key));
      const color=proj?proj.color:tk.gray3;
      return(
        <div key={g.key}>
          <SectionHeader>
            <span style={{width:6,height:6,borderRadius:2,background:color,display:"inline-block",flexShrink:0}}/>
            <span>{proj?proj.name:"미지정"}</span>
            <span style={{background:tk.gray5,color:tk.gray2,borderRadius:tk.radiusPill,padding:"1px 6px",fontSize:10,fontWeight:600,textTransform:"none",letterSpacing:0,border:"1px solid "+tk.gray4}}>{g.tasks.length}</span>
            {proj&&proj.open_date&&<span style={{fontSize:10,color:tk.gray3,fontWeight:400,textTransform:"none",letterSpacing:0}}>{fmtDate(proj.open_date)} 오픈</span>}
          </SectionHeader>
          <GroupCard>{g.tasks.map((t,i,a)=>renderTask(t,i,a))}</GroupCard>
        </div>
      );
    });
  }

  function renderScheduleTab() {
    const fp=phases.filter(p=>!selProj||p.project_id===Number(selProj));
    return(
      <div style={{textAlign:"left"}}>
        <SectionHeader>과제 선택</SectionHeader>
        <GroupCard>
          <Row last>
            <span style={{flex:1,fontSize:14,color:tk.label}}>과제</span>
            <select value={selProj} onChange={e=>setSelProj(e.target.value)} style={sel}>
              <option value="">전체 보기</option>
              {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Row>
        </GroupCard>
        {selProj&&(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <SectionHeader>단계</SectionHeader>
              <button onClick={()=>setShowPhaseForm(v=>!v)} style={btnLink()}>{showPhaseForm?"접기":"+ 추가"}</button>
            </div>
            {showPhaseForm&&(
              <>
                <GroupCard>
                  <Row>
                    <input placeholder="단계 이름" value={phaseForm.name} onChange={e=>setPhaseForm(f=>({...f,name:e.target.value}))} style={{flex:1,fontSize:14,border:"none",outline:"none",background:"transparent",fontFamily:font,color:tk.label,textAlign:"left"}}/>
                    <ColorPicker value={phaseForm.color} onChange={c=>setPhaseForm(f=>({...f,color:c}))}/>
                  </Row>
                  <Row>
                    <span style={{flex:1,fontSize:14,color:tk.label}}>시작일</span>
                    <input type="date" value={phaseForm.start_date} onChange={e=>setPhaseForm(f=>({...f,start_date:e.target.value}))} style={sel}/>
                  </Row>
                  <Row last>
                    <span style={{flex:1,fontSize:14,color:tk.label}}>종료일</span>
                    <input type="date" value={phaseForm.end_date} onChange={e=>setPhaseForm(f=>({...f,end_date:e.target.value}))} style={sel}/>
                  </Row>
                </GroupCard>
                <div style={{margin:"0 0 14px"}}>
                  <button onClick={submitPhase} style={{width:"100%",background:tk.accent,color:"#fff",border:"none",borderRadius:tk.radius,height:42,fontSize:14,fontWeight:500,cursor:"pointer",fontFamily:font,letterSpacing:"0.01em"}}>
                    {editPhaseId?"저장":"단계 추가"}
                  </button>
                </div>
              </>
            )}
          </>
        )}
        {fp.length>0&&(
          <>
            <SectionHeader>등록된 단계</SectionHeader>
            <GroupCard>
              {fp.map((ph,i,a)=>{
                const proj=projOf(ph.project_id);
                return(
                  <div key={ph.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",minHeight:44,borderBottom:i===a.length-1?"none":"1px solid "+tk.gray4,textAlign:"left"}}>
                    <span style={{width:8,height:8,borderRadius:2,background:ph.color,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,color:tk.label}}>{proj?proj.name+" · ":""}{ph.name}</div>
                      <div style={{fontSize:11,color:tk.gray2,marginTop:1}}>{fmtDate(ph.start_date)}{" ~ "}{fmtDate(ph.end_date)}</div>
                    </div>
                    <button onClick={()=>{setEditPhaseId(ph.id);setSelProj(String(ph.project_id));setPhaseForm({name:ph.name,start_date:ph.start_date,end_date:ph.end_date,color:ph.color});setShowPhaseForm(true);}} style={btnLink()}>수정</button>
                    <button onClick={()=>deletePhase(ph.id)} style={btnLink(tk.gray3)}>삭제</button>
                  </div>
                );
              })}
            </GroupCard>
          </>
        )}
        <SectionHeader>월별 캘린더</SectionHeader>
        <GroupCard>
          <div style={{padding:16,textAlign:"left"}}>
            <DraggableCalendar phases={fp} projects={projects} calDate={calDate} setCalDate={setCalDate} onUpdatePhase={updatePhase}/>
          </div>
        </GroupCard>
      </div>
    );
  }

  const tabs=[
    {key:"all",label:"전체",count:undone.length},
    {key:"today",label:"오늘",count:todayCnt},
    {key:"backlog",label:"백로그",count:backlogCnt},
    {key:"done",label:"완료",count:done.length},
  ];

  if(loading) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:font,color:tk.gray2,fontSize:13,letterSpacing:"0.05em"}}>
      불러오는 중
    </div>
  );

  return(
    <div style={{background:tk.bg,minHeight:"100vh",fontFamily:font}}>
      {showConfetti&&<Confetti onDone={()=>setShowConfetti(false)}/>}

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{background:"rgba(250,250,250,0.9)",backdropFilter:"blur(16px)",borderBottom:"1px solid "+tk.gray4,padding:"0 20px",height:50,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        {editingTitle?(
          <input value={appTitle} onChange={e=>setAppTitle(e.target.value)} onBlur={()=>setEditingTitle(false)} onKeyDown={e=>{if(e.key==="Enter"||e.key==="Escape")setEditingTitle(false);}} autoFocus style={{fontSize:15,fontWeight:700,border:"none",borderBottom:"1.5px solid "+tk.accent,outline:"none",background:"transparent",width:160,fontFamily:font,letterSpacing:"-0.01em",textAlign:"left"}}/>
        ):(
          <span onClick={()=>setEditingTitle(true)} style={{fontSize:15,fontWeight:700,cursor:"pointer",letterSpacing:"-0.01em",color:tk.label}}>{appTitle}</span>
        )}
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>setShowProjMgr(v=>!v)} style={{background:"transparent",color:tk.accentSub,border:"1px solid "+tk.gray3,borderRadius:tk.radius,padding:"0 12px",height:32,fontSize:12,cursor:"pointer",fontFamily:font,fontWeight:500}}>
            과제 관리
          </button>
          <button onClick={()=>{setShowForm(v=>!v);setEditId(null);}} style={{background:tk.accent,color:"#fff",border:"none",borderRadius:tk.radius,padding:"0 12px",height:32,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:font}}>
            + 추가
          </button>
        </div>
      </div>

      <div style={{maxWidth:640,margin:"0 auto",padding:"0 16px 40px",textAlign:"left"}}>

        {/* ── Project Manager ─────────────────────────────── */}
        {showProjMgr&&(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <SectionHeader>과제 목록</SectionHeader>
              <button onClick={()=>setShowNewProjForm(v=>!v)} style={btnLink()}>{showNewProjForm?"접기":"+ 추가"}</button>
            </div>
            <GroupCard>
              {projects.filter(p=>!p.done).length===0&&projects.filter(p=>p.done).length===0&&(
                <div style={{padding:"14px 16px",color:tk.gray3,fontSize:13,textAlign:"left"}}>등록된 과제가 없어요</div>
              )}
              {projects.filter(p=>!p.done).map((p,i,a)=>(
                <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",minHeight:44,borderBottom:i===a.length-1?"none":"1px solid "+tk.gray4,textAlign:"left"}}>
                  <span style={{width:6,height:6,borderRadius:2,background:p.color,flexShrink:0}}/>
                  {editingProjId===p.id?(
                    <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <ColorPicker value={editingProjColor} onChange={setEditingProjColor}/>
                        <input value={editingProjName} onChange={e=>setEditingProjName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();saveEditProj(p.id);}else if(e.key==="Escape")setEditingProjId(null);}} autoFocus style={{flex:1,fontSize:14,border:"none",outline:"none",fontFamily:font,textAlign:"left"}}/>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:12,color:tk.gray2}}>오픈일</span>
                        <input type="date" value={editingProjOpenDate} onChange={e=>setEditingProjOpenDate(e.target.value)} style={{...sel,fontSize:12}}/>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={()=>saveEditProj(p.id)} style={btnLink()}>저장</button>
                        <button onClick={()=>setEditingProjId(null)} style={btnLink(tk.gray2)}>취소</button>
                      </div>
                    </div>
                  ):(
                    <>
                      <div style={{flex:1,minWidth:0,textAlign:"left"}}>
                        <div style={{fontSize:13,color:tk.label}}>{p.name}</div>
                        {p.open_date&&<div style={{fontSize:11,color:tk.gray2,marginTop:1}}>{fmtDate(p.open_date)} 오픈</div>}
                      </div>
                      <button onClick={()=>toggleProjDone(p.id)} style={{...btnLink(tk.gray2),fontSize:12,border:"1px solid "+tk.gray4,borderRadius:6,padding:"3px 8px"}}>완료</button>
                      <button onClick={()=>{setEditingProjId(p.id);setEditingProjName(p.name);setEditingProjColor(p.color);setEditingProjOpenDate(p.open_date||"");}} style={btnLink()}>수정</button>
                      <button onClick={()=>deleteProject(p.id)} style={btnLink(tk.gray3)}>삭제</button>
                    </>
                  )}
                </div>
              ))}
            </GroupCard>

            {projects.filter(p=>p.done).length>0&&(
              <>
                <SectionHeader>완료된 과제</SectionHeader>
                <GroupCard>
                  {projects.filter(p=>p.done).map((p,i,a)=>(
                    <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",minHeight:44,borderBottom:i===a.length-1?"none":"1px solid "+tk.gray4,textAlign:"left"}}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <circle cx="6" cy="6" r="6" fill={p.color} opacity="0.2"/>
                        <path d="M3 6L5.2 8.5L9 4" stroke={p.color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <div style={{flex:1,minWidth:0,opacity:0.4,textAlign:"left"}}>
                        <div style={{fontSize:13,textDecoration:"line-through",color:tk.label}}>{p.name}</div>
                        {p.open_date&&<div style={{fontSize:11,color:tk.gray2,marginTop:1}}>{fmtDate(p.open_date)} 오픈</div>}
                      </div>
                      <button onClick={()=>toggleProjDone(p.id)} style={btnLink()}>되돌리기</button>
                      <button onClick={()=>deleteProject(p.id)} style={btnLink(tk.gray3)}>삭제</button>
                    </div>
                  ))}
                </GroupCard>
              </>
            )}

            {showNewProjForm&&(
              <GroupCard>
                <div style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",minHeight:44,textAlign:"left"}}>
                  <ColorPicker value={newProjColor} onChange={setNewProjColor}/>
                  <div style={{flex:1,display:"flex",flexDirection:"column",gap:4}}>
                    <input placeholder="새 과제 이름" value={newProjName} onChange={e=>setNewProjName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();e.stopPropagation();addProject();}}} autoFocus style={{fontSize:14,border:"none",outline:"none",background:"transparent",fontFamily:font,color:tk.label,textAlign:"left"}}/>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:11,color:tk.gray2}}>오픈일</span>
                      <input type="date" value={newProjOpenDate} onChange={e=>setNewProjOpenDate(e.target.value)} style={{...sel,fontSize:11}}/>
                    </div>
                  </div>
                  <button onClick={addProject} style={{background:tk.accent,color:"#fff",border:"none",borderRadius:6,padding:"0 12px",height:30,fontSize:12,cursor:"pointer",fontFamily:font,flexShrink:0,fontWeight:500}}>추가</button>
                </div>
              </GroupCard>
            )}
          </>
        )}

        {/* ── Add / Edit Form ─────────────────────────────── */}
        {showForm&&(
          <>
            <SectionHeader>{editId?"할 일 편집":"새 할 일"}</SectionHeader>
            <GroupCard>
              <Row>
                <input placeholder="할 일을 입력하세요" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} onKeyDown={e=>{if(e.key==="Enter")submit();}} autoFocus style={{flex:1,fontSize:15,border:"none",outline:"none",background:"transparent",fontFamily:font,color:tk.label,fontWeight:500,textAlign:"left"}}/>
              </Row>
              <Row>
                <textarea placeholder="메모 (선택)" value={form.memo} onChange={e=>setForm(f=>({...f,memo:e.target.value}))} rows={2} style={{flex:1,fontSize:13,border:"none",outline:"none",resize:"none",background:"transparent",fontFamily:font,lineHeight:1.6,color:tk.labelSub,textAlign:"left"}}/>
              </Row>
              <Row>
                <span style={{flex:1,fontSize:13,color:tk.gray1}}>과제</span>
                <select value={form.project_id} onChange={e=>setForm(f=>({...f,project_id:e.target.value?Number(e.target.value):""}))} style={sel}>
                  <option value="">미지정</option>
                  {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Row>
              <Row>
                <span style={{flex:1,fontSize:13,color:tk.gray1}}>일정</span>
                <select value={form.schedule} onChange={e=>setForm(f=>({...f,schedule:e.target.value,schedule_date:""}))} style={sel}>
                  <option value="today">오늘</option>
                  <option value="date">날짜 지정</option>
                  <option value="tomorrow">백로그</option>
                  <option value="none">미지정</option>
                </select>
              </Row>
              {form.schedule==="date"&&(
                <Row>
                  <span style={{flex:1,fontSize:13,color:tk.gray1}}>날짜</span>
                  <input type="date" value={form.schedule_date} min={ts} onChange={e=>setForm(f=>({...f,schedule_date:e.target.value}))} style={sel}/>
                </Row>
              )}
              <Row last>
                <span style={{flex:1,fontSize:13,color:tk.gray1}}>마감일</span>
                <input type="date" value={form.due} onChange={e=>setForm(f=>({...f,due:e.target.value}))} style={{...sel,color:form.due?tk.accentSub:tk.gray3}}/>
              </Row>
            </GroupCard>
            <div style={{display:"flex",gap:8,margin:"0 0 14px"}}>
              <button onClick={submit} style={{flex:1,background:tk.accent,color:"#fff",border:"none",borderRadius:tk.radius,height:42,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:font}}>{editId?"저장":"추가"}</button>
              <button onClick={cancelForm} style={{flex:1,background:tk.bgCard,color:tk.gray1,border:"1px solid "+tk.gray4,borderRadius:tk.radius,height:42,fontSize:14,cursor:"pointer",fontFamily:font}}>취소</button>
            </div>
          </>
        )}

        {/* ── Tab Bar ─────────────────────────────────────── */}
        <div style={{display:"flex",alignItems:"center",gap:6,margin:"14px 0 6px"}}>
          <div style={{display:"flex",flex:1,background:tk.gray5,borderRadius:tk.radius,padding:2,gap:2}}>
            {tabs.map(tab=>(
              <button key={tab.key} onClick={()=>setView(tab.key)}
                style={{flex:1,height:32,borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:view===tab.key?600:400,background:view===tab.key?"#fff":"transparent",color:view===tab.key?tk.label:tk.gray1,boxShadow:view===tab.key?"0 1px 4px rgba(0,0,0,0.1)":"none",fontFamily:font,display:"flex",alignItems:"center",justifyContent:"center",gap:3}}>
                {tab.label}
                {tab.count>0&&<span style={{fontSize:10,fontWeight:600,background:view===tab.key?tk.gray5:"transparent",borderRadius:tk.radiusPill,padding:"0 4px",color:tk.gray1}}>{tab.count}</span>}
              </button>
            ))}
          </div>
          <button onClick={()=>setView(v=>v==="schedule"?"all":"schedule")}
            style={{width:36,height:36,borderRadius:tk.radius,border:"1px solid "+(view==="schedule"?tk.accent:tk.gray4),background:view==="schedule"?tk.accent:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="2" width="12" height="11" rx="2" stroke={view==="schedule"?"#fff":tk.gray2} strokeWidth="1.2"/>
              <path d="M1 5h12" stroke={view==="schedule"?"#fff":tk.gray2} strokeWidth="1.2"/>
              <line x1="4" y1="1" x2="4" y2="3.5" stroke={view==="schedule"?"#fff":tk.gray2} strokeWidth="1.2" strokeLinecap="round"/>
              <line x1="10" y1="1" x2="10" y2="3.5" stroke={view==="schedule"?"#fff":tk.gray2} strokeWidth="1.2" strokeLinecap="round"/>
              <rect x="3.5" y="7.5" width="2" height="2" rx="0.5" fill={view==="schedule"?"#fff":tk.gray2}/>
              <rect x="6.5" y="7.5" width="2" height="2" rx="0.5" fill={view==="schedule"?"#fff":tk.gray2}/>
              <rect x="9.5" y="7.5" width="2" height="2" rx="0.5" fill={view==="schedule"?"#fff":tk.gray2}/>
            </svg>
          </button>
        </div>

        {view==="schedule"?renderScheduleTab():renderGroups(getFiltered())}
      </div>
    </div>
  );
}