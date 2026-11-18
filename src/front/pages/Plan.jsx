// Plan 2027: la Rueda de la Vida, las metas por área y los jefes finales.
import { useState } from "react";
import { Plus, Pencil, Swords, Play } from "lucide-react";
import { Link } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import useActions from "../hooks/useActions";
import { Glass, PageHead, Ring, Tabs, Modal, Form, CheckBtn, Bar, Empty, cx } from "../components/ui";
import { MONTHS } from "../lib/game";
import { Wheel, wheelAverage } from "../components/Wheel";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4", "Anual"];
const Q_LABEL = { Q1: "Enero a marzo", Q2: "Abril a junio", Q3: "Julio a septiembre", Q4: "Octubre a diciembre", Anual: "Todo el año" };

export const Plan = () => {
	const { store } = useGlobalReducer();
	const act = useActions();
	const [view, setView] = useState("rueda");
	const [goalModal, setGoalModal] = useState(null);   // {} nuevo | meta existente
	const [pillarModal, setPillarModal] = useState(null);
	const pillar = (id) => store.pillars.find((p) => p.id === id);
	const scores = store.user.settings?.wheel || {};
	const avg = wheelAverage(store.pillars, scores);
	const rate = (p, n) => act.saveProfile({ settings: { wheel: { ...scores, [p.id]: n } } });
	const lowest = store.pillars.filter((p) => +scores[p.id] > 0).sort((a, b) => scores[a.id] - scores[b.id])[0];
	const done = store.goals.filter((g) => g.status === "done").length;
	const xpTotal = store.goals.reduce((a, g) => a + g.xp, 0), xpWon = store.goals.filter((g) => g.status === "done").reduce((a, g) => a + g.xp, 0);

	const goalFields = [
		{ name: "title", label: "¿Qué vas a lograr?", required: true, placeholder: "Ej. Aprender inglés hasta poder viajar solo" },
		{ name: "pillar_id", label: "Área de tu vida", type: "select", options: store.pillars.map((p) => [p.id, `${p.emoji} ${p.name}`]) },
		{ name: "kind", label: "Tamaño del reto", type: "select", options: [["side", "Misión (+100 XP)"], ["boss", "Jefe final (+500 XP)"]] },
		{ name: "quarter", label: "Trimestre", type: "select", options: QUARTERS.map((q) => [q, q === "Anual" ? "Todo el año" : `${q}: ${Q_LABEL[q]}`]) },
		{ name: "month", label: "Mes objetivo", type: "select", options: [["", "Sin mes fijo"], ...MONTHS.map((m, i) => [i + 1, m])] },
		{ name: "notes", label: "¿Cómo lo vas a concretar?", type: "textarea", placeholder: "Primer paso, con quién, qué necesitas" },
	];
	const saveGoal = async (v) => {
		const kind = v.kind || "side";
		const data = { ...v, pillar_id: v.pillar_id || store.pillars[0]?.id, xp: kind === "boss" ? 500 : 100, coins: kind === "boss" ? 100 : 20 };
		if (goalModal.id) await act.update("goals", goalModal.id, data); else await act.create("goals", data);
		setGoalModal(null);
	};

	const GoalRow = ({ g, showPillar }) => {
		const p = pillar(g.pillar_id);
		return (
			<li className={cx("goal", g.status, g.kind === "boss" && "is-boss")} style={{ "--c": p?.color }}>
				<CheckBtn on={g.status === "done"} color={p?.color} onClick={() => act.completeGoal(g.id)} label={"Cumplir " + g.title} />
				<button className="goal-body" onClick={() => setGoalModal(g)}>
					<span className="goal-title">{g.kind === "boss" && <Swords size={14} />} {g.title}</span>
					<span className="goal-meta">
						{showPillar && p && <span className="tag">{p.emoji} {p.short}</span>}
						<span>{g.month ? MONTHS[g.month - 1] : Q_LABEL[g.quarter]}</span>
						{g.status === "doing" && <span className="tag live">en curso</span>}
					</span>
				</button>
				{g.status === "pending" && <button className="btn sm ghost" onClick={() => act.update("goals", g.id, { status: "doing" })}>Empezar</button>}
				<b className="num goal-xp">+{g.xp}</b>
			</li>
		);
	};

	return (
		<>
			<PageHead title="Tu 2027, área por área" sub={`${done} de ${store.goals.length} metas cumplidas. ${xpWon} de ${xpTotal} XP del plan ya son tuyos.`}>
				<Tabs value={view} onChange={setView} options={[["rueda", "Rueda de la vida"], ["pilares", "Metas por área"], ["trimestres", "Por trimestre"], ["jefes", "Jefes finales"]]} />
				<button className="btn primary" onClick={() => setGoalModal({})}><Plus size={16} /> Nueva meta</button>
			</PageHead>

			{view === "rueda" && (
				<Glass className="pad wheel-panel">
					<div className="wheel-side">
						<Wheel pillars={store.pillars} scores={scores} onRate={rate} />
						<p className="muted">Toca cada porción a la altura de tu nota: cerca del centro es 1, en el borde es 10.</p>
					</div>
					<div className="wheel-list">
						<div>
							<h3>{avg ? <>Tu rueda hoy: <span className="num gold">{avg.toFixed(1).replace(".", ",")}</span> de 10</> : "¿Cómo está hoy cada área de tu vida?"}</h3>
							<p className="muted">{lowest && scores[lowest.id] < 10 ? `Una rueda gira bien cuando está pareja. ${lowest.name} es la que más espacio tiene para crecer: ponle una meta.` : "Califica con honestidad de 1 a 10. No es un examen: es el punto de partida para decidir qué soñar en 2027."}</p>
						</div>
						<ul className="list tight">
							{store.pillars.map((p) => {
								const goals = store.goals.filter((g) => g.pillar_id === p.id), d = goals.filter((g) => g.status === "done").length, s = +scores[p.id] || 0;
								return (
									<li key={p.id} className="area-row" style={{ "--c": p.color }}>
										<span className="area-emoji">{p.emoji}</span>
										<div className="grow">
											<b>{p.name}</b>
											<small className="muted">{goals.length ? `${d} de ${goals.length} metas cumplidas` : p.focus || "Sin metas todavía"}</small>
										</div>
										<div className="area-dots" role="group" aria-label={"Nota de " + p.name}>
											{Array.from({ length: 10 }, (_, k) => <button key={k} className={cx("area-dot", k < s && "on")} onClick={() => rate(p, k + 1)} aria-label={`${k + 1} de 10`} />)}
										</div>
										<b className="num area-score">{s || "–"}</b>
										<button className="btn sm ghost" onClick={() => setGoalModal({ pillar_id: p.id })}><Plus size={14} /> Meta</button>
									</li>
								);
							})}
						</ul>
					</div>
				</Glass>
			)}

			{view === "pilares" && (
				<div className="grid g2">
					{store.pillars.map((p, i) => {
						const goals = store.goals.filter((g) => g.pillar_id === p.id);
						const d = goals.filter((g) => g.status === "done").length;
						const habits = store.habits.filter((h) => h.pillar_id === p.id && h.active);
						return (
							<Glass key={p.id} className="pad pillar" color={p.color}>
								<div className="pillar-head">
									<span className="pillar-emoji">{p.emoji}</span>
									<div className="grow">
										<small className="muted">{scores[p.id] ? `Hoy: ${scores[p.id]} de 10` : "Sin calificar"}</small>
										<h3>{p.name}</h3>
									</div>
									<Ring pct={goals.length ? (d / goals.length) * 100 : 0} size={52} stroke={5} color={p.color}><b className="num">{d}/{goals.length}</b></Ring>
									<button className="btn icon ghost" onClick={() => setPillarModal(p)} aria-label="Editar área"><Pencil size={15} /></button>
								</div>
								{p.focus && <p className="pillar-focus">{p.focus}</p>}
								<ul className="list tight">{goals.map((g) => <GoalRow key={g.id} g={g} />)}</ul>
								{habits.length > 0 && <div className="chips">{habits.map((h) => <span key={h.id} className="tag">{h.emoji} {h.name}</span>)}</div>}
								<button className="link" onClick={() => setGoalModal({ pillar_id: p.id })}><Plus size={14} /> Agregar meta a esta área</button>
							</Glass>
						);
					})}
					<button className="glass pad add-card" onClick={() => setPillarModal({})}><Plus size={22} /> Nueva área</button>
				</div>
			)}

			{view === "trimestres" && (
				<div className="quarters">
					{QUARTERS.map((q) => {
						const goals = store.goals.filter((g) => g.quarter === q).sort((a, b) => (a.month || 13) - (b.month || 13));
						const d = goals.filter((g) => g.status === "done").length;
						return (
							<Glass key={q} className="pad quarter">
								<div className="between"><div><h3>{q === "Anual" ? "Anual" : q}</h3><small className="muted">{Q_LABEL[q]}</small></div><span className="pill num">{d}/{goals.length}</span></div>
								<Bar pct={goals.length ? (d / goals.length) * 100 : 0} />
								<ul className="list tight">{goals.map((g) => <GoalRow key={g.id} g={g} showPillar />)}</ul>
								{!goals.length && <p className="muted">Nada planeado aquí todavía.</p>}
							</Glass>
						);
					})}
				</div>
			)}

			{view === "jefes" && (
				<div className="grid g3">
					{store.goals.filter((g) => g.kind === "boss").sort((a, b) => (a.month || 13) - (b.month || 13)).map((g) => {
						const p = pillar(g.pillar_id), beaten = g.status === "done";
						return (
							<Glass tilt key={g.id} className={cx("pad boss-card", beaten && "beaten")} color={p?.color}>
								<div className="between"><span className="tag">{p?.emoji} {p?.short}</span><span className="boss-when">{g.month ? MONTHS[g.month - 1] : g.quarter}</span></div>
								<div className="boss-emoji">{beaten ? "🏆" : "⚔️"}</div>
								<h3>{g.title}</h3>
								<p className="muted">{g.notes}</p>
								<div className="between">
									<b className="num gold">+{g.xp} XP · +{g.coins} 🪙</b>
									<button className={cx("btn sm", !beaten && "primary")} onClick={() => act.completeGoal(g.id)}>{beaten ? "Reabrir" : "Derrotado"}</button>
								</div>
							</Glass>
						);
					})}
					{!store.goals.some((g) => g.kind === "boss") && <Empty emoji="⚔️" title="Sin jefes finales">Crea una meta de tamaño jefe final: lo que más miedo y más ganas te da.</Empty>}
				</div>
			)}

			<Glass className="pad premiere-cta">
				<div><h3>¿Ya quedó como lo sueñas?</h3><p className="muted">Mira tu año presentado como un lanzamiento. Puedes repetirlo cada vez que cambies algo.</p></div>
				<Link to="/estreno" className="btn primary lg"><Play size={17} /> Ver el estreno</Link>
			</Glass>

			<Modal open={!!goalModal} onClose={() => setGoalModal(null)} title={goalModal?.id ? "Editar meta" : "Nueva meta"}>
				{goalModal && <Form key={goalModal.id || "new"} fields={goalFields}
					initial={{ kind: "side", quarter: "Q1", pillar_id: store.pillars[0]?.id, ...goalModal, month: goalModal.month || "" }}
					onSubmit={saveGoal}
					onDelete={goalModal.id ? async () => { await act.remove("goals", goalModal.id); setGoalModal(null); } : null} />}
			</Modal>

			<Modal open={!!pillarModal} onClose={() => setPillarModal(null)} title={pillarModal?.id ? "Editar área" : "Nueva área"}>
				{pillarModal && <Form key={pillarModal.id || "new"}
					fields={[
						{ name: "name", label: "Nombre", required: true }, { name: "short", label: "Nombre corto", placeholder: "Una palabra" },
						{ name: "emoji", label: "Emoji" }, { name: "color", label: "Color", type: "color" },
						{ name: "focus", label: "Pregunta guía", type: "textarea", placeholder: "¿Qué quieres lograr en esta área?" },
					]}
					initial={{ emoji: "⭐", color: "#E8B95B", ...pillarModal }}
					onSubmit={async (v) => {
						const data = { ...v, short: v.short || v.name.split(" ")[0], position: pillarModal.position ?? store.pillars.length };
						if (pillarModal.id) await act.update("pillars", pillarModal.id, data); else await act.create("pillars", data);
						setPillarModal(null);
					}}
					onDelete={pillarModal.id ? async () => { await act.remove("pillars", pillarModal.id); setPillarModal(null); } : null} />}
			</Modal>
		</>
	);
};
