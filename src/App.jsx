import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { App as CapApp } from '@capacitor/app';

// ─────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────

const COLORS = {
  bg:           "#0a0a0a",
  surface:      "#141414",
  surfaceHigh:  "#1e1e1e",
  border:       "#2a2a2a",
  borderLight:  "#1e1e1e",
  text:         "#ffffff",
  textSub:      "#cccccc",
  textMuted:    "#888888",
  textDim:      "#555555",
  accent:       "#FF4D1C",
  accentAmber:  "#E8A020",
  accentGreen:  "#4CAF50",
  accentBlue:   "#2196F3",
  accentPurple: "#9C27B0",
  accentCyan:   "#00BCD4",
  accentPink:   "#FF6B9D",
  accentOrange: "#FF9800",
  warning:      "#FF8C72",
};

const TYPOGRAPHY = {
  mono:  "'Space Mono', monospace",
  serif: "'Crimson Pro', serif",
};

const SPACING = {
  xs:   "4px",
  sm:   "8px",
  md:   "12px",
  lg:   "16px",
  xl:   "20px",
  xxl:  "24px",
  xxxl: "32px",
};

const NAV_HEIGHT = 68;

// ─────────────────────────────────────────────
// DEFAULT GOALS
// ─────────────────────────────────────────────

const DEFAULT_GOALS = {
  kcal:      2400,
  protein:   140,
  fat:       65,
  carbs:     360,
  steps:     10000,
  cardio:    30,
  sleep:     8,
  chinTucks: 3,
};

// ─────────────────────────────────────────────
// HABITS CONFIG
// ─────────────────────────────────────────────

const buildHabits = (goals) => [
  { id: "cardio",      label: "Кардио",          emoji: "🏃", color: COLORS.accent,       type: "number",  unit: "мин",    goal: goals.cardio    },
  { id: "steps",       label: "Шаги",             emoji: "👟", color: COLORS.accentAmber,  type: "number",  unit: "шагов",  goal: goals.steps     },
  { id: "sleep",       label: "Сон",              emoji: "😴", color: COLORS.accentPurple, type: "number",  unit: "ч",      goal: goals.sleep     },
  { id: "calories",    label: "Калории",          emoji: "🔥", color: COLORS.accent,       type: "auto",    unit: "кк",     goal: goals.kcal,     autoSource: "kcal"    },
  { id: "protein",     label: "Белок",            emoji: "🥩", color: COLORS.accentAmber,  type: "auto",    unit: "г",      goal: goals.protein,  autoSource: "protein" },
  { id: "shower",      label: "Контрастный душ",  emoji: "🚿", color: COLORS.accentCyan,   type: "boolean", goal: 1        },
  { id: "supplements", label: "Добавки",          emoji: "💊", color: COLORS.accentGreen,  type: "boolean", goal: 1        },
  { id: "chinTucks",   label: "Chin Tucks",       emoji: "💆", color: COLORS.accentBlue,   type: "number",  unit: "подх",   goal: goals.chinTucks },
  { id: "mewing",      label: "Мьюинг",           emoji: "👤", color: COLORS.accentPink,   type: "boolean", goal: 1        },
];

const buildDefaultDayData = () => ({
  cardio:      0,
  steps:       0,
  sleep:       0,
  calories:    0,
  protein:     0,
  shower:      false,
  supplements: false,
  chinTucks:   0,
  mewing:      false,
});

// ─────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function dateKeyFor(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
}

function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function migrateOldChecklist(dateKey, goals) {
  const oldKey = `checklist:${dateKey}`;
  const newKey = `daydata:${dateKey}`;
  try { if (localStorage.getItem(newKey) !== null) return; } catch { return; }
  const old = lsGet(oldKey, null);
  if (!old) return;
  const habits = buildHabits(goals);
  const migrated = buildDefaultDayData();
  habits.forEach(h => {
    const wasTrue = old[h.id] === true;
    if (h.type === "boolean") migrated[h.id] = wasTrue;
    else if (h.type === "number") migrated[h.id] = wasTrue ? h.goal : 0;
  });
  lsSet(newKey, migrated);
}

// ─────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────

function useGoals() {
  const [goals, setGoalsState] = useState(() => {
    const saved = lsGet("goals:v1", {});
    return { ...DEFAULT_GOALS, ...saved };
  });

  const updateGoals = useCallback((patch) => {
    setGoalsState(prev => {
      const next = { ...prev, ...patch };
      lsSet("goals:v1", next);
      return next;
    });
  }, []);

  return { goals, updateGoals };
}

function useDayData(dateKey, nutritionTotals, goals) {
  const storageKey = `daydata:${dateKey}`;

  useEffect(() => {
    migrateOldChecklist(dateKey, goals);
  }, [dateKey]);

  const [data, setData] = useState(() => {
    const saved = lsGet(storageKey, {});
    return { ...buildDefaultDayData(), ...saved };
  });

  useEffect(() => {
    lsSet(storageKey, data);
  }, [data, storageKey]);

  const merged = useMemo(() => ({
    ...data,
    calories: nutritionTotals.kcal,
    protein:  nutritionTotals.protein,
  }), [data, nutritionTotals]);

  const setValue = useCallback((id, value) => {
    setData(prev => ({ ...prev, [id]: value }));
  }, []);

  const toggleBoolean = useCallback((id) => {
    setData(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const getHabitPercent = useCallback((habit) => {
    const actual = merged[habit.id];
    if (habit.type === "boolean") return actual ? 100 : 0;
    if (!habit.goal || habit.goal === 0) return 0;
    return Math.min(100, Math.round((actual / habit.goal) * 100));
  }, [merged]);

  const habits = buildHabits(goals);
  const dayPercent = Math.round(
    habits.reduce((sum, h) => sum + getHabitPercent(h), 0) / habits.length
  );

  return { data: merged, setValue, toggleBoolean, getHabitPercent, dayPercent };
}

function useStreak(goals) {
  const [streak, setStreak] = useState(() =>
    lsGet("meta:streak", { current: 0, best: 0, startDate: todayKey() })
  );

  useEffect(() => {
    let current = 0;
    const today = todayKey();
    const cursor = new Date(today + "T12:00:00");
    const habits = buildHabits(goals);

    while (current < 365) {
      const key   = cursor.toISOString().slice(0, 10);
      const saved = lsGet(`daydata:${key}`, null);
      if (saved) {
        let totalPct = 0;
        habits.forEach(h => {
          const actual = saved[h.id] ?? (h.type === "boolean" ? false : 0);
          if (h.type === "boolean") totalPct += actual ? 100 : 0;
          else if (h.id !== "calories") totalPct += Math.min(100, (actual / (h.goal || 1)) * 100);
          else {
            const ratio = actual / (h.goal || 1);
            totalPct += ratio <= 1 ? 100 : Math.max(0, 100 - (ratio - 1) * 200);
          }
        });
        if ((totalPct / habits.length) >= 60) {
          current++;
          cursor.setDate(cursor.getDate() - 1);
          continue;
        }
      }
      break;
    }

    const best      = Math.max(current, streak.best);
    const startDate = lsGet("meta:startDate", today);
    const updated   = { current, best, startDate };
    setStreak(updated);
    lsSet("meta:streak", updated);
    if (!lsGet("meta:startDate", null)) lsSet("meta:startDate", today);
  }, []);

  const totalDays = useMemo(() => {
    const start = new Date(streak.startDate + "T12:00:00");
    return Math.max(1, Math.round((Date.now() - start) / 86400000) + 1);
  }, [streak.startDate]);

  return { ...streak, totalDays };
}

function useNutrition(dateKey) {
  const storageKey = `nutrition:${dateKey}`;
  const [entries, setEntries] = useState(() => lsGet(storageKey, []));

  useEffect(() => { lsSet(storageKey, entries); }, [entries, storageKey]);

  const addFood = useCallback((food) => {
    setEntries(prev => [...prev, {
      id:      Date.now().toString(),
      name:    food.name    || "Продукт",
      kcal:    Number(food.kcal)    || 0,
      protein: Number(food.protein) || 0,
      fat:     Number(food.fat)     || 0,
      carbs:   Number(food.carbs)   || 0,
    }]);
  }, []);

  const removeFood = useCallback((id) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const totals = useMemo(() => entries.reduce(
    (acc, e) => ({
      kcal:    acc.kcal    + e.kcal,
      protein: acc.protein + e.protein,
      fat:     acc.fat     + e.fat,
      carbs:   acc.carbs   + e.carbs,
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 }
  ), [entries]);

  return { entries, addFood, removeFood, totals };
}

function useWeight() {
  const [history, setHistory] = useState(() => lsGet("weight:history", []));

  useEffect(() => { lsSet("weight:history", history); }, [history]);

  const addWeight = useCallback((kg) => {
    const date = todayKey();
    setHistory(prev => {
      const filtered = prev.filter(e => e.date !== date);
      return [...filtered, { date, kg: Number(kg) }].sort((a, b) => a.date.localeCompare(b.date));
    });
  }, []);

  const current  = history.length > 0 ? history[history.length - 1].kg : null;
  const starting = history.length > 0 ? history[0].kg : null;
  const change   = current !== null && starting !== null ? +(current - starting).toFixed(1) : null;

  return { history, addWeight, current, starting, change };
}

// ─────────────────────────────────────────────
// SUPPLEMENTS CONFIG
// ─────────────────────────────────────────────

const SUPPLEMENTS_CONFIG = [
  { id: "magnesium", label: "Магний бисглицинат", dose: "300–400 мг",    timing: "Вечер",        reason: "Сон, снижение кортизола",     emoji: "🧲", color: COLORS.accentPurple },
  { id: "vitaminD3", label: "Витамин D3",          dose: "2000–4000 МЕ", timing: "Зимой · Утро", reason: "Тестостерон, иммунитет",      emoji: "☀️", color: COLORS.accentAmber  },
  { id: "zinc",      label: "Цинк",                dose: "15–25 мг",     timing: "С едой",       reason: "Тестостерон, иммунитет",      emoji: "⚡", color: COLORS.accentBlue   },
  { id: "omega3",    label: "Омега-3",             dose: "1–2 г EPA+DHA",timing: "С едой",       reason: "Липолиз, снижение воспаления", emoji: "🐟", color: COLORS.accentCyan   },
  { id: "vitaminC",  label: "Витамин C",           dose: "500 мг",       timing: "Утро",         reason: "Снижение кортизола",           emoji: "🍊", color: COLORS.accentOrange },
  { id: "creatine",  label: "Креатин",             dose: "3–5 г",        timing: "Любое время",  reason: "Сила и мышцы при дефиците",   emoji: "💪", color: COLORS.accentGreen  },
];

const DEFAULT_SUPPLEMENTS = Object.fromEntries(
  SUPPLEMENTS_CONFIG.map(s => [s.id, false])
);

function useSupplements(dateKey) {
  const storageKey = `supplements:${dateKey}`;
  const [taken, setTaken] = useState(() => ({
    ...DEFAULT_SUPPLEMENTS,
    ...lsGet(storageKey, {}),
  }));

  useEffect(() => { lsSet(storageKey, taken); }, [taken, storageKey]);

  const toggle = useCallback((id) => {
    setTaken(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const takenCount = Object.values(taken).filter(Boolean).length;
  const totalCount = SUPPLEMENTS_CONFIG.length;

  return { taken, toggle, takenCount, totalCount };
}

// ─────────────────────────────────────────────
// WEEKLY STATS UTILITIES
// ─────────────────────────────────────────────

function computeWeeklyStats(goals) {
  const habits  = buildHabits(goals);
  const days    = Array.from({ length: 7 }, (_, i) => dateKeyFor(i));
  const results = { cardio: [], steps: [], sleep: [], protein: [], calories: [], completionPct: [] };

  days.forEach(dateKey => {
    const dayData   = lsGet(`daydata:${dateKey}`, null);
    const nutData   = lsGet(`nutrition:${dateKey}`, []);
    const nutTotals = nutData.reduce(
      (a, e) => ({ kcal: a.kcal + e.kcal, protein: a.protein + e.protein }),
      { kcal: 0, protein: 0 }
    );

    if (dayData) {
      results.cardio.push(dayData.cardio    || 0);
      results.steps.push(dayData.steps      || 0);
      results.sleep.push(dayData.sleep      || 0);
      results.protein.push(nutTotals.protein);
      results.calories.push(nutTotals.kcal);

      let totalPct = 0;
      habits.forEach(h => {
        const actual = h.type === "auto"
          ? (h.autoSource === "kcal" ? nutTotals.kcal : nutTotals.protein)
          : (dayData[h.id] ?? (h.type === "boolean" ? false : 0));
        if (h.type === "boolean") totalPct += actual ? 100 : 0;
        else totalPct += Math.min(100, (actual / (h.goal || 1)) * 100);
      });
      results.completionPct.push(Math.round(totalPct / habits.length));
    }
  });

  const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  return {
    avgCardio:     avg(results.cardio),
    avgSteps:      avg(results.steps),
    avgSleep:      +(results.sleep.length
                     ? (results.sleep.reduce((a, b) => a + b, 0) / results.sleep.length).toFixed(1)
                     : 0),
    avgProtein:    avg(results.protein),
    avgCalories:   avg(results.calories),
    avgCompletion: avg(results.completionPct),
    daysTracked:   results.completionPct.length,
  };
}

// ─────────────────────────────────────────────
// SHARED UI COMPONENTS
// ─────────────────────────────────────────────

function Card({ children, style = {}, onClick }) {
  return (
    <div style={{
      background: COLORS.surface,
      borderRadius: "16px",
      border: `1px solid ${COLORS.border}`,
      padding: SPACING.xl,
      ...style,
    }} onClick={onClick}>
      {children}
    </div>
  );
}

function Label({ children, color = COLORS.accent, style = {} }) {
  return (
    <div style={{
      fontFamily: TYPOGRAPHY.mono,
      fontSize: "10px",
      letterSpacing: "3px",
      fontWeight: 700,
      color,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// GOALS MODAL
// ─────────────────────────────────────────────

function GoalsModal({ goals, onSave, onClose }) {
  const [form, setForm] = useState({
    kcal:      String(goals.kcal),
    protein:   String(goals.protein),
    steps:     String(goals.steps),
    cardio:    String(goals.cardio),
    sleep:     String(goals.sleep),
    chinTucks: String(goals.chinTucks),
  });

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSave = () => {
    onSave({
      kcal:      Number(form.kcal)      || DEFAULT_GOALS.kcal,
      protein:   Number(form.protein)   || DEFAULT_GOALS.protein,
      steps:     Number(form.steps)     || DEFAULT_GOALS.steps,
      cardio:    Number(form.cardio)    || DEFAULT_GOALS.cardio,
      sleep:     Number(form.sleep)     || DEFAULT_GOALS.sleep,
      chinTucks: Number(form.chinTucks) || DEFAULT_GOALS.chinTucks,
      fat:       goals.fat,
      carbs:     goals.carbs,
    });
    onClose();
  };

  const inputStyle = {
    width: "100%", background: COLORS.surfaceHigh,
    border: `1px solid ${COLORS.border}`, borderRadius: "10px",
    padding: "11px 14px", fontFamily: TYPOGRAPHY.mono,
    fontSize: "15px", color: COLORS.text, outline: "none", boxSizing: "border-box",
  };

  const fields = [
    { key: "kcal",      label: "Калории",    unit: "кк/день"  },
    { key: "protein",   label: "Белок",      unit: "г/день"   },
    { key: "steps",     label: "Шаги",       unit: "шагов"    },
    { key: "cardio",    label: "Кардио",     unit: "мин"      },
    { key: "sleep",     label: "Сон",        unit: "часов"    },
    { key: "chinTucks", label: "Chin Tucks", unit: "подходов" },
  ];

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "flex-end" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: "100%", background: COLORS.surface, borderRadius: "20px 20px 0 0",
        padding: "24px 20px 40px", border: `1px solid ${COLORS.border}`,
        maxHeight: "88vh", overflowY: "auto",
      }}>
        <div style={{ width: "40px", height: "4px", background: COLORS.border, borderRadius: "2px", margin: "0 auto 20px" }} />
        <Label style={{ marginBottom: SPACING.xl }}>МОИ ЦЕЛИ</Label>
        {fields.map(f => (
          <div key={f.key} style={{ marginBottom: SPACING.md }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.xs }}>
              <span style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "15px", color: COLORS.textMuted }}>{f.label}</span>
              <span style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "10px", color: COLORS.textDim }}>{f.unit}</span>
            </div>
            <input type="number" value={form[f.key]} onChange={set(f.key)} style={inputStyle} />
          </div>
        ))}
        <div style={{ display: "flex", gap: SPACING.md, marginTop: SPACING.xl }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "14px", background: "transparent",
            border: `1px solid ${COLORS.border}`, borderRadius: "12px",
            fontFamily: TYPOGRAPHY.mono, fontSize: "12px", color: COLORS.textMuted, cursor: "pointer",
          }}>ОТМЕНА</button>
          <button onClick={handleSave} style={{
            flex: 2, padding: "14px", background: COLORS.accent, border: "none",
            borderRadius: "12px", fontFamily: TYPOGRAPHY.mono, fontSize: "12px",
            fontWeight: 700, color: COLORS.text, cursor: "pointer",
          }}>СОХРАНИТЬ</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TODAY SCREEN COMPONENTS
// ─────────────────────────────────────────────

function ProgressRing({ percent, size = 116 }) {
  const r      = (size - 12) / 2;
  const circ   = 2 * Math.PI * r;
  const filled = (percent / 100) * circ;
  const color  = percent === 100 ? COLORS.accentGreen : percent >= 60 ? COLORS.accentAmber : COLORS.accent;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={COLORS.border} strokeWidth={8} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={8} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ - filled}
          style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "20px", fontWeight: 700, color }}>{percent}%</span>
        <span style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "11px", color: COLORS.textMuted }}>дня</span>
      </div>
    </div>
  );
}

