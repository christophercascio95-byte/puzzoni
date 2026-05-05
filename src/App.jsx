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

const P = {
  rose:"#F9A8C9",roseLight:"#FDE8F0",roseDark:"#E07BAA",
  peach:"#FDBA9B",peachLight:"#FEF0E8",
  lav:"#C4B5E8",lavLight:"#EDE8F9",lavDark:"#9B88D4",
  mint:"#A8D8C8",mintLight:"#E8F6F1",mintDark:"#5BBFA0",
  cream:"#FFF8F3",gray:"#7A6B6B",dark:"#3D2B2B",
};

const CAL_COLORS=[
  {name:"Rosa",value:"#F9A8C9"},{name:"Lavanda",value:"#C4B5E8"},
  {name:"Menta",value:"#A8D8C8"},{name:"Pesca",value:"#FDBA9B"},
  {name:"Cielo",value:"#A8C8E8"},{name:"Giallo",value:"#F9E4A8"},
  {name:"Rosso",value:"#F4A0A0"},{name:"Verde",value:"#A8E8B4"},
];

const EVENT_COLORS=[
  {name:"Rosa",value:"#F9A8C9"},{name:"Lavanda",value:"#C4B5E8"},
  {name:"Menta",value:"#A8D8C8"},{name:"Pesca",value:"#FDBA9B"},
  {name:"Cielo",value:"#A8C8E8"},{name:"Giallo",value:"#F9E4A8"},
  {name:"Rosso",value:"#F4A0A0"},{name:"Verde",value:"#A8E8B4"},
  {name:"Arancio",value:"#FDCB9B"},{name:"Viola",value:"#D4A8E8"},
];

