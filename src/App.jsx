import { useState, useEffect, useRef } from "react";

const TASKS_KEY = "pm_tasks";
const PROJECTS_KEY = "pm_projects";
const TITLE_KEY = "pm_title";
const PHASES_KEY = "pm_phases";

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
}
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
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

const COLORS = ["#7F77DD","#1D9E75","#D85A30","#D4537E","#007AFF","#639922","#BA7517","#E24B4A"];
const tk = {
  blue:"#007AFF", red:"#FF3B30", orange:"#FF9500",
  gray1:"#8E8E93", gray2:"#AEAEB2", gray3:"#C7C7CC", gray4:"#D1D1D6", gray5:"#E5E5EA",
  blueLight:"#EBF2FF", label:"#000000", bg:"#F2F2F7", bgCard:"#FFFFFF",
  radius:"10px", radiusLg:"12px", radiusPill:"999px",
};
const font = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif';

function getEff(task, ts) {
  if (task.schedule === "today") return "today";
  if (task.schedule === "date" && task.scheduleDate) return task.scheduleDate <= ts ? "today" : "backlog";
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
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const cols = ["#007AFF","#FF3B30","#FF9500","#34C759","#7F77DD","#D4537E","#FFD60A","#30D158"];
    const pts = [];
    function burst(ox, oy, n) {
      for (let i = 0; i < n; i++) {
        const a = (Math.PI*2*i)/n + Math.random()*0.3, sp = Math.random()*8+3;
        pts.push({ x:ox, y:oy, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp-2, color:cols[Math.floor(Math.random()*cols.length)], size:Math.random()*7+3, shape:Math.random()>0.5?"r":"c", alpha:1, rot:Math.random()*Math.PI*2, rs:(Math.random()-0.5)*0.3, g:0.18, drag:0.97 });
      }
    }
    burst(cx, cy*0.5, 60);
    setTimeout(function(){ burst(cx*0.4, cy*0.6, 40); }, 200);
    setTimeout(function(){ burst(cx*1.6, cy*0.6, 40); }, 350);
    setTimeout(function(){ burst(cx, cy*0.3, 30); }, 500);
    let frame;
    function draw() {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      let alive = false;
      for (let i=0; i<pts.length; i++) {
        const p = pts[i];
        if (p.alpha <= 0) continue;
        alive = true;
        p.vx*=p.drag; p.vy*=p.drag; p.vy+=p.g;
        p.x+=p.vx; p.y+=p.vy; p.rot+=p.rs; p.alpha-=0.012;
        ctx.save(); ctx.globalAlpha=Math.max(0,p.alpha); ctx.fillStyle=p.color;
        ctx.translate(p.x,p.y); ctx.rotate(p.rot);
        if (p.shape==="c") { ctx.beginPath(); ctx.arc(0,0,p.size/2,0,Math.PI*2); ctx.fill(); }
        else { ctx.fillRect(-p.size/2,-p.size/2*1.6,p.size,p.size*1.6); }
        ctx.restore();
      }
      if (alive) { frame = requestAnimationFrame(draw); } else { onDone(); }
    }
    frame = requestAnimationFrame(draw);
    return function() { cancelAnimationFrame(frame); };
  }, []);
  return <canvas ref={ref} style={{ position:"fixed", top:0, left:0, width:"100vw", height:"100vh", pointerEvents:"none", zIndex:9999 }} />;
}

function ColorPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position:"relative", flexShrink:0 }}>
      <button onClick={() => setOpen(v => !v)} style={{ width:24, height:24, borderRadius:"50%", background:value, border:"2px solid rgba(0,0,0,0.08)", cursor:"pointer", padding:0 }} />
      {open && (
        <div style={{ position:"fixed", zIndex:1000, background:tk.bgCard, border:"0.5px solid "+tk.gray4, borderRadius:tk.radius, padding:"10px", display:"flex", gap:8, flexWrap:"wrap", width:148, boxShadow:"0 8px 24px rgba(0,0,0,0.12)" }}>
          {COLORS.map(c => (
            <button key={c} onClick={() => { onChange(c); setOpen(false); }} style={{ width:22, height:22, borderRadius:"50%", background:c, border:"none", cursor:"pointer", padding:0, outline:value===c?"2.5px solid "+c:"none", outlineOffset:2 }} />
          ))}
        </div>
      )}
    </div>
  );
}

