// NOI DUE — Couples App
// Stack: React + Tailwind + Firebase Realtime Database
// 
// SETUP FIREBASE (una tantum):
// 1. Vai su https://console.firebase.google.com
// 2. Crea un nuovo progetto (es. "noi-due")
// 3. Aggiungi un'app Web (icona </>)
// 4. Copia le credenziali e sostituisci FIREBASE_CONFIG qui sotto
// 5. Nel pannello Firebase → Realtime Database → Crea database → Modalità test
//
// DEPLOY SU VERCEL:
// 1. Crea account su vercel.com
// 2. Carica questo file su GitHub
// 3. Importa il repo su Vercel → Deploy automatico!

import { useState, useEffect, useCallback } from "react";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, set, push, remove, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ⚙️ SOSTITUISCI CON LE TUE CREDENZIALI FIREBASE
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC18QZvuIR8ktjlARIPnau7VjDOG4A3ois",
  authDomain: "puzzoni-25b81.firebaseapp.com",
  databaseURL: "https://puzzoni-25b81-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "puzzoni-25b81",
  storageBucket: "puzzoni-25b81.firebasestorage.app",
  messagingSenderId: "516731252655",
  appId: "1:516731252655:web:1d2a200cb1e7c0a7de895a"
};

// Palette romantica pastello
const PALETTE = {
  rose: "#F9A8C9",
  roseLight: "#FDE8F0",
  roseDark: "#E07BAA",
  peach: "#FDBA9B",
  peachLight: "#FEF0E8",
  lavender: "#C4B5E8",
  lavenderLight: "#EDE8F9",
  mint: "#A8D8C8",
  mintLight: "#E8F6F1",
  cream: "#FFF8F3",
  warmGray: "#7A6B6B",
  darkBrown: "#3D2B2B",
};

// Utility: prossima data di ricorrenza
function nextOccurrence(item) {
  if (!item.recurrence || item.recurrence === "none") return null;
  const base = item.lastCompleted ? new Date(item.lastCompleted) : new Date(item.createdAt);
  const next = new Date(base);
  switch (item.recurrence) {
    case "daily": next.setDate(next.getDate() + 1); break;
    case "weekly": next.setDate(next.getDate() + 7); break;
    case "monthly": next.setMonth(next.getMonth() + 1); break;
  }
  return next;
}

function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

// ─── ICONE SVG inline ───────────────────────────────────────────────────────
const Icon = {
  cart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><polyline points="20 6 9 17 4 12"/></svg>,
  calendar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>,
  repeat: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  heart: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
};

