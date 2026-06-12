import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens — "sleek modern health", agent-first
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  bg: "#0B0E14", panel: "#151A23", panel2: "#1C2230", line: "#262D3B",
  text: "#EAF0F7", sub: "#8A93A6",
  accent: "#4ADE80", accent2: "#38BDF8", accent3: "#FBBF24",
};
const TYPE = {
  Chicken: "#F59E0B", Fish: "#38BDF8", Veg: "#4ADE80", "Khichdi Special": "#C084FC",
};
const WEEK = [
  { day: "Mon", type: "Chicken", meal: "Aloo Gobi Gravy + Sem Sabzi + Chicken Sukka" },
  { day: "Tue", type: "Veg",     meal: "Aloo Matar Paneer + Parwal + Paneer Bhurji" },
  { day: "Wed", type: "Chicken", meal: "Palak Dal + Methi + Chicken Masala" },
  { day: "Thu", type: "Veg",     meal: "Black Chana + Baingan Bharta + Paneer Bhurji" },
  { day: "Fri", type: "Fish",    meal: "Lauki Dal + Beetroot + Mackerel Rava Fry" },
  { day: "Sat", type: "Khichdi Special", meal: "Khichdi + Chokha + Mackerel Dry Fry" },
  { day: "Sun", type: "Veg",     meal: "Rajma + Beetroot + Paneer Bhurji" },
];

// ── Progress ring ────────────────────────────────────────────────────────────
function Ring({ value, target, label, unit, color, size = 74 }) {
  const r = (size - 10) / 2, c = 2 * Math.PI * r, pct = Math.min(value / target, 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} stroke={T.line} strokeWidth="7" fill="none" />
          <motion.circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="7" fill="none"
            strokeLinecap="round" strokeDasharray={c}
            initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c - c * pct }}
            transition={{ duration: 1.1, ease: "easeOut", delay: 0.3 }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center",
                      fontSize: 15, fontWeight: 700 }}>{value}</div>
      </div>
      <div style={{ fontSize: 10.5, color: T.sub, fontWeight: 600 }}>{label} · {unit}</div>
    </div>
  );
}

// ── Chat primitives ──────────────────────────────────────────────────────────
function Avatar() {
  return <div style={{ width: 30, height: 30, borderRadius: 10, flexShrink: 0,
    background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`,
    display: "grid", placeItems: "center", fontSize: 15 }}>🍳</div>;
}
function Bubble({ children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      style={{ display: "flex", gap: 9, alignItems: "flex-end" }}>
      <Avatar />
      <div style={{ background: T.panel2, border: `1px solid ${T.line}`, color: T.text,
        padding: "11px 14px", borderRadius: "4px 16px 16px 16px", fontSize: 14, lineHeight: 1.5,
        maxWidth: 300 }}>{children}</div>
    </motion.div>
  );
}
function UserBubble({ children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      style={{ display: "flex", justifyContent: "flex-end" }}>
      <div style={{ background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, color: "#06210F",
        padding: "11px 14px", borderRadius: "16px 4px 16px 16px", fontSize: 14, fontWeight: 600,
        maxWidth: 280 }}>{children}</div>
    </motion.div>
  );
}
function Typing() {
  return (
    <div style={{ display: "flex", gap: 9, alignItems: "flex-end" }}>
      <Avatar />
      <div style={{ background: T.panel2, border: `1px solid ${T.line}`, padding: "13px 16px",
        borderRadius: "4px 16px 16px 16px", display: "flex", gap: 4 }}>
        {[0, 1, 2].map(i => (
          <motion.span key={i} animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
            style={{ width: 6, height: 6, borderRadius: 6, background: T.sub }} />
        ))}
      </div>
    </div>
  );
}
function Quick({ children, onClick, primary }) {
  return (
    <motion.button whileTap={{ scale: 0.95 }} onClick={onClick}
      style={{ padding: "9px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
        border: primary ? "none" : `1px solid ${T.line}`,
        background: primary ? `linear-gradient(135deg, ${T.accent}, ${T.accent2})` : T.panel,
        color: primary ? "#06210F" : T.text }}>{children}</motion.button>
  );
}

// ── Rich inline cards the agent "sends" ──────────────────────────────────────
function MealPlanCard() {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      style={{ marginLeft: 39, background: `linear-gradient(180deg, ${T.panel2}, ${T.panel})`,
        border: `1px solid ${T.line}`, borderRadius: 18, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 14,
        paddingBottom: 14, borderBottom: `1px solid ${T.line}` }}>
        <Ring value={1657} target={1700} label="Cals" unit="avg" color={T.accent2} />
        <Ring value={125} target={130} label="Protein" unit="g" color={T.accent} />
        <Ring value={6500} target={9500} label="Budget" unit="₹wk" color={T.accent3} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {WEEK.map((d, i) => (
          <motion.div key={d.day} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ width: 30, fontSize: 11, fontWeight: 700, color: T.sub }}>{d.day}</span>
            <span style={{ width: 7, height: 7, borderRadius: 7, background: TYPE[d.type],
              boxShadow: `0 0 8px ${TYPE[d.type]}`, flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: T.text, lineHeight: 1.35 }}>{d.meal}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
function SpendCard({ onLog }) {
  const [amt, setAmt] = useState("");
  const cats = ["🛒 Grocery", "🧴 Toiletries", "🧼 Cleaning", "💊 Health"];
  const [cat, setCat] = useState(cats[0]);
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      style={{ marginLeft: 39, background: T.panel, border: `1px solid ${T.line}`,
        borderRadius: 18, padding: 16 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {cats.map(c => (
          <button key={c} onClick={() => setCat(c)} style={{ padding: "6px 10px", borderRadius: 12,
            fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${cat === c ? T.accent : T.line}`,
            background: cat === c ? "rgba(74,222,128,.12)" : "transparent",
            color: cat === c ? T.accent : T.sub }}>{c}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={amt} onChange={e => setAmt(e.target.value)} placeholder="₹ amount" inputMode="numeric"
          style={{ flex: 1, background: T.bg, border: `1px solid ${T.line}`, borderRadius: 12,
            padding: "11px 13px", color: T.text, fontSize: 14, outline: "none" }} />
        <Quick primary onClick={() => onLog(cat, amt)}>Log</Quick>
      </div>
    </motion.div>
  );
}