function GroupCard({ children }) {
  return <div style={{ background:tk.bgCard, borderRadius:tk.radiusLg, overflow:"hidden", marginBottom:8 }}>{children}</div>;
}
function Row({ children, last }) {
  return <div style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 16px", minHeight:44, textAlign:"left", borderBottom:last?"none":"0.5px solid "+tk.gray5 }}>{children}</div>;
}
function SectionHeader({ children }) {
  return <div style={{ fontSize:12, fontWeight:600, color:tk.gray1, textTransform:"uppercase", letterSpacing:"0.05em", padding:"20px 4px 6px", display:"flex", alignItems:"center", gap:6 }}>{children}</div>;
}
function Badge({ color, children }) {
  return <span style={{ display:"inline-flex", alignItems:"center", height:18, padding:"0 7px", borderRadius:tk.radiusPill, fontSize:11, fontWeight:600, background:color+"20", color }}>{children}</span>;
}

const IconPinned = () => <span style={{ fontSize:14, opacity:1 }}>📌</span>;
const IconUnpinned = () => <span style={{ fontSize:14, opacity:0.3 }}>📌</span>;

function DraggableCalendar({ phases, projects, calDate, setCalDate, onUpdatePhase }) {
  const [dragging, setDragging] = useState(null);
  const [hoverDay, setHoverDay] = useState(null);
  const y = calDate.y, m = calDate.m;
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const monthStr = y + "-" + String(m+1).padStart(2,"0");
  const ts = today();
  const cells = [];
  for (let i=0; i<firstDay; i++) cells.push(null);
  for (let d=1; d<=daysInMonth; d++) cells.push(d);
  const vis = phases.filter(ph => ph.start && ph.end && ph.start.slice(0,7) <= monthStr && ph.end.slice(0,7) >= monthStr);
  const days = ["일","월","화","수","목","금","토"];

  function ds(d) { return y+"-"+String(m+1).padStart(2,"0")+"-"+String(d).padStart(2,"0"); }
  function prev(ph) {
    if (!dragging || dragging.phaseId !== ph.id || !hoverDay) return { start:ph.start, end:ph.end };
    const delta = diffDays(dragging.startDayStr, hoverDay);
    return { start:addDays(dragging.origStart,delta), end:addDays(dragging.origEnd,delta) };
  }

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <button onClick={() => setCalDate(c => c.m===0?{y:c.y-1,m:11}:{y:c.y,m:c.m-1})} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:tk.blue, padding:"0 8px" }}>{"‹"}</button>
        <span style={{ fontSize:16, fontWeight:600, color:tk.label }}>{y}{"년 "}{m+1}{"월"}</span>
        <button onClick={() => setCalDate(c => c.m===11?{y:c.y+1,m:0}:{y:c.y,m:c.m+1})} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:tk.blue, padding:"0 8px" }}>{"›"}</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", marginBottom:4 }}>
        {days.map(d => <div key={d} style={{ textAlign:"center", fontSize:11, fontWeight:600, color:tk.gray1, padding:"4px 0" }}>{d}</div>)}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:2 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={"e"+i} />;
          const dateStr = ds(d);
          const isT = dateStr === ts;
          const isH = hoverDay === dateStr && dragging;
          const dph = vis.filter(ph => { const p = prev(ph); return p.start <= dateStr && p.end >= dateStr; });
          return (
            <div key={d}
              onDragOver={e => { e.preventDefault(); setHoverDay(dateStr); }}
              onDrop={e => { e.preventDefault(); if (!dragging) return; const delta = diffDays(dragging.startDayStr,dateStr); if (delta!==0) onUpdatePhase(dragging.phaseId,{start:addDays(dragging.origStart,delta),end:addDays(dragging.origEnd,delta)}); setDragging(null); setHoverDay(null); }}
              style={{ minHeight:64, padding:"4px 3px", background:isH?tk.blueLight:isT?"#F0F7FF":"transparent", borderRadius:8 }}>
              <div style={{ textAlign:"center", fontSize:13, fontWeight:isT?700:400, color:isT?tk.blue:tk.label, marginBottom:3 }}>{d}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                {dph.slice(0,3).map(ph => {
                  const p = prev(ph);
                  return (
                    <div key={ph.id} draggable
                      onDragStart={e => { e.stopPropagation(); setDragging({phaseId:ph.id,startDayStr:dateStr,origStart:ph.start,origEnd:ph.end}); e.dataTransfer.effectAllowed="move"; }}
                      onDragEnd={() => { setDragging(null); setHoverDay(null); }}
                      style={{ background:ph.color, color:"#fff", fontSize:10, fontWeight:500, padding:"2px 5px", borderRadius:p.start===dateStr&&p.end===dateStr?4:p.start===dateStr?"4px 0 0 4px":p.end===dateStr?"0 4px 4px 0":0, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis", cursor:"grab", opacity:dragging&&dragging.phaseId===ph.id?0.5:1, userSelect:"none" }}>
                      {p.start===dateStr?ph.name:"\u00A0"}
                    </div>
                  );
                })}
                {dph.length>3 && <div style={{ fontSize:9, color:tk.gray1, textAlign:"center" }}>{"+"}{dph.length-3}</div>}
              </div>
            </div>
          );
        })}
      </div>
      {vis.length > 0 && (
        <div style={{ marginTop:16, display:"flex", flexWrap:"wrap", gap:8 }}>
          {vis.map(ph => {
            const proj = projects.find(p => p.id===ph.projectId);
            const p = prev(ph);
            return (
              <div key={ph.id} style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:tk.gray1 }}>
                <span style={{ width:10, height:10, borderRadius:3, background:ph.color, flexShrink:0 }} />
                <span style={{ color:tk.label }}>{proj?proj.name+" · ":""}{ph.name}</span>
                <span>{fmtDate(p.start)}{"~"}{fmtDate(p.end)}</span>
              </div>
            );
          })}
        </div>
      )}
      <p style={{ fontSize:11, color:tk.gray2, marginTop:12, textAlign:"center" }}>{"막대를 드래그해서 날짜를 이동할 수 있어요"}</p>
    </div>
  );
}