// ─── COMPONENTE MODALE AGGIUNGI ELEMENTO ───────────────────────────────────
function AddModal({ type, onAdd, onClose }) {
  const [text, setText] = useState("");
  const [recurrence, setRecurrence] = useState("none");
  const [date, setDate] = useState("");
  const [qty, setQty] = useState("");

  const handleSubmit = () => {
    if (!text.trim()) return;
    onAdd({ text: text.trim(), recurrence, date: date || null, qty: qty || null });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ background: "rgba(61,43,43,0.4)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-md rounded-3xl p-6 shadow-2xl" style={{ background: PALETTE.cream }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: PALETTE.darkBrown, fontFamily: "'Playfair Display', serif" }}>
          {type === "shopping" ? "🛒 Aggiungi prodotto" : type === "todo" ? "✅ Aggiungi attività" : "📅 Aggiungi evento"}
        </h3>

        <input
          autoFocus
          className="w-full rounded-2xl px-4 py-3 mb-3 text-sm outline-none"
          style={{ background: PALETTE.roseLight, color: PALETTE.darkBrown, border: `1.5px solid ${PALETTE.rose}` }}
          placeholder={type === "shopping" ? "es. Latte, pane, fragole..." : type === "todo" ? "es. Prenotare ristorante..." : "es. Anniversario..."}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
        />

        {type === "shopping" && (
          <input
            className="w-full rounded-2xl px-4 py-3 mb-3 text-sm outline-none"
            style={{ background: PALETTE.peachLight, color: PALETTE.darkBrown, border: `1.5px solid ${PALETTE.peach}` }}
            placeholder="Quantità (opzionale, es. 2 kg)"
            value={qty}
            onChange={e => setQty(e.target.value)}
          />
        )}

        {(type === "todo" || type === "calendar") && (
          <input
            type="date"
            className="w-full rounded-2xl px-4 py-3 mb-3 text-sm outline-none"
            style={{ background: PALETTE.lavenderLight, color: PALETTE.darkBrown, border: `1.5px solid ${PALETTE.lavender}` }}
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        )}

        <div className="mb-5">
          <p className="text-xs mb-2 font-medium" style={{ color: PALETTE.warmGray }}>Ricorrenza</p>
          <div className="flex gap-2 flex-wrap">
            {["none", "daily", "weekly", "monthly"].map(r => (
              <button key={r}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  background: recurrence === r ? PALETTE.rose : PALETTE.roseLight,
                  color: recurrence === r ? "#fff" : PALETTE.warmGray,
                  border: `1.5px solid ${recurrence === r ? PALETTE.roseDark : PALETTE.rose}`
                }}
                onClick={() => setRecurrence(r)}
              >
                {r === "none" ? "Una volta" : r === "daily" ? "Giornaliero" : r === "weekly" ? "Settimanale" : "Mensile"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-2xl py-3 text-sm font-medium" style={{ background: PALETTE.roseLight, color: PALETTE.warmGray }}>
            Annulla
          </button>
          <button onClick={handleSubmit} className="flex-1 rounded-2xl py-3 text-sm font-medium text-white" style={{ background: `linear-gradient(135deg, ${PALETTE.rose}, ${PALETTE.roseDark})` }}>
            Aggiungi ✨
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── LISTA SPESA ────────────────────────────────────────────────────────────
function ShoppingList({ db }) {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!db) return;
    const r = ref(db, "shopping");
    return onValue(r, snap => {
      const data = snap.val() || {};
      setItems(Object.entries(data).map(([id, v]) => ({ id, ...v })));
    });
  }, [db]);

  const addItem = (data) => {
    if (!db) return;
    push(ref(db, "shopping"), { ...data, checked: false, createdAt: Date.now() });
  };

  const toggleItem = (item) => {
    if (!db) return;
    const updates = { checked: !item.checked };
    if (!item.checked && item.recurrence !== "none") updates.lastCompleted = Date.now();
    update(ref(db, `shopping/${item.id}`), updates);
  };

  const deleteItem = (id) => {
    if (!db) return;
    remove(ref(db, `shopping/${id}`));
  };

  const unchecked = items.filter(i => !i.checked);
  const checked = items.filter(i => i.checked);

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      {showModal && <AddModal type="shopping" onAdd={addItem} onClose={() => setShowModal(false)} />}

      <div className="px-4 pt-4 space-y-3">
        {unchecked.length === 0 && checked.length === 0 && (
          <div className="text-center py-12" style={{ color: PALETTE.warmGray }}>
            <div className="text-5xl mb-3">🛒</div>
            <p className="text-sm">La lista è vuota!<br />Aggiungi il primo prodotto ✨</p>
          </div>
        )}

        {unchecked.map(item => (
          <div key={item.id} className="flex items-center gap-3 rounded-2xl px-4 py-3 shadow-sm" style={{ background: "#fff", border: `1.5px solid ${PALETTE.roseLight}` }}>
            <button onClick={() => toggleItem(item)} className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0" style={{ borderColor: PALETTE.rose }}>
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: PALETTE.darkBrown }}>{item.text}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {item.qty && <span className="text-xs" style={{ color: PALETTE.warmGray }}>{item.qty}</span>}
                {item.recurrence !== "none" && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: PALETTE.roseDark }}>
                    {Icon.repeat} {item.recurrence === "daily" ? "ogni giorno" : item.recurrence === "weekly" ? "ogni settimana" : "ogni mese"}
                  </span>
                )}
              </div>
            </div>
            <button onClick={() => deleteItem(item.id)} style={{ color: PALETTE.rose }}>{Icon.trash}</button>
          </div>
        ))}

        {checked.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: PALETTE.warmGray }}>Nel carrello ✓</p>
            {checked.map(item => (
              <div key={item.id} className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-2 opacity-60" style={{ background: PALETTE.roseLight }}>
                <button onClick={() => toggleItem(item)} className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white" style={{ background: PALETTE.rose }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg>
                </button>
                <span className="flex-1 text-sm line-through" style={{ color: PALETTE.warmGray }}>{item.text}</span>
                <button onClick={() => deleteItem(item.id)} style={{ color: PALETTE.roseDark }}>{Icon.trash}</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white"
        style={{ background: `linear-gradient(135deg, ${PALETTE.rose}, ${PALETTE.roseDark})` }}
      >
        {Icon.plus}
      </button>
    </div>
  );
}

// ─── TO-DO LIST ─────────────────────────────────────────────────────────────
function TodoList({ db }) {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!db) return;
    const r = ref(db, "todos");
    return onValue(r, snap => {
      const data = snap.val() || {};
      setItems(Object.entries(data).map(([id, v]) => ({ id, ...v })));
    });
  }, [db]);

  const addItem = (data) => {
    if (!db) return;
    push(ref(db, "todos"), { ...data, done: false, createdAt: Date.now() });
  };

  const toggleItem = (item) => {
    if (!db) return;
    const updates = { done: !item.done };
    if (!item.done && item.recurrence !== "none") updates.lastCompleted = Date.now();
    update(ref(db, `todos/${item.id}`), updates);
  };

  const deleteItem = (id) => remove(ref(db, `todos/${id}`));

  const pending = items.filter(i => !i.done).sort((a, b) => (a.date || "9") < (b.date || "9") ? -1 : 1);
  const done = items.filter(i => i.done);

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      {showModal && <AddModal type="todo" onAdd={addItem} onClose={() => setShowModal(false)} />}

      <div className="px-4 pt-4 space-y-3">
        {pending.length === 0 && done.length === 0 && (
          <div className="text-center py-12" style={{ color: PALETTE.warmGray }}>
            <div className="text-5xl mb-3">✅</div>
            <p className="text-sm">Nessuna attività!<br />Aggiungine una 💪</p>
          </div>
        )}

        {pending.map(item => (
          <div key={item.id} className="flex items-center gap-3 rounded-2xl px-4 py-3 shadow-sm" style={{ background: "#fff", border: `1.5px solid ${PALETTE.lavenderLight}` }}>
            <button onClick={() => toggleItem(item)} className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0" style={{ borderColor: PALETTE.lavender }}>
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: PALETTE.darkBrown }}>{item.text}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {item.date && <span className="text-xs" style={{ color: PALETTE.lavender }}>📅 {formatDate(item.date)}</span>}
                {item.recurrence !== "none" && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: "#9B88D4" }}>
                    {Icon.repeat} {item.recurrence === "daily" ? "ogni giorno" : item.recurrence === "weekly" ? "ogni settimana" : "ogni mese"}
                  </span>
                )}
              </div>
            </div>
            <button onClick={() => deleteItem(item.id)} style={{ color: PALETTE.lavender }}>{Icon.trash}</button>
          </div>
        ))}

        {done.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: PALETTE.warmGray }}>Completate ✓</p>
            {done.map(item => (
              <div key={item.id} className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-2 opacity-60" style={{ background: PALETTE.lavenderLight }}>
                <button onClick={() => toggleItem(item)} className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white" style={{ background: PALETTE.lavender }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg>
                </button>
                <span className="flex-1 text-sm line-through" style={{ color: PALETTE.warmGray }}>{item.text}</span>
                <button onClick={() => deleteItem(item.id)} style={{ color: PALETTE.lavender }}>{Icon.trash}</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white"
        style={{ background: `linear-gradient(135deg, ${PALETTE.lavender}, #9B88D4)` }}
      >
        {Icon.plus}
      </button>
    </div>
  );
}

// ─── CALENDARIO ─────────────────────────────────────────────────────────────
function CalendarView({ db }) {
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!db) return;
    const r = ref(db, "calendar");
    return onValue(r, snap => {
      const data = snap.val() || {};
      setEvents(Object.entries(data).map(([id, v]) => ({ id, ...v })));
    });
  }, [db]);

  const addEvent = (data) => {
    if (!db || !data.date) return;
    push(ref(db, "calendar"), { ...data, createdAt: Date.now() });
  };

  const deleteEvent = (id) => remove(ref(db, `calendar/${id}`));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const monthNames = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];

  // Genera tutti gli eventi del mese includendo ricorrenti
  const eventsThisMonth = [];
  events.forEach(ev => {
    if (!ev.date) return;
    const evDate = new Date(ev.date);

    if (ev.recurrence === "none" || !ev.recurrence) {
      if (evDate.getFullYear() === year && evDate.getMonth() === month) {
        eventsThisMonth.push({ ...ev, displayDate: evDate });
      }
    } else if (ev.recurrence === "monthly") {
      const d = new Date(year, month, evDate.getDate());
      eventsThisMonth.push({ ...ev, displayDate: d });
    } else if (ev.recurrence === "weekly") {
      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(year, month, day);
        if (d.getDay() === evDate.getDay()) eventsThisMonth.push({ ...ev, displayDate: d });
      }
    } else if (ev.recurrence === "daily") {
      for (let day = 1; day <= daysInMonth; day++) {
        eventsThisMonth.push({ ...ev, displayDate: new Date(year, month, day) });
      }
    }
  });

  const getEventsForDay = (day) =>
    eventsThisMonth.filter(ev => ev.displayDate.getDate() === day);

  const [selectedDay, setSelectedDay] = useState(null);
  const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      {showModal && <AddModal type="calendar" onAdd={addEvent} onClose={() => setShowModal(false)} />}

      <div className="px-4 pt-4">
        {/* Header mese */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: PALETTE.mintLight }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h2 className="text-base font-bold" style={{ color: PALETTE.darkBrown, fontFamily: "'Playfair Display', serif" }}>
            {monthNames[month]} {year}
          </h2>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: PALETTE.mintLight }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        {/* Giorni settimana */}
        <div className="grid grid-cols-7 mb-2">
          {["D","L","M","M","G","V","S"].map((d, i) => (
            <div key={i} className="text-center text-xs font-semibold py-1" style={{ color: PALETTE.warmGray }}>{d}</div>
          ))}
        </div>

        {/* Griglia giorni */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {Array(firstDay).fill(null).map((_, i) => <div key={"e" + i} />)}
          {Array(daysInMonth).fill(null).map((_, i) => {
            const day = i + 1;
            const isToday = isSameDay(new Date(year, month, day), today);
            const isSelected = selectedDay === day;
            const dayEvents = getEventsForDay(day);
            return (
              <button key={day}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className="aspect-square rounded-xl flex flex-col items-center justify-center relative"
                style={{
                  background: isSelected ? PALETTE.mint : isToday ? PALETTE.mintLight : "transparent",
                  border: isToday ? `2px solid ${PALETTE.mint}` : "2px solid transparent",
                }}
              >
                <span className="text-xs font-medium" style={{ color: isSelected ? "#fff" : PALETTE.darkBrown }}>{day}</span>
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map((_, di) => (
                      <div key={di} className="w-1 h-1 rounded-full" style={{ background: isSelected ? "#fff" : PALETTE.mint }} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Eventi del giorno selezionato */}
        {selectedDay && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: PALETTE.warmGray }}>
              {selectedDay} {monthNames[month]}
            </p>
            {selectedEvents.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: PALETTE.warmGray }}>Nessun evento 🌸</p>
            ) : (
              selectedEvents.map((ev, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-2 shadow-sm" style={{ background: "#fff", border: `1.5px solid ${PALETTE.mintLight}` }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PALETTE.mint }} />
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: PALETTE.darkBrown }}>{ev.text}</p>
                    {ev.recurrence !== "none" && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: PALETTE.mint }}>
                        {Icon.repeat} ricorrente
                      </span>
                    )}
                  </div>
                  <button onClick={() => deleteEvent(ev.id)} style={{ color: PALETTE.mint }}>{Icon.trash}</button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white"
        style={{ background: `linear-gradient(135deg, ${PALETTE.mint}, #5BBFA0)` }}
      >
        {Icon.plus}
      </button>
    </div>
  );
}