function WeightWidget({ current, change, onAddWeight }) {
  const [editing, setEditing] = useState(false);
  const [input,   setInput]   = useState("");

  const handleSave = () => {
    if (input && !isNaN(Number(input))) {
      onAddWeight(Number(input));
      setInput("");
      setEditing(false);
    }
  };

  return (
    <Card style={{ marginBottom: SPACING.md }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Label color={COLORS.textDim} style={{ marginBottom: SPACING.xs }}>ВЕС</Label>
          {current !== null ? (
            <>
              <div style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "26px", fontWeight: 700, color: COLORS.text }}>
                {current} <span style={{ fontSize: "13px", color: COLORS.textMuted }}>кг</span>
              </div>
              {change !== null && (
                <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "14px", color: change < 0 ? COLORS.accentGreen : change > 0 ? COLORS.warning : COLORS.textMuted, marginTop: "2px" }}>
                  {change < 0 ? "" : change > 0 ? "+" : ""}{change} кг от старта
                </div>
              )}
            </>
          ) : (
            <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "15px", color: COLORS.textDim }}>Не записан</div>
          )}
        </div>
        {!editing ? (
          <button onClick={() => setEditing(true)} style={{
            background: `${COLORS.accent}18`, border: `1px solid ${COLORS.accent}40`,
            borderRadius: "10px", padding: "8px 14px", cursor: "pointer",
            fontFamily: TYPOGRAPHY.mono, fontSize: "11px", fontWeight: 700,
            color: COLORS.accent, letterSpacing: "1px",
          }}>+ ЗАПИСАТЬ</button>
        ) : (
          <div style={{ display: "flex", gap: SPACING.sm, alignItems: "center" }}>
            <input type="number" step="0.1" placeholder="кг" value={input} onChange={e => setInput(e.target.value)} autoFocus
              style={{ width: "72px", background: COLORS.surfaceHigh, border: `1px solid ${COLORS.accent}`, borderRadius: "10px", padding: "8px 10px", fontFamily: TYPOGRAPHY.mono, fontSize: "15px", color: COLORS.text, outline: "none" }} />
            <button onClick={handleSave} style={{ background: COLORS.accent, border: "none", borderRadius: "10px", padding: "8px 12px", fontFamily: TYPOGRAPHY.mono, fontSize: "11px", fontWeight: 700, color: COLORS.text, cursor: "pointer" }}>OK</button>
            <button onClick={() => setEditing(false)} style={{ background: "transparent", border: "none", color: COLORS.textDim, fontSize: "20px", cursor: "pointer" }}>×</button>
          </div>
        )}
      </div>
    </Card>
  );
}

function MiniBar({ percent, color }) {
  return (
    <div style={{ height: "3px", background: COLORS.border, borderRadius: "2px", marginTop: "6px" }}>
      <div style={{ height: "100%", width: `${percent}%`, background: color, borderRadius: "2px", transition: "width 0.35s ease" }} />
    </div>
  );
}

