// El estreno: tu 2027 presentado como el lanzamiento de un producto. Se puede repetir las veces que quieras.
import { useEffect, useMemo, useState, useCallback } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Play, Pause, ChevronLeft, ChevronRight, RotateCcw, X, Swords, PenLine } from "lucide-react";
import useActions from "../hooks/useActions";
import { useBoot, Loader, Toasts } from "./Layout";
import { Sky } from "../components/Sky";
import { Rocket3D } from "../components/Rocket3D";
import { Liquid, cx } from "../components/ui";
import { VisionTile } from "./Vision";
import { MONTHS, MON, cop } from "../lib/game";
import { play, fireworks } from "../lib/fx";

const ease = [0.2, 0.8, 0.2, 1];
const up = { hide: { opacity: 0, y: 40, filter: "blur(10px)" }, show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease } } };
const stagger = (s = 0.12, d = 0.1) => ({ hide: {}, show: { transition: { staggerChildren: s, delayChildren: d } } });
const flip = { hide: { opacity: 0, y: 120, rotateX: -80 }, show: { opacity: 1, y: 0, rotateX: 0, transition: { type: "spring", stiffness: 70, damping: 13 } } };

function Countdown() {
	const [n, setN] = useState(3);
	useEffect(() => { play("tick"); if (n > 1) { const t = setTimeout(() => setN(n - 1), 1000); return () => clearTimeout(t); } }, [n]);
	return (
		<div className="pr-center">
			<AnimatePresence mode="wait">
				<motion.b key={n} className="pr-count num" initial={{ scale: 2.4, opacity: 0, filter: "blur(20px)" }} animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }} exit={{ scale: 0.4, opacity: 0 }} transition={{ duration: 0.45, ease }}>{n}</motion.b>
			</AnimatePresence>
		</div>
	);
}