// ─── APP ROOT ───────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("shopping");
  const [db, setDb] = useState(null);
  const [dbError, setDbError] = useState(false);

  useEffect(() => {
    try {
      const app = initializeApp(FIREBASE_CONFIG);
      setDb(getDatabase(app));
    } catch (e) {
      setDbError(true);
    }
  }, []);

  const tabs = [
    { id: "shopping", label: "Spesa", icon: Icon.cart, color: PALETTE.rose },
    { id: "todo", label: "Attività", icon: Icon.check, color: PALETTE.lavender },
    { id: "calendar", label: "Calendario", icon: Icon.calendar, color: PALETTE.mint },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: PALETTE.cream, fontFamily: "'Lato', sans-serif", maxWidth: 430, margin: "0 auto" }}>
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-center justify-between" style={{ background: "#fff", borderBottom: `1px solid ${PALETTE.roseLight}` }}>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: PALETTE.darkBrown, fontFamily: "'Playfair Display', serif" }}>
            Noi Due 💕
          </h1>
          <p className="text-xs" style={{ color: PALETTE.warmGray }}>La vostra app condivisa</p>
        </div>
        <div style={{ color: PALETTE.rose }}>{Icon.heart}</div>
      </div>

      {/* Avviso Firebase non configurato */}
      {dbError && (
        <div className="mx-4 mt-4 rounded-2xl p-4 text-sm" style={{ background: PALETTE.peachLight, color: PALETTE.darkBrown, border: `1.5px solid ${PALETTE.peach}` }}>
          ⚙️ <strong>Configura Firebase</strong> per attivare la sync.<br />
          <span className="text-xs" style={{ color: PALETTE.warmGray }}>Leggi le istruzioni in cima al file.</span>
        </div>
      )}

      {/* Contenuto */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {tab === "shopping" && <ShoppingList db={db} />}
        {tab === "todo" && <TodoList db={db} />}
        {tab === "calendar" && <CalendarView db={db} />}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] flex" style={{ background: "#fff", borderTop: `1px solid ${PALETTE.roseLight}`, paddingBottom: "env(safe-area-inset-bottom)" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 flex flex-col items-center py-3 gap-1 transition-all"
            style={{ color: tab === t.id ? t.color : PALETTE.warmGray }}
          >
            {t.icon}
            <span className="text-xs font-medium">{t.label}</span>
            {tab === t.id && <div className="w-1.5 h-1.5 rounded-full" style={{ background: t.color }} />}
          </button>
        ))}
      </div>
    </div>
  );
}