function HabitRow({ habit, actual, percent, onToggle, onSetValue }) {
  const [inputOpen, setInputOpen] = useState(false);
  const [inputVal,  setInputVal]  = useState("");

  const isAuto = habit.type === "auto";
  const isBool = habit.type === "boolean";
  const isDone = isBool ? !!actual : percent >= 100;

  const handleRowTap = () => {
    if (isAuto) return;
    if (isBool) { onToggle(habit.id); return; }
    setInputOpen(v => !v);
  };

  const handleConfirm = () => {
    const num = Number(inputVal);
    if (!isNaN(num) && inputVal !== "") onSetValue(habit.id, num);
    setInputVal("");
    setInputOpen(false);
  };

  return (
    <div style={{ borderBottom: `1px solid ${COLORS.borderLight}`, paddingBottom: "10px", marginBottom: "10px" }}>
      <div onClick={handleRowTap} style={{ display: "flex", alignItems: "center", gap: SPACING.md, cursor: isAuto ? "default" : "pointer", userSelect: "none" }}>
        <div style={{ width: "26px", height: "26px", borderRadius: "50%", flexShrink: 0, border: `2px solid ${isDone ? habit.color : COLORS.border}`, background: isDone ? habit.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease" }}>
          {isDone && (
            <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
              <path d="M1 5L5 9L12 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <span style={{ fontSize: "19px", flexShrink: 0 }}>{habit.emoji}</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "16px", color: isDone ? COLORS.textMuted : COLORS.textSub, textDecoration: isDone && isBool ? "line-through" : "none" }}>
            {habit.label}
          </span>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {isBool ? (
            <span style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "13px", color: isDone ? habit.color : COLORS.textDim }}>
              {isDone ? "выполнено" : "не выполнено"}
            </span>
          ) : (
            <div>
              <span style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "13px", fontWeight: 700, color: isDone ? habit.color : COLORS.textSub }}>{actual}</span>
              <span style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "10px", color: COLORS.textDim }}>/{habit.goal} {habit.unit}</span>
            </div>
          )}
        </div>
      </div>
      {!isBool && <MiniBar percent={percent} color={habit.color} />}
      {inputOpen && !isAuto && (
        <div style={{ display: "flex", gap: SPACING.sm, alignItems: "center", marginTop: SPACING.sm, paddingLeft: "38px" }}>
          <input type="number" step="any" placeholder={`Факт (${habit.unit})`} value={inputVal} onChange={e => setInputVal(e.target.value)} autoFocus
            style={{ flex: 1, background: COLORS.surfaceHigh, border: `1px solid ${habit.color}80`, borderRadius: "8px", padding: "8px 12px", fontFamily: TYPOGRAPHY.mono, fontSize: "14px", color: COLORS.text, outline: "none" }} />
          <button onClick={handleConfirm} style={{ background: habit.color, border: "none", borderRadius: "8px", padding: "8px 14px", fontFamily: TYPOGRAPHY.mono, fontSize: "11px", fontWeight: 700, color: COLORS.text, cursor: "pointer" }}>OK</button>
          <button onClick={() => setInputOpen(false)} style={{ background: "transparent", border: "none", color: COLORS.textDim, fontSize: "20px", cursor: "pointer" }}>×</button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// TODAY SCREEN
// ─────────────────────────────────────────────

function TodayScreen({ goals, onOpenGoals, nutritionTotals, onNavigate }) {
  const date = todayKey();
  const { data, setValue, toggleBoolean, getHabitPercent, dayPercent } = useDayData(date, nutritionTotals, goals);
  const { current: streakCurrent, best: streakBest } = useStreak(goals);
  const { current: weightCurrent, change: weightChange, addWeight } = useWeight();
  const { takenCount, totalCount } = useSupplements(date);
  const habits = buildHabits(goals);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: SPACING.xxl }}>
        <div>
          <Label style={{ marginBottom: SPACING.sm }}>СЕГОДНЯ</Label>
          <h1 style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "26px", fontWeight: 600, color: COLORS.text, lineHeight: 1.2, textTransform: "capitalize" }}>
            {formatDate(date)}
          </h1>
        </div>
        <button onClick={onOpenGoals} style={{ background: COLORS.surfaceHigh, border: `1px solid ${COLORS.border}`, borderRadius: "10px", padding: "8px 12px", cursor: "pointer", fontFamily: TYPOGRAPHY.mono, fontSize: "10px", color: COLORS.textDim, letterSpacing: "1px", marginTop: "4px" }}>
          ЦЕЛИ ⚙
        </button>
      </div>

      <Card style={{ marginBottom: SPACING.md }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <Label color={COLORS.textDim} style={{ marginBottom: SPACING.sm }}>ПРОГРЕСС ДНЯ</Label>
            <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "15px", color: COLORS.textMuted, marginBottom: SPACING.lg }}>выполнение целей</div>
            <div style={{ display: "flex", gap: SPACING.md }}>
              <div style={{ background: `${COLORS.accent}18`, border: `1px solid ${COLORS.accent}40`, borderRadius: "10px", padding: "7px 12px", textAlign: "center" }}>
                <div style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "16px", fontWeight: 700, color: COLORS.accent }}>{streakCurrent}</div>
                <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "11px", color: COLORS.textMuted }}>серия</div>
              </div>
              <div style={{ background: COLORS.surfaceHigh, border: `1px solid ${COLORS.border}`, borderRadius: "10px", padding: "7px 12px", textAlign: "center" }}>
                <div style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "16px", fontWeight: 700, color: COLORS.textMuted }}>{streakBest}</div>
                <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "11px", color: COLORS.textDim }}>рекорд</div>
              </div>
            </div>
          </div>
          <ProgressRing percent={dayPercent} />
        </div>
      </Card>

      <WeightWidget current={weightCurrent} change={weightChange} onAddWeight={addWeight} />

      <Card>
        <Label color={COLORS.textDim} style={{ marginBottom: SPACING.md }}>ЦЕЛИ НА ДЕНЬ</Label>
        {habits.map(habit => (
          <HabitRow
            key={habit.id}
            habit={habit}
            actual={data[habit.id] ?? (habit.type === "boolean" ? false : 0)}
            percent={getHabitPercent(habit)}
            onToggle={toggleBoolean}
            onSetValue={setValue}
          />
        ))}
      </Card>

      <Card style={{ marginTop: SPACING.md, cursor: "pointer" }} onClick={() => onNavigate && onNavigate("supplements")}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <Label color={COLORS.textDim} style={{ marginBottom: SPACING.sm }}>ДОБАВКИ СЕГОДНЯ</Label>
            <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "15px", color: COLORS.textMuted }}>{takenCount} из {totalCount} приняты</div>
          </div>
          <div style={{ width: "52px", height: "52px", borderRadius: "50%", border: `3px solid ${takenCount === totalCount ? COLORS.accentGreen : COLORS.accentCyan}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "15px", fontWeight: 700, color: takenCount === totalCount ? COLORS.accentGreen : COLORS.accentCyan }}>{takenCount}/{totalCount}</span>
          </div>
        </div>
        <div style={{ height: "3px", background: COLORS.border, borderRadius: "2px", marginTop: SPACING.md }}>
          <div style={{ height: "100%", width: `${Math.round((takenCount / totalCount) * 100)}%`, background: takenCount === totalCount ? COLORS.accentGreen : COLORS.accentCyan, borderRadius: "2px", transition: "width 0.4s ease" }} />
        </div>
      </Card>

      {dayPercent >= 90 && (
        <Card style={{ marginTop: SPACING.md, borderColor: `${COLORS.accentGreen}50`, textAlign: "center" }}>
          <div style={{ fontSize: "28px", marginBottom: SPACING.sm }}>{dayPercent === 100 ? "🎯" : "💪"}</div>
          <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "19px", color: COLORS.accentGreen, fontWeight: 600 }}>{dayPercent === 100 ? "День выполнен!" : "Отличный день!"}</div>
          <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "14px", color: COLORS.textMuted, marginTop: SPACING.xs }}>
            {dayPercent === 100 ? "Серия продолжается. Так держать." : `${dayPercent}% — финишируй сильно.`}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// FAVORITES
// ─────────────────────────────────────────────

const DEFAULT_FAVORITES = [
  { id: "fav_chicken",   name: "Куриная грудка",  kcal: 165, protein: 31,  fat: 3.6, carbs: 0   },
  { id: "fav_egg",       name: "Яйцо варёное",     kcal: 77,  protein: 6,   fat: 5,   carbs: 0.6 },
  { id: "fav_buckwheat", name: "Гречка варёная",   kcal: 132, protein: 5,   fat: 1.5, carbs: 25  },
  { id: "fav_rice",      name: "Рис варёный",      kcal: 130, protein: 2.7, fat: 0.3, carbs: 28  },
  { id: "fav_oats",      name: "Овсянка на воде",  kcal: 88,  protein: 3,   fat: 1.5, carbs: 15  },
  { id: "fav_potato",    name: "Картошка варёная", kcal: 80,  protein: 2,   fat: 0.1, carbs: 17  },
  { id: "fav_pasta",     name: "Макароны варёные", kcal: 158, protein: 5.5, fat: 0.9, carbs: 31  },
  { id: "fav_cottage",   name: "Творог 5%",        kcal: 121, protein: 17,  fat: 5,   carbs: 3   },
];

function useFavorites() {
  const [favorites, setFavorites] = useState(() => {
    const saved = lsGet("favorites:products", null);
    if (saved === null) { lsSet("favorites:products", DEFAULT_FAVORITES); return DEFAULT_FAVORITES; }
    return saved;
  });

  const addFavorite = useCallback((food) => {
    const entry = { id: "fav_" + Date.now(), name: food.name || "Продукт", kcal: Number(food.kcal) || 0, protein: Number(food.protein) || 0, fat: Number(food.fat) || 0, carbs: Number(food.carbs) || 0 };
    setFavorites(prev => {
      const next = [...prev, entry].sort((a, b) => a.name.localeCompare(b.name, "ru"));
      lsSet("favorites:products", next);
      return next;
    });
  }, []);

  const removeFavorite = useCallback((id) => {
    setFavorites(prev => {
      const next = prev.filter(f => f.id !== id);
      lsSet("favorites:products", next);
      return next;
    });
  }, []);

  return { favorites, addFavorite, removeFavorite };
}

// ─────────────────────────────────────────────
// NUTRITION SCREEN
// ─────────────────────────────────────────────

function MacroBar({ value, goal, color }) {
  const pct = Math.min(100, Math.round((value / goal) * 100));
  return (
    <div style={{ height: "4px", background: COLORS.border, borderRadius: "2px", marginTop: SPACING.sm }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "2px", transition: "width 0.4s ease" }} />
    </div>
  );
}

function MacroTile({ label, value, goal, unit, color }) {
  return (
    <div style={{ background: COLORS.surfaceHigh, borderRadius: "12px", padding: "12px", border: `1px solid ${COLORS.border}`, flex: 1 }}>
      <Label color={color} style={{ fontSize: "9px", letterSpacing: "2px", marginBottom: "6px" }}>{label}</Label>
      <div style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "17px", fontWeight: 700, color: COLORS.text }}>
        {Math.round(value)}<span style={{ fontSize: "10px", color: COLORS.textMuted, marginLeft: "2px" }}>{unit}</span>
      </div>
      <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "11px", color: COLORS.textDim }}>из {goal}{unit}</div>
      <MacroBar value={value} goal={goal} color={color} />
    </div>
  );
}

function AddFoodModal({ onAdd, onClose }) {
  const [form,  setForm]  = useState({ name: "", kcal: "", protein: "", fat: "", carbs: "" });
  const [error, setError] = useState("");
  const set = field => e => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleAdd = () => {
    if (!form.name.trim()) { setError("Введи название"); return; }
    if (!form.kcal)        { setError("Введи калории");  return; }
    onAdd(form); onClose();
  };

  const inputStyle = { width: "100%", background: COLORS.surfaceHigh, border: `1px solid ${COLORS.border}`, borderRadius: "10px", padding: "12px 14px", fontFamily: TYPOGRAPHY.serif, fontSize: "16px", color: COLORS.text, outline: "none", boxSizing: "border-box", marginBottom: SPACING.md };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "flex-end" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "100%", background: COLORS.surface, borderRadius: "20px 20px 0 0", padding: "24px 20px 40px", border: `1px solid ${COLORS.border}`, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ width: "40px", height: "4px", background: COLORS.border, borderRadius: "2px", margin: "0 auto 20px" }} />
        <Label style={{ marginBottom: SPACING.lg }}>ДОБАВИТЬ ПРОДУКТ</Label>
        <input type="text" placeholder="Название" value={form.name} onChange={set("name")} style={inputStyle} />
        <div style={{ display: "flex", gap: SPACING.sm, marginBottom: SPACING.md }}>
          {[["kcal","Ккал"],["protein","Белок г"]].map(([f,p]) => (
            <input key={f} type="number" placeholder={p} value={form[f]} onChange={set(f)} style={{ ...inputStyle, flex: 1, marginBottom: 0 }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: SPACING.sm, marginBottom: SPACING.md }}>
          {[["fat","Жиры г"],["carbs","Углеводы г"]].map(([f,p]) => (
            <input key={f} type="number" placeholder={p} value={form[f]} onChange={set(f)} style={{ ...inputStyle, flex: 1, marginBottom: 0 }} />
          ))}
        </div>
        {error && <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "14px", color: COLORS.warning, marginBottom: SPACING.md }}>{error}</div>}
        <div style={{ display: "flex", gap: SPACING.md }}>
          <button onClick={onClose} style={{ flex: 1, padding: "14px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: "12px", fontFamily: TYPOGRAPHY.mono, fontSize: "12px", color: COLORS.textMuted, cursor: "pointer" }}>ОТМЕНА</button>
          <button onClick={handleAdd} style={{ flex: 2, padding: "14px", background: COLORS.accent, border: "none", borderRadius: "12px", fontFamily: TYPOGRAPHY.mono, fontSize: "12px", fontWeight: 700, color: COLORS.text, cursor: "pointer" }}>ДОБАВИТЬ</button>
        </div>
      </div>
    </div>
  );
}

function AddFavoriteModal({ onAdd, onClose }) {
  const [form,  setForm]  = useState({ name: "", kcal: "", protein: "", fat: "", carbs: "" });
  const [error, setError] = useState("");
  const set = field => e => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleAdd = () => {
    if (!form.name.trim()) { setError("Введи название"); return; }
    if (!form.kcal)        { setError("Введи калории");  return; }
    onAdd(form); onClose();
  };

  const inputStyle = { width: "100%", background: COLORS.surfaceHigh, border: `1px solid ${COLORS.border}`, borderRadius: "10px", padding: "12px 14px", fontFamily: TYPOGRAPHY.serif, fontSize: "16px", color: COLORS.text, outline: "none", boxSizing: "border-box", marginBottom: SPACING.md };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "flex-end" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "100%", background: COLORS.surface, borderRadius: "20px 20px 0 0", padding: "24px 20px 40px", border: `1px solid ${COLORS.border}`, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ width: "40px", height: "4px", background: COLORS.border, borderRadius: "2px", margin: "0 auto 20px" }} />
        <Label style={{ marginBottom: SPACING.xs }}>ДОБАВИТЬ В ИЗБРАННОЕ</Label>
        <p style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "14px", color: COLORS.textDim, marginBottom: SPACING.lg }}>Сохранится навсегда — потом одним нажатием</p>
        <input type="text" placeholder="Название продукта" value={form.name} onChange={set("name")} style={inputStyle} />
        <div style={{ display: "flex", gap: SPACING.sm, marginBottom: SPACING.md }}>
          {[["kcal","Ккал"],["protein","Белок г"]].map(([f,p]) => (
            <input key={f} type="number" placeholder={p} value={form[f]} onChange={set(f)} style={{ ...inputStyle, flex: 1, marginBottom: 0 }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: SPACING.sm, marginBottom: SPACING.md }}>
          {[["fat","Жиры г"],["carbs","Углеводы г"]].map(([f,p]) => (
            <input key={f} type="number" placeholder={p} value={form[f]} onChange={set(f)} style={{ ...inputStyle, flex: 1, marginBottom: 0 }} />
          ))}
        </div>
        {error && <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "14px", color: COLORS.warning, marginBottom: SPACING.md }}>{error}</div>}
        <div style={{ display: "flex", gap: SPACING.md }}>
          <button onClick={onClose} style={{ flex: 1, padding: "14px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: "12px", fontFamily: TYPOGRAPHY.mono, fontSize: "12px", color: COLORS.textMuted, cursor: "pointer" }}>ОТМЕНА</button>
          <button onClick={handleAdd} style={{ flex: 2, padding: "14px", background: COLORS.accentGreen, border: "none", borderRadius: "12px", fontFamily: TYPOGRAPHY.mono, fontSize: "12px", fontWeight: 700, color: COLORS.text, cursor: "pointer" }}>СОХРАНИТЬ</button>
        </div>
      </div>
    </div>
  );
}

function FavoritesBlock({ favorites, onAddToDay, onRemoveFavorite, onAddFavorite }) {
  const [query,       setQuery]       = useState("");
  const [showAddFav,  setShowAddFav]  = useState(false);
  const [longPressId, setLongPressId] = useState(null);
  const pressTimer = useRef(null);

  const filtered = favorites
    .filter(f => f.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));

  const handlePressStart = (id) => { pressTimer.current = setTimeout(() => setLongPressId(id), 500); };
  const handlePressEnd   = ()    => { clearTimeout(pressTimer.current); };

  return (
    <Card style={{ marginBottom: SPACING.md }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.md }}>
        <Label color={COLORS.textDim}>ИЗБРАННЫЕ ПРОДУКТЫ</Label>
        <span style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "10px", color: COLORS.textDim }}>{favorites.length} продуктов</span>
      </div>
      <div style={{ position: "relative", marginBottom: SPACING.md }}>
        <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: COLORS.textDim, pointerEvents: "none" }}>🔍</span>
        <input type="text" placeholder="Поиск..." value={query} onChange={e => setQuery(e.target.value)}
          style={{ width: "100%", background: COLORS.surfaceHigh, border: `1px solid ${COLORS.border}`, borderRadius: "10px", padding: "10px 14px 10px 36px", fontFamily: TYPOGRAPHY.serif, fontSize: "15px", color: COLORS.text, outline: "none", boxSizing: "border-box" }} />
        {query.length > 0 && (
          <button onClick={() => setQuery("")} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: COLORS.textDim, fontSize: "18px", cursor: "pointer", lineHeight: 1 }}>×</button>
        )}
      </div>
      {filtered.length === 0 ? (
        <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "15px", color: COLORS.textDim, textAlign: "center", padding: "16px 0" }}>{query ? "Не найдено" : "Список пуст"}</div>
      ) : (
        filtered.map(fav => {
          const isLP = longPressId === fav.id;
          return (
            <div key={fav.id}
              onMouseDown={() => handlePressStart(fav.id)} onMouseUp={handlePressEnd} onMouseLeave={handlePressEnd}
              onTouchStart={() => handlePressStart(fav.id)} onTouchEnd={handlePressEnd}
              style={{ display: "flex", alignItems: "center", gap: SPACING.md, padding: "10px 0", borderBottom: `1px solid ${COLORS.borderLight}`, background: isLP ? `${COLORS.accent}10` : "transparent", borderRadius: isLP ? "8px" : "0", transition: "background 0.2s" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "15px", color: COLORS.textSub }}>{fav.name}</div>
                <div style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "10px", color: COLORS.textDim, marginTop: "2px" }}>Б:{fav.protein}г · Ж:{fav.fat}г · У:{fav.carbs}г</div>
              </div>
              <span style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "12px", color: COLORS.textMuted, flexShrink: 0 }}>{fav.kcal}кк</span>
              {isLP ? (
                <button onClick={() => { onRemoveFavorite(fav.id); setLongPressId(null); }} style={{ background: COLORS.warning, border: "none", borderRadius: "8px", padding: "6px 10px", fontFamily: TYPOGRAPHY.mono, fontSize: "10px", fontWeight: 700, color: COLORS.text, cursor: "pointer", flexShrink: 0 }}>УДАЛИТЬ</button>
              ) : (
                <button onClick={() => { onAddToDay(fav); setLongPressId(null); }} style={{ background: `${COLORS.accentGreen}20`, border: `1px solid ${COLORS.accentGreen}50`, borderRadius: "8px", padding: "6px 12px", fontFamily: TYPOGRAPHY.mono, fontSize: "13px", fontWeight: 700, color: COLORS.accentGreen, cursor: "pointer", flexShrink: 0 }}>+</button>
              )}
            </div>
          );
        })
      )}
      <button onClick={() => setShowAddFav(true)} style={{ width: "100%", marginTop: SPACING.md, padding: "12px", background: "transparent", border: `1px dashed ${COLORS.border}`, borderRadius: "10px", fontFamily: TYPOGRAPHY.mono, fontSize: "11px", letterSpacing: "1px", color: COLORS.textDim, cursor: "pointer" }}>
        + В ИЗБРАННОЕ
      </button>
      {showAddFav && <AddFavoriteModal onAdd={(food) => { onAddFavorite(food); setShowAddFav(false); }} onClose={() => setShowAddFav(false)} />}
    </Card>
  );
}

function NutritionScreen({ goals, entries, addFood, removeFood, totals }) {
  const [showModal, setShowModal] = useState(false);
  const { favorites, addFavorite, removeFavorite } = useFavorites();
  const date = todayKey();

  const macros = [
    { label: "КАЛОРИИ",  value: totals.kcal,    goal: goals.kcal,    unit: "кк", color: COLORS.accent       },
    { label: "БЕЛОК",    value: totals.protein,  goal: goals.protein, unit: "г",  color: COLORS.accentAmber  },
    { label: "ЖИРЫ",     value: totals.fat,      goal: goals.fat,     unit: "г",  color: COLORS.accentGreen  },
    { label: "УГЛЕВОДЫ", value: totals.carbs,    goal: goals.carbs,   unit: "г",  color: COLORS.accentBlue   },
  ];

  const remaining = goals.kcal - Math.round(totals.kcal);
  const overGoal  = remaining < 0;

  return (
    <div>
      <div style={{ marginBottom: SPACING.xxl }}>
        <Label style={{ marginBottom: SPACING.sm }}>ПИТАНИЕ</Label>
        <h1 style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "28px", fontWeight: 600, color: COLORS.text, lineHeight: 1.2 }}>{formatDate(date)}</h1>
      </div>
      <div style={{ display: "flex", gap: SPACING.sm, marginBottom: SPACING.sm }}>{macros.slice(0,2).map(m => <MacroTile key={m.label} {...m} />)}</div>
      <div style={{ display: "flex", gap: SPACING.sm, marginBottom: SPACING.md }}>{macros.slice(2).map(m => <MacroTile key={m.label} {...m} />)}</div>
      <Card style={{ marginBottom: SPACING.md }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Label color={COLORS.textDim} style={{ marginBottom: SPACING.xs }}>{overGoal ? "ПРЕВЫШЕНИЕ" : "ОСТАТОК"}</Label>
            <div style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "28px", fontWeight: 700, color: overGoal ? COLORS.warning : COLORS.accentGreen }}>{Math.abs(remaining)} кк</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "13px", color: COLORS.textDim }}>цель {goals.kcal} кк</div>
            <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "13px", color: COLORS.textMuted, marginTop: "2px" }}>съедено {Math.round(totals.kcal)} кк</div>
          </div>
        </div>
      </Card>
      <Card style={{ marginBottom: SPACING.md }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.md }}>
          <Label color={COLORS.textDim}>ПРОДУКТЫ СЕГОДНЯ</Label>
          <span style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "10px", color: COLORS.textDim }}>{entries.length} позиций</span>
        </div>
        {entries.length === 0 ? (
          <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "16px", color: COLORS.textDim, textAlign: "center", padding: "20px 0" }}>Пока ничего не добавлено</div>
        ) : (
          entries.map(entry => (
            <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: SPACING.md, padding: "11px 0", borderBottom: `1px solid ${COLORS.borderLight}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "16px", color: COLORS.textSub }}>{entry.name}</div>
                <div style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "10px", color: COLORS.textDim, marginTop: "3px", letterSpacing: "1px" }}>Б:{entry.protein}г · Ж:{entry.fat}г · У:{entry.carbs}г</div>
              </div>
              <div style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "14px", fontWeight: 700, color: COLORS.accent }}>{entry.kcal} кк</div>
              <button onClick={() => removeFood(entry.id)} style={{ background: "transparent", border: "none", color: COLORS.textDim, fontSize: "20px", cursor: "pointer", padding: "0 0 0 6px" }}>×</button>
            </div>
          ))
        )}
      </Card>
      <FavoritesBlock favorites={favorites} onAddToDay={addFood} onRemoveFavorite={removeFavorite} onAddFavorite={addFavorite} />
      <button onClick={() => setShowModal(true)} style={{ width: "100%", padding: "16px", background: COLORS.accent, border: "none", borderRadius: "14px", fontFamily: TYPOGRAPHY.mono, fontSize: "13px", fontWeight: 700, letterSpacing: "2px", color: COLORS.text, cursor: "pointer", marginBottom: SPACING.xxxl }}>
        + ДОБАВИТЬ ПРОДУКТ
      </button>
      {showModal && <AddFoodModal onAdd={addFood} onClose={() => setShowModal(false)} />}
    </div>
  );
}

