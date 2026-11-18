// Marco de la app: cielo, barra lateral, HUD del juego y transiciones entre secciones.
import { useEffect, useState } from "react";
import { NavLink, Navigate, useLocation, useOutlet, useNavigate, Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Home, Target, Flame, Timer, BookOpen, Wallet, Sofa, Images, Sparkles, Rocket, UserRound, Coins, Shield, Menu, X, Smartphone, ShieldCheck } from "lucide-react";
import useGlobalReducer from "../hooks/useGlobalReducer";
import useActions from "../hooks/useActions";
import { TimersProvider, useTimers, mmss } from "../context/Timers";
import { Sky } from "../components/Sky";
import { Ring, cx } from "../components/ui";
import { levelInfo, skyPhase, todayStr, habitCount, applyAccent } from "../lib/game";

// Cada sección es una "estación" del mapa, con su propio color
export const NAV = [
  { group: "Tu día", items: [
    { to: "/", label: "Inicio y logros", icon: Home, end: true, color: "#E8B95B" },
    { to: "/habitos", label: "Hábitos y cuerpo", icon: Flame, color: "#F0995C" },
    { to: "/enfoque", label: "Enfoque y calma", icon: Timer, color: "#6C9BD9" },
    { to: "/bitacora", label: "Bitácora", icon: BookOpen, color: "#9B8CE0" },
  ] },
  { group: "Tus sueños", items: [
    { to: "/plan", label: "Plan 2027", icon: Target, color: "#E27D60" },
    { to: "/vision", label: "Tablero de visión", icon: Images, color: "#D58BB8" },
  ] },
  { group: "Tus recursos", items: [
    { to: "/finanzas", label: "Finanzas", icon: Wallet, color: "#5FA57C" },
    { to: "/apartamento", label: "Mi espacio", icon: Sofa, color: "#D9A066" },
  ] },
  { group: "Apoyo", items: [{ to: "/copiloto", label: "Copiloto IA", icon: Sparkles, color: "#BFE0EE" }] },
];
const CONTROL = { to: "/control", label: "Sala de control", icon: ShieldCheck, color: "#C9A227" };
const FLAT = [...NAV.flatMap((g) => g.items), CONTROL];
const MOBILE = ["/", "/habitos", "/plan", "/finanzas"];
const SHORT = { "/": "Inicio", "/habitos": "Hábitos", "/plan": "Plan", "/finanzas": "Finanzas" };

// Carga los datos una vez por sesión. Lo usan el Layout y el Estreno.
export function useBoot() {
  const { store } = useGlobalReducer();
  const act = useActions();
  useEffect(() => { if (store.token && !store.ready) act.boot(); }, [store.token, store.ready]); // eslint-disable-line
  return store;
}

export const Loader = () => (
  <div className="loader"><div className="loader-star" /><p>Abriendo tu 2027…</p></div>
);

const CHEERS = ["Hoy sumas un punto más", "Un hábito y ya arrancaste", "Vas con buen ritmo", "Ya casi cierras el día", "Día perfecto. Qué nivel."];

// Tarjeta de jugador: nivel, XP y misiones del día
function PlayerCard() {
  const { store } = useGlobalReducer();
  const navigate = useNavigate();
  const lv = levelInfo(store.user.xp);
  const today = todayStr();
  const daily = store.habits.filter((h) => h.active && h.period === "day");
  const done = daily.filter((h) => habitCount(h, store.habitLogs, today)).length;
  const cheer = !daily.length ? CHEERS[0] : done === daily.length ? CHEERS[4] : CHEERS[Math.min(3, Math.floor((done / daily.length) * 4))];
  return (
    <button className="player" onClick={() => navigate("/?ver=botin")} title={`Faltan ${lv.left} XP para ${lv.next}`}>
      <Ring pct={lv.pct} size={54} stroke={5}><span className="avatar">{(store.user.display_name || store.user.username)[0]}</span></Ring>
      <span className="player-txt">
        <b>{(store.user.display_name || store.user.username).split(" ")[0]}</b>
        <small>Nivel {lv.level} · {lv.name}</small>
        <span className="player-xp"><i style={{ width: lv.pct + "%" }} /></span>
        <small className="muted">{cheer}</small>
      </span>
      <span className="player-quest num" aria-label="Misiones de hoy">{done}/{daily.length}</span>
    </button>
  );
}