function CountUp({ to }) {
	const [v, setV] = useState(0);
	useEffect(() => { let raf, t0 = performance.now(); const f = (t) => { const k = Math.min(1, (t - t0) / 1100); setV(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(f); }; raf = requestAnimationFrame(f); return () => cancelAnimationFrame(raf); }, [to]);
	return <span className="num">{v}</span>;
}

export const Premiere = () => {
	const store = useBoot();
	const act = useActions();
	const navigate = useNavigate();
	const [i, setI] = useState(0);
	const [playing, setPlaying] = useState(true);
	const [signed, setSigned] = useState(false);

	const scenes = useMemo(() => !store.ready ? [] : [
		{ id: "count", ms: 3300 },
		{ id: "title", ms: 6000 },
		{ id: "numbers", ms: 6500 },
		...store.pillars.filter((p) => store.goals.some((g) => g.pillar_id === p.id) || store.habits.some((h) => h.pillar_id === p.id && h.active)).map((p) => ({ id: "pillar", p, ms: 7500 })),
		...(store.goals.some((g) => g.kind === "boss") ? [{ id: "bosses", ms: 9000 }] : []),
		...(store.funds.length ? [{ id: "money", ms: 7500 }] : []),
		...(store.vision.length ? [{ id: "vision", ms: 8000 }] : []),
		{ id: "launch", ms: 0 },
	], [store.ready]); // eslint-disable-line
	const scene = scenes[i];
	const last = i === scenes.length - 1;

	const go = useCallback((n) => setI((cur) => Math.max(0, Math.min(scenes.length - 1, typeof n === "function" ? n(cur) : n))), [scenes.length]);
	useEffect(() => {
		if (!scene || !playing || !scene.ms) return;
		const t = setTimeout(() => go((c) => c + 1), scene.ms);
		return () => clearTimeout(t);
	}, [i, playing, scene, go]);
	useEffect(() => {
		const key = (e) => {
			if (e.key === "ArrowRight") go((c) => c + 1); else if (e.key === "ArrowLeft") go((c) => c - 1);
			else if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); } else if (e.key === "Escape") navigate("/");
		};
		window.addEventListener("keydown", key);
		return () => window.removeEventListener("keydown", key);
	}, [go, navigate]);
	useEffect(() => { if (scene?.id === "launch") play("win"); }, [scene?.id]);

	if (!store.token) return <Navigate to="/login" replace />;
	if (!store.ready) return <><Sky phase="night" /><Loader /></>;

	const name = store.user.display_name || store.user.username;
	const bosses = store.goals.filter((g) => g.kind === "boss");
	const pillarOf = (id) => store.pillars.find((p) => p.id === id);
	const replay = () => { setSigned(false); setI(0); setPlaying(true); };
	const sign = async () => { setSigned(true); fireworks(3200); await act.launch(); };
	const tint = scene.id === "pillar" ? scene.p.color : scene.id === "money" ? "#E8B95B" : scene.id === "bosses" ? "#E27D60" : "#6C9BD9";

	return (
		<div className="premiere" style={{ "--tint": tint }}>
			<Sky phase={last ? "night" : "dawn"} />
			<div className="pr-tint" />
			<div className="pr-bars">{scenes.map((s, k) => <button key={k} className={cx("pr-bar", k < i && "past", k === i && "now", !playing && "paused")} style={{ "--ms": (s.ms || 1) + "ms" }} onClick={() => go(k)} aria-label={"Escena " + (k + 1)}><i /></button>)}</div>
			<button className="btn icon ghost pr-exit" onClick={() => navigate("/")} aria-label="Salir del estreno"><X size={20} /></button>

			<AnimatePresence mode="wait">
				<motion.section key={i} className={"pr-scene s-" + scene.id} initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96, filter: "blur(12px)" }} transition={{ duration: 0.6, ease }}>
					{scene.id === "count" && <Countdown />}

					{scene.id === "title" && (
						<motion.div className="pr-center" variants={stagger(0.14, 0.1)} initial="hide" animate="show">
							<motion.p className="pr-kicker" variants={up}>{name} presenta</motion.p>
							<h1 className="pr-year" aria-label="2027">{"2027".split("").map((d, k) => <motion.span key={k} variants={flip}>{d}</motion.span>)}</h1>
							<motion.p className="pr-motto" variants={up}>{store.user.motto || "El año en que lo hago realidad."}</motion.p>
						</motion.div>
					)}

					{scene.id === "numbers" && (
						<motion.div className="pr-center" variants={stagger(0.5, 0.2)} initial="hide" animate="show">
							<motion.p className="pr-kicker" variants={up}>Así está construido</motion.p>
							<div className="pr-specs">
								{[[store.pillars.length, "áreas de vida"], [store.goals.length, "metas"], [bosses.length, "jefes finales"], [store.habits.filter((h) => h.active).length, "hábitos"], [store.goals.reduce((a, g) => a + g.xp, 0), "XP en juego"]].map(([n, label]) => (
									<motion.div key={label} className="pr-spec" variants={up}><b><CountUp to={n} /></b><span>{label}</span></motion.div>
								))}
							</div>
						</motion.div>
					)}

					{scene.id === "pillar" && (() => {
						const p = scene.p, idx = store.pillars.findIndex((x) => x.id === p.id) + 1;
						const goals = store.goals.filter((g) => g.pillar_id === p.id), habits = store.habits.filter((h) => h.pillar_id === p.id && h.active);
						return (
							<motion.div className="pr-pillar" variants={stagger(0.1, 0.15)} initial="hide" animate="show">
								<motion.div className="pr-pillar-art" initial={{ rotateY: -70, opacity: 0, scale: 0.7 }} animate={{ rotateY: 0, opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 60, damping: 14 }}>
									<div className="pr-slab"><span>{p.emoji}</span><b className="num">{String(idx).padStart(2, "0")}</b></div>
								</motion.div>
								<div className="pr-pillar-copy">
									<motion.p className="pr-kicker" variants={up}>Pilar {idx} de {store.pillars.length}</motion.p>
									<motion.h2 variants={up}>{p.name}</motion.h2>
									{p.focus && <motion.p className="pr-focus" variants={up}>{p.focus}</motion.p>}
									<ul className="pr-goals">
										{goals.slice(0, 6).map((g) => (
											<motion.li key={g.id} variants={up} className={cx(g.kind === "boss" && "boss", g.status === "done" && "done")}>
												{g.kind === "boss" ? <Swords size={16} /> : <i />}<span>{g.title}</span><small>{g.month ? MON[g.month - 1] : g.quarter}</small>
											</motion.li>
										))}
									</ul>
									{habits.length > 0 && <motion.div className="chips" variants={up}>{habits.map((h) => <span key={h.id} className="tag">{h.emoji} {h.name}</span>)}</motion.div>}
								</div>
							</motion.div>
						);
					})()}

					{scene.id === "bosses" && (
						<motion.div className="pr-wide" variants={stagger(0.08, 0.3)} initial="hide" animate="show">
							<motion.p className="pr-kicker" variants={up}>El calendario de batallas</motion.p>
							<motion.h2 variants={up}>{bosses.length} jefes finales te esperan</motion.h2>
							<div className="pr-months">
								{MONTHS.map((m, k) => {
									const list = bosses.filter((b) => b.month === k + 1);
									return (
										<motion.div key={m} className={cx("pr-month", list.length && "has")} variants={up}>
											<span>{m.slice(0, 3)}</span>
											{list.map((b) => <div key={b.id} className="pr-boss" style={{ "--c": pillarOf(b.pillar_id)?.color }}><Swords size={13} /> {b.title}</div>)}
										</motion.div>
									);
								})}
							</div>
						</motion.div>
					)}

					{scene.id === "money" && (
						<motion.div className="pr-wide" variants={stagger(0.14, 0.3)} initial="hide" animate="show">
							<motion.p className="pr-kicker" variants={up}>Lo que lo financia</motion.p>
							<motion.h2 variants={up}>{cop(store.funds.reduce((a, f) => a + f.target, 0))} con nombre y fecha</motion.h2>
							<div className="pr-funds">
								{store.funds.slice(0, 5).map((f) => (
									<motion.div key={f.id} variants={up} className="pr-fund">
										<Liquid pct={f.target ? Math.max(6, (f.saved / f.target) * 100) : 6} color={f.color} height={170}><span className="pr-fund-emoji">{f.emoji}</span></Liquid>
										<b>{f.name}</b><small className="num">{cop(f.target)}</small>
									</motion.div>
								))}
							</div>
						</motion.div>
					)}

					{scene.id === "vision" && (
						<div className="pr-wide">
							<motion.p className="pr-kicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Así se va a ver</motion.p>
							<div className="board collage pr-board">
								{store.vision.slice(0, 8).map((v, k) => (
									<motion.div key={v.id} initial={{ opacity: 0, y: 200, rotate: k % 2 ? 30 : -30, scale: 0.6 }} animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }} transition={{ delay: 0.25 + k * 0.22, type: "spring", stiffness: 80, damping: 13 }}>
										<VisionTile item={v} index={k} total={8} />
									</motion.div>
								))}
							</div>
						</div>
					)}

					{scene.id === "launch" && (
						<>
							<Rocket3D go={signed} />
							<motion.div className="pr-launch" variants={stagger(0.2, 0.4)} initial="hide" animate="show">
								<motion.h1 variants={up}>{signed ? "Despegaste. Nos vemos en el siguiente nivel." : "Lo voy a lograr."}</motion.h1>
								<motion.p className="pr-motto" variants={up}>{signed ? "Tu firma quedó guardada. Ahora toca el primer hábito." : `${store.goals.length} metas, ${bosses.length} jefes finales y un año entero para ir por ellos.`}</motion.p>
								<motion.div className="row center wrap" variants={up}>
									{!signed && <button className="btn primary lg" onClick={sign}><PenLine size={18} /> Firmar mi compromiso</button>}
									{signed && <button className="btn primary lg" onClick={() => navigate("/")}>Ir a mi base</button>}
									<button className="btn lg" onClick={replay}><RotateCcw size={17} /> Ver de nuevo</button>
									<button className="btn lg ghost" onClick={() => navigate("/plan")}>Cambiar el plan</button>
								</motion.div>
							</motion.div>
						</>
					)}
				</motion.section>
			</AnimatePresence>

			<div className="pr-controls">
				<button className="btn icon ghost" onClick={() => go((c) => c - 1)} disabled={i === 0} aria-label="Anterior"><ChevronLeft size={20} /></button>
				{!last && <button className="btn icon" onClick={() => setPlaying(!playing)} aria-label={playing ? "Pausar" : "Reproducir"}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>}
				<button className="btn icon ghost" onClick={() => go((c) => c + 1)} disabled={last} aria-label="Siguiente"><ChevronRight size={20} /></button>
			</div>
			<Toasts />
		</div>
	);
};
