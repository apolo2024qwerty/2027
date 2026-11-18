// Enfoque: zonas de concentración (pomodoro) y cronómetro de redes sociales.
import { useState, useEffect } from "react";
import { Play, Pause, Square, SkipForward, Volume2, VolumeX, Smartphone, Wind } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar as RBar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { useTimers, ZONES, mmss } from "../context/Timers";
import { Glass, PageHead, Stat, ChartTip, AXIS, GRID, cx } from "../components/ui";
import { todayStr, lastDays, parseDay, DOW } from "../lib/game";
import { ambient } from "../lib/fx";

export const Focus = () => {
	const { store } = useGlobalReducer();
	const t = useTimers();
	const [wind, setWind] = useState(false);
	useEffect(() => { ambient(wind); return () => ambient(false); }, [wind]);

	const today = todayStr();
	const focus = store.focus.filter((f) => f.kind === "focus"), social = store.focus.filter((f) => f.kind === "social");
	const minToday = focus.filter((f) => f.day === today).reduce((a, f) => a + f.minutes, 0);
	const socToday = social.filter((f) => f.day === today).reduce((a, f) => a + f.minutes, 0) + (t.social.running ? t.socialMs / 60000 : 0);
	const data = lastDays(7).map((d) => ({
		d: DOW[parseDay(d).getDay()],
		Enfoque: Math.round(focus.filter((f) => f.day === d).reduce((a, f) => a + f.minutes, 0)),
		Redes: Math.round(social.filter((f) => f.day === d).reduce((a, f) => a + f.minutes, 0)),
	}));

	const pct = 1 - Math.max(0, t.pomoLeft) / t.pomo.total;
	const R = 132, C = 2 * Math.PI * R;
	const resting = t.pomo.phase === "rest";
	const idle = !t.pomo.running && t.pomo.left === t.pomo.total;
	const socialPct = Math.min(1, t.socialMs / (t.social.planned * 60000));

	return (
		<>
			<PageHead title="Una sola cosa a la vez" sub="Elige una zona, escribe en qué vas a trabajar y deja esta pestaña abierta: el tiempo se ve en el título." />

			<div className="grid focus-grid">
				<Glass className={cx("pad focus-main", t.pomo.running && "running", resting && "resting")}>
					<div className="zones">
						{ZONES.map((z) => (
							<button key={z.id} className={cx("zone", t.pomo.zone === z.id && "on")} disabled={!idle} onClick={() => t.setZone(z.id)}>
								<b>{z.name}</b><span className="num">{z.focus} + {z.rest}</span><small>{z.desc}</small>
							</button>
						))}
					</div>

					<div className="dial">
						<svg viewBox="0 0 300 300" className="dial-svg">
							<circle cx="150" cy="150" r={R} className="dial-track" />
							<circle cx="150" cy="150" r={R} className="dial-arc" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} transform="rotate(-90 150 150)" />
							{Array.from({ length: 60 }, (_, i) => <line key={i} x1="150" y1="6" x2="150" y2={i % 5 ? 10 : 14} className="dial-tick" transform={`rotate(${i * 6} 150 150)`} />)}
						</svg>
						<div className="dial-in">
							<span className="muted">{resting ? "Descanso" : t.zone.name}</span>
							<b className="num dial-time">{mmss(t.pomoLeft)}</b>
							<small className="muted">{resting ? "Párate, estira, mira lejos" : `Bloque ${t.pomo.rounds + 1} de hoy`}</small>
						</div>
					</div>

					<input className="input focus-label" placeholder="¿En qué vas a trabajar? Ej. Terminar la propuesta" value={t.pomo.label} onChange={(e) => t.setLabel(e.target.value)} />

					<div className="row center">
						{t.pomo.running
							? <button className="btn lg" onClick={t.pause}><Pause size={18} /> Pausar</button>
							: <button className="btn primary lg" onClick={t.start}><Play size={18} /> {idle ? "Empezar bloque" : "Continuar"}</button>}
						{!idle && !resting && <button className="btn lg ghost" onClick={t.stop}><Square size={16} /> Terminar y guardar</button>}
						{resting && <button className="btn lg ghost" onClick={t.skipRest}><SkipForward size={16} /> Saltar descanso</button>}
						<button className={cx("btn icon lg", wind && "primary")} onClick={() => setWind(!wind)} aria-pressed={wind} aria-label="Viento de páramo" title="Viento de páramo: ruido suave para concentrarte">
							{wind ? <Volume2 size={18} /> : <VolumeX size={18} />}
						</button>
					</div>
					<p className="muted center-text">Cada 5 minutos de enfoque valen 2 XP. Un bloque completo suma monedas.</p>
				</Glass>

				<div className="col">
					<Glass className={cx("pad social", t.social.running && "running", t.socialOver && "over")}>
						<div className="between"><h3>Pausa de redes</h3><Smartphone size={18} /></div>
						<p className="muted">Decide cuánto te das antes de abrir Instagram. Si vuelves a tiempo ganas XP; si te pasas, lo pierdes.</p>
						{!t.social.running ? (
							<>
								<div className="chips">
									{[5, 10, 15, 20].map((m) => <button key={m} className={cx("chip-btn", t.social.planned === m && "on")} onClick={() => t.setPlanned(m)}>{m} min</button>)}
								</div>
								<button className="btn" onClick={t.startSocial}><Play size={15} /> Empezar mi pausa</button>
							</>
						) : (
							<>
								<b className="num social-time">{mmss(t.socialMs)}</b>
								<div className={cx("bar", t.socialOver && "over")}><i style={{ width: socialPct * 100 + "%" }} /></div>
								<small className="muted">{t.socialOver ? "Te pasaste. Cada minuto extra cuesta 2 XP." : `Te diste ${t.social.planned} minutos`}</small>
								<button className="btn primary" onClick={t.stopSocial}>Ya volví al trabajo</button>
							</>
						)}
					</Glass>

					<Glass className="pad">
						<div className="grid g2 mini-stats">
							<Stat label="Enfoque hoy" value={Math.round(minToday) + " min"} />
							<Stat label="Redes hoy" value={Math.round(socToday) + " min"} color={socToday > minToday && socToday > 0 ? "var(--coral)" : undefined} />
						</div>
						<ResponsiveContainer width="100%" height={170}>
							<BarChart data={data} barGap={2}><CartesianGrid {...GRID} /><XAxis dataKey="d" {...AXIS} /><YAxis {...AXIS} width={30} />
								<Tooltip content={<ChartTip fmt={(v) => v + " min"} />} cursor={{ fill: "rgba(255,255,255,.05)" }} />
								<RBar dataKey="Enfoque" fill="#E8B95B" radius={[5, 5, 0, 0]} maxBarSize={18} />
								<RBar dataKey="Redes" fill="#E27D60" radius={[5, 5, 0, 0]} maxBarSize={18} /></BarChart>
						</ResponsiveContainer>
					</Glass>
				</div>
			</div>

			<Glass className="pad">
				<h3>Bloques recientes</h3>
				{store.focus.length ? (
					<ul className="list tight">
						{store.focus.slice(0, 8).map((f) => (
							<li key={f.id} className="item">
								<span className="item-emoji">{f.kind === "focus" ? "🎯" : f.kind === "social" ? "📱" : <Wind size={16} />}</span>
								<span className="grow">{f.label || (f.kind === "focus" ? "Enfoque" : f.kind === "social" ? "Redes sociales" : "Respiración")}</span>
								<small className="muted">{f.day === today ? "hoy" : f.day.slice(5)}</small>
								<b className="num">{Math.round(f.minutes)} min</b>
							</li>
						))}
					</ul>
				) : <p className="muted">Tu primer bloque aparece aquí cuando suene la campana.</p>}
			</Glass>
		</>
	);
};
