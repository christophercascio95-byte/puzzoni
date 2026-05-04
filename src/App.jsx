import { useState, useEffect, useRef } from "react";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, set, push, remove, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC18QZvuIR8ktjlARIPnau7VjDOG4A3ois",
  authDomain: "puzzoni-25b81.firebaseapp.com",
  databaseURL: "https://puzzoni-25b81-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "puzzoni-25b81",
  storageBucket: "puzzoni-25b81.firebasestorage.app",
  messagingSenderId: "516731252655",
  appId: "1:516731252655:web:1d2a200cb1e7c0a7de895a"
};

const PALETTE = {
  rose: "#F9A8C9", roseLight: "#FDE8F0", roseDark: "#E07BAA",
  peach: "#FDBA9B", peachLight: "#FEF0E8",
  lavender: "#C4B5E8", lavenderLight: "#EDE8F9", lavenderDark: "#9B88D4",
  mint: "#A8D8C8", mintLight: "#E8F6F1", mintDark: "#5BBFA0",
  cream: "#FFF8F3", warmGray: "#7A6B6B", darkBrown: "#3D2B2B",
  sky: "#A8C8E8", skyLight: "#E8F1F9",
};

const CALENDAR_COLORS = [
  { name: "Rosa", value: "#F9A8C9" }, { name: "Lavanda", value: "#C4B5E8" },
  { name: "Menta", value: "#A8D8C8" }, { name: "Pesca", value: "#FDBA9B" },
  { name: "Cielo", value: "#A8C8E8" }, { name: "Giallo", value: "#F9E4A8" },
];

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}
function formatTime(d) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}
function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}
const MONTHS = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const DAYS_SHORT = ["Dom","Lun","Mar","Mer","Gio","Ven","Sab"];