// ── The conversation ─────────────────────────────────────────────────────────
export default function MealPlanPreview() {
  const [step, setStep] = useState(0);   // drives the scripted agent flow
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);

  // advance helper with a realistic "typing" beat
  const advance = (to) => { setTyping(true); setTimeout(() => { setTyping(false); setStep(to); }, 850); };

  useEffect(() => { setTyping(true); const t = setTimeout(() => { setTyping(false); setStep(1); }, 1000); return () => clearTimeout(t); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [step, typing]);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text,
      fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 460, margin: "0 auto",
      display: "flex", flexDirection: "column" }}>
      {/* Header — the agent, "online" */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "16px 18px",
        borderBottom: `1px solid ${T.line}`, background: T.bg, position: "sticky", top: 0, zIndex: 5 }}>
        <Avatar />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Sous Chef</div>
          <div style={{ fontSize: 11.5, color: T.accent, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: 6, background: T.accent }} /> your health agent · online
          </div>
        </div>
      </div>

      {/* Conversation */}
      <div style={{ flex: 1, padding: "18px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        {step >= 1 && <Bubble>Morning, Supriya 👋 Your week's ready — balanced to <b>~1,700 kcal</b> and <b>130g protein</b>, and within budget.</Bubble>}
        {step >= 1 && <MealPlanCard />}
        {step >= 1 && step < 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            style={{ marginLeft: 39, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Quick primary onClick={() => advance(2)}>✓ Accept week</Quick>
            <Quick onClick={() => advance(2)}>🔁 Swap a day</Quick>
          </motion.div>
        )}

        {step >= 2 && <UserBubble>Accept ✓</UserBubble>}
        {step >= 2 && <Bubble>Done! Grocery list built — <b>₹6,500</b> across Licious, Instamart & Mango. 🛒<br/>Quick check — did you <b>spend anything else</b> today?</Bubble>}
        {step >= 2 && step < 3 && <SpendCard onLog={() => advance(3)} />}

        {step >= 3 && <UserBubble>₹420 · Toiletries</UserBubble>}
        {step >= 3 && <Bubble>Logged 🧴 You're at <b>₹31,200 / ₹38,000</b> this month — comfortably on track. I'll check in again tomorrow evening.</Bubble>}

        {typing && <Typing />}
        <div ref={endRef} />
      </div>

      {/* Input bar (visual) */}
      <div style={{ display: "flex", gap: 9, padding: "12px 14px", borderTop: `1px solid ${T.line}`,
        background: T.bg, position: "sticky", bottom: 0 }}>
        <div style={{ flex: 1, background: T.panel, border: `1px solid ${T.line}`, borderRadius: 22,
          padding: "11px 16px", color: T.sub, fontSize: 14 }}>Message Sous Chef…</div>
        <div style={{ width: 42, height: 42, borderRadius: 21, display: "grid", placeItems: "center",
          background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, fontSize: 17 }}>🎤</div>
      </div>
    </div>
  );
}