function SideNav({ onPick }) {
  const { store } = useGlobalReducer();
  const t = useTimers();
  const today = todayStr();
  const pending = store.habits.filter((h) => h.active && h.period === "day" && !habitCount(h, store.habitLogs, today)).length;
  const badge = { "/habitos": pending || null, "/enfoque": t.pomo.running || t.social.running ? "●" : null };
  return (
    <nav className="side-nav">
      {NAV.map((g) => ({ ...g, items: g.group === "Apoyo" && store.user.is_admin ? [...g.items, CONTROL] : g.items })).map((g) => (
        <div key={g.group} className="side-group">
          <span className="side-label">{g.group}</span>
          {g.items.map(({ to, label, icon: Icon, end, color }) => (
            <NavLink key={to} to={to} end={end} onClick={() => onPick?.()} style={{ "--c": color }}
              className={({ isActive }) => cx("station", isActive && "active")}>
              <span className="gem"><Icon size={17} strokeWidth={2.4} /></span>
              <span className="station-label">{label}</span>
              {badge[to] && <span className="station-badge num">{badge[to]}</span>}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

function Hud({ title }) {
  const { store } = useGlobalReducer();
  const t = useTimers();
  const lv = levelInfo(store.user.xp);
  return (
    <div className="hud">
      <h2 className="hud-title">{title}</h2>
      <div className="hud-stats">
        {t.pomo.running && <Link to="/enfoque" className={cx("chip live", t.pomo.phase)}><Timer size={14} /><b className="num">{mmss(t.pomoLeft)}</b></Link>}
        {t.social.running && <Link to="/enfoque" className={cx("chip live", t.socialOver && "over")}><Smartphone size={14} /><b className="num">{mmss(t.socialMs)}</b></Link>}
        <span className="chip" title="Racha de días"><Flame size={15} color="var(--coral)" /><b className="num">{store.streak}</b></span>
        {store.user.shields > 0 && <span className="chip" title="Escudos de descanso"><Shield size={15} color="var(--ice)" /><b className="num">{store.user.shields}</b></span>}
        <span className="chip" title="Monedas"><Coins size={15} color="var(--gold)" /><b className="num">{store.user.coins}</b></span>
        <Link to="/?ver=botin" className="hud-level" title={`Faltan ${lv.left} XP para ${lv.next}`}>
          <Ring pct={lv.pct} size={40} stroke={4}><b className="num">{lv.level}</b></Ring>
          <div className="hud-level-txt"><b>{lv.name}</b><small className="muted num">{store.user.xp} XP</small></div>
        </Link>
        <Link to="/perfil" className="btn icon ghost" aria-label="Perfil"><UserRound size={18} /></Link>
      </div>
    </div>
  );
}

export function Toasts() {
  const { store } = useGlobalReducer();
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence>
        {store.toasts.map((t) => (
          <motion.div key={t.id} layout className={cx("toast", t.tone)} initial={{ x: 60, opacity: 0, scale: 0.9 }} animate={{ x: 0, opacity: 1, scale: 1 }} exit={{ x: 60, opacity: 0 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}>
            <span>{t.title}</span>
            <span className="toast-gain num">
              {!!t.xp && <b className={t.xp > 0 ? "up" : "down"}>{t.xp > 0 ? "+" : ""}{t.xp} XP</b>}
              {!!t.coins && <b className={t.coins > 0 ? "coin" : "down"}>{t.coins > 0 ? "+" : ""}{t.coins} 🪙</b>}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function Celebration() {
  const { store, dispatch } = useGlobalReducer();
  const c = store.celebration;
  useEffect(() => {
    if (!c) return;
    const t = setTimeout(() => dispatch({ type: "celebrate", payload: null }), 3400);
    return () => clearTimeout(t);
  }, [c, dispatch]);
  return (
    <AnimatePresence>
      {c && (
        <motion.div className="celebrate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => dispatch({ type: "celebrate", payload: null })}>
          <motion.div className="celebrate-card" initial={{ scale: 0.5, rotateX: 60, opacity: 0 }} animate={{ scale: 1, rotateX: 0, opacity: 1 }} exit={{ scale: 1.2, opacity: 0 }} transition={{ type: "spring", stiffness: 220, damping: 18 }}>
            <div className="celebrate-emoji">{c.emoji}</div>
            <h2>{c.title}</h2>
            <p>{c.subtitle}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Shell() {
  const location = useLocation();
  const outlet = useOutlet();
  const [menu, setMenu] = useState(false);
  const current = FLAT.find((i) => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to))) || { label: "Perfil" };

  useEffect(() => { window.scrollTo(0, 0); setMenu(false); }, [location.pathname]);

  return (
    <div className="app">
      <aside className="side glass">
        <Link to="/" className="brand"><span className="brand-mark" /><span>Level Up<b>2027</b></span></Link>
        <PlayerCard />
        <SideNav />
        <Link to="/estreno" className="launch-btn"><Rocket size={18} /><span><b>El estreno</b><small>Mira tu 2027 despegar</small></span></Link>
      </aside>

      <main className="stage">
        <Hud title={current.label} />
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} className="page"
            initial={{ opacity: 0, y: 18, scale: 0.985, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12, scale: 0.99, filter: "blur(6px)" }}
            transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}>
            {outlet}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="dock glass">
        {FLAT.filter((i) => MOBILE.includes(i.to)).map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => cx("dock-link", isActive && "active")}><Icon size={20} /><span>{SHORT[to] || label}</span></NavLink>
        ))}
        <button className={cx("dock-link", menu && "active")} onClick={() => setMenu(true)}><Menu size={20} /><span>Más</span></button>
      </nav>

      <AnimatePresence>
        {menu && (
          <motion.div className="sheet-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenu(false)}>
            <motion.div className="sheet glass" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 340, damping: 34 }} onClick={(e) => e.stopPropagation()}>
              <div className="between"><Link to="/" className="brand"><span className="brand-mark" /><span>Level Up<b>2027</b></span></Link>
                <button className="btn icon ghost" onClick={() => setMenu(false)} aria-label="Cerrar"><X size={18} /></button></div>
              <SideNav onPick={() => setMenu(false)} />
              <Link to="/estreno" className="launch-btn"><Rocket size={18} /><span><b>El estreno</b><small>Mira tu 2027 despegar</small></span></Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <Toasts />
      <Celebration />
    </div>
  );
}

export const Layout = () => {
  const store = useBoot();
  const accent = store.user?.settings?.accent;
  useEffect(() => { applyAccent(accent); }, [accent]);
  if (!store.token) return <Navigate to="/login" replace />;
  return (
    <>
      <Sky soft phase={skyPhase(store.user?.settings?.sky)} scene={store.user?.settings?.scene || "orbitas"} />
      {store.ready ? <TimersProvider><Shell /></TimersProvider> : <Loader />}
    </>
  );
};
