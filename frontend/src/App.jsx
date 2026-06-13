import { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { useVoice } from "./hooks/useVoice";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Normalize the API base URL so a missing scheme or trailing slash in the
// VITE_API_URL env var can't break requests (e.g. "host.app" -> "https://host.app").
const API_URL = (() => {
  let base = import.meta.env.VITE_API_URL || "http://localhost:8000";
  base = base.trim().replace(/\/+$/, "");                 // drop trailing slash(es)
  if (base && !/^https?:\/\//i.test(base)) base = "https://" + base; // ensure scheme
  return base;
})();

// ── Sleek-health design tokens ───────────────────────────────────────────────
const T = {
  bg: "#0B0E14", panel: "#151A23", panel2: "#1C2230", line: "#262D3B",
  text: "#EAF0F7", sub: "#8A93A6",
  accent: "#4ADE80", accent2: "#38BDF8", accent3: "#FBBF24", danger: "#F87171",
};

const PLATFORMS = {
  licious:   { label: "Licious",   color: "#E8473F", emoji: "🥩", search: q => `https://www.licious.in/search?q=${encodeURIComponent(q)}` },
  instamart: { label: "Instamart", color: "#FC8019", emoji: "🛍️", search: q => `https://www.swiggy.com/instamart/search?query=${encodeURIComponent(q)}` },
  blinkit:   { label: "Blinkit",   color: "#8AC53E", emoji: "💛", search: q => `https://blinkit.com/s/?q=${encodeURIComponent(q)}` },
  mango:     { label: "Mango",     color: "#4CAF7D", emoji: "🏪", search: q => `https://www.google.com/search?q=mango+hypermarket+${encodeURIComponent(q)}` },
};

const TODAY = new Date();
const DATE_LABEL = TODAY.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
const DAY_OF_MONTH = TODAY.getDate();
const DAY_TYPES = { 0:"flex", 1:"chicken", 2:"fish", 3:"chicken", 4:"veg", 5:"fish", 6:"chicken" };
const DAY_LABELS = { chicken:"🥩 Chicken", fish:"🐟 Fish", veg:"🥦 Veg", flex:"🍽️ Flexible" };
const DAY_DOT = { chicken:"#F59E0B", fish:"#38BDF8", veg:"#4ADE80", flex:"#C084FC", khichdi:"#C084FC" };
const todayType = DAY_TYPES[TODAY.getDay()];

function fmt(n) { return "₹" + Number(n || 0).toLocaleString("en-IN"); }

const QUICK_ACTIONS = [
  { emoji: "🍳", label: "Plan today", msg: `Plan today's meals` },
  { emoji: "📅", label: "Plan week", msg: "Plan my week Mon to Sun" },
  { emoji: "🛒", label: "Shopping list", msg: "Show me the shopping list" },
  { emoji: "💰", label: "Budget", msg: "How are we doing on budget this month?" },
  { emoji: "📧", label: "Email list", msg: "Email the grocery list to me and Vivek" },
];

// ── Progress ring (SVG) ──────────────────────────────────────────────────────
function Ring({ value, target, label, sub, color, size = 88, display }) {
  const r = (size - 11) / 2, c = 2 * Math.PI * r, pct = Math.min((value || 0) / target, 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size/2} cy={size/2} r={r} stroke={T.line} strokeWidth="8" fill="none" />
          <motion.circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth="8" fill="none"
            strokeLinecap="round" strokeDasharray={c}
            initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c - c * pct }}
            transition={{ duration: 1, ease: "easeOut" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center",
          fontSize: 15, fontWeight: 700, color: T.text }}>{display}</div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 12, color: T.text, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 10, color: T.sub }}>{sub}</div>
      </div>
    </div>
  );
}

