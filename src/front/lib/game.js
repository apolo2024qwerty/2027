// Reglas del juego y utilidades de fecha y dinero.

export const LEVELS = [
  "Chispa", "Aprendiz", "Constante", "En racha", "Imparable", "Estratega",
  "Referente", "Maestro", "Élite", "Estelar", "En órbita", "Leyenda 2027",
];
export const xpForLevel = (L) => 60 * L * (L - 1);
export const levelOf = (xp = 0) => Math.max(1, Math.floor((1 + Math.sqrt(1 + xp / 15)) / 2));
export const levelName = (L) => LEVELS[Math.min(L, LEVELS.length) - 1];
export function levelInfo(xp = 0) {
  const level = levelOf(xp);
  const from = xpForLevel(level), to = xpForLevel(level + 1);
  return { level, name: levelName(level), next: levelName(level + 1), from, to, pct: ((xp - from) / (to - from)) * 100, left: to - xp };
}

// Fechas siempre en hora local, formato AAAA-MM-DD
export const iso = (d) => d.toLocaleDateString("en-CA");
export const todayStr = () => iso(new Date());
export const parseDay = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parseDay(s); d.setDate(d.getDate() + n); return iso(d); };
export const weekStart = (s) => { const d = parseDay(s); return addDays(s, -((d.getDay() + 6) % 7)); }; // lunes
export const lastDays = (n, end = todayStr()) => Array.from({ length: n }, (_, i) => addDays(end, i - n + 1));
export const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
export const MON = MONTHS.map((m) => m.slice(0, 3));
export const DOW = ["D", "L", "M", "X", "J", "V", "S"];
export const niceDay = (s) => parseDay(s).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
export const shortDay = (s) => parseDay(s).toLocaleDateString("es-CO", { day: "numeric", month: "short" });

export const cop = (n) => (n < 0 ? "−$" : "$") + Math.abs(Math.round(n || 0)).toLocaleString("es-CO");
export const copShort = (n) => {
  const a = Math.abs(n || 0);
  if (a >= 1e6) return "$" + (n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(".0", "") + " M";
  if (a >= 1e3) return "$" + Math.round(n / 1e3) + " k";
  return "$" + Math.round(n || 0);
};

export const monthsUntil = (deadline, from = todayStr()) => {
  if (!deadline) return null;
  const a = parseDay(from), b = parseDay(deadline);
  return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth() + (b.getDate() >= a.getDate() ? 0 : -1));
};

// Cuántas veces se cumplió un hábito en su periodo actual (día, semana o mes)
export function habitCount(habit, logs, day = todayStr()) {
  const mine = logs.filter((l) => l.habit_id === habit.id);
  if (habit.period === "day") return mine.some((l) => l.day === day) ? 1 : 0;
  if (habit.period === "week") { const ws = weekStart(day), we = addDays(ws, 6); return mine.filter((l) => l.day >= ws && l.day <= we).length; }
  return mine.filter((l) => l.day.slice(0, 7) === day.slice(0, 7)).length;
}

export const WORKOUTS = {
  run: { label: "Running", emoji: "🏃" }, bike: { label: "Bici", emoji: "🚴" }, strength: { label: "Fuerza", emoji: "🏋️" },
  yoga: { label: "Yoga", emoji: "🧘" }, hike: { label: "Caminata", emoji: "🥾" }, other: { label: "Otro", emoji: "⚡" },
};

export const skyPhase = (mode = "auto", hour = new Date().getHours()) =>
  mode !== "auto" ? mode : hour >= 5 && hour < 8 ? "dawn" : hour >= 8 && hour < 16 ? "day" : hour >= 16 && hour < 19 ? "dusk" : "night";

// Color de acento que cada persona elige en su perfil: [principal, claro]
export const ACCENTS = {
  oro: ["Oro", "#E8B95B", "#F6D892"], coral: ["Coral", "#F2937F", "#FFC6B8"], menta: ["Menta", "#5FD0B1", "#AEEFDB"],
  cielo: ["Cielo", "#6DB9EC", "#B8E0F8"], lila: ["Lila", "#AC9DF6", "#D6CEFF"], rosa: ["Rosa", "#EC8FC6", "#FAC8E5"],
};
export function applyAccent(id) {
  const [, main, light] = ACCENTS[id] || ACCENTS.oro;
  document.documentElement.style.setProperty("--gold", main);
  document.documentElement.style.setProperty("--gold-2", light);
}

// Logros: se calculan con lo que ya hay en el store
export function achievements(s) {
  const done = s.goals.filter((g) => g.status === "done");
  const focusN = s.focus.filter((f) => f.kind === "focus" && f.minutes >= 25).length;
  const waterGoal = s.user?.settings?.water_goal || 2500;
  const bought = s.apartment.filter((a) => a.bought).length;
  const has = (key) => s.xpEvents.some((e) => e.key === key);
  return [
    { emoji: "🚀", name: "Despegue", desc: "Firmar el estreno de tu 2027", ok: has("launch-2027") },
    { emoji: "🎡", name: "Rueda completa", desc: "Calificar todas las áreas de tu Rueda de la Vida", ok: s.pillars.length > 0 && s.pillars.every((p) => +s.user?.settings?.wheel?.[p.id] > 0) },
    { emoji: "🎯", name: "Primera misión", desc: "Cumplir una meta del plan", ok: done.length >= 1 },
    { emoji: "⚔️", name: "Cazador de jefes", desc: "Derrotar un jefe final", ok: done.some((g) => g.kind === "boss") },
    { emoji: "👑", name: "Sin jefes en pie", desc: "Derrotar todos los jefes finales", ok: s.goals.some((g) => g.kind === "boss") && s.goals.filter((g) => g.kind === "boss").every((g) => g.status === "done") },
    { emoji: "🔥", name: "Semana encendida", desc: "Racha de 7 días", ok: s.streak >= 7 || s.xpEvents.some((e) => e.kind === "shield") },
    { emoji: "🌋", name: "Mes de lava", desc: "Racha de 30 días", ok: s.streak >= 30 },
    { emoji: "🧠", name: "Mente de láser", desc: "10 bloques de enfoque de 25 min o más", ok: focusN >= 10 },
    { emoji: "💧", name: "Río interior", desc: "Cumplir la meta de agua 7 días", ok: s.dailyLogs.filter((d) => d.water_ml >= waterGoal).length >= 7 },
    { emoji: "🏃", name: "Piernas despiertas", desc: "Registrar 10 entrenamientos", ok: s.workouts.length >= 10 },
    { emoji: "📓", name: "Cronista", desc: "10 entradas en la bitácora", ok: s.journal.length >= 10 },
    { emoji: "🪙", name: "Cofre lleno", desc: "Completar un cofre de ahorro", ok: s.funds.some((f) => f.filled) },
    { emoji: "🛋️", name: "Espacio a medias", desc: "Conseguir la mitad de lo que quieres para tu espacio", ok: s.apartment.length > 0 && bought >= s.apartment.length / 2 },
    { emoji: "🏠", name: "Mi lugar en el mundo", desc: "Conseguir todo lo que querías para tu espacio", ok: s.apartment.length > 0 && bought === s.apartment.length },
    { emoji: "⚡", name: "Imparable", desc: "Llegar al nivel 5", ok: levelOf(s.user?.xp) >= 5 },
    { emoji: "🛰️", name: "En órbita", desc: "Llegar al nivel 11", ok: levelOf(s.user?.xp) >= 11 },
  ];
}