// ─────────────────────────────────────────────
// PLAN SCREEN
// ─────────────────────────────────────────────

const PLAN_SECTIONS = [
  { id:"calories",    emoji:"🔥", title:"КАЛОРИИ",          subtitle:"Основа всего",                     color:"#FF4D1C",
    content:[
      {type:"intro",   text:"Тебе 17 лет, 180см, 65-66кг. Твой TDEE примерно 2700-2900 ккал. Дефицит нужен небольшой — агрессивный срежет мышцы и обрушит тестостерон."},
      {type:"table",   rows:[["TDEE (твой расход)","~2800 ккал","При 3 силовых + ходьба 10к шагов"],["Цель (дефицит)","2300–2400 ккал","Дефицит ~400-500 ккал — безопасно"],["Минимум калорий","2200 ккал","Ниже — потеря мышц и падение тестостерона"],["Скорость похудения","~0.3–0.5 кг/нед","Оптимально для сохранения мышц"]]},
      {type:"warning", text:"⚠️ Ты ел 3000 ккал раньше — это был небольшой профицит. Не режь сразу до 2200, иди до 2400 постепенно за 1-2 недели."},
      {type:"tip",     title:"Рефид раз в 10-14 дней", text:"1 день ешь на уровне TDEE (2800 ккал). Это поднимает лептин, снижает кортизол и ускоряет метаболизм."},
    ]},
  { id:"protein",     emoji:"🥩", title:"БЕЛОК",            subtitle:"Защита мышц при дефиците",         color:"#E8A020",
    content:[
      {type:"intro",   text:"При дефиците калорий организм может начать разрушать мышцы. Белок это предотвращает."},
      {type:"table",   rows:[["Цель","130–150г белка/день","2г/кг — минимум при дефиците"],["Курица (грудка, 100г)","~31г белка","Твой основной источник ✓"],["Яйца (1 шт)","~6г белка","2-3 яйца утром — хорошо ✓"],["Протеин (если нужно)","25-30г за раз","Если не добираешь из еды"]]},
      {type:"tip",     title:"Распредели по приёмам", text:"Оптимально 30-40г за приём, 4 раза в день."},
      {type:"warning", text:"⚠️ Жареное мясо — не проблема само по себе. Проблема в масле. Большое количество масла — это +200-400 ккал которые ты не учитываешь."},
    ]},
  { id:"carbs",       emoji:"🌾", title:"УГЛЕВОДЫ И ЖИРЫ",  subtitle:"Распределение оставшихся калорий", color:"#4CAF50",
    content:[
      {type:"intro",   text:"У тебя 2400 ккал. Минус белок (150г × 4 = 600 ккал). Остаётся 1800 ккал на жиры и углеводы."},
      {type:"table",   rows:[["Жиры","60-70г/день","240-280 ккал — важны для тестостерона"],["Углеводы","~350-370г/день","Оставшиеся калории"],["Гречка (сухая 100г)","~313 ккал, 62г углеводов","Лучший выбор ✓"],["Рис (сухой 100г)","~344 ккал, 75г углеводов","Хорошо ✓"]]},
      {type:"warning", text:"⚠️ Жиры нельзя резать ниже 50г/день — это обрушит тестостерон у молодого парня."},
      {type:"tip",     title:"Соль — ключевой момент для лица", text:"1г соли задерживает ~100мл воды. Если ешь солёную еду вечером — утром лицо опухшее."},
    ]},
  { id:"training",    emoji:"💪", title:"ТРЕНИРОВКИ",        subtitle:"Силовые + кардио",                 color:"#2196F3",
    content:[
      {type:"intro",   text:"Твоя задача: сохранить мышцы на дефиците через силовые, и создать дополнительный расход через кардио."},
      {type:"table",   rows:[["Силовые","3 раза/нед","Оставить программу как есть ✓"],["Беговая дорожка","25-30 мин, пульс 130-150","4-5 раз/нед — лучшее кардио для лица"],["Финишёр","Отжимания/пресс/приседы","3-4 подхода × 20+ повт ✓"],["Шаги","10 000/день","Уже делаешь — не бросай ✓"]]},
      {type:"tip",     title:"Когда делать кардио", text:"Лучшее время — утром до еды или сразу после силовой тренировки."},
      {type:"warning", text:"⚠️ Не делай кардио 7 дней в неделю. 4-5 раз — максимум."},
    ]},
  { id:"sleep",       emoji:"😴", title:"СОН И КОРТИЗОЛ",   subtitle:"Самый недооценённый фактор",       color:"#9C27B0",
    content:[
      {type:"intro",   text:"Недосып на 1-2 часа поднимает кортизол на 20-30%. Кортизол задерживает воду в тканях лица и блокирует липолиз."},
      {type:"table",   rows:[["Цель по сну","8-9 часов","На каникулах — отличная возможность ✓"],["Ложиться","До 23:00","Каждый час до полуночи стоит 2 часов после"],["Телефон","За 30-40 мин до сна убрать","Синий свет тормозит мелатонин"],["Магний бисглицинат","300-400мг за 1 час до сна","Уже принимаешь — идеально ✓"]]},
      {type:"tip",     title:"Контрастный душ утром", text:"30-60 сек тёплый → 30-60 сек холодный → повторить 2-3 раза."},
      {type:"warning", text:"⚠️ Спи на спине или на боку — лицо не в подушку."},
    ]},
  { id:"supplements", emoji:"💊", title:"ДОБАВКИ",           subtitle:"Что реально работает",             color:"#00BCD4",
    content:[
      {type:"intro",   text:"У тебя уже есть магний бисглицинат — это отличный выбор."},
      {type:"table",   rows:[["Магний бисглицинат","300-400мг перед сном","Уже есть ✓"],["Витамин D3","2000-4000 МЕ утром","Критично — дефицит = рост кортизола"],["Цинк","15-25мг с едой","Поддерживает тестостерон"],["Омега-3","1-2г EPA+DHA/день","Снижает воспаление"],["Креатин","3-5г/день","Сила, мышцы, не вредит похудению"],["Витамин C","500мг утром","Снижает кортизол"]]},
      {type:"tip",     title:"Приоритет покупки", text:"Сначала Витамин D3, потом Омега-3, потом Цинк. Магний уже есть."},
    ]},
  { id:"face",        emoji:"👤", title:"ЛИЦО",              subtitle:"Отёки vs жир",                     color:"#FF6B9D",
    content:[
      {type:"intro",   text:"На твоём фото — примерно 50/50 отёки и жир. Отёки уйдут за 2-4 недели. Жир — за 2-4 месяца."},
      {type:"table",   rows:[["Отёки","2-4 недели","Диета + сон + меньше соли"],["Жир лица","2-4 месяца","Дефицит калорий, нельзя ускорить"],["Жвачка Falim","Каждый день, 20-30 мин","Жевательные мышцы — видимый эффект за 3 мес"],["Мьюинг","Постоянно","Правильное положение языка — долгосрочно"]]},
      {type:"tip",     title:"Как отслеживать прогресс", text:"Весы — раз в неделю, утром натощак. Фото — раз в 2 недели."},
      {type:"warning", text:"⚠️ Плато после 4-6 недель — нормально. Либо добавь 1000 шагов, либо убери 100-150 ккал."},
    ]},
];

