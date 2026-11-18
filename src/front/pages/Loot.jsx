// Botín y logros: los niveles, las medallas, la tienda de premios y el historial de XP.
import { useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Plus, Coins, Pencil } from "lucide-react";
import useGlobalReducer from "../hooks/useGlobalReducer";
import useActions from "../hooks/useActions";
import { Glass, PageHead, Modal, Form, Bar, ChartTip, AXIS, GRID, cx } from "../components/ui";
import { LEVELS, xpForLevel, levelInfo, achievements, lastDays, shortDay, iso } from "../lib/game";

export const Loot = () => {
	const { store } = useGlobalReducer();
	const act = useActions();
	const [modal, setModal] = useState(null);
	const lv = levelInfo(store.user.xp);
	const medals = achievements(store);
	const got = medals.filter((m) => m.ok).length;

	const byDay = {};
	store.xpEvents.forEach((e) => { const d = iso(new Date(e.created_at + "Z")); byDay[d] = (byDay[d] || 0) + e.xp; });
	const data = lastDays(14).map((d) => ({ d: shortDay(d), XP: byDay[d] || 0 }));

	return (
		<>
			<PageHead title="Todo lo que has ganado" sub="El XP te sube de nivel. Las monedas se gastan en premios que tú mismo defines: disciplina que se cobra." />

			<Glass className="pad trail-card">
				<div className="between wrap">
					<div><small className="muted">Nivel {lv.level}</small><h2>{lv.name}</h2></div>
					<div className="trail-next"><Bar pct={lv.pct} /><small className="muted num">{store.user.xp} XP · faltan {lv.left} para {lv.next}</small></div>
				</div>
				<div className="trail-scroll">
					<ol className="trail">
						{LEVELS.map((name, i) => (
							<li key={name} className={cx("trail-stop", i + 1 < lv.level && "past", i + 1 === lv.level && "here")} style={{ "--h": i }}>
								<span className="trail-dot">{i + 1 === lv.level ? "⭐" : i + 1 < lv.level ? "✓" : i + 1}</span>
								<b>{name}</b><small className="muted num">{xpForLevel(i + 1)} XP</small>
							</li>
						))}
					</ol>
				</div>
			</Glass>

			<div className="grid g2">
				<Glass className="pad">
					<div className="between"><h3>Tienda de premios</h3><span className="chip"><Coins size={15} color="var(--gold)" /><b className="num">{store.user.coins}</b></span></div>
					<ul className="list">
						{store.rewards.map((r) => {
							const can = store.user.coins >= r.cost;
							return (
								<li key={r.id} className="item reward">
									<span className="item-emoji">{r.emoji}</span>
									<div className="grow"><b>{r.name}</b>{r.redeemed > 0 && <small className="muted"> · canjeado {r.redeemed} {r.redeemed === 1 ? "vez" : "veces"}</small>}
										{!can && <Bar pct={(store.user.coins / r.cost) * 100} />}</div>
									<button className="btn icon ghost" onClick={() => setModal(r)} aria-label="Editar premio"><Pencil size={14} /></button>
									<button className={cx("btn sm", can && "primary")} disabled={!can} onClick={() => act.redeem(r.id)}>{r.cost} 🪙</button>
								</li>
							);
						})}
					</ul>
					<button className="link" onClick={() => setModal({})}><Plus size={14} /> Crear un premio</button>
				</Glass>

				<Glass className="pad chart-card">
					<h3>XP de los últimos 14 días</h3>
					<ResponsiveContainer width="100%" height={220}>
						<AreaChart data={data}>
							<defs><linearGradient id="gXp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#E8B95B" stopOpacity=".5" /><stop offset="1" stopColor="#E8B95B" stopOpacity="0" /></linearGradient></defs>
							<CartesianGrid {...GRID} /><XAxis dataKey="d" {...AXIS} interval={2} /><YAxis {...AXIS} width={34} />
							<Tooltip content={<ChartTip fmt={(v) => v + " XP"} />} />
							<Area dataKey="XP" stroke="#E8B95B" strokeWidth={2} fill="url(#gXp)" />
						</AreaChart>
					</ResponsiveContainer>
				</Glass>
			</div>

			<Glass className="pad">
				<div className="between"><h3>Medallas</h3><span className="pill num">{got}/{medals.length}</span></div>
				<div className="medals">
					{medals.map((m) => (
						<div key={m.name} className={cx("medal", m.ok && "on")}>
							<span className="medal-emoji">{m.emoji}</span><b>{m.name}</b><small className="muted">{m.desc}</small>
						</div>
					))}
				</div>
			</Glass>

			<Glass className="pad">
				<h3>Historial</h3>
				{store.xpEvents.length ? (
					<ul className="list tight ledger">
						{store.xpEvents.slice(0, 30).map((e) => (
							<li key={e.id} className="item">
								<span className="grow">{e.reason}</span>
								<small className="muted">{shortDay(iso(new Date(e.created_at + "Z")))}</small>
								{!!e.xp && <b className={cx("num", e.xp > 0 ? "good" : "bad")}>{e.xp > 0 ? "+" : ""}{e.xp} XP</b>}
								{!!e.coins && <b className={cx("num", e.coins > 0 ? "gold" : "bad")}>{e.coins > 0 ? "+" : ""}{e.coins} 🪙</b>}
							</li>
						))}
					</ul>
				) : <p className="muted">Marca tu primer hábito y el historial empieza a escribirse.</p>}
			</Glass>

			<Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? "Editar premio" : "Nuevo premio"}>
				{modal && <Form key={modal.id || "new"} fields={[
					{ name: "name", label: "¿Con qué te vas a premiar?", required: true, placeholder: "Ej. Cena en ese restaurante" },
					{ name: "emoji", label: "Emoji" }, { name: "cost", label: "Precio en monedas", type: "number", min: 1, required: true },
				]} initial={{ emoji: "🎁", cost: 100, ...modal }}
					onSubmit={async (v) => { if (modal.id) await act.update("rewards", modal.id, v); else await act.create("rewards", v); setModal(null); }}
					onDelete={modal.id ? async () => { await act.remove("rewards", modal.id); setModal(null); } : null} />}
			</Modal>
		</>
	);
};