export default function App() {
  const [tasks, setTasks] = useState(() => load(TASKS_KEY, []));
  const [projects, setProjects] = useState(() => load(PROJECTS_KEY, []));
  const [phases, setPhases] = useState(() => load(PHASES_KEY, []));
  const [appTitle, setAppTitle] = useState(() => load(TITLE_KEY, "할 일"));
  const [editingTitle, setEditingTitle] = useState(false);
  const [form, setForm] = useState({ title:"", memo:"", due:"", schedule:"today", scheduleDate:"", projectId:"" });
  const [editId, setEditId] = useState(null);
  const [view, setView] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [showProjMgr, setShowProjMgr] = useState(false);
  const [showNewProjForm, setShowNewProjForm] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newProjColor, setNewProjColor] = useState(COLORS[0]);
  const [newProjOpenDate, setNewProjOpenDate] = useState("");
  const [editingProjId, setEditingProjId] = useState(null);
  const [editingProjName, setEditingProjName] = useState("");
  const [editingProjColor, setEditingProjColor] = useState("");
  const [editingProjOpenDate, setEditingProjOpenDate] = useState("");
  const [calDate, setCalDate] = useState(() => { const d = new Date(); return { y:d.getFullYear(), m:d.getMonth() }; });
  const [selProj, setSelProj] = useState("");
  const [showPhaseForm, setShowPhaseForm] = useState(false);
  const [phaseForm, setPhaseForm] = useState({ name:"", start:"", end:"", color:COLORS[0] });
  const [editPhaseId, setEditPhaseId] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => { save(TASKS_KEY, tasks); }, [tasks]);
  useEffect(() => { save(PROJECTS_KEY, projects); }, [projects]);
  useEffect(() => { save(PHASES_KEY, phases); }, [phases]);
  useEffect(() => { save(TITLE_KEY, appTitle); }, [appTitle]);

  const ts = today();
  const isOD = d => d && d < ts;
  const isTD = d => d === ts;
  const isDS = d => { if (!d) return false; const diff=(new Date(d)-new Date(ts))/86400000; return diff>0&&diff<=3; };
  const projOf = id => projects.find(p => p.id===id);
  const sel = { fontSize:14, border:"none", background:"transparent", color:tk.blue, outline:"none", cursor:"pointer", fontFamily:font };

  function addProject() {
    const name = newProjName.trim();
    if (!name) return;
    setProjects(ps => [...ps, { id:Date.now(), name, color:newProjColor, openDate:newProjOpenDate, done:false }]);
    setNewProjName(""); setNewProjColor(COLORS[0]); setNewProjOpenDate(""); setShowNewProjForm(false);
  }
  function deleteProject(id) {
    if (!window.confirm("과제를 삭제할까요?")) return;
    setProjects(ps => ps.filter(p => p.id!==id));
    setTasks(t2 => t2.map(t => t.projectId===id ? {...t,projectId:""} : t));
  }
  function toggleProjDone(id) {
    setProjects(ps => ps.map(p => {
      if (p.id!==id) return p;
      if (!p.done) setShowConfetti(true);
      return {...p,done:!p.done};
    }));
  }
  function saveEditProj(id) {
    const name = editingProjName.trim();
    if (name) setProjects(ps => ps.map(p => p.id===id ? {...p,name,color:editingProjColor,openDate:editingProjOpenDate} : p));
    setEditingProjId(null);
  }
  function submit() {
    if (!form.title.trim()) return;
    const task = {...form};
    if (task.schedule!=="date") task.scheduleDate="";
    if (editId) {
      setTasks(t2 => t2.map(t => t.id===editId ? {...t,...task} : t));
      setEditId(null);
    } else {
      setTasks(t2 => [...t2, {...task,id:Date.now(),done:false,createdAt:ts}]);
    }
    setForm(f => ({title:"",memo:"",due:"",schedule:"today",scheduleDate:"",projectId:f.projectId}));
    setShowForm(false);
  }
  function toggleDone(id) {
    setTasks(t2 => t2.map(t => {
      if (t.id!==id) return t;
      if (!t.done) setShowConfetti(true);
      return {...t,done:!t.done};
    }));
  }
  function moveTask(t) {
    const eff = getEff(t, ts);
    const next = eff==="today" ? {schedule:"tomorrow",scheduleDate:""} : {schedule:"today",scheduleDate:""};
    setTasks(t2 => t2.map(x => x.id===t.id ? {...x,...next} : x));
  }
  function deleteTask(id) {
    if (!window.confirm("할 일을 삭제할까요?")) return;
    setTasks(t2 => t2.filter(t => t.id!==id));
  }
  function startEdit(t) {
    setForm({title:t.title,memo:t.memo||"",due:t.due||"",schedule:t.schedule||"none",scheduleDate:t.scheduleDate||"",projectId:t.projectId||""});
    setEditId(t.id); setShowForm(true);
  }
  function cancelForm() {
    setForm(f => ({title:"",memo:"",due:"",schedule:"today",scheduleDate:"",projectId:f.projectId}));
    setEditId(null); setShowForm(false);
  }
  function submitPhase() {
    if (!phaseForm.name.trim()||!phaseForm.start||!phaseForm.end||!selProj) return;
    if (editPhaseId) {
      setPhases(ps => ps.map(p => p.id===editPhaseId ? {...p,...phaseForm,projectId:Number(selProj)} : p));
      setEditPhaseId(null);
    } else {
      setPhases(ps => [...ps, {...phaseForm,id:Date.now(),projectId:Number(selProj)}]);
    }
    setPhaseForm({name:"",start:"",end:"",color:COLORS[0]});
    setShowPhaseForm(false);
  }
  function deletePhase(id) {
    if (!window.confirm("단계를 삭제할까요?")) return;
    setPhases(ps => ps.filter(p => p.id!==id));
  }
  function updatePhase(id, updates) {
    setPhases(ps => ps.map(p => p.id===id ? {...p,...updates} : p));
  }

  const undone = tasks.filter(t => !t.done);
  const done = tasks.filter(t => t.done);
  const todayCnt = undone.filter(t => getEff(t,ts)==="today").length;
  const backlogCnt = undone.filter(t => getEff(t,ts)==="backlog").length;

  function getFiltered() {
    if (view==="today") return undone.filter(t => getEff(t,ts)==="today");
    if (view==="backlog") return undone.filter(t => getEff(t,ts)==="backlog");
    if (view==="all") return undone;
    return done;
  }

  function groupByProject(list) {
    const groups = {};
    for (const t of list) {
      const key = t.projectId ? String(t.projectId) : "__none__";
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    }
    const order = [...projects.map(p => String(p.id)), "__none__"];
    return order.filter(k => groups[k]).map(k => ({key:k,tasks:groups[k]}));
  }

  function renderTask(t, idx, arr) {
    const eff = getEff(t, ts);
    return (
      <div key={t.id} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"11px 16px", minHeight:44, borderBottom:idx===arr.length-1?"none":"0.5px solid "+tk.gray5 }}>
        <button onClick={() => toggleDone(t.id)} style={{ width:22, height:22, borderRadius:"50%", border:t.done?"none":"1.5px solid "+tk.gray3, background:t.done?tk.blue:"transparent", flexShrink:0, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0, marginTop:1 }}>
          {t.done && (
            <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
              <path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
        <div style={{ flex:1, minWidth:0, opacity:t.done?0.4:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
            <span style={{ fontSize:15, color:tk.label, textDecoration:t.done?"line-through":"none" }}>{t.title}</span>
            {t.schedule==="date" && t.scheduleDate && (
              <Badge color={t.scheduleDate<=ts?tk.orange:tk.blue}>{fmtDate(t.scheduleDate)}</Badge>
            )}
            {t.due && (
              isOD(t.due) ? <Badge color={tk.red}>{fmtDate(t.due)}{" 초과"}</Badge>
              : isTD(t.due) ? <Badge color={tk.orange}>{"오늘 마감"}</Badge>
              : isDS(t.due) ? <Badge color={tk.orange}>{"~"}{fmtDate(t.due)}</Badge>
              : <Badge color={tk.gray1}>{"~"}{fmtDate(t.due)}</Badge>
            )}
          </div>
          {t.memo && <p style={{ fontSize:13, color:tk.gray1, margin:"2px 0 0", whiteSpace:"pre-line", textAlign:"left" }}>{t.memo}</p>}
        </div>
        {!t.done && (
          <button onClick={() => moveTask(t)} title={eff==="today" ? "백로그로 이동" : "오늘로 이동"} style={{ background:"none", border:"none", cursor:"pointer", padding:"0 4px", flexShrink:0, display:"flex", alignItems:"center", marginTop:2 }}>
            {eff==="today" ? <IconPinned /> : <IconUnpinned />}
          </button>
        )}
        <button onClick={() => startEdit(t)} style={{ background:"none", color:tk.blue, border:"none", fontSize:14, cursor:"pointer", padding:"0 6px", fontFamily:font }}>{"편집"}</button>
        <button onClick={() => deleteTask(t.id)} style={{ background:"none", color:tk.red, border:"none", fontSize:14, cursor:"pointer", padding:"0 6px", fontFamily:font }}>{"삭제"}</button>
      </div>
    );
  }

  function renderGroups(list) {
    const groups = groupByProject(list);
    if (groups.length===0) return <div style={{ textAlign:"center", padding:"4rem 0", color:tk.gray2, fontSize:15 }}>{"할 일이 없어요"}</div>;
    return groups.map(g => {
      const proj = g.key==="__none__" ? null : projOf(Number(g.key));
      const color = proj ? proj.color : tk.gray2;
      return (
        <div key={g.key}>
          <SectionHeader>
            <span style={{ width:7, height:7, borderRadius:"50%", background:color, display:"inline-block", flexShrink:0 }} />
            <span>{proj ? proj.name : "과제 미지정"}</span>
            <span style={{ background:tk.gray5, color:tk.gray1, borderRadius:tk.radiusPill, padding:"1px 7px", fontSize:11, fontWeight:600, textTransform:"none", letterSpacing:0 }}>{g.tasks.length}</span>
            {proj && proj.openDate && <span style={{ fontSize:11, color:tk.gray1, fontWeight:400, textTransform:"none", letterSpacing:0 }}>{fmtDate(proj.openDate)}{" 오픈"}</span>}
          </SectionHeader>
          <GroupCard>{g.tasks.map((t,i,a) => renderTask(t,i,a))}</GroupCard>
        </div>
      );
    });
  }

  function renderScheduleTab() {
    const fp = phases.filter(p => !selProj || p.projectId===Number(selProj));
    return (
      <div>
        <SectionHeader>{"과제 선택"}</SectionHeader>
        <GroupCard>
          <Row last>
            <span style={{ flex:1, fontSize:15 }}>{"과제"}</span>
            <select value={selProj} onChange={e => setSelProj(e.target.value)} style={sel}>
              <option value="">{"전체 보기"}</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Row>
        </GroupCard>
        {selProj && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <SectionHeader>{"단계"}</SectionHeader>
              <button onClick={() => setShowPhaseForm(v => !v)} style={{ background:"none", border:"none", color:tk.blue, fontSize:13, cursor:"pointer", fontFamily:font, padding:"0 4px" }}>
                {showPhaseForm ? "접기" : "+ 추가"}
              </button>
            </div>
            {showPhaseForm && (
              <>
                <GroupCard>
                  <Row>
                    <input placeholder="단계 이름 (기획, 디자인, 개발...)" value={phaseForm.name} onChange={e => setPhaseForm(f => ({...f,name:e.target.value}))} style={{ flex:1, fontSize:15, border:"none", outline:"none", background:"transparent", fontFamily:font }} />
                    <ColorPicker value={phaseForm.color} onChange={c => setPhaseForm(f => ({...f,color:c}))} />
                  </Row>
                  <Row>
                    <span style={{ flex:1, fontSize:15 }}>{"시작일"}</span>
                    <input type="date" value={phaseForm.start} onChange={e => setPhaseForm(f => ({...f,start:e.target.value}))} style={sel} />
                  </Row>
                  <Row last>
                    <span style={{ flex:1, fontSize:15 }}>{"종료일"}</span>
                    <input type="date" value={phaseForm.end} onChange={e => setPhaseForm(f => ({...f,end:e.target.value}))} style={sel} />
                  </Row>
                </GroupCard>
                <div style={{ margin:"0 0 16px" }}>
                  <button onClick={submitPhase} style={{ width:"100%", background:tk.blue, color:"#fff", border:"none", borderRadius:tk.radius, height:44, fontSize:15, fontWeight:500, cursor:"pointer", fontFamily:font }}>
                    {editPhaseId ? "저장" : "단계 추가"}
                  </button>
                </div>
              </>
            )}
          </>
        )}
        {fp.length > 0 && (
          <>
            <SectionHeader>{"등록된 단계"}</SectionHeader>
            <GroupCard>
              {fp.map((ph,i,a) => {
                const proj = projOf(ph.projectId);
                return (
                  <div key={ph.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 16px", minHeight:44, borderBottom:i===a.length-1?"none":"0.5px solid "+tk.gray5 }}>
                    <span style={{ width:10, height:10, borderRadius:3, background:ph.color, flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, color:tk.label }}>{proj?proj.name+" · ":""}{ph.name}</div>
                      <div style={{ fontSize:12, color:tk.gray1 }}>{fmtDate(ph.start)}{" ~ "}{fmtDate(ph.end)}</div>
                    </div>
                    <button onClick={() => { setEditPhaseId(ph.id); setSelProj(String(ph.projectId)); setPhaseForm({name:ph.name,start:ph.start,end:ph.end,color:ph.color}); setShowPhaseForm(true); }} style={sel}>{"수정"}</button>
                    <button onClick={() => deletePhase(ph.id)} style={{...sel,color:tk.red}}>{"삭제"}</button>
                  </div>
                );
              })}
            </GroupCard>
          </>
        )}
        <SectionHeader>{"월별 캘린더"}</SectionHeader>
        <GroupCard>
          <div style={{ padding:16 }}>
            <DraggableCalendar phases={fp} projects={projects} calDate={calDate} setCalDate={setCalDate} onUpdatePhase={updatePhase} />
          </div>
        </GroupCard>
      </div>
    );
  }

  const tabs = [
    { key:"all", label:"전체", count:undone.length },
    { key:"today", label:"오늘", count:todayCnt },
    { key:"backlog", label:"백로그", count:backlogCnt },
    { key:"done", label:"완료", count:done.length },
  ];

  return (
    <div style={{ background:tk.bg, minHeight:"100vh", fontFamily:font }}>
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}
      <div style={{ background:"rgba(255,255,255,0.85)", backdropFilter:"blur(20px)", borderBottom:"0.5px solid "+tk.gray4, padding:"0 20px", height:52, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        {editingTitle ? (
          <input value={appTitle} onChange={e => setAppTitle(e.target.value)} onBlur={() => setEditingTitle(false)} onKeyDown={e => { if (e.key==="Enter"||e.key==="Escape") setEditingTitle(false); }} autoFocus style={{ fontSize:17, fontWeight:600, border:"none", borderBottom:"1.5px solid "+tk.blue, outline:"none", background:"transparent", width:180, fontFamily:font }} />
        ) : (
          <span onClick={() => setEditingTitle(true)} style={{ fontSize:17, fontWeight:600, cursor:"pointer" }}>{appTitle}</span>
        )}
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => setShowProjMgr(v => !v)} style={{ background:tk.bgCard, color:tk.blue, border:"0.5px solid "+tk.gray4, borderRadius:tk.radius, padding:"0 14px", height:34, fontSize:14, cursor:"pointer", fontFamily:font }}>{"과제 관리"}</button>
          <button onClick={() => { setShowForm(v => !v); setEditId(null); }} style={{ background:tk.blue, color:"#fff", border:"none", borderRadius:tk.radius, padding:"0 14px", height:34, fontSize:14, fontWeight:500, cursor:"pointer", fontFamily:font }}>{"+ 추가"}</button>
        </div>
      </div>

      <div style={{ maxWidth:680, margin:"0 auto", padding:"0 16px 40px" }}>
        {showProjMgr && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <SectionHeader>{"과제 목록"}</SectionHeader>
              <button onClick={() => setShowNewProjForm(v => !v)} style={{ background:"none", border:"none", color:tk.blue, fontSize:13, cursor:"pointer", fontFamily:font, padding:"0 4px" }}>
                {showNewProjForm ? "접기" : "+ 추가"}
              </button>
            </div>
            <GroupCard>
              {projects.filter(p => !p.done).length===0 && projects.filter(p => p.done).length===0 && (
                <div style={{ padding:"11px 16px", color:tk.gray2, fontSize:15 }}>{"등록된 과제가 없어요"}</div>
              )}
              {projects.filter(p => !p.done).map((p,i,a) => (
                <div key={p.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 16px", minHeight:44, borderBottom:i===a.length-1?"none":"0.5px solid "+tk.gray5 }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:p.color, flexShrink:0 }} />
                  {editingProjId===p.id ? (
                    <div style={{ flex:1, display:"flex", flexDirection:"column", gap:6 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <ColorPicker value={editingProjColor} onChange={setEditingProjColor} />
                        <input value={editingProjName} onChange={e => setEditingProjName(e.target.value)} onKeyDown={e => { if (e.key==="Enter"){e.preventDefault();saveEditProj(p.id);}else if(e.key==="Escape")setEditingProjId(null); }} autoFocus style={{ flex:1, fontSize:15, border:"none", outline:"none", fontFamily:font }} />
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:13, color:tk.gray1 }}>{"오픈일"}</span>
                        <input type="date" value={editingProjOpenDate} onChange={e => setEditingProjOpenDate(e.target.value)} style={{...sel,fontSize:13}} />
                      </div>
                      <div style={{ display:"flex", gap:8 }}>
                        <button onClick={() => saveEditProj(p.id)} style={sel}>{"저장"}</button>
                        <button onClick={() => setEditingProjId(null)} style={{...sel,color:tk.gray1}}>{"취소"}</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ flex:1, minWidth:0, textAlign:"left" }}>
                        <div style={{ fontSize:15 }}>{p.name}</div>
                        {p.openDate && <div style={{ fontSize:12, color:tk.gray1, marginTop:2 }}>{fmtDate(p.openDate)}{" 오픈"}</div>}
                      </div>
                      <button onClick={() => toggleProjDone(p.id)} style={{ background:tk.gray5, color:tk.gray1, border:"none", borderRadius:6, fontSize:12, padding:"4px 10px", cursor:"pointer", fontFamily:font, flexShrink:0 }}>{"완료"}</button>
                      <button onClick={() => { setEditingProjId(p.id); setEditingProjName(p.name); setEditingProjColor(p.color); setEditingProjOpenDate(p.openDate||""); }} style={{...sel,flexShrink:0}}>{"수정"}</button>
                      <button onClick={() => deleteProject(p.id)} style={{...sel,color:tk.red,flexShrink:0}}>{"삭제"}</button>
                    </>
                  )}
                </div>
              ))}
            </GroupCard>
            {projects.filter(p => p.done).length > 0 && (
              <>
                <SectionHeader>{"완료된 과제"}</SectionHeader>
                <GroupCard>
                  {projects.filter(p => p.done).map((p,i,a) => (
                    <div key={p.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 16px", minHeight:44, borderBottom:i===a.length-1?"none":"0.5px solid "+tk.gray5 }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="7" fill={p.color} opacity="0.3"/>
                        <path d="M3.5 7L6 9.5L10.5 5" stroke={p.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <div style={{ flex:1, minWidth:0, opacity:0.5, textAlign:"left" }}>
                        <div style={{ fontSize:15, textDecoration:"line-through", color:tk.gray1 }}>{p.name}</div>
                        {p.openDate && <div style={{ fontSize:12, color:tk.gray2, marginTop:2 }}>{fmtDate(p.openDate)}{" 오픈"}</div>}
                      </div>
                      <button onClick={() => toggleProjDone(p.id)} style={{...sel,flexShrink:0}}>{"되돌리기"}</button>
                      <button onClick={() => deleteProject(p.id)} style={{...sel,color:tk.red,flexShrink:0}}>{"삭제"}</button>
                    </div>
                  ))}
                </GroupCard>
              </>
            )}
            {showNewProjForm && (
              <GroupCard>
                <div style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 16px", minHeight:44 }}>
                  <ColorPicker value={newProjColor} onChange={setNewProjColor} />
                  <div style={{ flex:1, display:"flex", flexDirection:"column", gap:4 }}>
                    <input placeholder="새 과제 이름" value={newProjName} onChange={e => setNewProjName(e.target.value)} onKeyDown={e => { if (e.key==="Enter"){e.preventDefault();addProject();} }} autoFocus style={{ fontSize:15, border:"none", outline:"none", background:"transparent", fontFamily:font }} />
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontSize:12, color:tk.gray1 }}>{"오픈일"}</span>
                      <input type="date" value={newProjOpenDate} onChange={e => setNewProjOpenDate(e.target.value)} style={{...sel,fontSize:12}} />
                    </div>
                  </div>
                  <button onClick={addProject} style={{ background:tk.blue, color:"#fff", border:"none", borderRadius:8, padding:"0 14px", height:32, fontSize:14, cursor:"pointer", fontFamily:font, flexShrink:0 }}>{"추가"}</button>
                </div>
              </GroupCard>
            )}
          </>
        )}

        {showForm && (
          <>
            <SectionHeader>{editId ? "할 일 편집" : "새 할 일"}</SectionHeader>
            <GroupCard>
              <Row>
                <input placeholder="할 일을 입력하세요" value={form.title} onChange={e => setForm(f => ({...f,title:e.target.value}))} onKeyDown={e => { if (e.key==="Enter") submit(); }} autoFocus style={{ flex:1, fontSize:16, border:"none", outline:"none", background:"transparent", fontFamily:font }} />
              </Row>
              <Row>
                <textarea placeholder="메모 (선택)" value={form.memo} onChange={e => setForm(f => ({...f,memo:e.target.value}))} rows={2} style={{ flex:1, fontSize:14, border:"none", outline:"none", resize:"none", background:"transparent", fontFamily:font, lineHeight:1.5, color:tk.label }} />
              </Row>
              <Row>
                <span style={{ flex:1, fontSize:15 }}>{"과제"}</span>
                <select value={form.projectId} onChange={e => setForm(f => ({...f,projectId:e.target.value?Number(e.target.value):""}))} style={sel}>
                  <option value="">{"미지정"}</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Row>
              <Row>
                <span style={{ flex:1, fontSize:15 }}>{"일정"}</span>
                <select value={form.schedule} onChange={e => setForm(f => ({...f,schedule:e.target.value,scheduleDate:""}))} style={sel}>
                  <option value="today">{"오늘"}</option>
                  <option value="date">{"날짜 지정"}</option>
                  <option value="tomorrow">{"백로그"}</option>
                  <option value="none">{"미지정"}</option>
                </select>
              </Row>
              {form.schedule==="date" && (
                <Row>
                  <span style={{ flex:1, fontSize:15 }}>{"날짜"}</span>
                  <input type="date" value={form.scheduleDate} min={ts} onChange={e => setForm(f => ({...f,scheduleDate:e.target.value}))} style={sel} />
                </Row>
              )}
              <Row last>
                <span style={{ flex:1, fontSize:15 }}>{"마감일"}</span>
                <input type="date" value={form.due} onChange={e => setForm(f => ({...f,due:e.target.value}))} style={{...sel,color:form.due?tk.blue:tk.gray2}} />
              </Row>
            </GroupCard>
            <div style={{ display:"flex", gap:8, margin:"0 0 16px" }}>
              <button onClick={submit} style={{ flex:1, background:tk.blue, color:"#fff", border:"none", borderRadius:tk.radius, height:44, fontSize:15, fontWeight:500, cursor:"pointer", fontFamily:font }}>{editId ? "저장" : "추가"}</button>
              <button onClick={cancelForm} style={{ flex:1, background:tk.bgCard, color:tk.label, border:"0.5px solid "+tk.gray4, borderRadius:tk.radius, height:44, fontSize:15, cursor:"pointer", fontFamily:font }}>{"취소"}</button>
            </div>
          </>
        )}

        <div style={{ display:"flex", alignItems:"center", gap:8, margin:"12px 0 4px" }}>
          <div style={{ display:"flex", flex:1, background:tk.gray5, borderRadius:tk.radius, padding:2, gap:2 }}>
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setView(tab.key)} style={{ flex:1, height:32, borderRadius:8, border:"none", cursor:"pointer", fontSize:12, fontWeight:view===tab.key?600:400, background:view===tab.key?"#fff":"transparent", color:view===tab.key?tk.label:tk.gray1, boxShadow:view===tab.key?"0 1px 4px rgba(0,0,0,0.1)":"none", fontFamily:font, display:"flex", alignItems:"center", justifyContent:"center", gap:3 }}>
                {tab.label}
                {tab.count>0 && <span style={{ fontSize:10, fontWeight:600, background:view===tab.key?tk.gray5:"transparent", borderRadius:tk.radiusPill, padding:"0 4px", color:tk.gray1 }}>{tab.count}</span>}
              </button>
            ))}
          </div>
          <button onClick={() => setView(v => v==="schedule"?"all":"schedule")} style={{ width:36, height:36, borderRadius:tk.radius, border:"0.5px solid "+tk.gray4, background:view==="schedule"?tk.blue:tk.bgCard, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="2.5" width="14" height="12.5" rx="2.5" fill={view==="schedule"?"#fff":tk.gray4}/>
              <rect x="1" y="2.5" width="14" height="4.5" rx="2.5" fill={view==="schedule"?"rgba(255,255,255,0.3)":tk.gray2}/>
              <rect x="1" y="5" width="14" height="2" fill={view==="schedule"?"rgba(255,255,255,0.3)":tk.gray2}/>
              <rect x="4.5" y="9" width="2" height="2" rx="0.5" fill={view==="schedule"?tk.blue:tk.gray1}/>
              <rect x="7.5" y="9" width="2" height="2" rx="0.5" fill={view==="schedule"?tk.blue:tk.gray1}/>
              <rect x="10.5" y="9" width="2" height="2" rx="0.5" fill={view==="schedule"?tk.blue:tk.gray1}/>
              <rect x="4.5" y="12" width="2" height="2" rx="0.5" fill={view==="schedule"?tk.blue:tk.gray1}/>
              <rect x="7.5" y="12" width="2" height="2" rx="0.5" fill={view==="schedule"?tk.blue:tk.gray1}/>
              <line x1="5" y1="1" x2="5" y2="4" stroke={view==="schedule"?"#fff":tk.gray2} strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="11" y1="1" x2="11" y2="4" stroke={view==="schedule"?"#fff":tk.gray2} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {view==="schedule" ? renderScheduleTab() : renderGroups(getFiltered())}
      </div>
    </div>
  );
}