const MONTHS=["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const MONTHS_SHORT=["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
const DAYS_SHORT=["Dom","Lun","Mar","Mer","Gio","Ven","Sab"];
const REC_LABELS={none:"Una volta",daily:"Ogni giorno",weekly:"Ogni settimana",monthly:"Ogni mese"};
const PX_PER_HOUR=64;

function fmtDate(d){if(!d)return"";return new Date(d).toLocaleDateString("it-IT",{day:"2-digit",month:"short",year:"numeric"});}
function fmtTime(d){if(!d)return"";return new Date(d).toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});}
function isSameDay(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}
function timeToMin(t){if(!t)return null;const[h,m]=t.split(":").map(Number);return h*60+(m||0);}
function toIsoDate(d){if(!d)return"";const dt=d instanceof Date?d:new Date(d);return`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;}

// ── ICS EXPORT ───────────────────────────────────────────────────────────────
function exportToICS(events,username){
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Puzzoni//IT","CALSCALE:GREGORIAN","METHOD:PUBLISH"];
  events.forEach(ev=>{
    if(!ev.date)return;
    const uid=`${ev.id||Date.now()}@puzzoni`;
    const dtstart=ev.timeFrom?`${ev.date.replace(/-/g,"")}T${ev.timeFrom.replace(":","") }00`:`${ev.date.replace(/-/g,"")}`;
    const dtend=ev.timeTo?`${ev.date.replace(/-/g,"")}T${ev.timeTo.replace(":","") }00`:dtstart;
    const isAllDay=!ev.timeFrom;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`SUMMARY:${ev.text||""}`);
    if(isAllDay){lines.push(`DTSTART;VALUE=DATE:${dtstart}`);lines.push(`DTEND;VALUE=DATE:${dtend}`);}
    else{lines.push(`DTSTART:${dtstart}`);lines.push(`DTEND:${dtend}`);}
    if(ev.recurrence&&ev.recurrence!=="none"){
      const rmap={daily:"DAILY",weekly:"WEEKLY",monthly:"MONTHLY"};
      if(rmap[ev.recurrence])lines.push(`RRULE:FREQ=${rmap[ev.recurrence]}`);
    }
    lines.push(`DESCRIPTION:${ev.owner||""}`);
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  const blob=new Blob([lines.join("\r\n")],{type:"text/calendar;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=`puzzoni-${username||"calendario"}.ics`;
  document.body.appendChild(a);a.click();
  document.body.removeChild(a);URL.revokeObjectURL(url);
}

// ── COMPONENTS ───────────────────────────────────────────────────────────────
function Lbl({children}){return<p style={{fontSize:11,fontWeight:600,color:P.gray,marginBottom:4,marginTop:10,letterSpacing:0.3}}>{children}</p>;}

function Modal({onClose,children,title}){
  useEffect(()=>{
    const prev=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return()=>{document.body.style.overflow=prev;};
  },[]);
  return(
    <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center",background:"rgba(61,43,43,0.6)",backdropFilter:"blur(6px)"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:"100%",maxWidth:430,background:P.cream,borderRadius:"28px 28px 0 0",display:"flex",flexDirection:"column",maxHeight:"90vh",marginBottom:65}}
        onClick={e=>e.stopPropagation()}>
        <div style={{overflowY:"auto",flex:1,padding:"24px 20px 100px",WebkitOverflowScrolling:"touch"}}>
          {title&&<h3 style={{fontFamily:"'Playfair Display',serif",color:P.dark,fontSize:18,marginBottom:12,marginTop:0}}>{title}</h3>}
          {children}
        </div>
      </div>
    </div>
  );
}

function RecRow({value,onChange,color=P.mint,colorLight}){
  return(
    <div>
      <Lbl>Ricorrenza</Lbl>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {["none","daily","weekly","monthly"].map(r=>(
          <button key={r} onClick={()=>onChange(r)} style={{padding:"6px 12px",borderRadius:20,fontSize:12,fontWeight:500,border:"none",cursor:"pointer",background:value===r?color:colorLight||P.mintLight,color:value===r?"#fff":P.gray}}>{REC_LABELS[r]}</button>
        ))}
      </div>
    </div>
  );
}

function BtnRow({onCancel,onSave,onDelete,saveLabel="Salva ✨"}){
  return(
    <div style={{position:"fixed",bottom:70,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,display:"flex",gap:8,padding:"10px 20px",background:P.cream,borderTop:`1px solid ${P.roseLight}`,zIndex:200,boxSizing:"border-box"}}>
      {onDelete&&<button onClick={onDelete} style={{padding:"12px 14px",borderRadius:20,border:"none",background:"#FFE8E8",color:"#C0392B",cursor:"pointer",fontSize:13,fontWeight:600}}>🗑</button>}
      <button onClick={onCancel} style={{flex:1,padding:"12px 0",borderRadius:20,border:"none",background:P.mintLight,color:P.gray,cursor:"pointer",fontSize:14}}>Annulla</button>
      <button onClick={onSave} style={{flex:1,padding:"12px 0",borderRadius:20,border:"none",background:`linear-gradient(135deg,${P.mint},${P.mintDark})`,color:"#fff",cursor:"pointer",fontWeight:600,fontSize:14}}>{saveLabel}</button>
    </div>
  );
}

// Color picker for events
function ColorPicker({value,onChange,label}){
  return(
    <div>
      {label&&<Lbl>{label}</Lbl>}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {EVENT_COLORS.map(c=>(
          <button key={c.value} onClick={()=>onChange(c.value)} title={c.name}
            style={{width:32,height:32,borderRadius:"50%",background:c.value,border:value===c.value?`3px solid ${P.dark}`:"3px solid transparent",cursor:"pointer"}}/>
        ))}
      </div>
    </div>
  );
}

// Native date input styled
function DateInp({label,value,onChange,color=P.mint,colorLight}){
  return(
    <div>
      {label&&<Lbl>{label}</Lbl>}
      <input type="date" value={value} onChange={e=>onChange(e.target.value)}
        style={{width:"100%",border:`1.5px solid ${color}`,borderRadius:12,padding:"10px 12px",fontSize:15,outline:"none",background:colorLight||P.mintLight,color:P.dark,boxSizing:"border-box",WebkitAppearance:"none",appearance:"none"}}/>
    </div>
  );
}

function TimeRow({label,from,to,onFrom,onTo,color=P.mint,colorLight}){
  return(
    <div>
      {label&&<Lbl>{label}</Lbl>}
      <div style={{display:"flex",gap:10}}>
        <div style={{flex:1}}>
          <p style={{fontSize:11,color:P.gray,margin:"0 0 4px",fontWeight:600}}>Orario Da</p>
          <input type="time" step="900" value={from} onChange={e=>{const[h,m]=e.target.value.split(":");const min=parseInt(m);const rounded=Math.round(min/15)*15;const fixedMin=rounded>=60?45:rounded;onFrom(`${h}:${String(fixedMin).padStart(2,"0")}`);}}
            style={{width:"100%",border:`1.5px solid ${color}`,borderRadius:12,padding:"10px 12px",fontSize:15,outline:"none",background:colorLight||P.mintLight,color:P.dark,boxSizing:"border-box",WebkitAppearance:"none",appearance:"none"}}/>
        </div>
        <div style={{flex:1}}>
          <p style={{fontSize:11,color:P.gray,margin:"0 0 4px",fontWeight:600}}>Orario A</p>
          <input type="time" step="900" value={to} onChange={e=>{const[h,m]=e.target.value.split(":");const min=parseInt(m);const rounded=Math.round(min/15)*15;const fixedMin=rounded>=60?45:rounded;onTo(`${h}:${String(fixedMin).padStart(2,"0")}`);}}
            style={{width:"100%",border:`1.5px solid ${color}`,borderRadius:12,padding:"10px 12px",fontSize:15,outline:"none",background:colorLight||P.mintLight,color:P.dark,boxSizing:"border-box",WebkitAppearance:"none",appearance:"none"}}/>
        </div>
      </div>
    </div>
  );
}

// ── ONBOARDING ───────────────────────────────────────────────────────────────
function Onboarding({onComplete}){
  const[name,setName]=useState("");
  const[color,setColor]=useState(CAL_COLORS[0].value);
  return(
    <div style={{position:"fixed",inset:0,zIndex:50,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,background:P.cream}}>
      <div style={{fontSize:56,marginBottom:12}}>🐾</div>
      <h1 style={{fontFamily:"'Playfair Display',serif",color:P.dark,fontSize:28,fontWeight:700,marginBottom:6,textAlign:"center"}}>Benvenuto/a!</h1>
      <p style={{color:P.gray,fontSize:14,marginBottom:28,textAlign:"center"}}>Come ti chiami? Scegli il colore del tuo calendario.</p>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="Il tuo nome..."
        style={{width:"100%",maxWidth:320,border:`1.5px solid ${P.rose}`,borderRadius:16,padding:"12px 16px",fontSize:15,outline:"none",background:P.roseLight,color:P.dark,marginBottom:24,boxSizing:"border-box"}}/>
      <div style={{display:"flex",gap:12,marginBottom:32,flexWrap:"wrap",justifyContent:"center"}}>
        {CAL_COLORS.map(c=>(
          <button key={c.value} onClick={()=>setColor(c.value)} title={c.name}
            style={{width:44,height:44,borderRadius:"50%",background:c.value,border:color===c.value?`3px solid ${P.dark}`:"3px solid transparent",cursor:"pointer"}}/>
        ))}
      </div>
      <button onClick={()=>{if(name.trim())onComplete(name.trim(),color);}}
        style={{background:`linear-gradient(135deg,${P.rose},${P.roseDark})`,color:"#fff",border:"none",borderRadius:20,padding:"13px 44px",fontSize:15,fontWeight:600,cursor:"pointer",opacity:name.trim()?1:0.5}}>
        Iniziamo 💕
      </button>
    </div>
  );
}

// ── SHOPPING ─────────────────────────────────────────────────────────────────
function ShoppingList({db}){
  const[items,setItems]=useState([]);
  const[saved,setSaved]=useState([]);
  const[text,setText]=useState("");
  const[qty,setQty]=useState("");
  const[rec,setRec]=useState("none");
  const[sugg,setSugg]=useState([]);
  const[editing,setEditing]=useState(null);
  const inputRef=useRef();

  useEffect(()=>{
    if(!db)return;
    const u1=onValue(ref(db,"shopping"),snap=>{const d=snap.val()||{};setItems(Object.entries(d).map(([id,v])=>({id,...v})));});
    const u2=onValue(ref(db,"shoppingArticles"),snap=>{const d=snap.val()||{};setSaved(Object.entries(d).map(([id,v])=>({id,...v})).sort((a,b)=>(b.count||0)-(a.count||0)));});
    return()=>{u1();u2();};
  },[db]);

  useEffect(()=>{
    if(!text.trim()){setSugg([]);return;}
    setSugg(saved.filter(a=>a.name.toLowerCase().includes(text.toLowerCase())&&a.name.toLowerCase()!==text.toLowerCase()));
  },[text,saved]);

  const addItem=()=>{
    if(!text.trim()||!db)return;
    push(ref(db,"shopping"),{text:text.trim(),qty:qty||null,recurrence:rec,checked:false,createdAt:Date.now()});
    const ex=saved.find(a=>a.name.toLowerCase()===text.trim().toLowerCase());
    if(ex)update(ref(db,`shoppingArticles/${ex.id}`),{count:(ex.count||0)+1});
    else push(ref(db,"shoppingArticles"),{name:text.trim(),count:1});
    setText("");setQty("");setRec("none");setSugg([]);
  };
  const toggleItem=(item)=>{if(!db)return;update(ref(db,`shopping/${item.id}`),{checked:!item.checked,...(!item.checked&&item.recurrence!=="none"?{lastCompleted:Date.now()}:{})});};
  const saveEdit=()=>{if(!editing||!db)return;update(ref(db,`shopping/${editing.id}`),{text:editing.text,qty:editing.qty||null,recurrence:editing.recurrence||"none"});setEditing(null);};
  const deleteItem=(id)=>{remove(ref(db,`shopping/${id}`));if(editing?.id===id)setEditing(null);};
  const deleteSaved=(id)=>remove(ref(db,`shoppingArticles/${id}`));
  const unchecked=items.filter(i=>!i.checked);
  const checked=items.filter(i=>i.checked);

  const Row=({item})=>(
    <div style={{display:"flex",alignItems:"center",gap:10,background:"#fff",borderRadius:16,padding:"11px 14px",border:`1.5px solid ${P.roseLight}`,opacity:item.checked?0.65:1,marginBottom:8}}>
      <button onClick={()=>toggleItem(item)} style={{width:26,height:26,borderRadius:"50%",border:`2px solid ${P.rose}`,background:item.checked?P.rose:"none",cursor:"pointer",flexShrink:0,color:"#fff",fontSize:13}}>{item.checked?"✓":""}</button>
      <div style={{flex:1,minWidth:0}}>
        <p style={{fontSize:14,fontWeight:500,color:P.dark,margin:0,textDecoration:item.checked?"line-through":"none"}}>{item.text}</p>
        <div style={{display:"flex",gap:8}}>
          {item.qty&&<span style={{fontSize:11,color:P.gray}}>{item.qty}</span>}
          {item.recurrence&&item.recurrence!=="none"&&<span style={{fontSize:11,color:P.roseDark}}>🔁 {REC_LABELS[item.recurrence]}</span>}
        </div>
      </div>
      <button onClick={()=>setEditing({...item})} style={{border:"none",background:"none",cursor:"pointer",fontSize:18,padding:"0 4px"}}>✏️</button>
      <button onClick={()=>deleteItem(item.id)} style={{border:"none",background:"none",cursor:"pointer",fontSize:18,padding:"0 4px"}}>🗑</button>
    </div>
  );

  return(
    <div style={{flex:1,overflowY:"auto",paddingBottom:160,minHeight:0}}>
      <div style={{padding:"16px 16px 0"}}>
        <div style={{background:"#fff",borderRadius:20,padding:16,border:`1.5px solid ${P.roseLight}`,marginBottom:12}}>
          <div style={{display:"flex",gap:8,marginBottom:8}}>
            <input ref={inputRef} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addItem()}
              placeholder="Nome prodotto..." style={{flex:1,border:`1.5px solid ${P.rose}`,borderRadius:12,padding:"10px 12px",fontSize:15,outline:"none",background:P.roseLight,color:P.dark}}/>
            <input value={qty} onChange={e=>setQty(e.target.value)} placeholder="Qtà"
              style={{width:64,border:`1.5px solid ${P.peach}`,borderRadius:12,padding:"10px 8px",fontSize:15,outline:"none",background:P.peachLight,color:P.dark}}/>
          </div>
          {sugg.length>0&&(
            <div style={{background:P.roseLight,borderRadius:12,marginBottom:8}}>
              {sugg.slice(0,4).map(s=>(
                <button key={s.id} onClick={()=>{setText(s.name);setSugg([]);inputRef.current?.focus();}}
                  style={{display:"block",width:"100%",textAlign:"left",padding:"8px 12px",background:"none",border:"none",cursor:"pointer",fontSize:13,color:P.dark}}>
                  🔍 {s.name} <span style={{color:P.gray,fontSize:11}}>({s.count}x)</span>
                </button>
              ))}
            </div>
          )}
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
            {["none","daily","weekly","monthly"].map(r=>(
              <button key={r} onClick={()=>setRec(r)} style={{padding:"5px 10px",borderRadius:20,fontSize:11,fontWeight:500,border:"none",cursor:"pointer",background:rec===r?P.rose:P.roseLight,color:rec===r?"#fff":P.gray}}>{REC_LABELS[r]}</button>
            ))}
            <button onClick={addItem} style={{marginLeft:"auto",padding:"6px 18px",borderRadius:20,fontSize:13,fontWeight:600,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${P.rose},${P.roseDark})`,color:"#fff"}}>+ Aggiungi</button>
          </div>
        </div>
        {saved.length>0&&(
          <div style={{marginBottom:12}}>
            <p style={{fontSize:11,fontWeight:600,color:P.gray,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Articoli frequenti</p>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {saved.slice(0,8).map(a=>(
                <div key={a.id} style={{display:"flex",alignItems:"center",gap:4,background:P.roseLight,borderRadius:20,padding:"4px 10px"}}>
                  <button onClick={()=>{setText(a.name);inputRef.current?.focus();}} style={{border:"none",background:"none",cursor:"pointer",fontSize:12,color:P.dark}}>{a.name}</button>
                  <button onClick={()=>deleteSaved(a.id)} style={{border:"none",background:"none",cursor:"pointer",fontSize:10,color:P.rose}}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
        {unchecked.length===0&&checked.length===0&&(
          <div style={{textAlign:"center",padding:"40px 0",color:P.gray}}>
            <div style={{fontSize:48,marginBottom:8}}>🛒</div>
            <p style={{fontSize:14}}>La lista è vuota!<br/>Aggiungi il primo prodotto ✨</p>
          </div>
        )}
        {unchecked.map(item=><Row key={item.id} item={item}/>)}
        {checked.length>0&&(
          <>
            <p style={{fontSize:11,fontWeight:600,color:P.gray,textTransform:"uppercase",letterSpacing:1,margin:"12px 0 6px"}}>Nel carrello ✓</p>
            {checked.map(item=><Row key={item.id} item={item}/>)}
          </>
        )}
      </div>
      {editing&&(
        <Modal title="✏️ Modifica prodotto" onClose={()=>setEditing(null)}>
          <Lbl>Nome prodotto</Lbl>
          <input value={editing.text} onChange={e=>setEditing(p=>({...p,text:e.target.value}))} style={{width:"100%",border:`1.5px solid ${P.rose}`,borderRadius:12,padding:"10px 12px",fontSize:15,outline:"none",background:P.roseLight,color:P.dark,boxSizing:"border-box"}}/>
          <Lbl>Quantità (es. 2 kg, 1 bottiglia...)</Lbl>
          <input value={editing.qty||""} onChange={e=>setEditing(p=>({...p,qty:e.target.value}))} style={{width:"100%",border:`1.5px solid ${P.peach}`,borderRadius:12,padding:"10px 12px",fontSize:15,outline:"none",background:P.peachLight,color:P.dark,boxSizing:"border-box"}}/>
          <RecRow value={editing.recurrence||"none"} onChange={v=>setEditing(p=>({...p,recurrence:v}))} color={P.rose} colorLight={P.roseLight}/>
          <BtnRow onCancel={()=>setEditing(null)} onSave={saveEdit} onDelete={()=>{deleteItem(editing.id);}}/>
        </Modal>
      )}
    </div>
  );
}

// ── TODO ─────────────────────────────────────────────────────────────────────
function TodoList({db,user}){
  const[items,setItems]=useState([]);
  const[text,setText]=useState("");
  const[date,setDate]=useState("");
  const[rec,setRec]=useState("none");
  const[filter,setFilter]=useState("open");
  const[editing,setEditing]=useState(null);
  const[showAddTodo,setShowAddTodo]=useState(false);

  useEffect(()=>{
    if(!db)return;
    return onValue(ref(db,"todos"),snap=>{const d=snap.val()||{};setItems(Object.entries(d).map(([id,v])=>({id,...v})).sort((a,b)=>b.createdAt-a.createdAt));});
  },[db]);

  const addItem=()=>{
    if(!text.trim()||!db)return;
    push(ref(db,"todos"),{text:text.trim(),date:date||null,recurrence:rec,done:false,createdAt:Date.now(),createdBy:user.name});
    setText("");setDate("");setRec("none");
  };
  const toggleItem=(item)=>{if(!db)return;update(ref(db,`todos/${item.id}`),{done:!item.done,...(!item.done?{completedBy:user.name,completedAt:Date.now()}:{completedBy:null,completedAt:null})});};
  const saveEdit=()=>{if(!editing||!db)return;update(ref(db,`todos/${editing.id}`),{text:editing.text,date:editing.date||null,recurrence:editing.recurrence||"none"});setEditing(null);};
  const deleteItem=(id)=>{remove(ref(db,`todos/${id}`));if(editing?.id===id)setEditing(null);};
  const filtered=items.filter(i=>filter==="open"?!i.done:i.done);

  return(
    <div style={{flex:1,overflowY:"auto",paddingBottom:160,minHeight:0}}>
      <div style={{padding:"16px 16px 0"}}>

        <div style={{display:"flex",gap:8,marginBottom:12}}>
          {["open","done"].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{flex:1,padding:"8px 0",borderRadius:12,fontSize:13,fontWeight:600,border:"none",cursor:"pointer",background:filter===f?P.lav:P.lavLight,color:filter===f?"#fff":P.gray}}>
              {f==="open"?`📋 Aperte (${items.filter(i=>!i.done).length})`:`✅ Chiuse (${items.filter(i=>i.done).length})`}
            </button>
          ))}
        </div>
        {filtered.length===0&&(
          <div style={{textAlign:"center",padding:"40px 0",color:P.gray}}>
            <div style={{fontSize:48,marginBottom:8}}>{filter==="open"?"✅":"📋"}</div>
            <p style={{fontSize:14}}>Nessuna attività {filter==="open"?"aperta":"chiusa"}!</p>
          </div>
        )}
        {filtered.map(item=>(
          <div key={item.id} style={{background:"#fff",borderRadius:16,padding:"12px 14px",marginBottom:8,border:`1.5px solid ${P.lavLight}`,opacity:item.done?0.75:1}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <button onClick={()=>toggleItem(item)} style={{width:26,height:26,borderRadius:"50%",border:`2px solid ${P.lav}`,background:item.done?P.lav:"none",cursor:"pointer",flexShrink:0,color:"#fff",fontSize:13}}>{item.done?"✓":""}</button>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:14,fontWeight:500,color:P.dark,margin:0,textDecoration:item.done?"line-through":"none"}}>{item.text}</p>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:2}}>
                  <span style={{fontSize:11,color:P.gray}}>Aggiunta {fmtDate(item.createdAt)} · {item.createdBy||"?"}</span>
                  {item.date&&<span style={{fontSize:11,color:P.lavDark}}>📅 {fmtDate(item.date+"T12:00:00")}</span>}
                  {item.recurrence&&item.recurrence!=="none"&&<span style={{fontSize:11,color:P.lavDark}}>🔁 {REC_LABELS[item.recurrence]}</span>}
                </div>
                {item.done&&item.completedBy&&(
                  <p style={{fontSize:11,color:P.lavDark,margin:"2px 0 0"}}>✅ {item.completedBy} · {fmtDate(item.completedAt)} {fmtTime(item.completedAt)}</p>
                )}
              </div>
              <button onClick={()=>setEditing({...item})} style={{border:"none",background:"none",cursor:"pointer",fontSize:18,padding:"0 4px"}}>✏️</button>
              <button onClick={()=>deleteItem(item.id)} style={{border:"none",background:"none",cursor:"pointer",fontSize:18,padding:"0 4px"}}>🗑</button>
            </div>
          </div>
        ))}
      </div>
      {/* Todo FAB */}
      {!showAddTodo&&!editing&&(
        <div style={{position:"fixed",bottom:90,right:16,zIndex:10}}>
          <button onClick={()=>{setText("");setDate("");setRec("none");setShowAddTodo(true);}}
            style={{width:52,height:52,borderRadius:"50%",border:"none",background:`linear-gradient(135deg,${P.lav},${P.lavDark})`,cursor:"pointer",fontSize:22,color:"#fff",boxShadow:"0 4px 12px rgba(196,181,232,0.5)"}}>+</button>
        </div>
      )}

      {/* Add Todo Modal */}
      {showAddTodo&&(
        <Modal title="✅ Nuova attività" onClose={()=>setShowAddTodo(false)}>
          <Lbl>Nome attività</Lbl>
          <input value={text} onChange={e=>setText(e.target.value)} autoFocus
            placeholder="es. Chiamare il dentista..." style={{width:"100%",border:`1.5px solid ${P.lav}`,borderRadius:12,padding:"10px 12px",fontSize:15,outline:"none",background:P.lavLight,color:P.dark,boxSizing:"border-box"}}/>
          <RecRow value={rec} onChange={setRec} color={P.lav} colorLight={P.lavLight}/>
          <BtnRow onCancel={()=>setShowAddTodo(false)} onSave={()=>{addItem();setShowAddTodo(false);}}/>
        </Modal>
      )}

      {editing&&(
        <Modal title="✏️ Modifica attività" onClose={()=>setEditing(null)}>
          <Lbl>Nome attività</Lbl>
          <input value={editing.text} onChange={e=>setEditing(p=>({...p,text:e.target.value}))} style={{width:"100%",border:`1.5px solid ${P.lav}`,borderRadius:12,padding:"10px 12px",fontSize:15,outline:"none",background:P.lavLight,color:P.dark,boxSizing:"border-box"}}/>
          <DateInp label="Data scadenza" value={editing.date||""} onChange={v=>setEditing(p=>({...p,date:v}))} color={P.lav} colorLight={P.lavLight}/>
          <RecRow value={editing.recurrence||"none"} onChange={v=>setEditing(p=>({...p,recurrence:v}))} color={P.lav} colorLight={P.lavLight}/>
          {editing.done&&editing.completedBy&&(
            <div style={{background:P.lavLight,borderRadius:12,padding:"10px 14px",marginTop:12}}>
              <p style={{fontSize:12,color:P.gray,margin:0}}>✅ Completata da <strong>{editing.completedBy}</strong></p>
              <p style={{fontSize:12,color:P.gray,margin:"2px 0 0"}}>🕐 {fmtDate(editing.completedAt)} · {fmtTime(editing.completedAt)}</p>
            </div>
          )}
          <BtnRow onCancel={()=>setEditing(null)} onSave={saveEdit} onDelete={()=>{deleteItem(editing.id);}}/>
        </Modal>
      )}
    </div>
  );
}