// ── Meal-plan card the agent renders inside chat (rings + day rows) ──────────
function MealPlanCard({ plan }) {
  const days = plan.days || [];
  const budget = Number(plan.weekly_budget || 9500);
  const total = Number(plan.weekly_total || 0);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      style={{ marginTop: 8, background: `linear-gradient(180deg, ${T.panel2}, ${T.panel})`, border: `1px solid ${T.line}`, borderRadius: 18, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-around", paddingBottom: 14, marginBottom: 12, borderBottom: `1px solid ${T.line}` }}>
        <Ring size={72} value={1} target={1} display={plan.kcal_target} label="Cals" sub="target/day" color={T.accent2} />
        <Ring size={72} value={1} target={1} display={`${plan.protein_target}g`} label="Protein" sub="target/day" color={T.accent} />
        <Ring size={72} value={total} target={budget} display={fmt(total)} label="Budget" sub={`of ${fmt(budget)}`} color={total > budget ? T.danger : T.accent3} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {days.map((d, i) => (
          <motion.div key={d.day + i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
            style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ width: 34, flexShrink: 0, fontSize: 11, fontWeight: 700, color: T.sub, paddingTop: 1 }}>{d.day.slice(0, 3)}</span>
            <span style={{ width: 7, height: 7, marginTop: 5, borderRadius: 7, flexShrink: 0, background: DAY_DOT[d.day_type] || T.sub, boxShadow: `0 0 8px ${DAY_DOT[d.day_type] || "transparent"}` }} />
            <span style={{ fontSize: 12.5, color: T.text, lineHeight: 1.4 }}>{d.meal}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([{
    role: "assistant",
    content: `Morning! 👋 I'm your Sous Chef.\n\nI know your meals, your macros, and your budget.\n${DAY_LABELS[todayType]} day today.\n\nWhat do you need?`,
    type: "text",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [shoppingList, setShoppingList] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [totalMonth, setTotalMonth] = useState(0);
  const [activeTab, setActiveTab] = useState("chat");
  const [checkedItems, setCheckedItems] = useState({});
  const [newExp, setNewExp] = useState({ platform: "instamart", amount: "", note: "" });
  const bottomRef = useRef();
  const inputRef = useRef();

  const { listening, supported, startListening, stopListening } = useVoice((transcript) => {
    setInput(transcript);
    setTimeout(() => sendMessage(transcript), 300);
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [expRes, shopRes] = await Promise.all([
        fetch(`${API_URL}/api/expenses/`),
        fetch(`${API_URL}/api/meals/shopping`),
      ]);
      const expData = await expRes.json();
      const shopData = await shopRes.json();
      // Guard against error payloads (e.g. Supabase returning an error object,
      // not a list) so the Spend tab can never crash to a black screen.
      setExpenses(Array.isArray(expData?.expenses) ? expData.expenses : []);
      setTotalMonth(Number(expData?.total) || 0);
      if (Array.isArray(shopData) && shopData.length) setShoppingList(shopData);
    } catch {}
  }

  async function sendMessage(text) {
    const msg = text || input;
    if (!msg.trim() || loading) return;
    setInput("");
    setLoading(true);

    const userMsg = { role: "user", content: msg, type: "text" };
    setMessages(prev => [...prev, userMsg, { role: "assistant", content: "", type: "typing" }]);

    try {
      // Only send messages with real string content. Card messages (meal plans)
      // have no text content, and a failed response can be empty — including either
      // would POST null content, which the backend rejects and breaks ALL later
      // requests. Filtering here keeps one bad turn from poisoning the conversation.
      const history = [...messages, userMsg]
        .filter(m => typeof m.content === "string" && m.content.trim())
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      const data = await res.json();
      setMessages(prev => prev.filter(m => m.type !== "typing"));

      if (data.shopping_list?.length) setShoppingList(data.shopping_list);

      if (data.meal_plan?.days?.length) {
        // Structured plan → render rich card + rings in chat (stay on chat tab).
        setMessages(prev => [...prev, {
          role: "assistant", type: "plan",
          mealPlan: data.meal_plan,
          shoppingList: data.shopping_list || [],
        }]);
      } else if (data.shopping_list?.length) {
        setMessages(prev => [...prev, {
          role: "assistant", type: "plan",
          content: data.response,
          shoppingList: data.shopping_list,
        }]);
        setActiveTab("shop");
      } else {
        setMessages(prev => [...prev, { role: "assistant", type: "text",
          content: data.response || "Hmm, that one didn't go through on my end. Mind trying again?" }]);
      }
      await loadData();
    } catch (e) {
      setMessages(prev => [...prev.filter(m => m.type !== "typing"), {
        role: "assistant", type: "text", content: "Something went wrong. Try again!",
      }]);
    }
    setLoading(false);
  }

  async function addExpense() {
    if (!newExp.amount) return;
    await fetch(`${API_URL}/api/expenses/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: newExp.platform, amount: parseInt(newExp.amount), note: newExp.note }),
    });
    setNewExp({ platform: "instamart", amount: "", note: "" });
    await loadData();
  }

  async function deleteExpense(id) {
    await fetch(`${API_URL}/api/expenses/${id}`, { method: "DELETE" });
    await loadData();
  }

  function renderText(text) {
    if (!text) return null;
    const lines = text.split("\n");
    const hasTable = lines.some(l => l.trim().startsWith("|") && l.includes("|"));
    if (hasTable) {
      const parts = [];
      let tableLines = [];
      let nonTableLines = [];
      for (const line of lines) {
        if (line.trim().startsWith("|")) {
          if (nonTableLines.length) {
            parts.push(<span key={parts.length} style={{whiteSpace:"pre-wrap"}}>{nonTableLines.join("\n")}</span>);
            nonTableLines = [];
          }
          tableLines.push(line);
        } else {
          if (tableLines.length) {
            parts.push(renderTable(tableLines, parts.length));
            tableLines = [];
          }
          nonTableLines.push(line);
        }
      }
      if (tableLines.length) parts.push(renderTable(tableLines, parts.length));
      if (nonTableLines.length) parts.push(<span key={parts.length} style={{whiteSpace:"pre-wrap"}}>{nonTableLines.join("\n")}</span>);
      return parts;
    }
    return (text || "").split(/(\*\*[^*]+\*\*)/).map((p, i) =>
      p.startsWith("**") ? <strong key={i} style={{ color: "#fff" }}>{p.slice(2, -2)}</strong> : p
    );
  }

  function renderTable(lines, key) {
    const rows = lines
      .filter(l => !l.match(/^\|[-| ]+\|$/))
      .map(l => l.split("|").filter((_, i, a) => i > 0 && i < a.length - 1).map(c => c.trim()));
    if (!rows.length) return null;
    const headers = rows[0];
    const body = rows.slice(1);
    return (
      <div key={key} style={{overflowX:"auto", margin:"8px 0"}}>
        <table style={{borderCollapse:"collapse", width:"100%", fontSize:12}}>
          <thead>
            <tr>{headers.map((h,i) => (
              <th key={i} style={{padding:"6px 10px", background:T.panel, color:T.accent, textAlign:"left", borderBottom:`1px solid ${T.line}`, whiteSpace:"nowrap"}}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {body.map((row, i) => (
              <tr key={i} style={{borderBottom:`1px solid ${T.line}`}}>
                {row.map((cell, j) => (
                  <td key={j} style={{padding:"5px 10px", color: cell.startsWith("~") || cell.includes("Total") ? T.accent3 : T.text, whiteSpace:"nowrap", fontFamily: j > 1 ? "monospace" : "inherit"}}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const projected = DAY_OF_MONTH > 0 ? Math.round((totalMonth / DAY_OF_MONTH) * 31) : 0;
  const budgetPct = Math.min((totalMonth / 38000) * 100, 100);
  const dot = DAY_DOT[todayType];

  const tabs = [
    { id: "chat", label: "Chat", emoji: "💬" },
    { id: "shop", label: "Shop", emoji: "🛒", badge: shoppingList.length || 0 },
    { id: "expenses", label: "Spend", emoji: "📊" },
  ];

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: T.bg, color: T.text, fontFamily: "'Inter',system-ui,sans-serif", maxWidth: 480, margin: "0 auto" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* ── Header — the agent, online ── */}
      <div style={{ padding: "16px 18px 12px", background: T.bg, borderBottom: `1px solid ${T.line}`, flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0,
              background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, display: "grid", placeItems: "center", fontSize: 19 }}>🍳</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: -0.3 }}>Sous Chef</h1>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: T.accent, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: 6, background: T.accent }} /> your health agent · online
              </p>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: T.panel2,
              border: `1px solid ${T.line}`, color: dot, fontSize: 10.5, padding: "3px 10px", borderRadius: 20, fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: 6, background: dot }} />{DAY_LABELS[todayType]}
            </span>
            <p style={{ margin: "6px 0 0", fontSize: 16, fontWeight: 700, fontFamily: "monospace", color: totalMonth > 38000 ? T.danger : T.text }}>{fmt(totalMonth)}</p>
            <p style={{ margin: "1px 0 0", fontSize: 9, color: T.sub, fontFamily: "monospace" }}>proj. {fmt(projected)}</p>
          </div>
        </div>
        <div style={{ marginTop: 10, background: T.panel, borderRadius: 3, height: 3, overflow: "hidden" }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${budgetPct}%` }} transition={{ duration: 0.8 }}
            style={{ height: "100%", background: budgetPct > 100 ? T.danger : budgetPct > 80 ? T.accent3 : T.accent, borderRadius: 3 }} />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", borderBottom: `1px solid ${T.line}`, flexShrink: 0 }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: "11px 4px", border: "none", background: "transparent",
            color: activeTab === tab.id ? T.text : T.sub,
            fontWeight: activeTab === tab.id ? 700 : 500,
            fontSize: 12.5, cursor: "pointer", fontFamily: "'Inter',sans-serif",
            borderBottom: `2px solid ${activeTab === tab.id ? T.accent : "transparent"}`,
            transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <span>{tab.emoji}</span>{tab.label}
            {tab.badge ? <span style={{ background: T.accent, color: "#06210F", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10 }}>{tab.badge}</span> : null}
          </button>
        ))}
      </div>

      {/* ── Chat Tab ── */}
      {activeTab === "chat" && (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 0" }}>
            {messages.map((msg, i) => {
              const isUser = msg.role === "user";
              if (msg.type === "typing") return (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, display: "grid", placeItems: "center", fontSize: 15, flexShrink: 0 }}>🍳</div>
                  <div style={{ background: T.panel2, borderRadius: "4px 16px 16px 16px", padding: "14px 18px", border: `1px solid ${T.line}` }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {[0,1,2].map(j => (
                        <motion.div key={j} animate={{ opacity: [0.3,1,0.3], y: [0,-3,0] }}
                          transition={{ duration: 1, repeat: Infinity, delay: j*0.18 }}
                          style={{ width: 6, height: 6, borderRadius: 6, background: T.sub }} />
                      ))}
                    </div>
                  </div>
                </div>
              );

              return (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                  style={{ display: "flex", gap: 10, marginBottom: 16, justifyContent: isUser ? "flex-end" : "flex-start", alignItems: "flex-end" }}>
                  {!isUser && <div style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, display: "grid", placeItems: "center", fontSize: 15, flexShrink: 0 }}>🍳</div>}
                  <div style={{ maxWidth: msg.mealPlan ? "92%" : "80%" }}>
                    {msg.mealPlan ? (
                      <>
                        <div style={{ background: T.panel2, border: `1px solid ${T.line}`, borderRadius: "4px 16px 16px 16px", padding: "11px 15px", fontSize: 13, color: T.text }}>
                          Here's your week 👇
                        </div>
                        <MealPlanCard plan={msg.mealPlan} />
                        {msg.mealPlan.nudge ? (
                          <div style={{ marginTop: 8, background: "rgba(245,158,11,.1)", border: `1px solid rgba(245,158,11,.3)`, borderRadius: 14, padding: "10px 14px", fontSize: 12.5, lineHeight: 1.5, color: T.text }}>
                            {msg.mealPlan.nudge}
                          </div>
                        ) : null}
                        {msg.shoppingList?.length > 0 && (
                          <button onClick={() => setActiveTab("shop")} style={{ marginTop: 8, padding: "8px 14px", background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, border: "none", borderRadius: 20, color: "#06210F", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                            🛒 View shopping list →
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <div style={{
                          background: isUser ? `linear-gradient(135deg, ${T.accent}, ${T.accent2})` : T.panel2,
                          border: `1px solid ${isUser ? "transparent" : T.line}`,
                          borderRadius: isUser ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                          padding: "12px 16px", fontSize: 13, lineHeight: 1.7,
                          whiteSpace: "pre-wrap", color: isUser ? "#06210F" : T.text,
                          fontWeight: isUser ? 600 : 400,
                        }}>
                          {renderText(msg.content)}
                        </div>
                        {msg.type === "plan" && msg.shoppingList?.length > 0 && (
                          <button onClick={() => setActiveTab("shop")} style={{ marginTop: 8, padding: "7px 14px", background: "rgba(251,191,36,.12)", border: `1px solid rgba(251,191,36,.4)`, borderRadius: 20, color: T.accent3, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                            View shopping list →
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  {isUser && <div style={{ width: 32, height: 32, borderRadius: 10, background: T.panel2, border: `1px solid ${T.line}`, display: "grid", placeItems: "center", fontSize: 13, flexShrink: 0, fontWeight: 700 }}>S</div>}
                </motion.div>
              );
            })}

            {messages.length <= 1 && (
              <div style={{ marginLeft: 42, marginBottom: 16 }}>
                <p style={{ margin: "0 0 10px", fontSize: 11, color: T.sub }}>Quick actions</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {QUICK_ACTIONS.map((a, i) => (
                    <motion.button key={i} whileTap={{ scale: 0.95 }} onClick={() => sendMessage(a.msg)} style={{ padding: "8px 14px", background: T.panel, border: `1px solid ${T.line}`, borderRadius: 20, color: T.text, fontSize: 12, cursor: "pointer", fontFamily: "'Inter',sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
                      <span>{a.emoji}</span> {a.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length > 2 && !loading && (
            <div style={{ padding: "8px 16px 0", display: "flex", gap: 6, overflowX: "auto", flexShrink: 0 }}>
              {QUICK_ACTIONS.slice(0, 4).map((a, i) => (
                <button key={i} onClick={() => sendMessage(a.msg)} style={{ flexShrink: 0, padding: "6px 12px", background: T.panel, border: `1px solid ${T.line}`, borderRadius: 16, color: T.sub, fontSize: 11, cursor: "pointer", fontFamily: "'Inter',sans-serif", marginBottom: 4 }}>
                  {a.emoji} {a.label}
                </button>
              ))}
            </div>
          )}

          <div style={{ padding: "10px 16px 24px", borderTop: `1px solid ${T.line}`, flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", background: T.panel, border: `1px solid ${listening ? T.danger : T.line}`, borderRadius: 24, padding: "6px 6px 6px 16px", transition: "border-color 0.2s" }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder={listening ? "Listening..." : "Message Sous Chef…"}
                style={{ flex: 1, background: "transparent", border: "none", color: listening ? T.danger : T.text, fontSize: 14, fontFamily: "'Inter',sans-serif", outline: "none" }}
              />
              {supported && (
                <button
                  onMouseDown={startListening}
                  onMouseUp={stopListening}
                  onTouchStart={startListening}
                  onTouchEnd={stopListening}
                  style={{
                    width: 38, height: 38, borderRadius: "50%", border: "none", cursor: "pointer",
                    background: listening ? T.danger : T.panel2,
                    display: "grid", placeItems: "center",
                    fontSize: 16, flexShrink: 0, transition: "all 0.2s",
                    boxShadow: listening ? `0 0 0 4px ${T.danger}33` : "none",
                  }}>
                  {listening ? "⏹" : "🎤"}
                </button>
              )}
              <button onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{ width: 38, height: 38, borderRadius: "50%", border: "none", cursor: loading || !input.trim() ? "default" : "pointer", background: loading || !input.trim() ? T.panel2 : `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, color: loading || !input.trim() ? T.sub : "#06210F", fontSize: 18, display: "grid", placeItems: "center", flexShrink: 0, transition: "all 0.2s" }}>
                {loading ? "⟳" : "↑"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Shopping Tab ── */}
      {activeTab === "shop" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {shoppingList.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <p style={{ fontSize: 48 }}>🛒</p>
              <p style={{ color: T.sub, fontSize: 14 }}>No shopping list yet.</p>
              <button onClick={() => { setActiveTab("chat"); sendMessage("Plan my week"); }} style={{ marginTop: 12, padding: "11px 20px", background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, border: "none", borderRadius: 12, color: "#06210F", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                Plan my week →
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <p style={{ margin: 0, fontSize: 13, color: T.sub }}>{shoppingList.filter(i => !checkedItems[i.item]).length} items remaining</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.accent3, fontFamily: "monospace" }}>
                  {fmt(shoppingList.reduce((a, b) => a + Number(b.estimatedPrice || b.estimated_price || 0), 0))}
                </p>
              </div>
              {Object.entries(PLATFORMS).map(([pid, pconf]) => {
                const items = shoppingList.filter(i => (i.platform || "").toLowerCase() === pid);
                if (!items.length) return null;
                return (
                  <div key={pid} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "7px 12px", background: pconf.color + "18", borderRadius: 10 }}>
                      <span style={{ fontSize: 16 }}>{pconf.emoji}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: pconf.color, letterSpacing: 0.5 }}>{pconf.label}</span>
                      <span style={{ marginLeft: "auto", fontSize: 12, color: pconf.color, fontFamily: "monospace" }}>
                        {fmt(items.reduce((a, b) => a + Number(b.estimatedPrice || b.estimated_price || 0), 0))}
                      </span>
                    </div>
                    {items.map((item, j) => {
                      const checked = !!checkedItems[item.item];
                      const price = Number(item.estimatedPrice || item.estimated_price || 0);
                      return (
                        <div key={j} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", marginBottom: 6, background: checked ? T.panel : T.panel2, border: `1px solid ${T.line}`, borderRadius: 12, transition: "all 0.2s" }}>
                          <button onClick={() => setCheckedItems(c => ({ ...c, [item.item]: !c[item.item] }))} style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, background: checked ? pconf.color : "transparent", border: `2px solid ${checked ? pconf.color : T.line}`, cursor: "pointer", display: "grid", placeItems: "center" }}>
                            {checked && <span style={{ fontSize: 12, color: "#000" }}>✓</span>}
                          </button>
                          <div style={{ flex: 1, opacity: checked ? 0.4 : 1 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, textDecoration: checked ? "line-through" : "none" }}>{item.item}</p>
                            <p style={{ margin: "2px 0 0", fontSize: 11, color: T.sub }}>{item.qty}</p>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: pconf.color, fontFamily: "monospace", flexShrink: 0 }}>{price > 0 ? fmt(price) : ""}</span>
                          <a href={pconf.search(item.item)} target="_blank" rel="noreferrer" style={{ padding: "5px 10px", background: pconf.color + "22", borderRadius: 9, color: pconf.color, fontSize: 11, textDecoration: "none", fontWeight: 600, flexShrink: 0 }}>Order →</a>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              <button onClick={() => { setActiveTab("chat"); sendMessage("Email the grocery list to me and Vivek"); }} style={{ width: "100%", padding: 14, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, border: "none", borderRadius: 12, color: "#06210F", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Inter',sans-serif", marginTop: 8 }}>
                📧 Email to Vivek
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Expenses Tab ── */}
      {activeTab === "expenses" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          <div style={{ background: `radial-gradient(120% 100% at 50% 0%, ${T.panel2}, ${T.panel})`, border: `1px solid ${T.line}`, borderRadius: 20, padding: "20px 16px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-around" }}>
            <Ring value={totalMonth} target={38000} label="This month" sub={`of ₹38,000`} color={budgetPct > 100 ? T.danger : budgetPct > 80 ? T.accent3 : T.accent} display={`${Math.round(budgetPct)}%`} />
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 800, fontFamily: "monospace", color: totalMonth > 38000 ? T.danger : T.text }}>{fmt(totalMonth)}</p>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: T.sub }}>spent · projected {fmt(projected)}</p>
              <p style={{ margin: "10px 0 0", fontSize: 10, color: T.sub, fontFamily: "monospace" }}>Day {DAY_OF_MONTH}/31</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto" }}>
            {Object.entries(PLATFORMS).map(([pid, pconf]) => {
              const amt = expenses.filter(e => e.platform === pid).reduce((a, b) => a + b.amount, 0);
              if (!amt) return null;
              return (
                <div key={pid} style={{ flexShrink: 0, background: pconf.color + "15", border: `1px solid ${pconf.color}33`, borderRadius: 14, padding: "10px 14px", minWidth: 82 }}>
                  <p style={{ margin: 0, fontSize: 18 }}>{pconf.emoji}</p>
                  <p style={{ margin: "4px 0 2px", fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: pconf.color }}>{fmt(amt)}</p>
                  <p style={{ margin: 0, fontSize: 10, color: T.sub }}>{pconf.label}</p>
                </div>
              );
            })}
          </div>

          <div style={{ background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 600, color: T.text }}>Log expense</p>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              {Object.entries(PLATFORMS).map(([pid, pconf]) => (
                <button key={pid} onClick={() => setNewExp(e => ({ ...e, platform: pid }))} style={{ padding: "6px 12px", borderRadius: 20, border: `1px solid ${newExp.platform === pid ? pconf.color : T.line}`, cursor: "pointer", background: newExp.platform === pid ? pconf.color + "22" : "transparent", color: newExp.platform === pid ? pconf.color : T.sub, fontSize: 12, fontWeight: 600, fontFamily: "'Inter',sans-serif" }}>
                  {pconf.emoji} {pconf.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="number" placeholder="₹ Amount" value={newExp.amount} onChange={e => setNewExp(x => ({ ...x, amount: e.target.value }))} style={{ flex: 1, background: T.bg, border: `1px solid ${T.line}`, borderRadius: 10, padding: "10px 12px", color: T.text, fontSize: 13, fontFamily: "monospace", outline: "none" }} />
              <input placeholder="Note" value={newExp.note} onChange={e => setNewExp(x => ({ ...x, note: e.target.value }))} onKeyDown={e => e.key === "Enter" && addExpense()} style={{ flex: 1, background: T.bg, border: `1px solid ${T.line}`, borderRadius: 10, padding: "10px 12px", color: T.text, fontSize: 13, fontFamily: "'Inter',sans-serif", outline: "none" }} />
              <button onClick={addExpense} style={{ padding: "10px 16px", background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, border: "none", borderRadius: 10, color: "#06210F", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>+</button>
            </div>
          </div>

          {expenses.slice(0, 15).map(exp => {
            const p = PLATFORMS[exp.platform] || PLATFORMS.instamart;
            return (
              <div key={exp.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", marginBottom: 8, background: T.panel, border: `1px solid ${T.line}`, borderRadius: 12 }}>
                <span style={{ fontSize: 20 }}>{p.emoji}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{exp.note || p.label}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: T.sub, fontFamily: "monospace" }}>
                    {new Date(exp.expense_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {p.label}
                  </p>
                </div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, fontFamily: "monospace", color: p.color }}>{fmt(exp.amount)}</p>
                <button onClick={() => deleteExpense(exp.id)} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", fontSize: 16, padding: 4 }}>✕</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
