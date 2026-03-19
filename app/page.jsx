"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus, Calendar, CheckCircle2, Circle, Pin, PinOff,
  Pencil, Trash2, ChevronLeft, ChevronRight, X,
  Inbox, Clock, Archive, LayoutGrid, FolderKanban,
  Check, Loader2, NotebookPen, GripVertical
} from "lucide-react"

const COLORS = [
  "#0d9488","#2563EB","#7C3AED","#DB2777","#DC2626",
  "#EA580C","#D97706","#65A30D","#16A34A","#0891B2",
  "#4F46E5","#BE185D","#854D0E","#166534","#1D4ED8",
  "#7E22CE","#1E3A5F","#2E5280","#3B6EA8","#4A90D9",
]

function today() {
  const d = new Date()
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0")
}
function fmtDate(d) {
  if (!d) return ""
  const p = d.split("-")
  return parseInt(p[1]) + "/" + parseInt(p[2])
}
function addDays(dateStr, n) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0")
}
function diffDays(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000) }

function getEff(task, ts) {
  if (task.schedule === "today") return "today"
  if (task.schedule === "date" && task.schedule_date) return task.schedule_date <= ts ? "today" : "backlog"
  if (task.schedule === "tomorrow") return "backlog"
  return "none"
}

// ── Confetti ─────────────────────────────────────────────────────
function Confetti({ onDone }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    const cx = canvas.width/2, cy = canvas.height/2
    const cols = ["#1E5F52","#2D8069","#2563EB","#D97706","#16A34A","#7C3AED"]
    const pts = []
    function burst(ox, oy, n) {
      for (let i=0; i<n; i++) {
        const a=(Math.PI*2*i)/n+Math.random()*0.3, sp=Math.random()*8+3
        pts.push({x:ox,y:oy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-2,color:cols[Math.floor(Math.random()*cols.length)],size:Math.random()*6+2,shape:Math.random()>0.5?"r":"c",alpha:1,rot:Math.random()*Math.PI*2,rs:(Math.random()-0.5)*0.3,g:0.18,drag:0.97})
      }
    }
    burst(cx,cy*0.5,60)
    setTimeout(()=>burst(cx*0.4,cy*0.6,40),200)
    setTimeout(()=>burst(cx*1.6,cy*0.6,40),350)
    let frame
    function draw() {
      ctx.clearRect(0,0,canvas.width,canvas.height)
      let alive=false
      for (let i=0; i<pts.length; i++) {
        const p=pts[i]
        if(p.alpha<=0)continue
        alive=true
        p.vx*=p.drag;p.vy*=p.drag;p.vy+=p.g
        p.x+=p.vx;p.y+=p.vy;p.rot+=p.rs;p.alpha-=0.012
        ctx.save();ctx.globalAlpha=Math.max(0,p.alpha);ctx.fillStyle=p.color
        ctx.translate(p.x,p.y);ctx.rotate(p.rot)
        if(p.shape==="c"){ctx.beginPath();ctx.arc(0,0,p.size/2,0,Math.PI*2);ctx.fill()}
        else{ctx.fillRect(-p.size/2,-p.size/2*1.6,p.size,p.size*1.6)}
        ctx.restore()
      }
      if(alive){frame=requestAnimationFrame(draw)}else{onDone()}
    }
    frame=requestAnimationFrame(draw)
    return ()=>cancelAnimationFrame(frame)
  }, [])
  return <canvas ref={ref} className="fixed inset-0 w-screen h-screen pointer-events-none z-[9999]"/>
}

