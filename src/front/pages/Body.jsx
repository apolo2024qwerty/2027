// Cuerpo: agua, sueño, peso y entrenamientos con sus gráficas.
import { useState } from "react";
import { ResponsiveContainer, BarChart, Bar as RBar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, ReferenceLine, LineChart, Line } from "recharts";
import { Plus, Minus, Trash2 } from "lucide-react";
import useGlobalReducer from "../hooks/useGlobalReducer";
import useActions from "../hooks/useActions";
import { Glass, PageHead, Liquid, Modal, Form, Stat, Empty, Slider, ChartTip, AXIS, GRID } from "../components/ui";
import { todayStr, lastDays, parseDay, DOW, WORKOUTS, shortDay, weekStart, addDays } from "../lib/game";

export const Body = () => {
	const { store } = useGlobalReducer();
	const act = useActions();
	const [modal, setModal] = useState(false);
	const today = todayStr();
	const log = store.dailyLogs.find((d) => d.day === today) || {};
	const goal = store.user.settings?.water_goal || 2500;
	const byDay = Object.fromEntries(store.dailyLogs.map((d) => [d.day, d]));
	const water = (ml) => act.saveDaily(today, { water_ml: Math.max(0, (log.water_ml || 0) + ml) });

	const days14 = lastDays(14);
	const waterData = lastDays(7).map((d) => ({ d: DOW[parseDay(d).getDay()], Agua: (byDay[d]?.water_ml || 0) / 1000 }));
	const sleepData = days14.map((d) => ({ d: shortDay(d), Sueño: byDay[d]?.sleep_hours ?? null }));
	const weightData = store.dailyLogs.filter((d) => d.weight_kg).sort((a, b) => a.day.localeCompare(b.day)).slice(-30).map((d) => ({ d: shortDay(d.day), Peso: d.weight_kg }));
	const weeks = Array.from({ length: 8 }, (_, i) => addDays(weekStart(today), (i - 7) * 7));
	const kmData = weeks.map((ws) => {
		const we = addDays(ws, 6), w = store.workouts.filter((x) => x.day >= ws && x.day <= we);
		return { d: shortDay(ws), Km: +w.reduce((a, x) => a + (x.km || 0), 0).toFixed(1), Min: w.reduce((a, x) => a + (x.minutes || 0), 0) };
	});
	const ws = weekStart(today), thisWeek = store.workouts.filter((w) => w.day >= ws);
	const sleeps = days14.map((d) => byDay[d]?.sleep_hours).filter(Boolean);
	const avgSleep = sleeps.length ? (sleeps.reduce((a, b) => a + b, 0) / sleeps.length).toFixed(1) : "–";
	const year = store.workouts.filter((w) => w.day.slice(0, 4) === today.slice(0, 4));

	return (
		<>
			<PageHead title="Tu cuerpo, en números claros" sub="Registrar toma diez segundos y cada registro suma XP. La constancia se ve en las gráficas.">
				<button className="btn primary" onClick={() => setModal(true)}><Plus size={16} /> Registrar entrenamiento</button>
			</PageHead>

			<div className="grid g3">
				<Glass className="pad water-big">
					<h3>Agua de hoy</h3>
					<Liquid pct={((log.water_ml || 0) / goal) * 100} color="#5FB6DE" height={210}>
						<b className="num huge">{((log.water_ml || 0) / 1000).toFixed(2).replace(".", ",")}</b>
						<span>litros de {(goal / 1000).toString().replace(".", ",")}</span>
					</Liquid>
					<div className="row">
						<button className="btn icon" onClick={() => water(-250)} aria-label="Quitar un vaso"><Minus size={16} /></button>
						<button className="btn grow" onClick={() => water(250)}>+ Vaso 250 ml</button>
						<button className="btn grow" onClick={() => water(500)}>+ Botella 500 ml</button>
					</div>
				</Glass>

				<Glass className="pad">
					<h3>Sueño y peso</h3>
					<Slider label="Horas que dormiste anoche" unit=" h" min="3" max="11" step="0.5" value={log.sleep_hours} fallback={7} onCommit={(v) => act.saveDaily(today, { sleep_hours: v })} />
					<label className="field"><span>Peso de hoy en kg (opcional)</span>
						<input className="input" type="number" step="0.1" inputMode="decimal" defaultValue={log.weight_kg ?? ""} placeholder="Ej. 72,5"
							onBlur={(e) => e.target.value && +e.target.value !== log.weight_kg && act.saveDaily(today, { weight_kg: e.target.value })} />
					</label>
					<div className="grid g2 mini-stats">
						<Stat label="Sueño promedio" value={avgSleep + " h"} sub="últimos 14 días" />
						<Stat label="Esta semana" value={thisWeek.length} sub="entrenamientos" />
					</div>
				</Glass>

				<Glass className="pad">
					<h3>Tu año en movimiento</h3>
					<div className="grid g2 mini-stats">
						<Stat label="Kilómetros" value={year.reduce((a, w) => a + (w.km || 0), 0).toFixed(0)} />
						<Stat label="Horas" value={(year.reduce((a, w) => a + (w.minutes || 0), 0) / 60).toFixed(0)} />
					</div>
					<div className="chips">
						{Object.entries(WORKOUTS).map(([k, w]) => <span key={k} className="tag">{w.emoji} {w.label} <b className="num">{year.filter((x) => x.kind === k).length}</b></span>)}
					</div>
				</Glass>
			</div>

			<div className="grid g2">
				<Glass className="pad chart-card">
					<h3>Agua, últimos 7 días</h3>
					<ResponsiveContainer width="100%" height={200}>
						<BarChart data={waterData}><CartesianGrid {...GRID} /><XAxis dataKey="d" {...AXIS} /><YAxis {...AXIS} width={28} unit=" L" />
							<Tooltip content={<ChartTip fmt={(v) => v.toFixed(2) + " L"} />} cursor={{ fill: "rgba(255,255,255,.05)" }} />
							<ReferenceLine y={goal / 1000} stroke="var(--gold)" strokeDasharray="4 4" />
							<RBar dataKey="Agua" fill="#5FB6DE" radius={[6, 6, 0, 0]} maxBarSize={34} /></BarChart>
					</ResponsiveContainer>
				</Glass>
				<Glass className="pad chart-card">
					<h3>Sueño, últimos 14 días</h3>
					<ResponsiveContainer width="100%" height={200}>
						<AreaChart data={sleepData}><defs><linearGradient id="gSleep" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9B8CE0" stopOpacity=".5" /><stop offset="1" stopColor="#9B8CE0" stopOpacity="0" /></linearGradient></defs>
							<CartesianGrid {...GRID} /><XAxis dataKey="d" {...AXIS} interval={2} /><YAxis {...AXIS} width={28} domain={[3, 11]} unit=" h" />
							<Tooltip content={<ChartTip fmt={(v) => v + " h"} />} />
							<Area dataKey="Sueño" stroke="#9B8CE0" strokeWidth={2} fill="url(#gSleep)" connectNulls dot={{ r: 3, fill: "#9B8CE0" }} /></AreaChart>
					</ResponsiveContainer>
				</Glass>
				<Glass className="pad chart-card">
					<h3>Kilómetros por semana</h3>
					<ResponsiveContainer width="100%" height={200}>
						<BarChart data={kmData}><CartesianGrid {...GRID} /><XAxis dataKey="d" {...AXIS} /><YAxis {...AXIS} width={28} />
							<Tooltip content={<ChartTip fmt={(v) => v + " km"} />} cursor={{ fill: "rgba(255,255,255,.05)" }} />
							<RBar dataKey="Km" fill="#E27D60" radius={[6, 6, 0, 0]} maxBarSize={34} /></BarChart>
					</ResponsiveContainer>
				</Glass>
				<Glass className="pad chart-card">
					<h3>Peso</h3>
					{weightData.length > 1 ? (
						<ResponsiveContainer width="100%" height={200}>
							<LineChart data={weightData}><CartesianGrid {...GRID} /><XAxis dataKey="d" {...AXIS} /><YAxis {...AXIS} width={34} domain={["dataMin - 1", "dataMax + 1"]} />
								<Tooltip content={<ChartTip fmt={(v) => v + " kg"} />} />
								<Line dataKey="Peso" stroke="#5FA57C" strokeWidth={2} dot={{ r: 3, fill: "#5FA57C" }} /></LineChart>
						</ResponsiveContainer>
					) : <Empty emoji="⚖️" title="Sin curva todavía">Registra tu peso dos días distintos y aquí aparece la tendencia, sin sube y baja.</Empty>}
				</Glass>
			</div>

			<Glass className="pad">
				<h3>Entrenamientos</h3>
				{store.workouts.length ? (
					<ul className="list">
						{store.workouts.slice(0, 12).map((w) => (
							<li key={w.id} className="item">
								<span className="item-emoji">{WORKOUTS[w.kind]?.emoji}</span>
								<div className="grow"><b>{WORKOUTS[w.kind]?.label}</b> <small className="muted">{shortDay(w.day)} {w.note && "· " + w.note}</small></div>
								<span className="num">{w.km ? w.km + " km · " : ""}{w.minutes} min</span>
								<button className="btn icon ghost" onClick={() => act.remove("workouts", w.id)} aria-label="Eliminar"><Trash2 size={14} /></button>
							</li>
						))}
					</ul>
				) : <Empty emoji="🏃" title="Tu primera sesión te espera">Caminar, correr, bailar, gimnasio o yoga: todo movimiento cuenta.</Empty>}
			</Glass>

			<Modal open={modal} onClose={() => setModal(false)} title="Registrar entrenamiento">
				<Form fields={[
					{ name: "kind", label: "Tipo", type: "select", options: Object.entries(WORKOUTS).map(([k, w]) => [k, `${w.emoji} ${w.label}`]) },
					{ name: "day", label: "Fecha", type: "date" },
					{ name: "minutes", label: "Minutos", type: "number", min: 1, required: true },
					{ name: "km", label: "Kilómetros (si aplica)", type: "number", step: "0.1" },
					{ name: "note", label: "Nota", placeholder: "Cómo te sentiste" },
				]} initial={{ kind: "run", day: today }} submit="Registrar"
					onSubmit={async (v) => { await act.create("workouts", { ...v, km: v.km || 0 }); setModal(false); }} />
			</Modal>
		</>
	);
};