const PLAN_PRIORITIES = [
  { num:1, text:"Дефицит 2300-2400 ккал/день",      tag:"ГЛАВНОЕ",       color:"#FF4D1C" },
  { num:2, text:"Сон 8-9 часов — начать с каникул", tag:"КРИТИЧНО",      color:"#FF4D1C" },
  { num:3, text:"Кардио 4-5 раз/нед по 25-30 мин",  tag:"ВЫСОКИЙ",       color:"#E8A020" },
  { num:4, text:"Снизить соль в еде",                tag:"ВЫСОКИЙ",       color:"#E8A020" },
  { num:5, text:"Витамин D3 + Цинк + Омега-3",       tag:"СРЕДНИЙ",       color:"#4CAF50" },
  { num:6, text:"Контрастный душ утром",             tag:"СРЕДНИЙ",       color:"#4CAF50" },
  { num:7, text:"Мьюинг + Chin Tucks ежедневно",     tag:"ДОПОЛНИТЕЛЬНО", color:"#2196F3" },
  { num:8, text:"Жвачка Falim",                       tag:"ДОПОЛНИТЕЛЬНО", color:"#2196F3" },
];

function PlanSection({ section, isOpen, onToggle }) {
  return (
    <div style={{ marginBottom:"12px", borderRadius:"16px", overflow:"hidden", border:`1px solid ${isOpen ? section.color : COLORS.border}`, transition:"border-color 0.3s ease", background:COLORS.surface }}>
      <button onClick={onToggle} style={{ width:"100%", display:"flex", alignItems:"center", gap:"14px", padding:"18px 20px", background:"transparent", border:"none", cursor:"pointer", textAlign:"left" }}>
        <span style={{ fontSize:"28px" }}>{section.emoji}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:TYPOGRAPHY.mono, fontSize:"13px", letterSpacing:"3px", color:section.color, fontWeight:700 }}>{section.title}</div>
          <div style={{ fontFamily:TYPOGRAPHY.serif, fontSize:"16px", color:COLORS.textMuted, marginTop:"2px" }}>{section.subtitle}</div>
        </div>
        <div style={{ width:"28px", height:"28px", borderRadius:"50%", border:`2px solid ${section.color}`, display:"flex", alignItems:"center", justifyContent:"center", color:section.color, fontSize:"16px", fontWeight:700, flexShrink:0, transition:"transform 0.3s ease", transform:isOpen?"rotate(45deg)":"rotate(0deg)" }}>+</div>
      </button>
      {isOpen && (
        <div style={{ padding:"0 20px 20px" }}>
          <div style={{ height:"1px", background:`${section.color}33`, marginBottom:"16px" }} />
          {section.content.map((block,i) => {
            if (block.type==="intro")   return <p key={i} style={{ fontFamily:TYPOGRAPHY.serif, fontSize:"17px", lineHeight:"1.7", color:COLORS.textSub, marginBottom:"16px" }}>{block.text}</p>;
            if (block.type==="table")   return (
              <div key={i} style={{ marginBottom:"16px", overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}><tbody>
                  {block.rows.map((row,ri) => (
                    <tr key={ri} style={{ borderBottom:"1px solid #222" }}>
                      <td style={{ padding:"10px 16px 10px 0", fontFamily:TYPOGRAPHY.mono, fontSize:"12px", color:section.color, fontWeight:700, whiteSpace:"nowrap" }}>{row[0]}</td>
                      <td style={{ padding:"10px 12px", fontFamily:TYPOGRAPHY.mono, fontSize:"12px", color:COLORS.text, fontWeight:700 }}>{row[1]}</td>
                      <td style={{ padding:"10px 0 10px 12px", fontFamily:TYPOGRAPHY.serif, fontSize:"15px", color:COLORS.textMuted }}>{row[2]}</td>
                    </tr>
                  ))}
                </tbody></table>
              </div>
            );
            if (block.type==="tip")     return (
              <div key={i} style={{ background:`${section.color}15`, border:`1px solid ${section.color}40`, borderRadius:"12px", padding:"14px 16px", marginBottom:"12px" }}>
                <div style={{ fontFamily:TYPOGRAPHY.mono, fontSize:"11px", color:section.color, fontWeight:700, letterSpacing:"2px", marginBottom:"6px" }}>💡 {block.title}</div>
                <div style={{ fontFamily:TYPOGRAPHY.serif, fontSize:"16px", color:COLORS.textSub, lineHeight:"1.6" }}>{block.text}</div>
              </div>
            );
            if (block.type==="warning") return (
              <div key={i} style={{ background:"#FF4D1C15", border:"1px solid #FF4D1C40", borderRadius:"12px", padding:"14px 16px", marginBottom:"12px" }}>
                <div style={{ fontFamily:TYPOGRAPHY.serif, fontSize:"15px", color:COLORS.warning, lineHeight:"1.6" }}>{block.text}</div>
              </div>
            );
            return null;
          })}
        </div>
      )}
    </div>
  );
}

function PlanScreen() {
  const [openSection, setOpenSection] = useState(null);
  return (
    <div>
      <div style={{ marginBottom:"32px", paddingTop:"8px" }}>
        <div style={{ fontFamily:TYPOGRAPHY.mono, fontSize:"10px", letterSpacing:"4px", color:COLORS.accent, marginBottom:"8px", fontWeight:700 }}>ПЕРСОНАЛЬНЫЙ ПЛАН</div>
        <h1 style={{ fontFamily:TYPOGRAPHY.serif, fontSize:"36px", fontWeight:600, color:COLORS.text, lineHeight:"1.1", marginBottom:"8px" }}>
          Жиросжигание<br /><em style={{ color:COLORS.textMuted, fontWeight:400 }}>и рельеф лица</em>
        </h1>
        <div style={{ fontFamily:TYPOGRAPHY.mono, fontSize:"11px", color:COLORS.textDim, letterSpacing:"1px" }}>17 лет • 180см • 65-66кг • цель ~10% жира</div>
      </div>
      <div style={{ background:COLORS.surface, borderRadius:"16px", padding:"20px", marginBottom:"24px", border:`1px solid ${COLORS.border}` }}>
        <div style={{ fontFamily:TYPOGRAPHY.mono, fontSize:"11px", letterSpacing:"3px", color:COLORS.accent, fontWeight:700, marginBottom:"16px" }}>ПРИОРИТЕТЫ ПО ПОРЯДКУ</div>
        {PLAN_PRIORITIES.map(item => (
          <div key={item.num} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"10px 0", borderBottom:`1px solid ${COLORS.borderLight}` }}>
            <div style={{ width:"28px", height:"28px", borderRadius:"50%", background:`${item.color}20`, border:`1px solid ${item.color}50`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:TYPOGRAPHY.mono, fontSize:"12px", color:item.color, fontWeight:700, flexShrink:0 }}>{item.num}</div>
            <div style={{ fontFamily:TYPOGRAPHY.serif, fontSize:"16px", color:"#ddd", flex:1 }}>{item.text}</div>
            <div style={{ fontFamily:TYPOGRAPHY.mono, fontSize:"9px", letterSpacing:"1px", color:item.color, fontWeight:700, flexShrink:0 }}>{item.tag}</div>
          </div>
        ))}
      </div>
      <div style={{ fontFamily:TYPOGRAPHY.mono, fontSize:"11px", letterSpacing:"3px", color:COLORS.textDim, fontWeight:700, marginBottom:"12px" }}>ДЕТАЛЬНЫЙ РАЗБОР — НАЖМИ НА РАЗДЕЛ</div>
      {PLAN_SECTIONS.map(s => (
        <PlanSection key={s.id} section={s} isOpen={openSection===s.id} onToggle={() => setOpenSection(openSection===s.id ? null : s.id)} />
      ))}
      <div style={{ marginTop:"32px", padding:"20px", background:COLORS.surface, borderRadius:"16px", border:`1px solid ${COLORS.border}`, textAlign:"center" }}>
        <div style={{ fontFamily:TYPOGRAPHY.serif, fontSize:"18px", color:COLORS.textMuted, lineHeight:"1.7" }}>
          Отёки уйдут за <span style={{ color:COLORS.accent, fontWeight:600 }}>2-4 недели</span>.<br />
          Лицо как на цели — через <span style={{ color:COLORS.accent, fontWeight:600 }}>3-5 месяцев</span>.<br />
          <span style={{ fontSize:"15px", color:COLORS.textDim }}>При строгом соблюдении.</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PROGRESS SCREEN COMPONENTS
