// Temporizadores globales: siguen corriendo aunque cambies de sección y se ven en el título de la pestaña.
import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import useActions from "../hooks/useActions";
import { play } from "../lib/fx";

const Ctx = createContext(null);
export const useTimers = () => useContext(Ctx);

export const ZONES = [
  { id: "chispa", name: "Chispa", focus: 25, rest: 5, desc: "Para arrancar o tareas cortas" },
  { id: "flujo", name: "Flujo", focus: 50, rest: 10, desc: "Trabajo profundo de un tema" },
  { id: "inmersion", name: "Inmersión", focus: 90, rest: 20, desc: "Construir sin interrupciones" },
];

const load = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
export const mmss = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
};

export function TimersProvider({ children }) {
  const act = useActions();
  // pomodoro: phase focus|rest, running, endsAt (ms), left (ms en pausa), total (ms), label, zone, rounds
  const [pomo, setPomo] = useState(() => load("c27_pomo", { phase: "focus", running: false, left: 25 * 60000, total: 25 * 60000, zone: "chispa", label: "", rounds: 0 }));
  // redes: running, startedAt, planned (min)
  const [social, setSocial] = useState(() => load("c27_social", { running: false, startedAt: 0, planned: 10 }));
  const [nowMs, setNow] = useState(Date.now());
  const warned = useRef(false);

  useEffect(() => { localStorage.setItem("c27_pomo", JSON.stringify(pomo)); }, [pomo]);
  useEffect(() => { localStorage.setItem("c27_social", JSON.stringify(social)); }, [social]);
  useEffect(() => {
    if (!pomo.running && !social.running) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [pomo.running, social.running]);

  const zone = ZONES.find((z) => z.id === pomo.zone) || ZONES[0];
  const pomoLeft = pomo.running ? pomo.endsAt - nowMs : pomo.left;
  const socialMs = social.running ? nowMs - social.startedAt : 0;
  const socialOver = social.running && socialMs > social.planned * 60000;

  // Fin de un bloque
  useEffect(() => {
    if (!pomo.running || pomoLeft > 0) return;
    play("bell");
    if (pomo.phase === "focus") {
      act.logFocus({ kind: "focus", minutes: pomo.total / 60000, planned: pomo.total / 60000, label: pomo.label });
      const rest = zone.rest * 60000;
      setPomo((p) => ({ ...p, phase: "rest", running: true, endsAt: Date.now() + rest, total: rest, rounds: p.rounds + 1 }));
      notify("Bloque terminado", "Descansa " + zone.rest + " minutos. Te lo ganaste.");
    } else {
      const focus = zone.focus * 60000;
      setPomo((p) => ({ ...p, phase: "focus", running: false, left: focus, total: focus }));
      notify("Descanso terminado", "Cuando quieras, empieza el siguiente bloque.");
    }
  }, [pomoLeft, pomo.running]); // eslint-disable-line

  // Aviso cuando se acaba el tiempo de redes
  useEffect(() => {
    if (socialOver && !warned.current) { warned.current = true; play("lose"); notify("Se acabó la pausa de redes", "Cierra la app y vuelve a lo tuyo."); }
    if (!social.running) warned.current = false;
  }, [socialOver, social.running]);

  // Título de la pestaña
  useEffect(() => {
    if (pomo.running) document.title = `${mmss(pomoLeft)} · ${pomo.phase === "focus" ? "Enfoque" : "Descanso"} | Level Up 2027`;
    else if (social.running) document.title = `${mmss(socialMs)} · Redes${socialOver ? " (pasado)" : ""} | Level Up 2027`;
    else document.title = "Level Up 2027";
  }, [pomo.running, social.running, Math.floor(pomoLeft / 1000), Math.floor(socialMs / 1000)]); // eslint-disable-line

  const api = {
    pomo, zone, pomoLeft, social, socialMs, socialOver,
    setZone: useCallback((id) => { const z = ZONES.find((x) => x.id === id); setPomo((p) => ({ ...p, zone: id, phase: "focus", running: false, left: z.focus * 60000, total: z.focus * 60000 })); }, []),
    setLabel: (label) => setPomo((p) => ({ ...p, label })),
    start: () => { askPermission(); setPomo((p) => ({ ...p, running: true, endsAt: Date.now() + p.left })); },
    pause: () => setPomo((p) => ({ ...p, running: false, left: Math.max(0, p.endsAt - Date.now()) })),
    // Terminar antes: guarda lo trabajado
    stop: () => {
      const worked = (pomo.total - Math.max(0, pomoLeft)) / 60000;
      if (pomo.phase === "focus" && worked >= 5) act.logFocus({ kind: "focus", minutes: Math.floor(worked), planned: pomo.total / 60000, label: pomo.label });
      setPomo((p) => ({ ...p, phase: "focus", running: false, left: zone.focus * 60000, total: zone.focus * 60000 }));
    },
    skipRest: () => setPomo((p) => ({ ...p, phase: "focus", running: false, left: zone.focus * 60000, total: zone.focus * 60000 })),
    setPlanned: (planned) => setSocial((s) => ({ ...s, planned })),
    startSocial: () => { askPermission(); setSocial((s) => ({ ...s, running: true, startedAt: Date.now() })); setNow(Date.now()); },
    stopSocial: () => {
      act.logFocus({ kind: "social", minutes: Math.round((socialMs / 60000) * 10) / 10, planned: social.planned, label: "Redes sociales" });
      setSocial((s) => ({ ...s, running: false }));
    },
  };
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

function askPermission() { try { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission(); } catch { /* no disponible */ } }
function notify(title, body) { try { if ("Notification" in window && Notification.permission === "granted" && document.hidden) new Notification(title, { body }); } catch { /* no disponible */ } }