// ── Color Picker ──────────────────────────────────────────────────
function ColorPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])
  return (
    <div className="relative flex-shrink-0" ref={ref}>
      <button
        onClick={() => setOpen(v=>!v)}
        className="w-6 h-6 rounded-md border-2 border-white shadow-sm cursor-pointer flex-shrink-0 ring-1 ring-gray-200 hover:scale-110 transition-transform"
        style={{ background: value }}
      />
      {open && (
        <div className="absolute z-50 top-8 left-0 bg-white rounded-xl border border-gray-100 shadow-xl p-3 flex flex-wrap gap-2 w-48">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => { onChange(c); setOpen(false) }}
              className="w-6 h-6 rounded-md cursor-pointer transition-transform hover:scale-110 flex items-center justify-center"
              style={{ background: c }}
            >
              {value === c && <Check size={12} className="text-white" strokeWidth={3}/>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Date Range Picker ─────────────────────────────────────────────
function DateRangePicker({ startDate, endDate, onChange }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState("start") // "start" | "end"
  const [hover, setHover] = useState(null)
  const [cal, setCal] = useState(() => {
    const d = startDate ? new Date(startDate) : new Date()
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const ref = useRef(null)
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setStep("start") } }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  const { y, m } = cal
  const firstDay = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m+1, 0).getDate()
  const cells = []
  for (let i=0; i<firstDay; i++) cells.push(null)
  for (let d=1; d<=daysInMonth; d++) cells.push(d)
  const dayNames = ["일","월","화","수","목","금","토"]
  function ds(d) { return y+"-"+String(m+1).padStart(2,"0")+"-"+String(d).padStart(2,"0") }

  const previewEnd = step==="end" && hover ? (hover >= startDate ? hover : startDate) : endDate

  function handleDay(dateStr) {
    if (step === "start") {
      onChange({ start_date: dateStr, end_date: endDate && endDate >= dateStr ? endDate : dateStr })
      setStep("end")
    } else {
      if (dateStr < startDate) {
        onChange({ start_date: dateStr, end_date: startDate })
      } else {
        onChange({ start_date: startDate, end_date: dateStr })
      }
      setOpen(false); setStep("start"); setHover(null)
    }
  }

  const display = startDate && endDate ? `${fmtDate(startDate)} ~ ${fmtDate(endDate)}` : "기간 선택"
  const nights = startDate && endDate ? diffDays(startDate, endDate) + 1 : null

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen(v=>!v); setStep("start") }}
        className="w-full h-9 rounded-lg border border-gray-200 bg-white pl-3 pr-3 text-sm flex items-center gap-2 hover:border-[#1E5F52] transition-colors"
      >
        <Calendar size={13} className="text-gray-400 flex-shrink-0"/>
        <span className={startDate ? "text-gray-700 flex-1 text-left" : "text-gray-400 flex-1 text-left"}>{display}</span>
        {nights && <span className="text-[10px] text-gray-400 flex-shrink-0">{nights}일</span>}
      </button>
      {open && (
        <div className="absolute z-[60] top-11 left-0 bg-white rounded-xl border border-gray-100 shadow-2xl p-3 w-64">
          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mb-3">
            <div className={`flex-1 text-center text-xs py-1 rounded-lg font-medium transition-colors ${step==="start" ? "bg-[#1E5F52] text-white" : "bg-gray-100 text-gray-500"}`}>
              {startDate ? fmtDate(startDate) : "시작일"}
            </div>
            <span className="text-gray-300 text-xs">→</span>
            <div className={`flex-1 text-center text-xs py-1 rounded-lg font-medium transition-colors ${step==="end" ? "bg-[#1E5F52] text-white" : "bg-gray-100 text-gray-500"}`}>
              {step==="end" && hover ? fmtDate(previewEnd) : endDate ? fmtDate(endDate) : "종료일"}
            </div>
          </div>
          {/* Month nav */}
          <div className="flex items-center justify-between mb-2">
            <button onClick={()=>setCal(c=>c.m===0?{y:c.y-1,m:11}:{y:c.y,m:c.m-1})} className="w-6 h-6 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
              <ChevronLeft size={12}/>
            </button>
            <span className="text-xs font-semibold text-gray-700">{y}. {String(m+1).padStart(2,"0")}</span>
            <button onClick={()=>setCal(c=>c.m===11?{y:c.y+1,m:0}:{y:c.y,m:c.m+1})} className="w-6 h-6 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
              <ChevronRight size={12}/>
            </button>
          </div>
          {/* Day names */}
          <div className="grid grid-cols-7 mb-0.5">
            {dayNames.map(d => <div key={d} className="text-center text-[9px] font-semibold py-0.5 text-gray-400">{d}</div>)}
          </div>
          {/* Cells */}
          <div className="grid grid-cols-7">
            {cells.map((d, i) => {
              if (!d) return <div key={"e"+i}/>
              const dateStr = ds(d)
              const isS = dateStr === startDate
              const isE = dateStr === previewEnd
              const inR = startDate && previewEnd && dateStr > startDate && dateStr < previewEnd
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleDay(dateStr)}
                  onMouseEnter={() => step==="end" && setHover(dateStr)}
                  onMouseLeave={() => setHover(null)}
                  className={`h-7 text-[11px] flex items-center justify-center relative transition-colors
                    ${isS || isE ? "text-white font-bold" : inR ? "text-[#1E5F52] bg-[#EAF0EE]" : "text-gray-600 hover:bg-gray-100 rounded-md"}
                    ${isS ? "rounded-l-full" : ""}
                    ${isE ? "rounded-r-full" : ""}
                  `}
                >
                  {(isS || isE) && <span className="absolute inset-0.5 rounded-full bg-[#1E5F52] -z-10"/>}
                  {d}
                </button>
              )
            })}
          </div>
          {startDate && endDate && (
            <button type="button" onClick={()=>{onChange({start_date:"",end_date:""});setStep("start")}} className="mt-2 w-full text-[10px] text-gray-400 hover:text-red-400 transition-colors">
              초기화
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Draggable Calendar ────────────────────────────────────────────
function DraggableCalendar({ phases, projects, calDate, setCalDate, onUpdatePhase }) {
  const [dragging, setDragging] = useState(null)
  const [hoverDay, setHoverDay] = useState(null)
  const { y, m } = calDate
  const firstDay = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m+1, 0).getDate()
  const prevMonthDays = new Date(y, m, 0).getDate()
  const monthStr = y+"-"+String(m+1).padStart(2,"0")
  const ts = today()

  // 전달 trailing + 이번달 + 다음달 leading으로 셀 구성
  const cells = []
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ d: prevMonthDays - i, type: "prev" })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ d, type: "cur" })
  const remaining = (7 - (cells.length % 7)) % 7
  for (let d = 1; d <= remaining; d++) cells.push({ d, type: "next" })

  function dsCell(cell) {
    if (cell.type === "prev") {
      const pm = m === 0 ? 11 : m - 1
      const py = m === 0 ? y - 1 : y
      return py+"-"+String(pm+1).padStart(2,"0")+"-"+String(cell.d).padStart(2,"0")
    }
    if (cell.type === "next") {
      const nm = m === 11 ? 0 : m + 1
      const ny = m === 11 ? y + 1 : y
      return ny+"-"+String(nm+1).padStart(2,"0")+"-"+String(cell.d).padStart(2,"0")
    }
    return y+"-"+String(m+1).padStart(2,"0")+"-"+String(cell.d).padStart(2,"0")
  }

  // vis는 인접 달 포함하도록 범위 확장
  const visStart = cells[0] ? dsCell(cells[0]) : monthStr+"-01"
  const visEnd = cells[cells.length-1] ? dsCell(cells[cells.length-1]) : monthStr+"-31"
  const vis = phases.filter(ph => ph.start_date && ph.end_date && ph.start_date<=visEnd && ph.end_date>=visStart)
  const dayNames = ["일","월","화","수","목","금","토"]

  function ds(d) { return y+"-"+String(m+1).padStart(2,"0")+"-"+String(d).padStart(2,"0") }
  function prev(ph) {
    if (!dragging||dragging.phaseId!==ph.id||!hoverDay) return {start:ph.start_date,end:ph.end_date}
    const delta = diffDays(dragging.startDayStr, hoverDay)
    return {start:addDays(dragging.origStart,delta), end:addDays(dragging.origEnd,delta)}
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCalDate(c => c.m===0?{y:c.y-1,m:11}:{y:c.y,m:c.m-1})} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors">
          <ChevronLeft size={16}/>
        </button>
        <span className="text-sm font-semibold text-gray-800">{y}. {String(m+1).padStart(2,"0")}</span>
        <button onClick={() => setCalDate(c => c.m===11?{y:c.y+1,m:0}:{y:c.y,m:c.m+1})} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors">
          <ChevronRight size={16}/>
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {dayNames.map(d => (
          <div key={d} className={`text-center text-xs font-semibold py-1 ${d==="일"?"text-red-400":d==="토"?"text-blue-400":"text-gray-400"}`}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-lg overflow-hidden">
        {cells.map((cell, i) => {
          const isOtherMonth = cell.type !== "cur"
          const dateStr = dsCell(cell)
          const isT = dateStr === ts
          const dph = vis.filter(ph => { const p=prev(ph); return p.start<=dateStr&&p.end>=dateStr })
          return (
            <div key={dateStr+i}
              onDragOver={e => { if(isOtherMonth)return; e.preventDefault(); setHoverDay(dateStr) }}
              onDrop={e => { e.preventDefault(); if(!dragging||isOtherMonth)return; const delta=diffDays(dragging.startDayStr,dateStr); if(delta!==0)onUpdatePhase(dragging.phaseId,{start_date:addDays(dragging.origStart,delta),end_date:addDays(dragging.origEnd,delta)}); setDragging(null); setHoverDay(null) }}
              className={`min-h-14 p-1 ${isOtherMonth?"bg-gray-50/60":"bg-white"} ${isT?"ring-2 ring-inset ring-[#1E5F52]":""}`}>
              <div className={`text-center text-xs mb-0.5 w-6 h-6 flex items-center justify-center mx-auto rounded-full
                ${isT?"bg-[#1E5F52] text-white font-bold":isOtherMonth?"text-gray-300":"text-gray-500"}`}>
                {cell.d}
              </div>
              <div className="flex flex-col gap-px">
                {dph.slice(0,3).map(ph => {
                  const p = prev(ph)
                  return (
                    <div key={ph.id} draggable={!isOtherMonth}
                      onDragStart={e => { if(isOtherMonth)return; e.stopPropagation(); setDragging({phaseId:ph.id,startDayStr:dateStr,origStart:ph.start_date,origEnd:ph.end_date}); e.dataTransfer.effectAllowed="move" }}
                      onDragEnd={() => { setDragging(null); setHoverDay(null) }}
                      className="text-white text-[9px] font-medium px-1 py-px overflow-hidden whitespace-nowrap text-ellipsis cursor-grab select-none"
                      style={{
                        background: ph.color,
                        opacity: isOtherMonth ? 0.3 : dragging&&dragging.phaseId===ph.id ? 0.4 : 1,
                        borderRadius: p.start===dateStr&&p.end===dateStr?"3px":p.start===dateStr?"3px 0 0 3px":p.end===dateStr?"0 3px 3px 0":"0"
                      }}>
                      {p.start===dateStr ? ph.name : "\u00A0"}
                    </div>
                  )
                })}
                {dph.length > 3 && (
                  <div className="text-[8px] text-gray-400 font-medium px-1 leading-tight">
                    +{dph.length - 3}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {vis.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {vis.map(ph => {
            const proj = projects.find(p => p.id===ph.project_id)
            const p = prev(ph)
            return (
              <div key={ph.id} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{background:ph.color}}/>
                <span className="text-gray-700">{proj?proj.name+" · ":""}{ph.name}</span>
                <span className="text-gray-400">{fmtDate(p.start)}~{fmtDate(p.end)}</span>
              </div>
            )
          })}
        </div>
      )}
      <p className="text-xs text-gray-300 mt-3">막대를 드래그해서 날짜를 이동할 수 있어요</p>
    </div>
  )
}

// ── Task Form Modal ───────────────────────────────────────────────
function TaskForm({ form, setForm, editId, onSubmit, onCancel, projects, ts }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40"/>
      <form
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        onSubmit={e => { e.preventDefault(); onSubmit() }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{editId ? "할 일 편집" : "새 할 일"}</h2>
          <button type="button" onClick={onCancel} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
            <X size={16}/>
          </button>
        </div>
        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          <div>
            <Input
              placeholder="할 일을 입력하세요"
              value={form.title}
              onChange={e => setForm(f => ({...f, title: e.target.value}))}
              autoFocus
              className="text-base font-medium h-11"
            />
          </div>
          <div>
            <Textarea
              placeholder="메모 (선택사항)"
              value={form.memo}
              onChange={e => setForm(f => ({...f, memo: e.target.value}))}
              rows={2}
              className="text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">과제</label>
              <div className="relative">
                <select
                  value={form.project_id}
                  onChange={e => setForm(f => ({...f, project_id: e.target.value ? Number(e.target.value) : ""}))}
                  className="w-full h-9 rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1E5F52] focus:border-transparent appearance-none"
                >
                  <option value="">미지정</option>
                  {projects.filter(p=>!p.done).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <ChevronRight size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none"/>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">일정</label>
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <select
                    value={form.schedule}
                    onChange={e => setForm(f => ({...f, schedule: e.target.value, schedule_date: ""}))}
                    className="w-full h-9 rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1E5F52] focus:border-transparent appearance-none"
                  >
                    <option value="today">오늘</option>
                    <option value="date">날짜 지정</option>
                    <option value="tomorrow">백로그</option>
                    <option value="none">미지정</option>
                  </select>
                  <ChevronRight size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none"/>
                </div>
                {form.schedule !== "none" && (
                  <button
                    type="button"
                    onClick={() => setForm(f => ({...f, schedule: "none", schedule_date: ""}))}
                    className="w-9 h-9 flex-shrink-0 rounded-lg border border-gray-200 flex items-center justify-center text-gray-300 hover:text-red-400 hover:border-red-200 hover:bg-red-50 transition-colors"
                  >
                    <X size={14}/>
                  </button>
                )}
              </div>
            </div>
          </div>
          {form.schedule === "date" && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">시작 날짜</label>
              <Input type="date" value={form.schedule_date} min={ts} onChange={e => setForm(f => ({...f, schedule_date: e.target.value}))} className="text-sm"/>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">마감일</label>
            <Input type="date" value={form.due} onChange={e => setForm(f => ({...f, due: e.target.value}))} className="text-sm"/>
          </div>
        </div>
        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          <Button type="button" onClick={onCancel} variant="outline" className="flex-1">취소</Button>
          <Button type="submit" className="flex-1 bg-[#1E5F52] hover:bg-[#164A3F]">{editId ? "저장" : "추가"}</Button>
        </div>
      </form>
    </div>
  )
}

// ── Project Manager Modal ─────────────────────────────────────────
function ProjectManager({
  projects, phases, onClose, onAddProject, onDeleteProject, onToggleProjDone, onSaveEditProj,
  newProjName, setNewProjName, newProjColor, setNewProjColor, newProjOpenDate, setNewProjOpenDate,
  showNewProjForm, setShowNewProjForm,
  editingProjId, setEditingProjId, editingProjName, setEditingProjName, editingProjColor, setEditingProjColor, editingProjOpenDate, setEditingProjOpenDate,
  onReorderProjects,
}) {
  const dragProjRef = useRef(null)
  const active = projects.filter(p => !p.done)
  const completed = projects.filter(p => p.done)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40"/>
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <FolderKanban size={16} className="text-[#164A3F]"/>
            과제 관리
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
            <X size={16}/>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {active.length === 0 && completed.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">등록된 과제가 없어요</p>
          )}
          {active.map(p => (
            <div key={p.id}
              draggable={editingProjId !== p.id}
              onDragStart={e => {
                if(editingProjId===p.id)return
                dragProjRef.current = p.id
                e.dataTransfer.effectAllowed="move"
                e.currentTarget.style.opacity="0.4"
              }}
              onDragOver={e => {
                e.preventDefault()
                if(dragProjRef.current && dragProjRef.current!==p.id) e.currentTarget.style.outline="2px solid rgb(30 95 82 / 0.25)"
              }}
              onDragLeave={e => { e.currentTarget.style.outline="" }}
              onDrop={e => {
                e.preventDefault()
                e.currentTarget.style.outline=""
                const fromId = dragProjRef.current
                if(fromId && fromId!==p.id) onReorderProjects(fromId, p.id)
                dragProjRef.current = null
              }}
              onDragEnd={e => {
                e.currentTarget.style.opacity=""
                dragProjRef.current = null
              }}
              className="rounded-xl border border-gray-100 bg-gray-50 p-3"
            >
              {editingProjId === p.id ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <ColorPicker value={editingProjColor} onChange={setEditingProjColor}/>
                    <input value={editingProjName} onChange={e=>setEditingProjName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();onSaveEditProj(p.id)}else if(e.key==="Escape")setEditingProjId(null)}} autoFocus className="flex-1 text-sm font-medium bg-white rounded-lg border border-gray-200 px-3 h-8 focus:outline-none focus:ring-2 focus:ring-[#1E5F52]"/>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-10">오픈일</span>
                    <input type="date" value={editingProjOpenDate} onChange={e=>setEditingProjOpenDate(e.target.value)} className="flex-1 text-xs bg-white rounded-lg border border-gray-200 px-2 h-7 focus:outline-none focus:ring-2 focus:ring-[#1E5F52]"/>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={()=>onSaveEditProj(p.id)} className="flex-1 text-xs h-7">저장</Button>
                    <Button size="sm" variant="ghost" onClick={()=>setEditingProjId(null)} className="flex-1 text-xs h-7">취소</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <GripVertical size={14} className="text-gray-300 cursor-grab flex-shrink-0"/>
                  <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{background:p.color}}/>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{p.name}</div>
                    {p.open_date && <div className="text-xs text-gray-400 mt-0.5">{fmtDate(p.open_date)} 오픈</div>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={()=>onToggleProjDone(p.id)} className="px-2 py-1 text-xs text-gray-500 hover:text-[#164A3F] hover:bg-[#EAF0EE] rounded-md transition-colors">완료</button>
                    <button onClick={()=>{setEditingProjId(p.id);setEditingProjName(p.name);setEditingProjColor(p.color);setEditingProjOpenDate(p.open_date||"")}} className="px-2 py-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">수정</button>
                    <button onClick={()=>onDeleteProject(p.id)} className="px-2 py-1 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">삭제</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {completed.length > 0 && (
            <>
              <div className="text-xs font-semibold text-gray-400 pt-2 pb-1 px-1">완료된 과제</div>
              {completed.map(p => (
                <div key={p.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3 opacity-50">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={12} style={{color:p.color}} className="flex-shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-600 line-through truncate">{p.name}</div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={()=>onToggleProjDone(p.id)} className="px-2 py-1 text-xs text-gray-500 hover:text-[#164A3F] hover:bg-[#EAF0EE] rounded-md transition-colors">되돌리기</button>
                      <button onClick={()=>onDeleteProject(p.id)} className="px-2 py-1 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">삭제</button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
          {showNewProjForm && (
            <div className="rounded-xl border-2 border-[#C2D9D4] bg-[#EAF0EE] p-3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <ColorPicker value={newProjColor} onChange={setNewProjColor}/>
                <input placeholder="새 과제 이름" value={newProjName} onChange={e=>setNewProjName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();e.stopPropagation();onAddProject()}}} autoFocus className="flex-1 text-sm font-medium bg-white rounded-lg border border-gray-200 px-3 h-8 focus:outline-none focus:ring-2 focus:ring-[#1E5F52]"/>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-10">오픈일</span>
                <input type="date" value={newProjOpenDate} onChange={e=>setNewProjOpenDate(e.target.value)} className="flex-1 text-xs bg-white rounded-lg border border-gray-200 px-2 h-7 focus:outline-none focus:ring-2 focus:ring-[#1E5F52]"/>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={onAddProject} className="flex-1 text-xs h-7 bg-[#1E5F52] hover:bg-[#164A3F]">추가</Button>
                <Button size="sm" variant="ghost" onClick={()=>setShowNewProjForm(false)} className="flex-1 text-xs h-7">취소</Button>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-100 flex-shrink-0">
          <Button onClick={()=>setShowNewProjForm(true)} variant="outline" className="w-full gap-2">
            <Plus size={14}/>새 과제 추가
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Today Panel ──────────────────────────────────────────────────
function TodayPanel({ phases, projects, ts, onClose }) {
  const d = new Date()
  const dayNames = ["일","월","화","수","목","금","토"]
  const month = d.getMonth() + 1
  const date = d.getDate()
  const dayName = dayNames[d.getDay()]

  const projOf = id => projects.find(p => p.id === id)
  const activePhases = phases.filter(p => p.start_date <= ts && p.end_date >= ts)

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 w-56">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] font-semibold text-[#1E5F52] uppercase tracking-widest mb-0.5">Today</div>
            <div className="text-base font-bold text-gray-900">{month}월 {date}일</div>
            <div className="text-xs text-gray-400">{dayName}요일</div>
          </div>
          <button onClick={onClose} className="w-6 h-6 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-300 transition-colors mt-0.5">
            <X size={12}/>
          </button>
        </div>
        <div className="mt-3 h-px bg-gray-100"/>
      </div>
      {/* Content */}
      <div className="px-4 pb-4">
        {activePhases.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-gray-300">
            <Calendar size={20} className="mb-1.5"/>
            <p className="text-xs">진행 중인 일정 없음</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activePhases.map(ph => {
              const proj = projOf(ph.project_id)
              return (
                <div key={ph.id} className="rounded-xl p-2.5" style={{background: ph.color + "12"}}>
                  {proj && (
                    <div className="text-[9px] font-semibold uppercase tracking-wide mb-0.5" style={{color: ph.color + "bb"}}>
                      {proj.name}
                    </div>
                  )}
                  <div className="text-xs font-semibold text-gray-800 leading-snug">{ph.name}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Memo Panel ───────────────────────────────────────────────────
function MemoPanel({ onClose }) {
  const [text, setText] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("pm-todo-memo") || ""
    return ""
  })
  const [saved, setSaved] = useState(false)
  const timerRef = useRef(null)

  function handleChange(e) {
    const val = e.target.value
    setText(val)
    setSaved(false)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      localStorage.setItem("pm-todo-memo", val)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    }, 600)
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <NotebookPen size={14} className="text-[#1E5F52]"/>
          <span className="text-sm font-semibold text-gray-800">메모</span>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-[10px] text-gray-400">저장됨</span>}
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors"
          >
            <X size={13}/>
          </button>
        </div>
      </div>
      {/* Body */}
      <textarea
        value={text}
        onChange={handleChange}
        placeholder={"자유롭게 메모하세요\n\n• 아이디어\n• 회의 내용\n• 중요한 것들..."}
        className="flex-1 w-full resize-none p-4 text-sm text-gray-700 leading-relaxed placeholder:text-gray-300 focus:outline-none bg-white"
        style={{ fontFamily: "inherit" }}
      />
      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-300">{text.length}자</span>
          {text.length > 0 && (
            <button
              onClick={() => { setText(""); localStorage.removeItem("pm-todo-memo") }}
              className="text-[10px] text-gray-300 hover:text-red-400 transition-colors"
            >
              전체 삭제
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────
export default function App() {
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [phases, setPhases] = useState([])
  const [loading, setLoading] = useState(true)

  // Forms & modals
  const [form, setForm] = useState({title:"",memo:"",due:"",schedule:"today",schedule_date:"",project_id:""})
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showProjMgr, setShowProjMgr] = useState(false)

  // Project management
  const [showNewProjForm, setShowNewProjForm] = useState(false)
  const [newProjName, setNewProjName] = useState("")
  const [newProjColor, setNewProjColor] = useState(COLORS[0])
  const [newProjOpenDate, setNewProjOpenDate] = useState("")
  const [editingProjId, setEditingProjId] = useState(null)
  const [editingProjName, setEditingProjName] = useState("")
  const [editingProjColor, setEditingProjColor] = useState("")
  const [editingProjOpenDate, setEditingProjOpenDate] = useState("")

  // Memo panel
  const [showMemo, setShowMemo] = useState(false)

  // Today panel
  const [showToday, setShowToday] = useState(false)

  // Drag-and-drop order (localStorage persisted)
  const [projOrder, setProjOrder] = useState(() => {
    if (typeof window !== "undefined") {
      const s = localStorage.getItem("pm-todo-proj-order")
      return s ? JSON.parse(s) : []
    }
    return []
  })
  const [taskOrder, setTaskOrder] = useState(() => {
    if (typeof window !== "undefined") {
      const s = localStorage.getItem("pm-todo-task-order")
      return s ? JSON.parse(s) : []
    }
    return []
  })
  const dragTaskRef = useRef(null)

  // Views & calendar
  const [view, setView] = useState("all")
  const [calDate, setCalDate] = useState(() => { const d=new Date(); return {y:d.getFullYear(),m:d.getMonth()} })
  const [selProj, setSelProj] = useState("")
  const [showPhaseForm, setShowPhaseForm] = useState(false)
  const [phaseForm, setPhaseForm] = useState({name:"",start_date:"",end_date:"",color:COLORS[0]})
  const [editPhaseId, setEditPhaseId] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)

  const ts = today()

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      const [p, t, ph] = await Promise.all([
        supabase.from("projects").select("*").order("id"),
        supabase.from("tasks").select("*").order("id"),
        supabase.from("phases").select("*").order("id"),
      ])
      if (p.data) setProjects(p.data)
      if (t.data) setTasks(t.data)
      if (ph.data) setPhases(ph.data)
      setLoading(false)
    }
    fetchAll()
  }, [])

  const isOD = d => d && d < ts
  const isTD = d => d === ts
  const isDS = d => { if(!d)return false; const diff=(new Date(d)-new Date(ts))/86400000; return diff>0&&diff<=3 }
  const projOf = id => projects.find(p => p.id === id)

  async function addProject() {
    const name = newProjName.trim(); if (!name) return
    const id = Date.now()
    const row = {id, name, color:newProjColor, open_date:newProjOpenDate||null, done:false}
    setProjects(ps => [...ps, row])
    await supabase.from("projects").insert(row)
    setNewProjName(""); setNewProjColor(COLORS[0]); setNewProjOpenDate(""); setShowNewProjForm(false)
  }
  async function deleteProject(id) {
    if (!window.confirm("과제를 삭제할까요?")) return
    setProjects(ps => ps.filter(p => p.id !== id))
    setTasks(t2 => t2.map(t => t.project_id===id?{...t,project_id:null}:t))
    await supabase.from("projects").delete().eq("id", id)
  }
  async function toggleProjDone(id) {
    const proj = projects.find(p => p.id===id); if (!proj) return
    if (!proj.done) setShowConfetti(true)
    const updated = {...proj, done:!proj.done}
    setProjects(ps => ps.map(p => p.id===id?updated:p))
    await supabase.from("projects").update({done:!proj.done}).eq("id", id)
  }
  async function saveEditProj(id) {
    const name = editingProjName.trim(); if (!name) return
    const updates = {name, color:editingProjColor, open_date:editingProjOpenDate||null}
    setProjects(ps => ps.map(p => p.id===id?{...p,...updates}:p))
    await supabase.from("projects").update(updates).eq("id", id)
    setEditingProjId(null)
  }
  async function submit() {
    if (!form.title.trim()) return
    const id = Date.now()
    const row = {id,title:form.title,memo:form.memo||null,due:form.due||null,schedule:form.schedule,schedule_date:form.schedule!=="date"?null:form.schedule_date||null,project_id:form.project_id||null,done:false,created_at:ts}
    if (editId) {
      const {id:_,...updates} = row
      setTasks(t2 => t2.map(t => t.id===editId?{...t,...updates}:t))
      await supabase.from("tasks").update(updates).eq("id", editId)
      setEditId(null)
    } else {
      setTasks(t2 => [...t2, row])
      await supabase.from("tasks").insert(row)
    }
    setForm(f => ({title:"",memo:"",due:"",schedule:"today",schedule_date:"",project_id:f.project_id}))
    setShowForm(false)
  }
  async function toggleDone(id) {
    const t = tasks.find(x => x.id===id); if (!t) return
    if (!t.done) setShowConfetti(true)
    setTasks(t2 => t2.map(x => x.id===id?{...x,done:!x.done}:x))
    await supabase.from("tasks").update({done:!t.done}).eq("id", id)
  }
  async function moveTask(t) {
    const eff = getEff(t, ts)
    const updates = eff==="today"?{schedule:"tomorrow",schedule_date:null}:{schedule:"today",schedule_date:null}
    setTasks(t2 => t2.map(x => x.id===t.id?{...x,...updates}:x))
    await supabase.from("tasks").update(updates).eq("id", t.id)
  }
  async function deleteTask(id) {
    if (!window.confirm("할 일을 삭제할까요?")) return
    setTasks(t2 => t2.filter(t => t.id !== id))
    await supabase.from("tasks").delete().eq("id", id)
  }
  function startEdit(t) {
    setForm({title:t.title,memo:t.memo||"",due:t.due||"",schedule:t.schedule||"none",schedule_date:t.schedule_date||"",project_id:t.project_id||""})
    setEditId(t.id); setShowForm(true)
  }
  function cancelForm() {
    setForm(f => ({title:"",memo:"",due:"",schedule:"today",schedule_date:"",project_id:f.project_id}))
    setEditId(null); setShowForm(false)
  }
  async function submitPhase() {
    if (!phaseForm.name.trim()||!phaseForm.start_date||!phaseForm.end_date||!selProj) return
    if (editPhaseId) {
      const updates = {name:phaseForm.name,start_date:phaseForm.start_date,end_date:phaseForm.end_date,color:phaseForm.color}
      setPhases(ps => ps.map(p => p.id===editPhaseId?{...p,...updates}:p))
      await supabase.from("phases").update(updates).eq("id", editPhaseId)
      setEditPhaseId(null)
    } else {
      const id = Date.now()
      const row = {id,...phaseForm,project_id:Number(selProj)}
      setPhases(ps => [...ps, row])
      await supabase.from("phases").insert(row)
    }
    setPhaseForm({name:"",start_date:"",end_date:"",color:COLORS[0]}); setShowPhaseForm(false)
  }
  async function deletePhase(id) {
    if (!window.confirm("단계를 삭제할까요?")) return
    setPhases(ps => ps.filter(p => p.id !== id))
    await supabase.from("phases").delete().eq("id", id)
  }
  async function updatePhase(id, updates) {
    setPhases(ps => ps.map(p => p.id===id?{...p,...updates}:p))
    await supabase.from("phases").update(updates).eq("id", id)
  }

  // ── Drag-and-drop order helpers ───────────────────────────────
  function getSortedProjects(list) {
    if (projOrder.length === 0) return list
    const om = {}; projOrder.forEach((id, i) => { om[id] = i })
    return [...list].sort((a, b) => (om[a.id] ?? 9999) - (om[b.id] ?? 9999))
  }
  function reorderProjects(fromId, toId) {
    if (fromId === toId) return
    const ids = getSortedProjects(projects).map(p => p.id)
    const fi = ids.indexOf(fromId), ti = ids.indexOf(toId)
    if (fi === -1 || ti === -1) return
    ids.splice(fi, 1); ids.splice(ti, 0, fromId)
    setProjOrder(ids)
    localStorage.setItem("pm-todo-proj-order", JSON.stringify(ids))
  }
  function getSortedTasks(list) {
    if (taskOrder.length === 0) return list
    const om = {}; taskOrder.forEach((id, i) => { om[id] = i })
    return [...list].sort((a, b) => (om[a.id] ?? 9999) - (om[b.id] ?? 9999))
  }
  function reorderTasks(fromId, toId) {
    if (fromId === toId) return
    const ids = getSortedTasks(tasks).map(t => t.id)
    const fi = ids.indexOf(fromId), ti = ids.indexOf(toId)
    if (fi === -1 || ti === -1) return
    ids.splice(fi, 1); ids.splice(ti, 0, fromId)
    setTaskOrder(ids)
    localStorage.setItem("pm-todo-task-order", JSON.stringify(ids))
  }

  const undone = tasks.filter(t => !t.done)
  const done = tasks.filter(t => t.done)
  const todayCnt = undone.filter(t => getEff(t,ts)==="today").length
  const backlogCnt = undone.filter(t => getEff(t,ts)==="backlog").length

  function getFiltered() {
    if (view==="today") return undone.filter(t => getEff(t,ts)==="today")
    if (view==="backlog") return undone.filter(t => getEff(t,ts)==="backlog")
    if (view==="all") return undone
    return done
  }

  function groupByProject(list) {
    const groups = {}
    for (const t of list) { const key=t.project_id?String(t.project_id):"__none__"; if(!groups[key])groups[key]=[]; groups[key].push(t) }
    const order = [...getSortedProjects(projects).map(p=>String(p.id)),"__none__"]
    return order.filter(k=>groups[k]).map(k=>({key:k,tasks:groups[k]}))
  }

  // ── Task Row ──────────────────────────────────────────────────
  function TaskRow({ t, isLast }) {
    const eff = getEff(t, ts)
    const hasMemo = t.memo && t.memo.trim()
    const pinned = eff === "today"

    return (
      <div
        draggable
        onDragStart={e => {
          dragTaskRef.current = t.id
          e.dataTransfer.effectAllowed = "move"
          e.currentTarget.style.opacity = "0.4"
        }}
        onDragOver={e => {
          e.preventDefault()
          if (dragTaskRef.current !== t.id) e.currentTarget.style.background = "rgb(234 240 238 / 0.6)"
        }}
        onDragLeave={e => { e.currentTarget.style.background = "" }}
        onDrop={e => {
          e.preventDefault()
          e.currentTarget.style.background = ""
          const fromId = dragTaskRef.current
          if (fromId && fromId !== t.id) reorderTasks(fromId, t.id)
          dragTaskRef.current = null
        }}
        onDragEnd={e => {
          e.currentTarget.style.opacity = ""
          dragTaskRef.current = null
        }}
        className={`flex items-center gap-2 px-4 py-3 group hover:bg-gray-50/70 transition-colors ${!isLast?"border-b border-gray-50":""}`}
      >
        <div className="flex-shrink-0 text-gray-200 group-hover:text-gray-300 transition-colors cursor-grab">
          <GripVertical size={14}/>
        </div>
        <button
          onClick={() => toggleDone(t.id)}
          className={`flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${t.done?"bg-[#1E5F52] border-[#1E5F52]":"border-gray-200 hover:border-[#1E5F52]"}`}
        >
          {t.done && <Check size={10} className="text-white" strokeWidth={3}/>}
        </button>
        <div className={`flex-1 min-w-0 ${t.done?"opacity-40":""}`}>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`text-sm font-medium text-gray-800 ${t.done?"line-through":""}`}>{t.title}</span>
            {t.schedule==="date"&&t.schedule_date&&(
              <Badge variant={t.schedule_date<=ts?"warning":"secondary"} className="text-[10px]">{fmtDate(t.schedule_date)}</Badge>
            )}
            {t.due&&(
              isOD(t.due)?<Badge variant="destructive" className="text-[10px]">{fmtDate(t.due)} 초과</Badge>:
              isTD(t.due)?<Badge variant="warning" className="text-[10px]">오늘 마감</Badge>:
              isDS(t.due)?<Badge variant="warning" className="text-[10px]">~{fmtDate(t.due)}</Badge>:
              <Badge variant="secondary" className="text-[10px]">~{fmtDate(t.due)}</Badge>
            )}
          </div>
          {hasMemo && <p className="text-xs text-gray-400 whitespace-pre-line leading-relaxed mt-0.5">{t.memo}</p>}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {!t.done && (
            <button
              onClick={() => moveTask(t)}
              title={pinned?"백로그로":"오늘로"}
              className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${pinned?"text-[#1E5F52] hover:bg-[#EAF0EE]":"text-gray-300 hover:bg-gray-100 hover:text-gray-500"}`}
            >
              {pinned ? <Pin size={13}/> : <PinOff size={13}/>}
            </button>
          )}
          <button onClick={() => startEdit(t)} className="w-7 h-7 rounded-md flex items-center justify-center text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors">
            <Pencil size={13}/>
          </button>
          <button onClick={() => deleteTask(t.id)} className="w-7 h-7 rounded-md flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 size={13}/>
          </button>
        </div>
      </div>
    )
  }

  function renderGroups(list) {
    const groups = groupByProject(list)
    if (groups.length === 0) return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Inbox size={32} className="mb-3 opacity-30"/>
        <p className="text-sm">할 일이 없어요</p>
      </div>
    )
    return groups.map(g => {
      const proj = g.key==="__none__"?null:projOf(Number(g.key))
      const color = proj?proj.color:"#9ca3af"
      return (
        <div key={g.key} className="mb-5">
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{background:color}}/>
            <span className="text-xs font-semibold text-gray-700">{proj?proj.name:"미지정"}</span>
            <span className="text-xs font-semibold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{g.tasks.length}</span>
            {proj&&proj.open_date&&<span className="text-xs text-gray-400 ml-auto">{fmtDate(proj.open_date)} 오픈</span>}
          </div>
          <div className="bg-white rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            {getSortedTasks(g.tasks).map((t, i, a) => <TaskRow key={t.id} t={t} isLast={i===a.length-1}/>)}
          </div>
        </div>
      )
    })
  }

  function renderScheduleTab() {
    const fp = phases.filter(p => !selProj || p.project_id===Number(selProj))
    return (
      <div>
        {/* Project selector */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-500 mb-1.5 block">과제 선택</label>
          <div className="relative">
            <select
              value={selProj}
              onChange={e => setSelProj(e.target.value)}
              className="w-full h-9 rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1E5F52] appearance-none"
            >
              <option value="">전체 보기</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <ChevronRight size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none"/>
          </div>
        </div>

        {/* Phase form */}
        {selProj && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500">단계</span>
              <button onClick={() => setShowPhaseForm(v=>!v)} className="text-xs text-[#164A3F] hover:text-[#1E5F52] font-medium">
                {showPhaseForm?"접기":"+ 추가"}
              </button>
            </div>
            {showPhaseForm && (
              <div className="bg-white rounded-xl p-4 mb-3 flex flex-col gap-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
                <div className="flex items-center gap-3">
                  <ColorPicker value={phaseForm.color} onChange={c=>setPhaseForm(f=>({...f,color:c}))}/>
                  <Input placeholder="단계 이름" value={phaseForm.name} onChange={e=>setPhaseForm(f=>({...f,name:e.target.value}))} className="flex-1"/>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">기간</label>
                  <DateRangePicker
                    startDate={phaseForm.start_date}
                    endDate={phaseForm.end_date}
                    onChange={({start_date, end_date}) => setPhaseForm(f=>({...f, start_date, end_date}))}
                  />
                </div>
                <Button onClick={submitPhase} className="w-full bg-[#1E5F52] hover:bg-[#164A3F]">
                  {editPhaseId?"저장":"단계 추가"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Phase list */}
        {fp.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-500 mb-2">등록된 단계</div>
            <div className="bg-white rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
              {fp.map((ph, i, a) => {
                const proj = projOf(ph.project_id)
                return (
                  <div key={ph.id} className={`flex items-center gap-3 px-4 py-3 group hover:bg-gray-50 ${i!==a.length-1?"border-b border-gray-100":""}`}>
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{background:ph.color}}/>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800">{proj?proj.name+" · ":""}{ph.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{fmtDate(ph.start_date)} ~ {fmtDate(ph.end_date)}</div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={()=>{setEditPhaseId(ph.id);setSelProj(String(ph.project_id));setPhaseForm({name:ph.name,start_date:ph.start_date,end_date:ph.end_date,color:ph.color});setShowPhaseForm(true)}} className="w-7 h-7 rounded-md flex items-center justify-center text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors">
                        <Pencil size={13}/>
                      </button>
                      <button onClick={()=>deletePhase(ph.id)} className="w-7 h-7 rounded-md flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Calendar */}
        <div className="text-xs font-semibold text-gray-500 mb-2">월별 캘린더</div>
        <div className="bg-white rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <DraggableCalendar phases={fp} projects={projects} calDate={calDate} setCalDate={setCalDate} onUpdatePhase={updatePhase}/>
        </div>
      </div>
    )
  }

  const tabs = [
    {key:"all",    label:"전체",   icon:<LayoutGrid size={13}/>,  count:undone.length},
    {key:"today",  label:"오늘",   icon:<Clock size={13}/>,       count:todayCnt},
    {key:"backlog",label:"백로그", icon:<Inbox size={13}/>,       count:backlogCnt},
    {key:"done",   label:"완료",   icon:<CheckCircle2 size={13}/>,count:done.length},
  ]

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen text-gray-400 gap-2">
      <Loader2 size={18} className="animate-spin"/>
      <span className="text-sm">불러오는 중...</span>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F5F7F6]">
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)}/>}

      {/* ── Header ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#1E5F52] flex items-center justify-center">
              <Check size={14} className="text-white" strokeWidth={2.5}/>
            </div>
            <span className="text-sm font-bold text-gray-900 tracking-tight">PM Todo</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowProjMgr(true)}
              className="gap-1.5 text-xs"
            >
              <FolderKanban size={13}/>
              과제 관리
            </Button>
            <Button
              size="sm"
              onClick={() => { setShowForm(true); setEditId(null) }}
              className="gap-1.5 text-xs bg-[#1E5F52] hover:bg-[#164A3F]"
            >
              <Plus size={13}/>
              추가
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────────── */}
      <div className="mx-auto px-4 py-5 max-w-2xl">
      <div className="relative">
      <main className="min-w-0">

        {/* Tab Bar */}
        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={() => setShowToday(v => !v)}
            title="오늘 일정"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
              showToday
                ? "bg-[#1E5F52] text-white shadow-md shadow-[#C2D9D4]"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            <Clock size={15}/>
          </button>
          <div className="flex flex-1 bg-white rounded-xl p-1 gap-1 border border-gray-200 shadow-sm">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setView(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium transition-all ${
                  view===tab.key
                    ? "bg-[#1E5F52] text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count > 0 && (
                  <span className={`text-[10px] font-semibold rounded-full px-1.5 py-px ${view===tab.key?"bg-white/20 text-white":"bg-gray-100 text-gray-400"}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => setView(v => v==="schedule"?"all":"schedule")}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
              view==="schedule"
                ? "bg-[#1E5F52] text-white shadow-md shadow-[#C2D9D4]"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            <Calendar size={15}/>
          </button>
          <button
            onClick={() => setShowMemo(v => !v)}
            title="메모"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
              showMemo
                ? "bg-[#1E5F52] text-white shadow-md shadow-[#C2D9D4]"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            <NotebookPen size={15}/>
          </button>
        </div>

        {/* Content */}
        {view==="schedule" ? renderScheduleTab() : renderGroups(getFiltered())}
      </main>

      {/* ── Today Panel ───────────────────────────────────────── */}
      {showToday && (
        <aside style={{position: "fixed", right: "calc(50% + 356px)", top: "80px"}}>
          <TodayPanel
            phases={phases} projects={projects} ts={ts}
            onClose={() => setShowToday(false)}
          />
        </aside>
      )}

      {/* ── Memo Panel ────────────────────────────────────────── */}
      {showMemo && (
        <aside className="rounded-2xl overflow-hidden shadow-sm border border-gray-100" style={{position: "fixed", left: "calc(50% + 356px)", top: "80px", width: "288px", height: "calc(100vh - 96px)"}}>
          <MemoPanel onClose={() => setShowMemo(false)}/>
        </aside>
      )}
      </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────── */}
      {showForm && (
        <TaskForm
          form={form} setForm={setForm} editId={editId}
          onSubmit={submit} onCancel={cancelForm}
          projects={projects} ts={ts}
        />
      )}

      {showProjMgr && (
        <ProjectManager
          projects={getSortedProjects(projects)}
          phases={phases}
          onClose={() => setShowProjMgr(false)}
          onAddProject={addProject}
          onDeleteProject={deleteProject}
          onToggleProjDone={toggleProjDone}
          onSaveEditProj={saveEditProj}
          newProjName={newProjName} setNewProjName={setNewProjName}
          newProjColor={newProjColor} setNewProjColor={setNewProjColor}
          newProjOpenDate={newProjOpenDate} setNewProjOpenDate={setNewProjOpenDate}
          showNewProjForm={showNewProjForm} setShowNewProjForm={setShowNewProjForm}
          editingProjId={editingProjId} setEditingProjId={setEditingProjId}
          editingProjName={editingProjName} setEditingProjName={setEditingProjName}
          editingProjColor={editingProjColor} setEditingProjColor={setEditingProjColor}
          editingProjOpenDate={editingProjOpenDate} setEditingProjOpenDate={setEditingProjOpenDate}
          onReorderProjects={reorderProjects}
        />
      )}
    </div>
  )
}