// ─────────────────────────────────────────────

function StatCard({ label, value, unit, color = COLORS.accent, sub = null }) {
  return (
    <div style={{ flex: 1, background: COLORS.surface, borderRadius: "16px", border: `1px solid ${COLORS.border}`, padding: "16px 12px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
      <div style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "9px", letterSpacing: "2px", color: COLORS.textDim, fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "26px", fontWeight: 700, color, lineHeight: 1.1 }}>{value ?? "—"}</div>
      {unit && <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "12px", color: COLORS.textMuted }}>{unit}</div>}
      {sub  && <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "12px", color: COLORS.textDim, marginTop: "2px" }}>{sub}</div>}
    </div>
  );
}

function WeightChart({ history }) {
  if (history.length < 2) {
    return (
      <div style={{ height: "140px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: TYPOGRAPHY.serif, fontSize: "15px", color: COLORS.textDim }}>
        Нужно минимум 2 записи для графика
      </div>
    );
  }
  const data  = history.slice(-30);
  const W = 400, H = 140;
  const PAD   = { top: 16, right: 16, bottom: 28, left: 40 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top  - PAD.bottom;
  const kgs   = data.map(d => d.kg);
  const minKg = Math.min(...kgs);
  const maxKg = Math.max(...kgs);
  const range = maxKg - minKg || 1;
  const xScale = (i)  => PAD.left + (i / (data.length - 1)) * plotW;
  const yScale = (kg) => PAD.top  + plotH - ((kg - minKg) / range) * plotH;
  const points   = data.map((d, i) => `${xScale(i)},${yScale(d.kg)}`).join(" ");
  const areaPath = [`M ${xScale(0)},${yScale(data[0].kg)}`, ...data.map((d, i) => `L ${xScale(i)},${yScale(d.kg)}`), `L ${xScale(data.length - 1)},${PAD.top + plotH}`, `L ${xScale(0)},${PAD.top + plotH}`, "Z"].join(" ");
  const fmtShort = (ds) => new Date(ds + "T12:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }}>
      {[0, 0.5, 1].map(t => {
        const y = PAD.top + plotH * (1 - t);
        return <line key={t} x1={PAD.left} y1={y} x2={PAD.left + plotW} y2={y} stroke={COLORS.border} strokeWidth="1" strokeDasharray="4 4" />;
      })}
      <path d={areaPath} fill={`${COLORS.accent}18`} />
      <polyline points={points} fill="none" stroke={COLORS.accent} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => <circle key={i} cx={xScale(i)} cy={yScale(d.kg)} r="3" fill={i === data.length - 1 ? COLORS.accent : COLORS.surface} stroke={COLORS.accent} strokeWidth="1.5" />)}
      <text x={xScale(data.length-1)} y={yScale(data[data.length-1].kg)-10} textAnchor="middle" fontFamily={TYPOGRAPHY.mono} fontSize="10" fontWeight="700" fill={COLORS.accent}>{data[data.length-1].kg} кг</text>
      {[{ kg: minKg, y: yScale(minKg) }, { kg: maxKg, y: yScale(maxKg) }].map(({ kg, y }, i) => (
        <text key={i} x={PAD.left - 6} y={y + 4} textAnchor="end" fontFamily={TYPOGRAPHY.mono} fontSize="9" fill={COLORS.textDim}>{kg}</text>
      ))}
      <text x={PAD.left}         y={H-4} textAnchor="middle" fontFamily={TYPOGRAPHY.mono} fontSize="9" fill={COLORS.textDim}>{fmtShort(data[0].date)}</text>
      <text x={PAD.left + plotW} y={H-4} textAnchor="middle" fontFamily={TYPOGRAPHY.mono} fontSize="9" fill={COLORS.textDim}>{fmtShort(data[data.length-1].date)}</text>
    </svg>
  );
}

function WeightHistoryList({ history }) {
  const items = [...history].reverse().slice(0, 20);
  if (items.length === 0) return <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "16px", color: COLORS.textDim, textAlign: "center", padding: "24px 0" }}>Записей ещё нет</div>;
  return (
    <div>
      {items.map((entry, i) => {
        const prev      = items[i + 1];
        const diff      = prev != null ? +(entry.kg - prev.kg).toFixed(1) : null;
        const diffColor = diff == null ? COLORS.textDim : diff < 0 ? COLORS.accentGreen : diff > 0 ? COLORS.warning : COLORS.textMuted;
        return (
          <div key={entry.date} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: `1px solid ${COLORS.borderLight}` }}>
            <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "15px", color: i === 0 ? COLORS.textSub : COLORS.textMuted }}>{formatDate(entry.date)}</div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {diff !== null && <span style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "11px", color: diffColor }}>{diff > 0 ? "+" : ""}{diff} кг</span>}
              <span style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "15px", fontWeight: 700, color: i === 0 ? COLORS.text : COLORS.textSub }}>{entry.kg} кг</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProgressScreen({ goals }) {
  const { history, current, starting, change, addWeight } = useWeight();
  const { current: streakCurrent, best: streakBest, totalDays } = useStreak(goals);
  const [editing,  setEditing]  = useState(false);
  const [inputVal, setInputVal] = useState("");

  const handleSave = () => {
    const num = Number(inputVal);
    if (!isNaN(num) && inputVal !== "" && num > 0) { addWeight(num); setInputVal(""); setEditing(false); }
  };

  const changeColor = change === null ? COLORS.textMuted : change < 0 ? COLORS.accentGreen : change > 0 ? COLORS.warning : COLORS.textMuted;
  const changeLabel = change === null ? "—" : `${change > 0 ? "+" : ""}${change}`;

  return (
    <div>
      <div style={{ marginBottom: "28px", paddingTop: "8px" }}>
        <div style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "10px", letterSpacing: "4px", color: COLORS.accent, marginBottom: "8px", fontWeight: 700 }}>ПРОГРЕСС</div>
        <h1 style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "36px", fontWeight: 600, color: COLORS.text, lineHeight: "1.1" }}>Твой путь</h1>
      </div>
      <div style={{ display: "flex", gap: SPACING.sm, marginBottom: SPACING.md }}>
        <StatCard label="В ПУТИ"  value={totalDays}     unit="дней"        color={COLORS.accentBlue} />
        <StatCard label="СТРИК"   value={streakCurrent} unit="дней подряд" color={streakCurrent >= 7 ? COLORS.accentGreen : COLORS.accentAmber} />
        <StatCard label="РЕКОРД"  value={streakBest}    unit="дней"        color={COLORS.accentPurple} />
      </div>
      <Card style={{ marginBottom: SPACING.md }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.md }}>
          <Label color={COLORS.textDim}>ВЕС</Label>
          {!editing ? (
            <button onClick={() => setEditing(true)} style={{ background: `${COLORS.accent}18`, border: `1px solid ${COLORS.accent}40`, borderRadius: "10px", padding: "7px 14px", cursor: "pointer", fontFamily: TYPOGRAPHY.mono, fontSize: "11px", fontWeight: 700, color: COLORS.accent, letterSpacing: "1px" }}>+ ЗАПИСАТЬ</button>
          ) : (
            <div style={{ display: "flex", gap: SPACING.sm, alignItems: "center" }}>
              <input type="number" step="0.1" placeholder="кг" value={inputVal} onChange={e => setInputVal(e.target.value)} autoFocus onKeyDown={e => e.key === "Enter" && handleSave()}
                style={{ width: "72px", background: COLORS.surfaceHigh, border: `1px solid ${COLORS.accent}`, borderRadius: "10px", padding: "8px 10px", fontFamily: TYPOGRAPHY.mono, fontSize: "15px", color: COLORS.text, outline: "none" }} />
              <button onClick={handleSave} style={{ background: COLORS.accent, border: "none", borderRadius: "10px", padding: "8px 12px", fontFamily: TYPOGRAPHY.mono, fontSize: "11px", fontWeight: 700, color: COLORS.text, cursor: "pointer" }}>OK</button>
              <button onClick={() => setEditing(false)} style={{ background: "transparent", border: "none", color: COLORS.textDim, fontSize: "20px", cursor: "pointer" }}>×</button>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: SPACING.sm }}>
          <div style={{ flex: 1, background: COLORS.surfaceHigh, borderRadius: "12px", padding: "14px 12px", textAlign: "center" }}>
            <div style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "9px", letterSpacing: "2px", color: COLORS.textDim, marginBottom: "6px" }}>СТАРТ</div>
            <div style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "22px", fontWeight: 700, color: COLORS.textSub }}>{starting ?? "—"}</div>
            <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "12px", color: COLORS.textDim, marginTop: "3px" }}>кг</div>
          </div>
          <div style={{ flex: 1, background: COLORS.surfaceHigh, borderRadius: "12px", padding: "14px 12px", textAlign: "center", border: `1px solid ${COLORS.accent}40` }}>
            <div style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "9px", letterSpacing: "2px", color: COLORS.accent, marginBottom: "6px" }}>СЕЙЧАС</div>
            <div style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "22px", fontWeight: 700, color: COLORS.text }}>{current ?? "—"}</div>
            <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "12px", color: COLORS.textMuted, marginTop: "3px" }}>кг</div>
          </div>
          <div style={{ flex: 1, background: COLORS.surfaceHigh, borderRadius: "12px", padding: "14px 12px", textAlign: "center" }}>
            <div style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "9px", letterSpacing: "2px", color: COLORS.textDim, marginBottom: "6px" }}>ИЗМЕНЕНИЕ</div>
            <div style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "22px", fontWeight: 700, color: changeColor }}>{changeLabel}</div>
            <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "12px", color: COLORS.textDim, marginTop: "3px" }}>кг</div>
          </div>
        </div>
      </Card>
      <Card style={{ marginBottom: SPACING.md }}>
        <Label color={COLORS.textDim} style={{ marginBottom: SPACING.md }}>ГРАФИК ВЕСА</Label>
        <WeightChart history={history} />
      </Card>
      <Card style={{ marginBottom: SPACING.xxxl }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.md }}>
          <Label color={COLORS.textDim}>ИСТОРИЯ ЗАПИСЕЙ</Label>
          <span style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "10px", color: COLORS.textDim }}>{history.length} записей</span>
        </div>
        <WeightHistoryList history={history} />
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// STATS SCREEN
// ─────────────────────────────────────────────