// ── CALENDAR ─────────────────────────────────────────────────────────────────
function CalendarView({db,user,users}){
  const[events,setEvents]=useState([]);
  const[templates,setTemplates]=useState([]);
  const[view,setView]=useState("month");
  const[curDate,setCurDate]=useState(new Date());
  const[calFilter,setCalFilter]=useState("shared");
  const[showAdd,setShowAdd]=useState(false);
  const[showTpl,setShowTpl]=useState(false);
  const[selDay,setSelDay]=useState(null);
  const[editEv,setEditEv]=useState(null);
  const emptyEv={text:"",date:"",timeFrom:"",timeTo:"",duration:"",recurrence:"none",isShared:true,color:""};
  const[newEv,setNewEv]=useState({...emptyEv});
  const[newTpl,setNewTpl]=useState({name:"",timeFrom:"",timeTo:"",duration:""});

  useEffect(()=>{
    if(!db)return;
    const u1=onValue(ref(db,"calendarEvents"),snap=>{const d=snap.val()||{};setEvents(Object.entries(d).map(([id,v])=>({id,...v})));});
    const u2=onValue(ref(db,`templates/${user.name}`),snap=>{const d=snap.val()||{};setTemplates(Object.entries(d).map(([id,v])=>({id,...v})));});
    return()=>{u1();u2();};
  },[db,user]);

  const openAddForDay=(date)=>{
    setNewEv({...emptyEv,date:toIsoDate(date)});
    setShowAdd(true);
  };

  const addEvent=()=>{
    if(!newEv.text.trim()||!newEv.date||!db)return;
    // For shared events use owner color; for personal use chosen color
    const evColor=newEv.isShared?user.color:(newEv.color||user.color);
    push(ref(db,"calendarEvents"),{...newEv,color:evColor,owner:user.name,ownerColor:user.color,createdAt:Date.now()});
    setNewEv({...emptyEv});setShowAdd(false);
  };

  const saveEditEv=()=>{
    if(!editEv||!db)return;
    const evColor=editEv.isShared?user.color:(editEv.color||user.color);
    update(ref(db,`calendarEvents/${editEv.id}`),{text:editEv.text,date:editEv.date,timeFrom:editEv.timeFrom,timeTo:editEv.timeTo,duration:editEv.duration,recurrence:editEv.recurrence,isShared:editEv.isShared,color:evColor});
    setEditEv(null);
  };

  const addTemplate=()=>{
    if(!newTpl.name.trim()||!db)return;
    push(ref(db,`templates/${user.name}`),{...newTpl});
    setNewTpl({name:"",timeFrom:"",timeTo:"",duration:""});
  };

  const deleteEvent=(id)=>{remove(ref(db,`calendarEvents/${id}`));if(editEv?.id===id)setEditEv(null);};
  const deleteTemplate=(id)=>remove(ref(db,`templates/${user.name}/${id}`));
  const applyTemplate=(t)=>{setNewEv(p=>({...p,text:t.name,timeFrom:t.timeFrom||"",timeTo:t.timeTo||"",duration:t.duration||""}));setShowAdd(true);setShowTpl(false);};
  
  const getEvColor=(ev)=>ev.color||ev.ownerColor||P.mint;
  const getUserColor=(ownerName)=>{const u=Object.values(users||{}).find(u=>u.name===ownerName);return u?.color||P.mint;};

  const visibleEvents=events.filter(ev=>calFilter==="mine"?ev.owner===user.name:(ev.isShared||ev.owner===user.name));

  const expandForMonth=(year,month)=>{
    const result=[],dim=new Date(year,month+1,0).getDate();
    visibleEvents.forEach(ev=>{
      if(!ev.date)return;
      const evDate=new Date(ev.date+"T12:00:00");
      const add=(d)=>result.push({...ev,displayDate:new Date(d)});
      if(!ev.recurrence||ev.recurrence==="none"){if(evDate.getFullYear()===year&&evDate.getMonth()===month)add(evDate);}
      else if(ev.recurrence==="monthly"){add(new Date(year,month,evDate.getDate()));}
      else if(ev.recurrence==="weekly"){for(let d=1;d<=dim;d++){const dt=new Date(year,month,d);if(dt.getDay()===evDate.getDay())add(dt);}}
      else if(ev.recurrence==="daily"){for(let d=1;d<=dim;d++)add(new Date(year,month,d));}
    });
    return result;
  };

  const year=curDate.getFullYear(),month=curDate.getMonth();
  const monthEvs=expandForMonth(year,month);
  const getEvForDay=(d)=>monthEvs.filter(ev=>isSameDay(ev.displayDate,d));
  const today=new Date();
  const navigate=(dir)=>{const d=new Date(curDate);if(view==="month")d.setMonth(d.getMonth()+dir);else if(view==="week")d.setDate(d.getDate()+dir*7);else d.setDate(d.getDate()+dir);setCurDate(d);};
  const getWeekDays=()=>{const d=new Date(curDate);d.setDate(d.getDate()-d.getDay());return Array.from({length:7},(_,i)=>{const dd=new Date(d);dd.setDate(d.getDate()+i);return dd;});};
  const headerLabel=()=>{if(view==="month")return`${MONTHS[month]} ${year}`;if(view==="week"){const w=getWeekDays();return`${w[0].getDate()} - ${w[6].getDate()} ${MONTHS_SHORT[w[6].getMonth()]}`;}return`${curDate.getDate()} ${MONTHS[curDate.getMonth()]}`;};

  // Export ICS for current user's events
  const handleExport=()=>{
    const myEvents=events.filter(ev=>ev.owner===user.name||(ev.isShared&&calFilter==="shared"));
    exportToICS(myEvents,user.name);
  };

  const EventCard=({ev})=>(
    <div onClick={()=>ev.owner===user.name&&setEditEv({...ev})}
      style={{display:"flex",alignItems:"center",gap:10,background:"#fff",borderRadius:14,padding:"10px 14px",marginBottom:8,border:`1.5px solid ${P.mintLight}`,cursor:ev.owner===user.name?"pointer":"default"}}>
      <div style={{width:10,height:10,borderRadius:"50%",background:getEvColor(ev),flexShrink:0,border:`1.5px solid rgba(0,0,0,0.1)`}}/>
      <div style={{flex:1}}>
        <p style={{fontSize:13,fontWeight:500,color:P.dark,margin:0}}>{ev.text}</p>
        <p style={{fontSize:11,color:P.gray,margin:0}}>{ev.owner}{ev.timeFrom?` · ${ev.timeFrom}${ev.timeTo?` - ${ev.timeTo}`:""}`:""}{ev.duration?` · ⏱ ${ev.duration}`:""}</p>
      </div>
      {ev.owner===user.name&&<span style={{fontSize:14}}>✏️</span>}
    </div>
  );

  const SharedToggle=({isShared,onChange})=>(
    <div>
      <Lbl>Visibilità</Lbl>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>onChange(true)} style={{flex:1,padding:"8px 0",borderRadius:12,fontSize:13,border:"none",cursor:"pointer",background:isShared?P.mint:P.mintLight,color:isShared?"#fff":P.gray}}>🌸 Condiviso</button>
        <button onClick={()=>onChange(false)} style={{flex:1,padding:"8px 0",borderRadius:12,fontSize:13,border:"none",cursor:"pointer",background:!isShared?P.mint:P.mintLight,color:!isShared?"#fff":P.gray}}>👤 Solo mio</button>
      </div>
    </div>
  );

  // Sticky header for week/day views
  const WeekHeader=({weekDays,onDayClick})=>(
    <div style={{display:"grid",gridTemplateColumns:"32px repeat(7,1fr)",gap:1,background:"#fff",paddingBottom:6,borderBottom:`1px solid ${P.mintLight}`,flexShrink:0}}>
      <div/>
      {weekDays.map((d,i)=>(
        <button key={i} onClick={()=>onDayClick(d)}
          style={{textAlign:"center",paddingBottom:2,background:"none",border:"none",cursor:"pointer"}}>
          <p style={{fontSize:10,color:P.gray,margin:0}}>{DAYS_SHORT[d.getDay()]}</p>
          <div style={{width:26,height:26,borderRadius:"50%",background:isSameDay(d,today)?P.mint:"transparent",display:"flex",alignItems:"center",justifyContent:"center",margin:"2px auto 0"}}>
            <span style={{fontSize:12,fontWeight:600,color:isSameDay(d,today)?"#fff":P.dark}}>{d.getDate()}</span>
          </div>
        </button>
      ))}
    </div>
  );

  const DayHeader=({date,onDayClick})=>(
    <div style={{background:"#fff",padding:"8px 12px",flexShrink:0,borderBottom:`1px solid ${P.mintLight}`,display:"flex",alignItems:"center",gap:10}}>
      <div style={{width:36,height:36,borderRadius:"50%",background:isSameDay(date,today)?P.mint:P.mintLight,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:9,color:isSameDay(date,today)?"#fff":P.gray,lineHeight:1}}>{DAYS_SHORT[date.getDay()]}</span>
        <span style={{fontSize:15,fontWeight:700,color:isSameDay(date,today)?"#fff":P.dark,lineHeight:1}}>{date.getDate()}</span>
      </div>
      <span style={{fontSize:14,color:P.gray}}>{MONTHS[date.getMonth()]} {date.getFullYear()}</span>
      <button onClick={()=>openAddForDay(date)} style={{marginLeft:"auto",padding:"6px 14px",borderRadius:16,fontSize:12,fontWeight:600,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${P.mint},${P.mintDark})`,color:"#fff"}}>+ Evento</button>
    </div>
  );

  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
      {/* TOP CONTROLS - always visible */}
      <div style={{padding:"10px 14px 0",background:"#fff",borderBottom:`1px solid ${P.roseLight}`,flexShrink:0}}>
        <div style={{display:"flex",gap:6,marginBottom:8}}>
          {["month","week"].map(v=>(
            <button key={v} onClick={()=>setView(v)} style={{flex:1,padding:"6px 0",borderRadius:10,fontSize:12,fontWeight:600,border:"none",cursor:"pointer",background:view===v?P.mint:P.mintLight,color:view===v?"#fff":P.gray}}>
              {v==="month"?"Mese":"Settimana"}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:6,marginBottom:8}}>
          <button onClick={()=>setCalFilter("shared")} style={{flex:1,padding:"5px 0",borderRadius:10,fontSize:12,fontWeight:500,border:"none",cursor:"pointer",background:calFilter==="shared"?user.color:P.mintLight,color:calFilter==="shared"?"#fff":P.gray}}>🌸 Condiviso</button>
          <button onClick={()=>setCalFilter("mine")} style={{flex:1,padding:"5px 0",borderRadius:10,fontSize:12,fontWeight:500,border:"none",cursor:"pointer",background:calFilter==="mine"?user.color:P.mintLight,color:calFilter==="mine"?"#fff":P.gray}}>👤 Il mio</button>
          <button onClick={handleExport} title="Esporta al calendario iPhone" style={{padding:"5px 10px",borderRadius:10,fontSize:12,fontWeight:500,border:"none",cursor:"pointer",background:P.mintLight,color:P.gray}}>📲</button>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <button onClick={()=>navigate(-1)} style={{width:32,height:32,borderRadius:"50%",border:"none",background:P.mintLight,cursor:"pointer",fontSize:18}}>‹</button>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:700,color:P.dark}}>{headerLabel()}</span>
          <button onClick={()=>navigate(1)} style={{width:32,height:32,borderRadius:"50%",border:"none",background:P.mintLight,cursor:"pointer",fontSize:18}}>›</button>
        </div>
      </div>

      {/* WEEK HEADER - outside scroll, always visible */}
      {view==="week"&&(()=>{
        const weekDays=getWeekDays();
        return(
          <div style={{background:"#fff",flexShrink:0,borderBottom:`1px solid ${P.mintLight}`}}>
            <WeekHeader weekDays={weekDays} onDayClick={(d)=>openAddForDay(d)}/>
          </div>
        );
      })()}

      {/* SCROLLABLE CONTENT */}
      <div style={{flex:1,overflowY:"auto",paddingBottom:160,minHeight:0}}>

        {/* MONTH VIEW */}
        {view==="month"&&(
          <div style={{padding:"0 10px"}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginTop:8,marginBottom:4}}>
              {["D","L","M","M","G","V","S"].map((d,i)=><div key={i} style={{textAlign:"center",fontSize:11,fontWeight:600,color:P.gray,padding:"3px 0"}}>{d}</div>)}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
              {Array(new Date(year,month,1).getDay()).fill(null).map((_,i)=><div key={"e"+i}/>)}
              {Array(new Date(year,month+1,0).getDate()).fill(null).map((_,i)=>{
                const day=i+1,d=new Date(year,month,day);
                const isToday=isSameDay(d,today),isSel=selDay&&isSameDay(d,selDay);
                const dayEvs=getEvForDay(d);
                return(
                  <button key={day}
                    onClick={()=>{
                      if(isSel){setSelDay(null);}
                      else{setSelDay(d);}
                    }}
                    onDoubleClick={()=>openAddForDay(d)}
                    style={{aspectRatio:"1",borderRadius:10,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",border:isToday?`2px solid ${P.mint}`:"2px solid transparent",background:isSel?P.mint:"transparent",cursor:"pointer"}}>
                    <span style={{fontSize:12,fontWeight:500,color:isSel?"#fff":P.dark}}>{day}</span>
                    <div style={{display:"flex",gap:2,marginTop:1}}>
                      {dayEvs.slice(0,3).map((ev,di)=><div key={di} style={{width:5,height:5,borderRadius:"50%",background:isSel?"#fff":getEvColor(ev)}}/>)}
                    </div>
                  </button>
                );
              })}
            </div>
            {selDay&&(
              <div style={{marginTop:12}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <p style={{fontSize:12,fontWeight:600,color:P.gray,textTransform:"uppercase",letterSpacing:1,margin:0}}>{selDay.getDate()} {MONTHS[selDay.getMonth()]}</p>
                  <button onClick={()=>openAddForDay(selDay)} style={{padding:"5px 12px",borderRadius:14,fontSize:12,fontWeight:600,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${P.mint},${P.mintDark})`,color:"#fff"}}>+ Evento</button>
                </div>
                {getEvForDay(selDay).length===0
                  ?<p style={{fontSize:13,color:P.gray,textAlign:"center",padding:"16px 0"}}>Nessun evento 🌸</p>
                  :getEvForDay(selDay).map((ev,i)=><EventCard key={i} ev={ev}/>)
                }
              </div>
            )}
          </div>
        )}

        {/* WEEK VIEW */}
        {view==="week"&&(()=>{
          const weekDays=getWeekDays();
          const allWE=weekDays.map(d=>expandForMonth(d.getFullYear(),d.getMonth()).filter(ev=>isSameDay(ev.displayDate,d)));
          return(
            <div>
              <div style={{display:"grid",gridTemplateColumns:"32px repeat(7,1fr)",gap:1,padding:"0 2px"}}>
                {Array.from({length:18},(_,h)=>[
                  <div key={"h"+(h+6)} style={{fontSize:9,color:P.gray,paddingTop:2,textAlign:"right",paddingRight:3,height:PX_PER_HOUR}}>{h+6}:00</div>,
                  ...weekDays.map((d,di)=>{
                    const dayEvs=allWE[di].filter(ev=>ev.timeFrom&&Math.floor(timeToMin(ev.timeFrom)/60)===(h+6));
                    return(
                      <div key={"c"+h+di} onClick={()=>{const ev2={...emptyEv,date:toIsoDate(d),timeFrom:`${String(h+6).padStart(2,"0")}:00`};setNewEv(ev2);setShowAdd(true);}} style={{height:PX_PER_HOUR,borderTop:`1px solid ${P.mintLight}`,borderLeft:`1px solid ${P.mintLight}`,position:"relative",cursor:"pointer"}}>
                        {dayEvs.map((ev,ei)=>{
                          const fromMin=timeToMin(ev.timeFrom)%60;
                          const durMin=ev.timeTo?timeToMin(ev.timeTo)-timeToMin(ev.timeFrom):60;
                          const top=(fromMin/60)*PX_PER_HOUR;
                          const height=Math.max((durMin/60)*PX_PER_HOUR,16);
                          return<div key={ei} onClick={e=>{e.stopPropagation();ev.owner===user.name&&setEditEv({...ev});}} style={{position:"absolute",top,left:1,right:1,height,background:getEvColor(ev),borderRadius:4,padding:"1px 3px",fontSize:8,color:"#fff",overflow:"hidden",cursor:"pointer",zIndex:2}}>{ev.text}</div>;
                        })}
                      </div>
                    );
                  })
                ])}
              </div>
            </div>
          );
        })()}

      </div>

      {/* FABs */}
      {!showAdd&&!showTpl&&!editEv&&(
      <div style={{position:"fixed",bottom:90,right:16,display:"flex",flexDirection:"column",gap:8,alignItems:"flex-end",zIndex:150}}>
        <button onClick={()=>setShowTpl(true)} style={{width:44,height:44,borderRadius:"50%",border:"none",background:P.mintLight,cursor:"pointer",fontSize:18,boxShadow:"0 2px 8px rgba(0,0,0,0.12)"}}>📋</button>
        <button onClick={()=>{setNewEv({...emptyEv});setShowAdd(true);}} style={{width:52,height:52,borderRadius:"50%",border:"none",background:`linear-gradient(135deg,${P.mint},${P.mintDark})`,cursor:"pointer",fontSize:22,color:"#fff",boxShadow:"0 4px 12px rgba(91,191,160,0.4)"}}>+</button>
      </div>
      )}

      {/* ADD EVENT MODAL */}
      {showAdd&&(
        <Modal title="📅 Nuovo evento" onClose={()=>setShowAdd(false)}>
          {templates.length>0&&(
            <div style={{marginBottom:8}}>
              <Lbl>Usa un template</Lbl>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {templates.map(t=>(
                  <button key={t.id} onClick={()=>applyTemplate(t)} style={{padding:"6px 12px",borderRadius:16,fontSize:12,border:`1px solid ${P.mint}`,background:P.mintLight,cursor:"pointer",color:P.dark}}>
                    {t.name}{t.timeFrom?` (${t.timeFrom}${t.timeTo?`-${t.timeTo}`:""})`:""}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Lbl>Nome evento</Lbl>
          <input value={newEv.text} onChange={e=>setNewEv(p=>({...p,text:e.target.value}))} placeholder="es. Dentista, Palestra..." style={{width:"100%",border:`1.5px solid ${P.mint}`,borderRadius:12,padding:"10px 12px",fontSize:15,outline:"none",background:P.mintLight,color:P.dark,boxSizing:"border-box"}}/>
          <DateInp label="Data" value={newEv.date} onChange={v=>setNewEv(p=>({...p,date:v}))}/>
          <TimeRow label="Orario fisso (lascia vuoto per evento tutto il giorno)" from={newEv.timeFrom} to={newEv.timeTo} onFrom={v=>setNewEv(p=>({...p,timeFrom:v}))} onTo={v=>setNewEv(p=>({...p,timeTo:v}))}/>
          <Lbl>Durata (es. 1 ora) — alternativa agli orari fissi</Lbl>
          <input value={newEv.duration} onChange={e=>setNewEv(p=>({...p,duration:e.target.value}))} placeholder="es. 1 ora, 30 min..." style={{width:"100%",border:`1.5px solid ${P.mint}`,borderRadius:12,padding:"10px 12px",fontSize:15,outline:"none",background:P.mintLight,color:P.dark,boxSizing:"border-box"}}/>
          <RecRow value={newEv.recurrence} onChange={v=>setNewEv(p=>({...p,recurrence:v}))}/>
          <SharedToggle isShared={newEv.isShared} onChange={v=>setNewEv(p=>({...p,isShared:v}))}/>
          {!newEv.isShared&&(
            <ColorPicker label="Colore evento (solo calendario personale)" value={newEv.color||user.color} onChange={v=>setNewEv(p=>({...p,color:v}))}/>
          )}
          <BtnRow onCancel={()=>setShowAdd(false)} onSave={addEvent}/>
        </Modal>
      )}

      {/* TEMPLATE MANAGER */}
      {showTpl&&(
        <Modal title="📋 I miei template" onClose={()=>setShowTpl(false)}>
          {templates.length===0
            ?<p style={{fontSize:13,color:P.gray,textAlign:"center",marginBottom:16}}>Nessun template ancora 🌿</p>
            :templates.map(t=>(
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,background:"#fff",borderRadius:14,padding:"10px 14px",marginBottom:8,border:`1.5px solid ${P.mintLight}`}}>
                <div style={{flex:1}}>
                  <p style={{fontSize:14,fontWeight:500,color:P.dark,margin:0}}>{t.name}</p>
                  <p style={{fontSize:12,color:P.gray,margin:0}}>{t.timeFrom?`🕐 ${t.timeFrom}${t.timeTo?` → ${t.timeTo}`:""}`:""}{t.duration?` · ⏱ ${t.duration}`:""}</p>
                </div>
                <button onClick={()=>applyTemplate(t)} style={{padding:"5px 10px",borderRadius:12,fontSize:12,border:`1px solid ${P.mint}`,background:P.mintLight,cursor:"pointer",color:P.dark}}>Usa</button>
                <button onClick={()=>deleteTemplate(t.id)} style={{border:"none",background:"none",cursor:"pointer",fontSize:18}}>🗑</button>
              </div>
            ))
          }
          <p style={{fontSize:13,fontWeight:600,color:P.dark,margin:"16px 0 4px"}}>Nuovo template</p>
          <Lbl>Nome impegno</Lbl>
          <input value={newTpl.name} onChange={e=>setNewTpl(p=>({...p,name:e.target.value}))} placeholder="es. Turno mattina, Palestra..." style={{width:"100%",border:`1.5px solid ${P.mint}`,borderRadius:12,padding:"10px 12px",fontSize:15,outline:"none",background:P.mintLight,color:P.dark,boxSizing:"border-box"}}/>
          <TimeRow label="Orario fisso (opzionale)" from={newTpl.timeFrom} to={newTpl.timeTo} onFrom={v=>setNewTpl(p=>({...p,timeFrom:v}))} onTo={v=>setNewTpl(p=>({...p,timeTo:v}))}/>
          <Lbl>Durata (es. 1 ora) — per impegni senza orario fisso</Lbl>
          <input value={newTpl.duration} onChange={e=>setNewTpl(p=>({...p,duration:e.target.value}))} placeholder="es. 1 ora, 45 min..." style={{width:"100%",border:`1.5px solid ${P.mint}`,borderRadius:12,padding:"10px 12px",fontSize:15,outline:"none",background:P.mintLight,color:P.dark,boxSizing:"border-box"}}/>
          <div style={{display:"flex",gap:10,marginTop:16}}>
            <button onClick={()=>setShowTpl(false)} style={{flex:1,padding:"12px 0",borderRadius:20,border:"none",background:P.mintLight,color:P.gray,cursor:"pointer"}}>Chiudi</button>
            <button onClick={addTemplate} style={{flex:1,padding:"12px 0",borderRadius:20,border:"none",background:`linear-gradient(135deg,${P.mint},${P.mintDark})`,color:"#fff",cursor:"pointer",fontWeight:600}}>+ Aggiungi</button>
          </div>
        </Modal>
      )}

      {/* EDIT EVENT MODAL */}
      {editEv&&(
        <Modal title="✏️ Modifica evento" onClose={()=>setEditEv(null)}>
          <Lbl>Nome evento</Lbl>
          <input value={editEv.text} onChange={e=>setEditEv(p=>({...p,text:e.target.value}))} style={{width:"100%",border:`1.5px solid ${P.mint}`,borderRadius:12,padding:"10px 12px",fontSize:15,outline:"none",background:P.mintLight,color:P.dark,boxSizing:"border-box"}}/>
          <DateInp label="Data" value={editEv.date||""} onChange={v=>setEditEv(p=>({...p,date:v}))}/>
          <TimeRow label="Orario fisso" from={editEv.timeFrom||""} to={editEv.timeTo||""} onFrom={v=>setEditEv(p=>({...p,timeFrom:v}))} onTo={v=>setEditEv(p=>({...p,timeTo:v}))}/>
          <Lbl>Durata</Lbl>
          <input value={editEv.duration||""} onChange={e=>setEditEv(p=>({...p,duration:e.target.value}))} placeholder="es. 1 ora..." style={{width:"100%",border:`1.5px solid ${P.mint}`,borderRadius:12,padding:"10px 12px",fontSize:15,outline:"none",background:P.mintLight,color:P.dark,boxSizing:"border-box"}}/>
          <RecRow value={editEv.recurrence||"none"} onChange={v=>setEditEv(p=>({...p,recurrence:v}))}/>
          <SharedToggle isShared={editEv.isShared} onChange={v=>setEditEv(p=>({...p,isShared:v}))}/>
          {!editEv.isShared&&(
            <ColorPicker label="Colore evento" value={editEv.color||user.color} onChange={v=>setEditEv(p=>({...p,color:v}))}/>
          )}
          <BtnRow onCancel={()=>setEditEv(null)} onSave={saveEditEv} onDelete={()=>{deleteEvent(editEv.id);setEditEv(null);}}/>
        </Modal>
      )}
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App(){
  const[tab,setTab]=useState("shopping");
  const[db,setDb]=useState(null);
  const[user,setUser]=useState(null);
  const[users,setUsers]=useState({});

  useEffect(()=>{
    try{
      const app=initializeApp(FIREBASE_CONFIG);
      const database=getDatabase(app);
      setDb(database);
      onValue(ref(database,"users"),snap=>setUsers(snap.val()||{}));
    }catch(e){console.error(e);}
  },[]);

  useEffect(()=>{
    const saved=localStorage.getItem("puzzoni_user");
    if(saved)setUser(JSON.parse(saved));
  },[]);

  const handleOnboarding=(name,color)=>{
    const u={name,color};
    setUser(u);
    localStorage.setItem("puzzoni_user",JSON.stringify(u));
    if(db)set(ref(db,`users/${name}`),u);
  };

  if(!user)return<Onboarding onComplete={handleOnboarding}/>;

  const tabs=[
    {id:"shopping",label:"Spesa",emoji:"🛒"},
    {id:"todo",label:"Attività",emoji:"✅"},
    {id:"calendar",label:"Calendario",emoji:"📅"},
  ];

  return(
    <div style={{minHeight:"100dvh",display:"flex",flexDirection:"column",background:P.cream,fontFamily:"'Lato',sans-serif",maxWidth:430,margin:"0 auto"}}>
      <div style={{padding:"48px 20px 12px",background:"#fff",borderBottom:`1px solid ${P.roseLight}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <h1 style={{fontFamily:"'Playfair Display',serif",color:P.dark,fontSize:24,fontWeight:700,margin:0}}>Puzzoni 🐾</h1>
          <p style={{color:P.gray,fontSize:12,margin:0}}>Ciao {user.name}! 💕</p>
        </div>
        <div style={{width:12,height:12,borderRadius:"50%",background:user.color,border:`2px solid ${P.dark}`}}/>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
        {tab==="shopping"&&<ShoppingList db={db} user={user}/>}
        {tab==="todo"&&<TodoList db={db} user={user}/>}
        {tab==="calendar"&&<CalendarView db={db} user={user} users={users}/>}
      </div>
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,display:"flex",background:"#fff",borderTop:`1px solid ${P.roseLight}`,paddingBottom:"env(safe-area-inset-bottom)",zIndex:200}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"10px 0 8px",gap:2,border:"none",background:"none",cursor:"pointer"}}>
            <span style={{fontSize:20}}>{t.emoji}</span>
            <span style={{fontSize:11,fontWeight:600,color:tab===t.id?P.roseDark:P.gray}}>{t.label}</span>
            {tab===t.id&&<div style={{width:6,height:6,borderRadius:"50%",background:P.rose}}/>}
          </button>
        ))}
      </div>
    </div>
  );
}