// ── ONBOARDING ──────────────────────────────────────────────────────────────
function Onboarding({ onComplete }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(CALENDAR_COLORS[0].value);
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-8" style={{ background: PALETTE.cream }}>
      <div className="text-5xl mb-4">🐾</div>
      <h1 style={{ fontFamily: "'Playfair Display', serif", color: PALETTE.darkBrown, fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Benvenuto/a!</h1>
      <p style={{ color: PALETTE.warmGray, fontSize: 14, marginBottom: 32, textAlign: "center" }}>Come ti chiami? Scegli anche il colore del tuo calendario.</p>
      <input
        className="w-full rounded-2xl px-4 py-3 mb-4 text-sm outline-none"
        style={{ background: PALETTE.roseLight, color: PALETTE.darkBrown, border: `1.5px solid ${PALETTE.rose}`, maxWidth: 320 }}
        placeholder="Il tuo nome..."
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <div style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap", justifyContent: "center", maxWidth: 320 }}>
        {CALENDAR_COLORS.map(c => (
          <button key={c.value} onClick={() => setColor(c.value)}
            style={{ width: 40, height: 40, borderRadius: "50%", background: c.value, border: color === c.value ? `3px solid ${PALETTE.darkBrown}` : "3px solid transparent", cursor: "pointer" }}
            title={c.name}
          />
        ))}
      </div>
      <button
        onClick={() => { if (name.trim()) onComplete(name.trim(), color); }}
        style={{ background: `linear-gradient(135deg, ${PALETTE.rose}, ${PALETTE.roseDark})`, color: "#fff", border: "none", borderRadius: 20, padding: "12px 40px", fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: name.trim() ? 1 : 0.5 }}
      >Iniziamo 💕</button>
    </div>
  );
}

// ── SHOPPING ─────────────────────────────────────────────────────────────────
function ShoppingList({ db, user }) {
  const [items, setItems] = useState([]);
  const [savedArticles, setSavedArticles] = useState([]);
  const [text, setText] = useState("");
  const [qty, setQty] = useState("");
  const [recurrence, setRecurrence] = useState("none");
  const [suggestions, setSuggestions] = useState([]);
  const inputRef = useRef();

  useEffect(() => {
    if (!db) return;
    const unsub1 = onValue(ref(db, "shopping"), snap => {
      const d = snap.val() || {};
      setItems(Object.entries(d).map(([id, v]) => ({ id, ...v })));
    });
    const unsub2 = onValue(ref(db, "shoppingArticles"), snap => {
      const d = snap.val() || {};
      setSavedArticles(Object.entries(d).map(([id, v]) => ({ id, ...v })).sort((a, b) => (b.count || 0) - (a.count || 0)));
    });
    return () => { unsub1(); unsub2(); };
  }, [db]);

  useEffect(() => {
    if (!text.trim()) { setSuggestions([]); return; }
    setSuggestions(savedArticles.filter(a => a.name.toLowerCase().includes(text.toLowerCase()) && a.name.toLowerCase() !== text.toLowerCase()));
  }, [text, savedArticles]);

  const addItem = () => {
    if (!text.trim() || !db) return;
    push(ref(db, "shopping"), { text: text.trim(), qty: qty || null, recurrence, checked: false, createdAt: Date.now() });
    // Update saved articles
    const existing = savedArticles.find(a => a.name.toLowerCase() === text.trim().toLowerCase());
    if (existing) update(ref(db, `shoppingArticles/${existing.id}`), { count: (existing.count || 0) + 1 });
    else push(ref(db, "shoppingArticles"), { name: text.trim(), count: 1 });
    setText(""); setQty(""); setRecurrence("none"); setSuggestions([]);
  };

  const toggleItem = (item) => {
    if (!db) return;
    update(ref(db, `shopping/${item.id}`), { checked: !item.checked, ...((!item.checked && item.recurrence !== "none") ? { lastCompleted: Date.now() } : {}) });
  };

  const deleteItem = (id) => remove(ref(db, `shopping/${id}`));
  const deleteSaved = (id) => remove(ref(db, `shoppingArticles/${id}`));

  const unchecked = items.filter(i => !i.checked);
  const checked = items.filter(i => i.checked);

  return (
    <div style={{ flex: 1, overflowY: "auto", paddingBottom: 100 }}>
      {/* Input */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: 16, boxShadow: "0 2px 12px rgba(249,168,201,0.15)", border: `1.5px solid ${PALETTE.roseLight}`, marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input ref={inputRef} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && addItem()}
              placeholder="Aggiungi prodotto..." style={{ flex: 1, border: `1.5px solid ${PALETTE.rose}`, borderRadius: 12, padding: "8px 12px", fontSize: 14, outline: "none", background: PALETTE.roseLight, color: PALETTE.darkBrown }} />
            <input value={qty} onChange={e => setQty(e.target.value)} placeholder="Qtà" style={{ width: 60, border: `1.5px solid ${PALETTE.peach}`, borderRadius: 12, padding: "8px 8px", fontSize: 14, outline: "none", background: PALETTE.peachLight, color: PALETTE.darkBrown }} />
          </div>
          {suggestions.length > 0 && (
            <div style={{ background: PALETTE.roseLight, borderRadius: 12, marginBottom: 8, overflow: "hidden" }}>
              {suggestions.slice(0, 4).map(s => (
                <button key={s.id} onClick={() => { setText(s.name); setSuggestions([]); inputRef.current?.focus(); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: PALETTE.darkBrown }}>
                  🔍 {s.name} <span style={{ color: PALETTE.warmGray, fontSize: 11 }}>({s.count}x)</span>
                </button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["none","daily","weekly","monthly"].map(r => (
              <button key={r} onClick={() => setRecurrence(r)} style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500, border: "none", cursor: "pointer", background: recurrence === r ? PALETTE.rose : PALETTE.roseLight, color: recurrence === r ? "#fff" : PALETTE.warmGray }}>
                {r === "none" ? "Una volta" : r === "daily" ? "Giornaliero" : r === "weekly" ? "Settimanale" : "Mensile"}
              </button>
            ))}
            <button onClick={addItem} style={{ marginLeft: "auto", padding: "4px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", background: `linear-gradient(135deg, ${PALETTE.rose}, ${PALETTE.roseDark})`, color: "#fff" }}>+ Aggiungi</button>
          </div>
        </div>

        {/* Articoli salvati */}
        {savedArticles.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: PALETTE.warmGray, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Articoli frequenti</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {savedArticles.slice(0, 8).map(a => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 4, background: PALETTE.roseLight, borderRadius: 20, padding: "4px 10px" }}>
                  <button onClick={() => { setText(a.name); inputRef.current?.focus(); }} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 12, color: PALETTE.darkBrown }}>{a.name}</button>
                  <button onClick={() => deleteSaved(a.id)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 10, color: PALETTE.rose }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista */}
        {unchecked.length === 0 && checked.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: PALETTE.warmGray }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🛒</div>
            <p style={{ fontSize: 14 }}>La lista è vuota!<br />Aggiungi il primo prodotto ✨</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {unchecked.map(item => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", borderRadius: 16, padding: "12px 16px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", border: `1.5px solid ${PALETTE.roseLight}` }}>
              <button onClick={() => toggleItem(item)} style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${PALETTE.rose}`, background: "none", cursor: "pointer", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: PALETTE.darkBrown, margin: 0 }}>{item.text}</p>
                <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                  {item.qty && <span style={{ fontSize: 11, color: PALETTE.warmGray }}>{item.qty}</span>}
                  {item.recurrence !== "none" && <span style={{ fontSize: 11, color: PALETTE.roseDark }}>🔁 {item.recurrence === "daily" ? "giornaliero" : item.recurrence === "weekly" ? "settimanale" : "mensile"}</span>}
                </div>
              </div>
              <button onClick={() => deleteItem(item.id)} style={{ border: "none", background: "none", cursor: "pointer", color: PALETTE.rose, fontSize: 16 }}>🗑</button>
            </div>
          ))}
          {checked.length > 0 && (
            <>
              <p style={{ fontSize: 11, fontWeight: 600, color: PALETTE.warmGray, textTransform: "uppercase", letterSpacing: 1, margin: "8px 0 4px" }}>Nel carrello ✓</p>
              {checked.map(item => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, background: PALETTE.roseLight, borderRadius: 16, padding: "10px 16px", opacity: 0.65 }}>
                  <button onClick={() => toggleItem(item)} style={{ width: 24, height: 24, borderRadius: "50%", background: PALETTE.rose, border: "none", cursor: "pointer", color: "#fff", fontSize: 12, flexShrink: 0 }}>✓</button>
                  <span style={{ flex: 1, fontSize: 14, textDecoration: "line-through", color: PALETTE.warmGray }}>{item.text}</span>
                  <button onClick={() => deleteItem(item.id)} style={{ border: "none", background: "none", cursor: "pointer", color: PALETTE.roseDark, fontSize: 16 }}>🗑</button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── TODO ─────────────────────────────────────────────────────────────────────
function TodoList({ db, user }) {
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const [date, setDate] = useState("");
  const [recurrence, setRecurrence] = useState("none");
  const [filter, setFilter] = useState("open");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!db) return;
    return onValue(ref(db, "todos"), snap => {
      const d = snap.val() || {};
      setItems(Object.entries(d).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.createdAt - a.createdAt));
    });
  }, [db]);

  const addItem = () => {
    if (!text.trim() || !db) return;
    push(ref(db, "todos"), { text: text.trim(), date: date || null, recurrence, done: false, createdAt: Date.now(), createdBy: user.name });
    setText(""); setDate(""); setRecurrence("none");
  };

  const toggleItem = (item) => {
    if (!db) return;
    const now = Date.now();
    update(ref(db, `todos/${item.id}`), { done: !item.done, ...((!item.done) ? { completedBy: user.name, completedAt: now } : { completedBy: null, completedAt: null }) });
  };

  const deleteItem = (id) => { remove(ref(db, `todos/${id}`)); if (selected?.id === id) setSelected(null); };

  const filtered = items.filter(i => filter === "open" ? !i.done : i.done);

  return (
    <div style={{ flex: 1, overflowY: "auto", paddingBottom: 100 }}>
      <div style={{ padding: "16px 16px 0" }}>
        {/* Input */}
        <div style={{ background: "#fff", borderRadius: 20, padding: 16, boxShadow: "0 2px 12px rgba(196,181,232,0.2)", border: `1.5px solid ${PALETTE.lavenderLight}`, marginBottom: 12 }}>
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && addItem()}
            placeholder="Nuova attività..." style={{ width: "100%", border: `1.5px solid ${PALETTE.lavender}`, borderRadius: 12, padding: "8px 12px", fontSize: 14, outline: "none", background: PALETTE.lavenderLight, color: PALETTE.darkBrown, boxSizing: "border-box", marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ flex: 1, border: `1.5px solid ${PALETTE.lavender}`, borderRadius: 12, padding: "6px 10px", fontSize: 13, outline: "none", background: PALETTE.lavenderLight, color: PALETTE.darkBrown }} />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["none","daily","weekly","monthly"].map(r => (
              <button key={r} onClick={() => setRecurrence(r)} style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500, border: "none", cursor: "pointer", background: recurrence === r ? PALETTE.lavender : PALETTE.lavenderLight, color: recurrence === r ? "#fff" : PALETTE.warmGray }}>
                {r === "none" ? "Una volta" : r === "daily" ? "Giornaliero" : r === "weekly" ? "Settimanale" : "Mensile"}
              </button>
            ))}
            <button onClick={addItem} style={{ marginLeft: "auto", padding: "4px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", background: `linear-gradient(135deg, ${PALETTE.lavender}, ${PALETTE.lavenderDark})`, color: "#fff" }}>+ Aggiungi</button>
          </div>
        </div>

        {/* Filtro */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {["open","done"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ flex: 1, padding: "8px 0", borderRadius: 12, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", background: filter === f ? PALETTE.lavender : PALETTE.lavenderLight, color: filter === f ? "#fff" : PALETTE.warmGray }}>
              {f === "open" ? `📋 Aperte (${items.filter(i => !i.done).length})` : `✅ Chiuse (${items.filter(i => i.done).length})`}
            </button>
          ))}
        </div>

        {/* Lista */}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: PALETTE.warmGray }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>{filter === "open" ? "✅" : "📋"}</div>
            <p style={{ fontSize: 14 }}>Nessuna attività {filter === "open" ? "aperta" : "chiusa"}!</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(item => (
            <div key={item.id}>
              <div onClick={() => setSelected(selected?.id === item.id ? null : item)}
                style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", borderRadius: 16, padding: "12px 16px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", border: `1.5px solid ${item.done ? PALETTE.lavenderLight : PALETTE.lavenderLight}`, cursor: "pointer", opacity: item.done ? 0.7 : 1 }}>
                <button onClick={e => { e.stopPropagation(); toggleItem(item); }} style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${PALETTE.lavender}`, background: item.done ? PALETTE.lavender : "none", cursor: "pointer", flexShrink: 0, color: "#fff", fontSize: 12 }}>
                  {item.done ? "✓" : ""}
                </button>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: PALETTE.darkBrown, margin: 0, textDecoration: item.done ? "line-through" : "none" }}>{item.text}</p>
                  <div style={{ display: "flex", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: PALETTE.warmGray }}>Aggiunto {formatDate(item.createdAt)}</span>
                    {item.date && <span style={{ fontSize: 11, color: PALETTE.lavenderDark }}>📅 Scadenza: {formatDate(item.date + "T00:00:00")}</span>}
                    {item.recurrence !== "none" && <span style={{ fontSize: 11, color: PALETTE.lavenderDark }}>🔁</span>}
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteItem(item.id); }} style={{ border: "none", background: "none", cursor: "pointer", color: PALETTE.lavender, fontSize: 16 }}>🗑</button>
              </div>
              {selected?.id === item.id && item.done && (
                <div style={{ background: PALETTE.lavenderLight, borderRadius: "0 0 16px 16px", padding: "10px 16px", marginTop: -8, fontSize: 12, color: PALETTE.warmGray }}>
                  {item.completedBy && <p style={{ margin: "2px 0" }}>✅ Completata da <strong>{item.completedBy}</strong></p>}
                  {item.completedAt && <p style={{ margin: "2px 0" }}>🕐 Il {formatDate(item.completedAt)} alle {formatTime(item.completedAt)}</p>}
                  <p style={{ margin: "2px 0" }}>➕ Aggiunta da <strong>{item.createdBy || "?"}</strong> il {formatDate(item.createdAt)}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── CALENDAR ─────────────────────────────────────────────────────────────────
function CalendarView({ db, user, users }) {
  const [events, setEvents] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [view, setView] = useState("month"); // month | week | day
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calFilter, setCalFilter] = useState("shared"); // shared | mine
  const [showAdd, setShowAdd] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [newEvent, setNewEvent] = useState({ text: "", date: "", timeFrom: "", timeTo: "", recurrence: "none", isShared: true });
  const [newTemplate, setNewTemplate] = useState({ name: "", timeFrom: "", timeTo: "" });

  useEffect(() => {
    if (!db) return;
    const u1 = onValue(ref(db, "calendarEvents"), snap => {
      const d = snap.val() || {};
      setEvents(Object.entries(d).map(([id, v]) => ({ id, ...v })));
    });
    const u2 = onValue(ref(db, `templates/${user.name}`), snap => {
      const d = snap.val() || {};
      setTemplates(Object.entries(d).map(([id, v]) => ({ id, ...v })));
    });
    return () => { u1(); u2(); };
  }, [db, user]);

  const addEvent = () => {
    if (!newEvent.text.trim() || !newEvent.date || !db) return;
    push(ref(db, "calendarEvents"), { ...newEvent, owner: user.name, ownerColor: user.color, createdAt: Date.now() });
    setNewEvent({ text: "", date: "", timeFrom: "", timeTo: "", recurrence: "none", isShared: true });
    setShowAdd(false);
  };

  const addTemplate = () => {
    if (!newTemplate.name.trim() || !db) return;
    push(ref(db, `templates/${user.name}`), { ...newTemplate });
    setNewTemplate({ name: "", timeFrom: "", timeTo: "" });
  };

  const deleteEvent = (id) => remove(ref(db, `calendarEvents/${id}`));
  const deleteTemplate = (id) => remove(ref(db, `templates/${user.name}/${id}`));

  const applyTemplate = (t) => {
    setNewEvent(prev => ({ ...prev, text: t.name, timeFrom: t.timeFrom, timeTo: t.timeTo }));
    setShowAdd(true);
  };

  // Filter events
  const visibleEvents = events.filter(ev => {
    if (calFilter === "mine") return ev.owner === user.name;
    return ev.isShared || ev.owner === user.name;
  });

  // Expand recurring events for a given month
  const expandEvents = (year, month) => {
    const result = [];
    visibleEvents.forEach(ev => {
      if (!ev.date) return;
      const evDate = new Date(ev.date);
      const add = (d) => result.push({ ...ev, displayDate: new Date(d) });
      if (!ev.recurrence || ev.recurrence === "none") {
        if (evDate.getFullYear() === year && evDate.getMonth() === month) add(evDate);
      } else if (ev.recurrence === "monthly") {
        add(new Date(year, month, evDate.getDate()));
      } else if (ev.recurrence === "weekly") {
        for (let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++) {
          const dt = new Date(year, month, d);
          if (dt.getDay() === evDate.getDay()) add(dt);
        }
      } else if (ev.recurrence === "daily") {
        for (let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++) add(new Date(year, month, d));
      }
    });
    return result;
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthEvents = expandEvents(year, month);
  const getEventsForDay = (d) => monthEvents.filter(ev => isSameDay(ev.displayDate, d));

  // Week view helpers
  const getWeekDays = () => {
    const d = new Date(currentDate);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => { const dd = new Date(d); dd.setDate(d.getDate() + i); return dd; });
  };

  const navigate = (dir) => {
    const d = new Date(currentDate);
    if (view === "month") d.setMonth(d.getMonth() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  };

  const headerLabel = () => {
    if (view === "month") return `${MONTHS[month]} ${year}`;
    if (view === "week") { const w = getWeekDays(); return `${w[0].getDate()} - ${w[6].getDate()} ${MONTHS[w[6].getMonth()]}`; }
    return `${currentDate.getDate()} ${MONTHS[currentDate.getMonth()]}`;
  };

  const today = new Date();
  const HOURS = Array.from({ length: 24 }, (_, i) => i);

  const getUserColor = (ownerName) => {
    const u = Object.values(users || {}).find(u => u.name === ownerName);
    return u?.color || PALETTE.mint;
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header controls */}
      <div style={{ padding: "12px 16px 0", background: "#fff", borderBottom: `1px solid ${PALETTE.roseLight}` }}>
        {/* View switcher */}
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {["month","week","day"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{ flex: 1, padding: "6px 0", borderRadius: 12, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", background: view === v ? PALETTE.mint : PALETTE.mintLight, color: view === v ? "#fff" : PALETTE.warmGray }}>
              {v === "month" ? "Mese" : v === "week" ? "Settimana" : "Giorno"}
            </button>
          ))}
        </div>
        {/* Filter */}
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {["shared","mine"].map(f => (
            <button key={f} onClick={() => setCalFilter(f)} style={{ flex: 1, padding: "5px 0", borderRadius: 10, fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer", background: calFilter === f ? user.color : PALETTE.mintLight, color: calFilter === f ? "#fff" : PALETTE.warmGray }}>
              {f === "shared" ? "🌸 Condiviso" : "👤 Il mio"}
            </button>
          ))}
        </div>
        {/* Nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <button onClick={() => navigate(-1)} style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: PALETTE.mintLight, cursor: "pointer", fontSize: 16 }}>‹</button>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: PALETTE.darkBrown }}>{headerLabel()}</span>
          <button onClick={() => navigate(1)} style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: PALETTE.mintLight, cursor: "pointer", fontSize: 16 }}>›</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 100 }}>
        {/* MONTH VIEW */}
        {view === "month" && (
          <div style={{ padding: "0 12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginTop: 8, marginBottom: 4 }}>
              {["D","L","M","M","G","V","S"].map((d, i) => (
                <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: PALETTE.warmGray, padding: "4px 0" }}>{d}</div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
              {Array(new Date(year, month, 1).getDay()).fill(null).map((_, i) => <div key={"e"+i} />)}
              {Array(new Date(year, month + 1, 0).getDate()).fill(null).map((_, i) => {
                const day = i + 1;
                const d = new Date(year, month, day);
                const isToday = isSameDay(d, today);
                const isSel = selectedDay && isSameDay(d, selectedDay);
                const dayEvs = getEventsForDay(d);
                return (
                  <button key={day} onClick={() => setSelectedDay(isSel ? null : d)}
                    style={{ aspectRatio: "1", borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: isToday ? `2px solid ${PALETTE.mint}` : "2px solid transparent", background: isSel ? PALETTE.mint : "transparent", cursor: "pointer" }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: isSel ? "#fff" : PALETTE.darkBrown }}>{day}</span>
                    <div style={{ display: "flex", gap: 2, marginTop: 1 }}>
                      {dayEvs.slice(0, 3).map((ev, di) => (
                        <div key={di} style={{ width: 5, height: 5, borderRadius: "50%", background: isSel ? "#fff" : getUserColor(ev.owner) }} />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedDay && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: PALETTE.warmGray, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{selectedDay.getDate()} {MONTHS[selectedDay.getMonth()]}</p>
                {getEventsForDay(selectedDay).length === 0 ? (
                  <p style={{ fontSize: 13, color: PALETTE.warmGray, textAlign: "center", padding: "16px 0" }}>Nessun evento 🌸</p>
                ) : (
                  getEventsForDay(selectedDay).map((ev, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", borderRadius: 14, padding: "10px 14px", marginBottom: 8, border: `1.5px solid ${PALETTE.mintLight}` }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: getUserColor(ev.owner), flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: PALETTE.darkBrown, margin: 0 }}>{ev.text}</p>
                        <p style={{ fontSize: 11, color: PALETTE.warmGray, margin: 0 }}>
                          {ev.owner} {ev.timeFrom && `· ${ev.timeFrom}${ev.timeTo ? ` - ${ev.timeTo}` : ""}`}
                        </p>
                      </div>
                      {ev.owner === user.name && <button onClick={() => deleteEvent(ev.id)} style={{ border: "none", background: "none", cursor: "pointer", color: PALETTE.mint, fontSize: 14 }}>🗑</button>}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* WEEK VIEW */}
        {view === "week" && (
          <div style={{ padding: "0 8px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "40px repeat(7,1fr)", gap: 2, marginTop: 8 }}>
              <div />
              {getWeekDays().map((d, i) => (
                <div key={i} style={{ textAlign: "center", padding: "4px 0" }}>
                  <p style={{ fontSize: 10, color: PALETTE.warmGray, margin: 0 }}>{DAYS_SHORT[d.getDay()]}</p>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: isSameDay(d, today) ? PALETTE.mint : "transparent", display: "flex", alignItems: "center", justifyContent: "center", margin: "2px auto 0" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: isSameDay(d, today) ? "#fff" : PALETTE.darkBrown }}>{d.getDate()}</span>
                  </div>
                </div>
              ))}
              {HOURS.map(h => (
                <>
                  <div key={"h"+h} style={{ fontSize: 10, color: PALETTE.warmGray, paddingTop: 4, textAlign: "right", paddingRight: 4 }}>{h}:00</div>
                  {getWeekDays().map((d, di) => {
                    const dayEvs = expandEvents(d.getFullYear(), d.getMonth()).filter(ev => isSameDay(ev.displayDate, d) && ev.timeFrom && parseInt(ev.timeFrom) === h);
                    return (
                      <div key={"c"+h+di} style={{ minHeight: 32, borderTop: `1px solid ${PALETTE.mintLight}`, position: "relative" }}>
                        {dayEvs.map((ev, ei) => (
                          <div key={ei} style={{ background: getUserColor(ev.owner), borderRadius: 6, padding: "2px 4px", fontSize: 9, color: "#fff", marginTop: 1, opacity: 0.9 }}>{ev.text}</div>
                        ))}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        )}

        {/* DAY VIEW */}
        {view === "day" && (
          <div style={{ padding: "0 16px" }}>
            <div style={{ marginTop: 8 }}>
              {HOURS.map(h => {
                const dayEvs = expandEvents(currentDate.getFullYear(), currentDate.getMonth()).filter(ev => isSameDay(ev.displayDate, currentDate) && ev.timeFrom && parseInt(ev.timeFrom) === h);
                return (
                  <div key={h} style={{ display: "flex", gap: 8, minHeight: 48, borderTop: `1px solid ${PALETTE.mintLight}` }}>
                    <span style={{ width: 40, fontSize: 11, color: PALETTE.warmGray, paddingTop: 4, flexShrink: 0 }}>{h}:00</span>
                    <div style={{ flex: 1, paddingTop: 4 }}>
                      {dayEvs.map((ev, i) => (
                        <div key={i} style={{ background: getUserColor(ev.owner), borderRadius: 10, padding: "6px 10px", marginBottom: 4, opacity: 0.9 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", margin: 0 }}>{ev.text}</p>
                          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", margin: 0 }}>{ev.owner} · {ev.timeFrom}{ev.timeTo ? ` - ${ev.timeTo}` : ""}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* FAB */}
      <div style={{ position: "fixed", bottom: 90, right: 16, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
        <button onClick={() => setShowTemplateManager(true)} style={{ width: 44, height: 44, borderRadius: "50%", border: "none", background: PALETTE.mintLight, cursor: "pointer", fontSize: 18, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>📋</button>
        <button onClick={() => setShowAdd(true)} style={{ width: 52, height: 52, borderRadius: "50%", border: "none", background: `linear-gradient(135deg, ${PALETTE.mint}, ${PALETTE.mintDark})`, cursor: "pointer", fontSize: 22, color: "#fff", boxShadow: "0 4px 12px rgba(91,191,160,0.4)" }}>+</button>
      </div>

      {/* Add Event Modal */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 16, background: "rgba(61,43,43,0.4)", backdropFilter: "blur(4px)" }}>
          <div style={{ width: "100%", maxWidth: 430, background: PALETTE.cream, borderRadius: 28, padding: 24 }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", color: PALETTE.darkBrown, fontSize: 18, marginBottom: 16 }}>📅 Nuovo evento</h3>
            {templates.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 11, color: PALETTE.warmGray, marginBottom: 6 }}>I tuoi template:</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {templates.map(t => (
                    <button key={t.id} onClick={() => applyTemplate(t)} style={{ padding: "4px 10px", borderRadius: 16, fontSize: 11, border: `1px solid ${PALETTE.mint}`, background: PALETTE.mintLight, cursor: "pointer", color: PALETTE.darkBrown }}>
                      {t.name} {t.timeFrom && `(${t.timeFrom}${t.timeTo ? `-${t.timeTo}` : ""})`}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {[
              { placeholder: "Nome evento", key: "text", type: "text" },
              { placeholder: "Data", key: "date", type: "date" },
              { placeholder: "Dalle (es. 09:00)", key: "timeFrom", type: "time" },
              { placeholder: "Alle (es. 17:00)", key: "timeTo", type: "time" },
            ].map(f => (
              <input key={f.key} type={f.type} placeholder={f.placeholder} value={newEvent[f.key]} onChange={e => setNewEvent(p => ({ ...p, [f.key]: e.target.value }))}
                style={{ width: "100%", border: `1.5px solid ${PALETTE.mint}`, borderRadius: 12, padding: "8px 12px", fontSize: 14, outline: "none", background: PALETTE.mintLight, color: PALETTE.darkBrown, boxSizing: "border-box", marginBottom: 8 }} />
            ))}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {["none","daily","weekly","monthly"].map(r => (
                <button key={r} onClick={() => setNewEvent(p => ({ ...p, recurrence: r }))} style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, border: "none", cursor: "pointer", background: newEvent.recurrence === r ? PALETTE.mint : PALETTE.mintLight, color: newEvent.recurrence === r ? "#fff" : PALETTE.warmGray }}>
                  {r === "none" ? "Una volta" : r === "daily" ? "Giornaliero" : r === "weekly" ? "Settimanale" : "Mensile"}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              <button onClick={() => setNewEvent(p => ({ ...p, isShared: true }))} style={{ flex: 1, padding: "8px 0", borderRadius: 12, fontSize: 12, border: "none", cursor: "pointer", background: newEvent.isShared ? PALETTE.mint : PALETTE.mintLight, color: newEvent.isShared ? "#fff" : PALETTE.warmGray }}>🌸 Condiviso</button>
              <button onClick={() => setNewEvent(p => ({ ...p, isShared: false }))} style={{ flex: 1, padding: "8px 0", borderRadius: 12, fontSize: 12, border: "none", cursor: "pointer", background: !newEvent.isShared ? PALETTE.mint : PALETTE.mintLight, color: !newEvent.isShared ? "#fff" : PALETTE.warmGray }}>👤 Solo mio</button>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: "12px 0", borderRadius: 20, border: "none", background: PALETTE.mintLight, color: PALETTE.warmGray, cursor: "pointer", fontSize: 14 }}>Annulla</button>
              <button onClick={addEvent} style={{ flex: 1, padding: "12px 0", borderRadius: 20, border: "none", background: `linear-gradient(135deg, ${PALETTE.mint}, ${PALETTE.mintDark})`, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Salva ✨</button>
            </div>
          </div>
        </div>
      )}

      {/* Template Manager Modal */}
      {showTemplateManager && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 16, background: "rgba(61,43,43,0.4)", backdropFilter: "blur(4px)" }}>
          <div style={{ width: "100%", maxWidth: 430, background: PALETTE.cream, borderRadius: 28, padding: 24, maxHeight: "80vh", overflowY: "auto" }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", color: PALETTE.darkBrown, fontSize: 18, marginBottom: 16 }}>📋 I miei template</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {templates.map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", borderRadius: 14, padding: "10px 14px", border: `1.5px solid ${PALETTE.mintLight}` }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: PALETTE.darkBrown, margin: 0 }}>{t.name}</p>
                    {(t.timeFrom || t.timeTo) && <p style={{ fontSize: 12, color: PALETTE.warmGray, margin: 0 }}>{t.timeFrom}{t.timeTo ? ` → ${t.timeTo}` : ""}</p>}
                  </div>
                  <button onClick={() => deleteTemplate(t.id)} style={{ border: "none", background: "none", cursor: "pointer", color: PALETTE.mint, fontSize: 16 }}>🗑</button>
                </div>
              ))}
              {templates.length === 0 && <p style={{ fontSize: 13, color: PALETTE.warmGray, textAlign: "center" }}>Nessun template ancora 🌿</p>}
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: PALETTE.darkBrown, marginBottom: 8 }}>Nuovo template</p>
            {[
              { placeholder: "Nome (es. Turno mattina)", key: "name" },
              { placeholder: "Dalle (es. 06:00)", key: "timeFrom", type: "time" },
              { placeholder: "Alle (es. 14:00)", key: "timeTo", type: "time" },
            ].map(f => (
              <input key={f.key} type={f.type || "text"} placeholder={f.placeholder} value={newTemplate[f.key]} onChange={e => setNewTemplate(p => ({ ...p, [f.key]: e.target.value }))}
                style={{ width: "100%", border: `1.5px solid ${PALETTE.mint}`, borderRadius: 12, padding: "8px 12px", fontSize: 14, outline: "none", background: PALETTE.mintLight, color: PALETTE.darkBrown, boxSizing: "border-box", marginBottom: 8 }} />
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={() => setShowTemplateManager(false)} style={{ flex: 1, padding: "12px 0", borderRadius: 20, border: "none", background: PALETTE.mintLight, color: PALETTE.warmGray, cursor: "pointer" }}>Chiudi</button>
              <button onClick={addTemplate} style={{ flex: 1, padding: "12px 0", borderRadius: 20, border: "none", background: `linear-gradient(135deg, ${PALETTE.mint}, ${PALETTE.mintDark})`, color: "#fff", cursor: "pointer", fontWeight: 600 }}>+ Aggiungi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("shopping");
  const [db, setDb] = useState(null);
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState({});

  useEffect(() => {
    try {
      const app = initializeApp(FIREBASE_CONFIG);
      const database = getDatabase(app);
      setDb(database);
      // Load users
      onValue(ref(database, "users"), snap => setUsers(snap.val() || {}));
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("puzzoni_user");
    if (saved) setUser(JSON.parse(saved));
  }, []);

  const handleOnboardingComplete = (name, color) => {
    const u = { name, color };
    setUser(u);
    localStorage.setItem("puzzoni_user", JSON.stringify(u));
    if (db) set(ref(db, `users/${name}`), u);
  };

  if (!user) return <Onboarding onComplete={handleOnboardingComplete} />;

  const tabs = [
    { id: "shopping", label: "Spesa", emoji: "🛒" },
    { id: "todo", label: "Attività", emoji: "✅" },
    { id: "calendar", label: "Calendario", emoji: "📅" },
  ];

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: PALETTE.cream, fontFamily: "'Lato', sans-serif", maxWidth: 430, margin: "0 auto", position: "relative" }}>
      {/* Header */}
      <div style={{ padding: "48px 20px 12px", background: "#fff", borderBottom: `1px solid ${PALETTE.roseLight}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", color: PALETTE.darkBrown, fontSize: 24, fontWeight: 700, margin: 0 }}>Puzzoni 🐾</h1>
          <p style={{ color: PALETTE.warmGray, fontSize: 12, margin: 0 }}>Ciao {user.name}! 💕</p>
        </div>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: user.color, border: `2px solid ${PALETTE.darkBrown}` }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {tab === "shopping" && <ShoppingList db={db} user={user} />}
        {tab === "todo" && <TodoList db={db} user={user} />}
        {tab === "calendar" && <CalendarView db={db} user={user} users={users} />}
      </div>

      {/* Bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, display: "flex", background: "#fff", borderTop: `1px solid ${PALETTE.roseLight}`, paddingBottom: "env(safe-area-inset-bottom)" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0 8px", gap: 2, border: "none", background: "none", cursor: "pointer" }}>
            <span style={{ fontSize: 20 }}>{t.emoji}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: tab === t.id ? PALETTE.roseDark : PALETTE.warmGray }}>{t.label}</span>
            {tab === t.id && <div style={{ width: 6, height: 6, borderRadius: "50%", background: PALETTE.rose }} />}
          </button>
        ))}
      </div>
    </div>
  );
}