function StatRow({ label, emoji, value, unit, goal, percent, color }) {
  const displayPct = Math.min(100, Math.round(percent));
  const barColor   = displayPct >= 80 ? COLORS.accentGreen : displayPct >= 50 ? COLORS.accentAmber : COLORS.accent;
  return (
    <div style={{ paddingTop: "14px", paddingBottom: "14px", borderBottom: `1px solid ${COLORS.borderLight}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACING.md, marginBottom: "8px" }}>
        <span style={{ fontSize: "18px", flexShrink: 0 }}>{emoji}</span>
        <span style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "16px", color: COLORS.textSub, flex: 1 }}>{label}</span>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <span style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "15px", fontWeight: 700, color }}>{value}</span>
          <span style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "10px", color: COLORS.textDim }}>{" "}{unit}</span>
          <span style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "10px", color: COLORS.textDim }}>{" "}/ {goal}{unit}</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: SPACING.sm, paddingLeft: "30px" }}>
        <div style={{ flex: 1, height: "4px", background: COLORS.border, borderRadius: "2px" }}>
          <div style={{ height: "100%", width: `${displayPct}%`, background: barColor, borderRadius: "2px", transition: "width 0.4s ease" }} />
        </div>
        <span style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "11px", fontWeight: 700, color: barColor, minWidth: "34px", textAlign: "right" }}>{displayPct}%</span>
      </div>
    </div>
  );
}

function WeakSpotItem({ rank, label, emoji, percent }) {
  const color = percent >= 80 ? COLORS.accentGreen : percent >= 50 ? COLORS.accentAmber : COLORS.accent;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: SPACING.md, padding: "12px 0", borderBottom: `1px solid ${COLORS.borderLight}` }}>
      <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: `${color}20`, border: `1px solid ${color}50`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: TYPOGRAPHY.mono, fontSize: "11px", fontWeight: 700, color, flexShrink: 0 }}>{rank}</div>
      <span style={{ fontSize: "16px", flexShrink: 0 }}>{emoji}</span>
      <span style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "16px", color: COLORS.textSub, flex: 1 }}>{label}</span>
      <span style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "13px", fontWeight: 700, color }}>{percent}%</span>
    </div>
  );
}

function StatsScreen({ goals }) {
  const stats = useMemo(() => computeWeeklyStats(goals), [goals]);

  const habitWeeklyPcts = useMemo(() => {
    const habits = buildHabits(goals);
    const days   = Array.from({ length: 7 }, (_, i) => dateKeyFor(i));
    const sums   = {};
    const counts = {};
    habits.forEach(h => { sums[h.id] = 0; counts[h.id] = 0; });
    days.forEach(dateKey => {
      const dayData   = lsGet(`daydata:${dateKey}`, null);
      if (!dayData) return;
      const nutData   = lsGet(`nutrition:${dateKey}`, []);
      const nutTotals = nutData.reduce((a, e) => ({ kcal: a.kcal + e.kcal, protein: a.protein + e.protein }), { kcal: 0, protein: 0 });
      habits.forEach(h => {
        const actual = h.type === "auto" ? (h.autoSource === "kcal" ? nutTotals.kcal : nutTotals.protein) : (dayData[h.id] ?? (h.type === "boolean" ? false : 0));
        const pct    = h.type === "boolean" ? (actual ? 100 : 0) : Math.min(100, Math.round((actual / (h.goal || 1)) * 100));
        sums[h.id]   += pct;
        counts[h.id] += 1;
      });
    });
    return habits.map(h => ({ ...h, avgPct: counts[h.id] > 0 ? Math.round(sums[h.id] / counts[h.id]) : 0 })).sort((a, b) => a.avgPct - b.avgPct);
  }, [goals]);

  const weakSpots = habitWeeklyPcts.slice(0, 3);
  const compColor = stats.avgCompletion >= 80 ? COLORS.accentGreen : stats.avgCompletion >= 50 ? COLORS.accentAmber : COLORS.accent;
  const ringSize  = 120, r = 50, circ = 2 * Math.PI * r, filled = (stats.avgCompletion / 100) * circ;

  const metrics = [
    { id:"sleep",    label:"Сон",     emoji:"😴", value:stats.avgSleep,                        unit:"ч",   goal:goals.sleep,                          color:COLORS.accentPurple, pct:stats.avgSleep > 0 ? Math.min(100, Math.round((stats.avgSleep   /goals.sleep)  *100)) : 0 },
    { id:"steps",    label:"Шаги",    emoji:"👟", value:stats.avgSteps.toLocaleString("ru-RU"), unit:"",    goal:goals.steps.toLocaleString("ru-RU"),  color:COLORS.accentAmber,  pct:Math.min(100,Math.round((stats.avgSteps   /goals.steps)  *100)) },
    { id:"cardio",   label:"Кардио",  emoji:"🏃", value:stats.avgCardio,                        unit:"мин", goal:goals.cardio,                         color:COLORS.accent,       pct:Math.min(100,Math.round((stats.avgCardio  /(goals.cardio||1))*100)) },
    { id:"protein",  label:"Белок",   emoji:"🥩", value:stats.avgProtein,                       unit:"г",   goal:goals.protein,                        color:COLORS.accentAmber,  pct:Math.min(100,Math.round((stats.avgProtein /goals.protein)*100)) },
    { id:"calories", label:"Калории", emoji:"🔥", value:stats.avgCalories,                      unit:"кк",  goal:goals.kcal,                           color:COLORS.accent,       pct:Math.min(100,Math.round((stats.avgCalories/goals.kcal)  *100)) },
  ];

  return (
    <div>
      <div style={{ marginBottom: "28px", paddingTop: "8px" }}>
        <div style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "10px", letterSpacing: "4px", color: COLORS.accent, marginBottom: "8px", fontWeight: 700 }}>СТАТИСТИКА</div>
        <h1 style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "36px", fontWeight: 600, color: COLORS.text, lineHeight: "1.1" }}>Последние 7 дней</h1>
      </div>
      <Card style={{ marginBottom: SPACING.md }}>
        <div style={{ display: "flex", alignItems: "center", gap: SPACING.xl }}>
          <div style={{ position: "relative", width: ringSize, height: ringSize, flexShrink: 0 }}>
            <svg width={ringSize} height={ringSize} style={{ transform: "rotate(-90deg)" }}>
              <circle cx={ringSize/2} cy={ringSize/2} r={r} fill="none" stroke={COLORS.border} strokeWidth={9} />
              <circle cx={ringSize/2} cy={ringSize/2} r={r} fill="none" stroke={compColor} strokeWidth={9} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - filled} style={{ transition: "stroke-dashoffset 0.6s ease" }} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "22px", fontWeight: 700, color: compColor }}>{stats.avgCompletion}%</span>
            </div>
          </div>
          <div>
            <Label color={COLORS.textDim} style={{ marginBottom: SPACING.sm }}>СРЕДНЕЕ ВЫПОЛНЕНИЕ ЦЕЛЕЙ</Label>
            <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "17px", color: COLORS.textSub, lineHeight: "1.5" }}>
              {stats.daysTracked > 0 ? `За ${stats.daysTracked} из 7 дней с записями` : "Данных пока нет"}
            </div>
            {stats.daysTracked === 0 && <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "14px", color: COLORS.textDim, marginTop: SPACING.sm }}>Заполни экран «Сегодня», чтобы появилась статистика</div>}
          </div>
        </div>
      </Card>
      <Card style={{ marginBottom: SPACING.md }}>
        <Label color={COLORS.textDim} style={{ marginBottom: SPACING.xs }}>ПОКАЗАТЕЛИ ЗА НЕДЕЛЮ</Label>
        {metrics.map(m => <StatRow key={m.id} label={m.label} emoji={m.emoji} value={m.value} unit={m.unit} goal={m.goal} percent={m.pct} color={m.color} />)}
      </Card>
      <Card style={{ marginBottom: SPACING.xxxl }}>
        <Label color={COLORS.accent} style={{ marginBottom: "4px" }}>СЛАБЫЕ МЕСТА НЕДЕЛИ</Label>
        <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "14px", color: COLORS.textDim, marginBottom: SPACING.md }}>Что нужно подтянуть</div>
        {stats.daysTracked === 0 ? (
          <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "16px", color: COLORS.textDim, textAlign: "center", padding: "20px 0" }}>Данных пока нет</div>
        ) : (
          weakSpots.map((h, i) => <WeakSpotItem key={h.id} rank={i+1} label={h.label} emoji={h.emoji} percent={h.avgPct} />)
        )}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// SUPPLEMENTS SCREEN
// ─────────────────────────────────────────────

function SupplementRow({ supp, taken, onToggle }) {
  const done = !!taken;
  return (
    <div onClick={() => onToggle(supp.id)} style={{ display: "flex", alignItems: "center", gap: SPACING.md, padding: "13px 0", borderBottom: `1px solid ${COLORS.borderLight}`, cursor: "pointer", userSelect: "none" }}>
      <div style={{ width: "26px", height: "26px", borderRadius: "50%", flexShrink: 0, border: `2px solid ${done ? supp.color : COLORS.border}`, background: done ? supp.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease" }}>
        {done && <svg width="13" height="10" viewBox="0 0 13 10" fill="none"><path d="M1 5L5 9L12 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      <span style={{ fontSize: "19px", flexShrink: 0 }}>{supp.emoji}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "16px", color: done ? COLORS.textMuted : COLORS.textSub, textDecoration: done ? "line-through" : "none" }}>{supp.label}</div>
        <div style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "10px", letterSpacing: "1px", color: COLORS.textDim, marginTop: "3px" }}>{supp.dose} · {supp.timing}</div>
        <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "13px", color: COLORS.textDim, marginTop: "1px" }}>{supp.reason}</div>
      </div>
    </div>
  );
}

function SupplementsWeekHistory() {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key   = d.toISOString().slice(0, 10);
    const saved = lsGet(`supplements:${key}`, null);
    const label = d.toLocaleDateString("ru-RU", { weekday: "short" });
    if (!saved) return { key, label, status: "empty" };
    const count = Object.values(saved).filter(Boolean).length;
    const total = SUPPLEMENTS_CONFIG.length;
    if (count === total) return { key, label, status: "full" };
    if (count > 0)       return { key, label, status: "partial" };
    return { key, label, status: "none" };
  });
  const dotColor = { full: COLORS.accentGreen, partial: COLORS.accentAmber, none: COLORS.border, empty: COLORS.border };
  return (
    <Card style={{ marginBottom: SPACING.md }}>
      <Label color={COLORS.textDim} style={{ marginBottom: SPACING.md }}>ИСТОРИЯ ЗА НЕДЕЛЮ</Label>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {days.map(day => (
          <div key={day.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: dotColor[day.status], transition: "background 0.3s" }} />
            <span style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "9px", color: COLORS.textDim, textTransform: "uppercase" }}>{day.label.slice(0,2)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SupplementsScreen() {
  const date = todayKey();
  const { taken, toggle, takenCount, totalCount } = useSupplements(date);
  const pct = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;
  return (
    <div>
      <div style={{ marginBottom: SPACING.xxl }}>
        <Label style={{ marginBottom: SPACING.sm }}>ДОБАВКИ</Label>
        <h1 style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "28px", fontWeight: 600, color: COLORS.text, lineHeight: 1.2 }}>{formatDate(todayKey())}</h1>
      </div>
      <Card style={{ marginBottom: SPACING.md }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: SPACING.md }}>
          <div>
            <Label color={COLORS.textDim} style={{ marginBottom: SPACING.sm }}>ПРИНЯТО СЕГОДНЯ</Label>
            <div style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "28px", fontWeight: 700, color: takenCount === totalCount ? COLORS.accentGreen : COLORS.text }}>
              {takenCount}<span style={{ fontSize: "16px", color: COLORS.textDim, fontWeight: 400 }}>/{totalCount}</span>
            </div>
          </div>
          <div style={{ width: "60px", height: "60px", borderRadius: "50%", border: `3px solid ${takenCount === totalCount ? COLORS.accentGreen : COLORS.accentCyan}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "14px", fontWeight: 700, color: takenCount === totalCount ? COLORS.accentGreen : COLORS.accentCyan }}>{pct}%</span>
          </div>
        </div>
        <div style={{ height: "4px", background: COLORS.border, borderRadius: "2px" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: takenCount === totalCount ? COLORS.accentGreen : COLORS.accentCyan, borderRadius: "2px", transition: "width 0.4s ease" }} />
        </div>
      </Card>
      <SupplementsWeekHistory />
      <Card style={{ marginBottom: SPACING.xxxl }}>
        <Label color={COLORS.textDim} style={{ marginBottom: SPACING.md }}>СПИСОК</Label>
        {SUPPLEMENTS_CONFIG.map(supp => <SupplementRow key={supp.id} supp={supp} taken={taken[supp.id]} onToggle={toggle} />)}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// JOURNAL
// ─────────────────────────────────────────────

const EDEMA_OPTIONS = [
  { value: "none",     label: "Нет",     color: COLORS.accentGreen  },
  { value: "mild",     label: "Слабые",  color: COLORS.accentAmber  },
  { value: "moderate", label: "Средние", color: COLORS.accentOrange },
  { value: "strong",   label: "Сильные", color: COLORS.accent       },
];

function useJournal(dateKey) {
  const storageKey = `journal:${dateKey}`;
  const [entry, setEntry] = useState(() => ({ note: "", edema: "none", ...lsGet(storageKey, {}) }));
  const debounceRef = useRef(null);

  const saveEntry = useCallback((next) => {
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
  }, [storageKey]);

  const setEdema = useCallback((edema) => {
    setEntry(prev => { const next = { ...prev, edema }; saveEntry(next); return next; });
  }, [saveEntry]);

  const setNote = useCallback((note) => {
    setEntry(prev => ({ ...prev, note }));
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setEntry(prev => { saveEntry(prev); return prev; });
    }, 800);
  }, [saveEntry]);

  const allEntries = useMemo(() => {
    const out = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("journal:")) {
          const date = key.slice(8);
          const val  = lsGet(key, null);
          if (val && (val.note || val.edema)) out.push({ date, note: "", edema: "none", ...val });
        }
      }
    } catch {}
    return out.sort((a, b) => b.date.localeCompare(a.date));
  }, [entry]);

  const journalStats = useMemo(() => {
    const dist = { none: 0, mild: 0, moderate: 0, strong: 0 };
    allEntries.forEach(e => { if (dist[e.edema] !== undefined) dist[e.edema]++; });
    return { total: allEntries.length, dist };
  }, [allEntries]);

  return { entry, setNote, setEdema, allEntries, journalStats };
}

