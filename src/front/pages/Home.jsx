// Inicio: el tablero del día y la Rueda de la Vida.
import { Link } from "react-router-dom";
import { Swords, Play, ArrowUpRight, Droplets } from "lucide-react";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import useActions from "../hooks/useActions";
import { useTimers, mmss } from "../context/Timers";
import { Glass, Bar, CheckBtn, Liquid, cx } from "../components/ui";
import { Wheel, wheelAverage } from "../components/Wheel";
import { todayStr, niceDay, habitCount, MONTHS, cop, copShort } from "../lib/game";

const MOODS = ["😣", "😕", "😐", "🙂", "🤩"];
const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches"; };

export const Home = () => {
	const { store } = useGlobalReducer();
	const act = useActions();
	const timers = useTimers();
	const today = todayStr();
	const name = (store.user.display_name || store.user.username).split(" ")[0];

	const now = new Date();
	const before = now < new Date(2027, 0, 1);
	const daysLeft = Math.ceil((new Date(2027, 0, 1) - now) / 86400000);
	const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);

	const habits = store.habits.filter((h) => h.active);
	const daily = habits.filter((h) => h.period === "day");
	const dailyDone = daily.filter((h) => habitCount(h, store.habitLogs, today)).length;
	const others = habits.filter((h) => h.period !== "day");
	const pillar = (id) => store.pillars.find((p) => p.id === id);

	const goalsDone = store.goals.filter((g) => g.status === "done").length;
	const scores = store.user.settings?.wheel || {};
	const avg = wheelAverage(store.pillars, scores), rated = avg > 0;
	const bosses = store.goals.filter((g) => g.kind === "boss" && g.status !== "done").sort((a, b) => (a.month || 13) - (b.month || 13)).slice(0, 3);

	const log = store.dailyLogs.find((d) => d.day === today) || {};
	const waterGoal = store.user.settings?.water_goal || 2500;
	const month = today.slice(0, 7);
	const tx = store.transactions.filter((t) => t.day.slice(0, 7) === month);
	const sum = (k) => tx.filter((t) => t.kind === k).reduce((a, t) => a + t.amount, 0);
	const income = sum("income"), expense = sum("expense"), saved = sum("saving") + sum("invest");
	const focusToday = store.focus.filter((f) => f.kind === "focus" && f.day === today).reduce((a, f) => a + f.minutes, 0);

	return (
		<div className="grid home">
			<Glass className="hero span-all">
				<div className="hero-copy">
					<p className="muted">{greeting()}, {name}. Hoy es {niceDay(today)}.</p>
					{before ? (
						<h1 className="hero-count"><span className="num">{daysLeft}</span> días para tu 2027</h1>
					) : (
						<h1 className="hero-count">Día <span className="num">{dayOfYear}</span> de 365</h1>
					)}
					<p className="hero-motto">{store.user.motto || "Mi 2027 empieza hoy."}</p>
					<div className="row wrap">
						<Link to="/estreno" className="btn primary"><Play size={16} /> Ver el estreno de mi 2027</Link>
						<Link to="/plan" className="btn">{store.goals.length ? `${goalsDone} de ${store.goals.length} metas cumplidas` : "Escribir mi primera meta"}</Link>
					</div>
				</div>
				<div className="hero-side">
					<Link to="/plan?ver=rueda" className="hero-wheel" title="Abrir mi Rueda de la Vida">
						<Wheel pillars={store.pillars} scores={scores} />
						<span className="hero-wheel-txt">
							{rated ? <><b className="num big">{avg.toFixed(1).replace(".", ",")}</b><small className="muted">tu rueda hoy, de 10</small></>
								: <><b>Califica tu rueda</b><small className="muted">¿cómo está hoy cada área de tu vida?</small></>}
						</span>
					</Link>
				</div>
			</Glass>

			<Glass className="pad span-2">
				<div className="between">
					<h3>Misiones de hoy</h3>
					<span className="pill num">{dailyDone}/{daily.length}</span>
				</div>
				<Bar pct={daily.length ? (dailyDone / daily.length) * 100 : 0} color="var(--jungle)" />
				<ul className="list tight">
					{daily.map((h) => {
						const on = !!habitCount(h, store.habitLogs, today);
						return (
							<li key={h.id} className={cx("item", on && "done")}>
								<CheckBtn on={on} color={pillar(h.pillar_id)?.color} onClick={() => act.toggleHabit(h.id)} label={h.name} />
								<span className="item-emoji">{h.emoji}</span><span className="grow">{h.name}</span>
								<small className="muted num">+{h.xp} XP</small>
							</li>
						);
					})}
				</ul>
				{others.length > 0 && <>
					<h4 className="sub-title">Esta semana y este mes</h4>
					<div className="chips">
						{others.map((h) => {
							const n = habitCount(h, store.habitLogs, today), on = store.habitLogs.some((l) => l.habit_id === h.id && l.day === today);
							return (
								<button key={h.id} className={cx("chip-btn", on && "on", n >= h.target && "full")} style={{ "--c": pillar(h.pillar_id)?.color }} onClick={() => act.toggleHabit(h.id)}>
									{h.emoji} {h.name} <b className="num">{n}/{h.target}</b>
								</button>
							);
						})}
					</div>
				</>}
			</Glass>

			<Glass className="pad span-2">
				<div className="between"><h3>Próximos jefes</h3><Swords size={18} color="var(--coral)" /></div>
				{bosses.length ? (
					<ul className="list">
						{bosses.map((g) => (
							<li key={g.id} className="boss-row" style={{ "--c": pillar(g.pillar_id)?.color }}>
								<span className="boss-month">{g.month ? MONTHS[g.month - 1].slice(0, 3) : g.quarter}</span>
								<span className="grow">{g.title}</span>
								<small className="num gold">+{g.xp}</small>
							</li>
						))}
					</ul>
				) : <p className="muted">{store.goals.length ? "No queda ningún jefe en pie. Agrega uno más grande en el plan." : "Un jefe final es ese sueño grande que da miedo y ganas a la vez. Escribe el primero en tu plan."}</p>}
				<Link to="/plan" className="link">Ver todo el plan <ArrowUpRight size={14} /></Link>
			</Glass>

			<Glass className="pad water-card">
				<div className="between"><h3>Agua</h3><Droplets size={18} color="var(--ice)" /></div>
				<Liquid pct={((log.water_ml || 0) / waterGoal) * 100} color="#5FB6DE" height={120}>
					<b className="num big">{((log.water_ml || 0) / 1000).toFixed(2).replace(".", ",")} L</b>
					<small>de {(waterGoal / 1000).toString().replace(".", ",")} L</small>
				</Liquid>
				<div className="row">
					<button className="btn sm grow" onClick={() => act.saveDaily(today, { water_ml: (log.water_ml || 0) + 250 })}>+ Vaso</button>
					<button className="btn sm grow" onClick={() => act.saveDaily(today, { water_ml: (log.water_ml || 0) + 500 })}>+ Botella</button>
				</div>
			</Glass>

			<Glass className="pad">
				<h3>Enfoque</h3>
				<div className="focus-mini">
					<b className="num big">{timers.pomo.running ? mmss(timers.pomoLeft) : Math.round(focusToday) + " min"}</b>
					<span className="muted">{timers.pomo.running ? (timers.pomo.phase === "focus" ? "en curso: " + (timers.pomo.label || timers.zone.name) : "descansando") : "de trabajo profundo hoy"}</span>
				</div>
				<Link to="/enfoque" className="btn"><Play size={15} /> {timers.pomo.running ? "Volver al bloque" : "Entrar a la zona"}</Link>
			</Glass>

			<Glass className="pad span-2">
				<h3>¿Cómo estás hoy?</h3>
				<div className="moods">
					{MOODS.map((m, i) => (
						<button key={i} className={cx("mood", log.mood === i + 1 && "on")} onClick={() => act.saveDaily(today, { mood: i + 1 })} aria-label={"Ánimo " + (i + 1) + " de 5"}>{m}</button>
					))}
				</div>
				<Link to="/respira" className="link">Tomar un minuto para respirar <ArrowUpRight size={14} /></Link>
			</Glass>

			<Glass className="pad span-all">
				<div className="between"><h3>Tu mes en plata</h3><Link to="/finanzas" className="link">Abrir finanzas <ArrowUpRight size={14} /></Link></div>
				{tx.length ? (
					<div className="money-row">
						<div><span className="muted">Entró</span><b className="num">{cop(income)}</b></div>
						<div><span className="muted">Salió</span><b className="num">{cop(expense)}</b></div>
						<div><span className="muted">Guardaste</span><b className="num gold">{cop(saved)}</b></div>
						<div><span className="muted">Libre</span><b className={cx("num", income - expense - saved < 0 && "bad")}>{cop(income - expense - saved)}</b></div>
					</div>
				) : <p className="muted">Aún no hay movimientos este mes. Registra el primero y gana XP por llevar las cuentas.</p>}
				{!store.funds.length && <p className="muted">Crea un cofre para cada sueño que cuesta plata: un viaje, un curso, tu fondo de emergencia.</p>}
				<div className="fund-strip">
					{store.funds.slice(0, 4).map((f) => (
						<div key={f.id} className="fund-mini" style={{ "--c": f.color }}>
							<span>{f.emoji} {f.name}</span>
							<Bar pct={f.target ? (f.saved / f.target) * 100 : 0} color={f.color} />
							<small className="muted num">{copShort(f.saved)} de {copShort(f.target)}</small>
						</div>
					))}
				</div>
			</Glass>
		</div>
	);
};
