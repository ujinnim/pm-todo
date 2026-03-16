import { useState, useEffect } from "react";

const TASKS_KEY = "pm_tasks";
const PROJECTS_KEY = "pm_projects";

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
}
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
function today() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function fmtDate(d) { if (!d) return ""; const [,m,day] = d.split("-"); return `${parseInt(m)}/${parseInt(day)}`; }

const COLORS = ["#7F77DD","#1D9E75","#D85A30","#D4537E","#378ADD","#639922","#BA7517","#E24B4A"];

const token = {
  blue: "#0069FF", blueHover: "#0057D6", blueLight: "#EBF2FF",
  gray100: "#F4F4F5", gray200: "#E4E4E7", gray400: "#A1A1AA",
  gray600: "#52525B", gray900: "#18181B",
  radius: "8px", radiusLg: "12px", radiusPill: "999px",
};

const s = {
  btnPrimary: { background: token.blue, color: "#fff", border: "none", borderRadius: token.radius, padding: "0 16px", height: 36, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 },
  btnSecondary: { background: "#fff", color: token.gray900, border: `1px solid ${token.gray200}`, borderRadius: token.radius, padding: "0 16px", height: 36, fontSize: 14, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 },
  btnGhost: { background: "transparent", color: token.gray600, border: "none", borderRadius: token.radius, padding: "0 12px", height: 32, fontSize: 13, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center" },
  btnDanger: { background: "transparent", color: "#E53E3E", border: "none", borderRadius: token.radius, padding: "0 12px", height: 32, fontSize: 13, cursor: "pointer" },
  input: { width: "100%", height: 40, padding: "0 12px", fontSize: 14, border: `1px solid ${token.gray200}`, borderRadius: token.radius, outline: "none", boxSizing: "border-box", color: token.gray900, background: "#fff" },
  textarea: { width: "100%", padding: "10px 12px", fontSize: 13, border: `1px solid ${token.gray200}`, borderRadius: token.radius, outline: "none", resize: "none", boxSizing: "border-box", color: token.gray900, background: "#fff", lineHeight: 1.5 },
  card: { background: "#fff", border: `1px solid ${token.gray200}`, borderRadius: token.radiusLg, padding: "14px 16px" },
  chip: (active) => ({ display: "inline-flex", alignItems: "center", height: 32, padding: "0 14px", borderRadius: token.radiusPill, fontSize: 13, fontWeight: 500, cursor: "pointer", border: active ? `1.5px solid ${token.blue}` : `1px solid ${token.gray200}`, background: active ? token.blueLight : "#fff", color: active ? token.blue : token.gray600 }),
  badge: (color) => ({ display: "inline-flex", alignItems: "center", height: 20, padding: "0 8px", borderRadius: token.radiusPill, fontSize: 11, fontWeight: 600, background: color + "1A", color }),
};

function getEffectiveSchedule(task, todayStr) {
  if (task.schedule === "today") return "today";
  if (task.schedule === "date" && task.scheduleDate) {
    if (task.scheduleDate <= todayStr) return "today";
    return "backlog";
  }
  if (task.schedule === "tomorrow") return "backlog";
  return "none";
}

function ColorPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button onClick={() => setOpen(v => !v)} style={{ width: 28, height: 28, borderRadius: "50%", background: value, border: `2px solid ${value}`, cursor: "pointer", padding: 0 }} />
      {open && (
        <div style={{ position: "absolute", top: 34, left: 0, zIndex: 10, background: "#fff", border: `1px solid ${token.gray200}`, borderRadius: token.radius, padding: "10px", display: "flex", gap: 6, flexWrap: "wrap", width: 136, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
          {COLORS.map(c => (
            <button key={c} onClick={() => { onChange(c); setOpen(false); }} style={{ width: 20, height: 20, borderRadius: "50%", background: c, border: "none", cursor: "pointer", padding: 0, outline: value === c ? `2px solid ${c}` : "none", outlineOffset: 2, transform: value === c ? "scale(1.2)" : "scale(1)" }} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [tasks, setTasks] = useState(() => load(TASKS_KEY, []));
  const [projects, setProjects] = useState(() => load(PROJECTS_KEY, []));
  const [view, setView] = useState("today");
  const [showForm, setShowForm] = useState(false);
  const [showProjMgr, setShowProjMgr] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newProjColor, setNewProjColor] = useState(COLORS[0]);
  const [editingProjId, setEditingProjId] = useState(null);
  const [editingProjName, setEditingProjName] = useState("");
  const [editingProjColor, setEditingProjColor] = useState("");
  const [editId, setEditId] = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [appTitle, setAppTitle] = useState(() => load("pm_title", "할 일"));

  useEffect(() => { save("pm_title", appTitle); }, [appTitle]);

  useEffect(() => { save(TASKS_KEY, tasks); }, [tasks]);
  useEffect(() => { save(PROJECTS_KEY, projects); }, [projects]);

  const todayStr = today();
  const isOverdue = d => d && d < todayStr;
  const isDueToday = d => d === todayStr;
  const isDueSoon = d => { if (!d) return false; const diff = (new Date(d) - new Date(todayStr)) / 86400000; return diff > 0 && diff <= 3; };
  const projOf = id => projects.find(p => p.id === id);

  function addProject() {
    const name = newProjName.trim();
    if (!name) return;
    setProjects(ps => [...ps, { id: Date.now(), name, color: newProjColor }]);
    setNewProjName("");
    setNewProjColor(COLORS[0]);
  }

  function deleteProject(id) {
    if (!window.confirm("과제를 삭제할까요?\n해당 과제의 할 일들은 '과제 미지정'으로 이동해요.")) return;
    setProjects(ps => ps.filter(p => p.id !== id));
    setTasks(ts => ts.map(t => t.projectId === id ? { ...t, projectId: "" } : t));
  }

  function saveEditProj(id) {
    const name = editingProjName.trim();
    if (name) setProjects(ps => ps.map(p => p.id === id ? { ...p, name, color: editingProjColor } : p));
    setEditingProjId(null);
  }

  function submit() {
    if (!form.title.trim()) return;
    const task = { ...form };
    if (task.schedule !== "date") task.scheduleDate = "";
    if (editId) {
      setTasks(ts => ts.map(t => t.id === editId ? { ...t, ...task } : t));
      setEditId(null);
    } else {
      setTasks(ts => [...ts, { ...task, id: Date.now(), done: false, createdAt: todayStr }]);
    }
    setForm(f => ({ title: "", memo: "", due: "", schedule: "today", scheduleDate: "", projectId: f.projectId }));
    setShowForm(false);
  }

  function toggleDone(id) { setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t)); }

  function cycleSchedule(id) {
    setTasks(ts => ts.map(t => {
      if (t.id !== id) return t;
      const next = t.schedule === "today" ? "tomorrow" : t.schedule === "tomorrow" ? "none" : "today";
      return { ...t, schedule: next, scheduleDate: "" };
    }));
  }

  function deleteTask(id) {
    if (!window.confirm("할 일을 삭제할까요?")) return;
    setTasks(ts => ts.filter(t => t.id !== id));
  }

  function startEdit(t) {
    setForm({ title: t.title, memo: t.memo || "", due: t.due || "", schedule: t.schedule || "none", scheduleDate: t.scheduleDate || "", projectId: t.projectId || "" });
    setEditId(t.id);
    setShowForm(true);
  }

  function cancelForm() {
    setForm(f => ({ title: "", memo: "", due: "", schedule: "today", scheduleDate: "", projectId: f.projectId }));
    setEditId(null);
    setShowForm(false);
  }

  const undone = tasks.filter(t => !t.done);
  const done = tasks.filter(t => t.done);
  const todayCount = undone.filter(t => getEffectiveSchedule(t, todayStr) === "today").length;
  const backlogCount = undone.filter(t => getEffectiveSchedule(t, todayStr) === "backlog").length;

  function getFiltered() {
    if (view === "today") return undone.filter(t => getEffectiveSchedule(t, todayStr) === "today");
    if (view === "backlog") return undone.filter(t => getEffectiveSchedule(t, todayStr) === "backlog");
    if (view === "all") return undone;
    return done;
  }

  function groupByProject(list) {
    const groups = {};
    for (const t of list) {
      const key = t.projectId || "__none__";
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    }
    const order = [...projects.map(p => String(p.id)), "__none__"];
    return order.filter(k => groups[k]).map(k => ({ key: k, tasks: groups[k] }));
  }

  const scheduleIcon = t => {
    if (t.schedule === "today") return { icon: "★", color: "#F59E0B" };
    if (t.schedule === "date" && t.scheduleDate) return { icon: "★", color: token.blue };
    if (t.schedule === "tomorrow") return { icon: "★", color: token.blue };
    return { icon: "☆", color: token.gray400 };
  };

  function dueBadge(due) {
    if (!due) return null;
    if (isOverdue(due)) return <span style={s.badge("#E53E3E")}>{fmtDate(due)} 초과</span>;
    if (isDueToday(due)) return <span style={s.badge("#D97706")}>오늘 마감</span>;
    if (isDueSoon(due)) return <span style={s.badge("#D97706")}>~{fmtDate(due)}</span>;
    return <span style={s.badge(token.gray400)}>~{fmtDate(due)}</span>;
  }

  function scheduleBadge(t) {
    if (t.schedule !== "date" || !t.scheduleDate) return null;
    const isPast = t.scheduleDate <= todayStr;
    return <span style={s.badge(isPast ? "#D97706" : token.blue)}>{fmtDate(t.scheduleDate)}</span>;
  }

  function renderTask(t, idx) {
    const si = scheduleIcon(t);
    return (
      <div key={t.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderTop: idx === 0 ? `1px solid ${token.gray200}` : "none", borderBottom: `1px solid ${token.gray200}`, opacity: t.done ? 0.45 : 1 }}>
        <input type="checkbox" checked={t.done} onChange={() => toggleDone(t.id)} style={{ marginTop: 3, cursor: "pointer", flexShrink: 0, width: 16, height: 16, accentColor: token.blue }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: t.done ? token.gray400 : token.gray900, textDecoration: t.done ? "line-through" : "none" }}>{t.title}</span>
            {scheduleBadge(t)}
            {dueBadge(t.due)}
          </div>
          {t.memo && <p style={{ fontSize: 12, color: token.gray400, margin: "3px 0 0", whiteSpace: "pre-line", textAlign: "left" }}>{t.memo}</p>}
        </div>
        <div style={{ display: "flex", gap: 2, flexShrink: 0, alignItems: "center" }}>
          <button onClick={() => startEdit(t)} style={s.btnGhost}>편집</button>
          <button onClick={() => deleteTask(t.id)} style={s.btnDanger}>삭제</button>
        </div>
      </div>
    );
  }

  function renderGroups(list) {
    const groups = groupByProject(list);
    if (groups.length === 0) return <div style={{ textAlign: "center", padding: "3rem 0", color: token.gray400, fontSize: 14 }}>할 일이 없어요</div>;
    return groups.map(({ key, tasks: gtasks }) => {
      const proj = key === "__none__" ? null : projOf(Number(key));
      const sectionColor = proj ? proj.color : token.gray400;
      return (
        <div key={key} style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: `2px solid ${sectionColor}` }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: sectionColor }}>{proj ? proj.name : "과제 미지정"}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: sectionColor, borderRadius: token.radiusPill, padding: "1px 8px" }}>{gtasks.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {gtasks.map((t, i) => renderTask(t, i))}
          </div>
        </div>
      );
    });
  }

  return (
    <div style={{ padding: "1.5rem 2rem", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: token.gray100, minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div>
          {editingTitle ? (
            <input
              value={appTitle}
              onChange={e => setAppTitle(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") setEditingTitle(false); }}
              autoFocus
              style={{ fontSize: 20, fontWeight: 700, color: token.gray900, border: "none", borderBottom: `2px solid ${token.blue}`, outline: "none", background: "transparent", width: 200, padding: "0 2px" }}
            />
          ) : (
            <h1
              onClick={() => setEditingTitle(true)}
              title="클릭해서 수정"
              style={{ fontSize: 20, fontWeight: 700, margin: 0, color: token.gray900, cursor: "pointer" }}
            >{appTitle}</h1>
          )}
          <p style={{ fontSize: 13, color: token.gray400, margin: "2px 0 0" }}>{todayStr.replace(/-/g, ".")}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowProjMgr(v => !v)} style={s.btnSecondary}>과제 관리</button>
          <button onClick={() => { setShowForm(v => !v); setEditId(null); }} style={s.btnPrimary}>+ 추가</button>
        </div>
      </div>

      {showProjMgr && (
        <div style={{ ...s.card, marginBottom: "1rem" }}>
          <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px", color: token.gray900, textAlign: "left" }}>과제 목록</p>
          {projects.length === 0 && <p style={{ fontSize: 13, color: token.gray400, margin: "0 0 12px" }}>등록된 과제가 없어요</p>}
          <div style={{ marginBottom: 16 }}>
            {projects.map((p, i) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: i === 0 ? `1px solid ${token.gray200}` : "none", borderBottom: `1px solid ${token.gray200}` }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                {editingProjId === p.id ? (
                  <>
                    <ColorPicker value={editingProjColor} onChange={setEditingProjColor} />
                    <input value={editingProjName} onChange={e => setEditingProjName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); saveEditProj(p.id); } else if (e.key === "Escape") setEditingProjId(null); }}
                      autoFocus style={{ ...s.input, height: 32, flex: 1, width: "auto" }} />
                    <button onClick={() => saveEditProj(p.id)} style={s.btnPrimary}>저장</button>
                    <button onClick={() => setEditingProjId(null)} style={s.btnSecondary}>취소</button>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 14, color: token.gray900 }}>{p.name}</span>
                    <div style={{ flex: 1 }} />
                    <button onClick={() => { setEditingProjId(p.id); setEditingProjName(p.name); setEditingProjColor(p.color); }} style={s.btnGhost}>수정</button>
                    <button onClick={() => deleteProject(p.id)} style={s.btnDanger}>삭제</button>
                  </>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: `1px solid ${token.gray200}` }}>
            <ColorPicker value={newProjColor} onChange={setNewProjColor} />
            <input placeholder="새 과제 이름" value={newProjName} onChange={e => setNewProjName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addProject(); } }}
              style={s.input} />
            <button onClick={addProject} style={{ ...s.btnPrimary, flexShrink: 0 }}>추가</button>
          </div>
        </div>
      )}

      {showForm && (
        <div style={{ ...s.card, marginBottom: "1rem", padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 16px 12px" }}>
            <input placeholder="할 일을 입력하세요" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && submit()} autoFocus
              style={{ ...s.input, marginBottom: 8, fontSize: 15, fontWeight: 500 }} />
            <textarea placeholder="메모 (선택)" value={form.memo}
              onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
              rows={2} style={s.textarea} />
          </div>
          <div style={{ padding: "10px 16px", borderTop: `1px solid ${token.gray100}`, borderBottom: `1px solid ${token.gray100}`, display: "flex", gap: 8, flexWrap: "wrap", background: token.gray100 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: `1px solid ${token.gray200}`, borderRadius: token.radius, padding: "0 10px", height: 36 }}>
              <span style={{ fontSize: 12, color: token.gray400, fontWeight: 600 }}>과제</span>
              <select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value ? Number(e.target.value) : "" }))}
                style={{ fontSize: 13, border: "none", background: "transparent", color: token.gray900, outline: "none", cursor: "pointer" }}>
                <option value="">미지정</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: `1px solid ${token.gray200}`, borderRadius: token.radius, padding: "0 10px", height: 36 }}>
              <span style={{ fontSize: 12, color: token.gray400, fontWeight: 600 }}>일정</span>
              <select value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value, scheduleDate: "" }))}
                style={{ fontSize: 13, border: "none", background: "transparent", color: token.gray900, outline: "none", cursor: "pointer" }}>
                <option value="today">오늘</option>
                <option value="date">날짜 지정</option>
                <option value="tomorrow">백로그</option>
                <option value="none">미지정</option>
              </select>
            </div>
            {form.schedule === "date" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: `1.5px solid ${token.blue}`, borderRadius: token.radius, padding: "0 10px", height: 36 }}>
                <span style={{ fontSize: 12, color: token.blue, fontWeight: 600 }}>날짜</span>
                <input type="date" value={form.scheduleDate} min={todayStr}
                  onChange={e => setForm(f => ({ ...f, scheduleDate: e.target.value }))}
                  style={{ fontSize: 13, border: "none", background: "transparent", color: token.gray900, outline: "none" }} />
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: `1px solid ${token.gray200}`, borderRadius: token.radius, padding: "0 10px", height: 36 }}>
              <span style={{ fontSize: 12, color: token.gray400, fontWeight: 600 }}>마감일</span>
              <input type="date" value={form.due} onChange={e => setForm(f => ({ ...f, due: e.target.value }))}
                style={{ fontSize: 13, border: "none", background: "transparent", color: token.gray900, outline: "none" }} />
            </div>
          </div>
          <div style={{ padding: "12px 16px", display: "flex", gap: 8 }}>
            <button onClick={submit} style={s.btnPrimary}>{editId ? "저장" : "추가"}</button>
            <button onClick={cancelForm} style={s.btnSecondary}>취소</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {[
          { key: "today", label: `오늘 (${todayCount})` },
          { key: "backlog", label: `백로그 (${backlogCount})` },
          { key: "all", label: `전체 (${undone.length})` },
          { key: "done", label: "완료" },
        ].map(tab => (
          <button key={tab.key} onClick={() => setView(tab.key)} style={s.chip(view === tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {renderGroups(getFiltered())}

 
    </div>
  );
}