function EdemaSelector({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: SPACING.sm }}>
      {EDEMA_OPTIONS.map(opt => {
        const active = value === opt.value;
        return (
          <button key={opt.value} onClick={() => onChange(opt.value)} style={{ flex: 1, padding: "10px 4px", borderRadius: "12px", border: `1.5px solid ${active ? opt.color : COLORS.border}`, background: active ? `${opt.color}22` : "transparent", cursor: "pointer", fontFamily: TYPOGRAPHY.mono, fontSize: "10px", fontWeight: active ? 700 : 400, letterSpacing: "0.5px", color: active ? opt.color : COLORS.textDim, transition: "all 0.18s ease" }}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function JournalEntryCard({ entry }) {
  const edemaOpt = EDEMA_OPTIONS.find(o => o.value === entry.edema) || EDEMA_OPTIONS[0];
  const preview  = entry.note ? entry.note.slice(0, 120) + (entry.note.length > 120 ? "…" : "") : null;
  return (
    <div style={{ paddingTop: "16px", paddingBottom: "16px", borderBottom: `1px solid ${COLORS.borderLight}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: preview ? "8px" : 0 }}>
        <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "15px", color: COLORS.textSub }}>{formatDate(entry.date)}</div>
        <div style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "10px", fontWeight: 700, letterSpacing: "1px", color: edemaOpt.color, background: `${edemaOpt.color}18`, border: `1px solid ${edemaOpt.color}40`, borderRadius: "8px", padding: "4px 10px" }}>{edemaOpt.label}</div>
      </div>
      {preview && <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "15px", color: COLORS.textMuted, lineHeight: "1.5" }}>{preview}</div>}
    </div>
  );
}

function JournalStats({ stats }) {
  return (
    <Card style={{ marginBottom: SPACING.md }}>
      <Label color={COLORS.textDim} style={{ marginBottom: SPACING.md }}>СТАТИСТИКА ДНЕВНИКА</Label>
      {EDEMA_OPTIONS.map(opt => {
        const count = stats.dist[opt.value] || 0;
        const pct   = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
        return (
          <div key={opt.value} style={{ marginBottom: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "10px", letterSpacing: "1px", color: opt.color }}>{opt.label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "80px", height: "3px", background: COLORS.border, borderRadius: "2px" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: opt.color, borderRadius: "2px", transition: "width 0.4s ease" }} />
                </div>
                <span style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "12px", fontWeight: 700, color: opt.color, minWidth: "28px", textAlign: "right" }}>{count}</span>
              </div>
            </div>
          </div>
        );
      })}
    </Card>
  );
}

// ─────────────────────────────────────────────
// BACKUP
// ─────────────────────────────────────────────

const BACKUP_PREFIXES = [
  "goals:v1", "daydata:", "nutrition:", "weight:history",
  "supplements:", "favorites:products", "journal:", "meta:",
];

function exportData() {
  try {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (BACKUP_PREFIXES.some(p => key === p || key.startsWith(p))) data[key] = lsGet(key, null);
    }
    const payload = { version: 1, exportedAt: new Date().toISOString(), data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `tracker-backup-${todayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch { alert("Ошибка при экспорте данных"); }
}

function importData(file) {
  if (!file) return;
  if (!window.confirm("Импорт заменит все текущие данные приложения. Продолжить?")) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.version !== 1 || !parsed.data || typeof parsed.data !== "object") {
        alert(parsed.version !== undefined && parsed.version !== 1 ? "Неподдерживаемая версия резервной копии" : "Некорректный файл резервной копии");
        return;
      }
      const keysToDelete = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && BACKUP_PREFIXES.some(p => key === p || key.startsWith(p))) keysToDelete.push(key);
      }
      keysToDelete.forEach(key => { try { localStorage.removeItem(key); } catch {} });
      Object.entries(parsed.data).forEach(([key, value]) => { lsSet(key, value); });
      if (window.confirm("Импорт завершён. Перезагрузить приложение?")) window.location.reload();
    } catch { alert("Некорректный файл резервной копии"); }
  };
  reader.readAsText(file);
}

// ─────────────────────────────────────────────
// JOURNAL SCREEN
// ─────────────────────────────────────────────

function JournalScreen() {
  const date = todayKey();
  const { entry, setNote, setEdema, allEntries, journalStats } = useJournal(date);
  const fileInputRef = useRef(null);

  return (
    <div>
      <div style={{ marginBottom: "28px", paddingTop: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "10px", letterSpacing: "4px", color: COLORS.accent, marginBottom: "8px", fontWeight: 700 }}>ДНЕВНИК</div>
          <div style={{ display: "flex", gap: SPACING.sm, zIndex: 10, pointerEvents: "auto" }}>
            <button onClick={exportData} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: "8px", padding: "6px 10px", fontFamily: TYPOGRAPHY.mono, fontSize: "9px", letterSpacing: "1px", color: COLORS.textDim, cursor: "pointer" }}>[ EXPORT ]</button>
            <button onClick={() => fileInputRef.current && fileInputRef.current.click()} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: "8px", padding: "6px 10px", fontFamily: TYPOGRAPHY.mono, fontSize: "9px", letterSpacing: "1px", color: COLORS.textDim, cursor: "pointer" }}>[ IMPORT ]</button>
            <input ref={fileInputRef} type="file" accept=".json" style={{ display: "none" }} onChange={e => { importData(e.target.files[0]); e.target.value = ""; }} />
          </div>
        </div>
        <h1 style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "36px", fontWeight: 600, color: COLORS.text, lineHeight: "1.1" }}>Наблюдения</h1>
      </div>
      <Card style={{ marginBottom: SPACING.md }}>
        <Label color={COLORS.textDim} style={{ marginBottom: SPACING.sm }}>УРОВЕНЬ ОТЁКОВ СЕГОДНЯ</Label>
        <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "14px", color: COLORS.textDim, marginBottom: SPACING.md }}>{formatDate(date)}</div>
        <EdemaSelector value={entry.edema} onChange={setEdema} />
      </Card>
      <Card style={{ marginBottom: SPACING.md }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.md }}>
          <Label color={COLORS.textDim}>ЗАМЕТКА ДНЯ</Label>
          <span style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "9px", color: COLORS.textDim, letterSpacing: "1px" }}>АВТОСОХРАНЕНИЕ</span>
        </div>
        <textarea value={entry.note} onChange={e => setNote(e.target.value)}
          placeholder={"Как выглядело лицо?\nКак спал?\nБыли ли нарушения питания?\nУровень энергии…"} rows={6}
          style={{ width: "100%", background: COLORS.surfaceHigh, border: `1px solid ${COLORS.border}`, borderRadius: "12px", padding: "14px", fontFamily: TYPOGRAPHY.serif, fontSize: "16px", color: COLORS.textSub, lineHeight: "1.6", resize: "vertical", outline: "none", boxSizing: "border-box" }}
          onFocus={e => { e.target.style.borderColor = COLORS.accent; }}
          onBlur={e  => { e.target.style.borderColor = COLORS.border; }} />
      </Card>
      {journalStats.total > 0 && <JournalStats stats={journalStats} />}
      <Card style={{ marginBottom: SPACING.xxxl }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.sm }}>
          <Label color={COLORS.textDim}>ИСТОРИЯ ЗАПИСЕЙ</Label>
          <span style={{ fontFamily: TYPOGRAPHY.mono, fontSize: "10px", color: COLORS.textDim }}>{allEntries.length} записей</span>
        </div>
        {allEntries.length === 0 ? (
          <div style={{ fontFamily: TYPOGRAPHY.serif, fontSize: "16px", color: COLORS.textDim, textAlign: "center", padding: "24px 0" }}>Записей пока нет — начни сегодня</div>
        ) : (
          allEntries.map(e => <JournalEntryCard key={e.date} entry={e} />)
        )}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// BOTTOM NAVIGATION
// ─────────────────────────────────────────────

const TABS = [
  { id:"today",       label:"Сегодня",  icon:"◎" },
  { id:"plan",        label:"План",     icon:"≡" },
  { id:"nutrition",   label:"Питание",  icon:"⊕" },
  { id:"supplements", label:"Добавки",  icon:"💊" },
  { id:"progress",    label:"Прогресс", icon:"↗" },
  { id:"stats",       label:"Статист.", icon:"◈" },
  { id:"journal",     label:"Дневник",  icon:"✎" },
];

function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav style={{ position:"fixed", bottom:0, left:0, right:0, height:`calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom))`, background:COLORS.surface, borderTop:`1px solid ${COLORS.border}`, display:"flex", alignItems:"flex-start", justifyContent:"space-around", zIndex:50, paddingBottom:"env(safe-area-inset-bottom)", paddingTop:"4px" }}>
      {TABS.map(tab => {
        const active = tab.id === activeTab;
        return (
          <button key={tab.id} onClick={() => onTabChange(tab.id)} style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"2px", background:"transparent", border:"none", cursor:"pointer", minWidth:"44px", minHeight:"44px", padding:"6px 2px", touchAction:"manipulation" }}>
            <span style={{ fontSize:"14px", color:active ? COLORS.accent : COLORS.textDim, transition:"color 0.2s ease", lineHeight:1 }}>{tab.icon}</span>
            <span style={{ fontFamily:TYPOGRAPHY.mono, fontSize:"7px", fontWeight:active ? 700 : 400, color:active ? COLORS.accent : COLORS.textDim, transition:"color 0.2s ease" }}>{tab.label}</span>
            {active && <div style={{ width:"3px", height:"3px", borderRadius:"50%", background:COLORS.accent }} />}
          </button>
        );
      })}
    </nav>
  );
}

// ─────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState("today");
  const [showGoals, setShowGoals] = useState(false);

  // Android Back Button
  useEffect(() => {
    const listenerPromise = CapApp.addListener('backButton', () => {
      if (activeTab !== 'today') {
        setActiveTab('today');
      } else {
        CapApp.exitApp();
      }
    });
    return () => { listenerPromise.then(h => h.remove()); };
  }, [activeTab]);

  const { goals, updateGoals }                    = useGoals();
  const date                                       = todayKey();
  const { entries, addFood, removeFood, totals }  = useNutrition(date);

  const renderScreen = () => {
    switch (activeTab) {
      case "today":       return <TodayScreen goals={goals} onOpenGoals={() => setShowGoals(true)} nutritionTotals={totals} onNavigate={setActiveTab} />;
      case "plan":        return <PlanScreen />;
      case "nutrition":   return <NutritionScreen goals={goals} entries={entries} addFood={addFood} removeFood={removeFood} totals={totals} />;
      case "supplements": return <SupplementsScreen />;
      case "progress":    return <ProgressScreen goals={goals} />;
      case "stats":       return <StatsScreen goals={goals} />;
      case "journal":     return <JournalScreen />;
      default:            return <TodayScreen goals={goals} onOpenGoals={() => setShowGoals(true)} nutritionTotals={totals} onNavigate={setActiveTab} />;
    }
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: ${COLORS.bg}; min-height: 100dvh; }
        body { overscroll-behavior-y: none; }
        * { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
        textarea, input { touch-action: auto; }
        input::placeholder { color: ${COLORS.textDim}; }
        input:focus { border-color: ${COLORS.accent} !important; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 2px; }
      `}</style>

      <div style={{ minHeight: "100dvh", background: COLORS.bg, maxWidth: "480px", margin: "0 auto", paddingBottom: `calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom) + 16px)` }}>
        <div style={{ padding: `${SPACING.xxl} ${SPACING.lg} 0` }}>
          {renderScreen()}
        </div>
      </div>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {showGoals && <GoalsModal goals={goals} onSave={updateGoals} onClose={() => setShowGoals(false)} />}
    </>
  );
}
