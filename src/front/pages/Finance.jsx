// Finanzas: resumen, movimientos, presupuesto 50/30/20, cofres, inversiones y plan para una meta.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { Plus, Trash2, Pencil, Sparkles, ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import useGlobalReducer from "../hooks/useGlobalReducer";
import useActions from "../hooks/useActions";
import { Glass, PageHead, Tabs, Modal, Form, Bar, Liquid, Stat, Empty, Field, ChartTip, AXIS, GRID, cx } from "../components/ui";
import { todayStr, cop, copShort, MON, MONTHS, monthsUntil, shortDay, parseDay } from "../lib/game";

const KIND = { income: "Ingreso", expense: "Gasto", saving: "Ahorro", invest: "Inversión" };
const INCOME_CATS = ["Salario", "Negocio propio", "Trabajos independientes", "Ventas", "Rendimientos", "Otros ingresos"];
const PIE = ["#E8B95B", "#E27D60", "#6C9BD9", "#5FA57C", "#9B8CE0", "#D58BB8", "#7FC8C0", "#D9A066", "#BFE0EE"];
const shiftMonth = (ym, n) => { const [y, m] = ym.split("-").map(Number); const d = new Date(y, m - 1 + n, 1); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); };
const monthName = (ym) => MONTHS[+ym.slice(5) - 1] + " " + ym.slice(0, 4);

export const Finance = () => {
	const { store } = useGlobalReducer();
	const act = useActions();
	const navigate = useNavigate();
	const today = todayStr();
	const [tab, setTab] = useState("resumen");
	const [ym, setYm] = useState(today.slice(0, 7));
	const [txModal, setTxModal] = useState(null);
	const [fundModal, setFundModal] = useState(null);
	const [giveModal, setGiveModal] = useState(null);
	const [budgetModal, setBudgetModal] = useState(null);
	const [invModal, setInvModal] = useState(null);

	const tx = useMemo(() => store.transactions.filter((t) => t.day.slice(0, 7) === ym), [store.transactions, ym]);
	const total = (list, k) => list.filter((t) => t.kind === k).reduce((a, t) => a + t.amount, 0);
	const income = total(tx, "income"), expense = total(tx, "expense"), saved = total(tx, "saving") + total(tx, "invest");
	const free = income - expense - saved;
	const rate = income ? Math.round((saved / income) * 100) : 0;
	const byCat = {};
	tx.filter((t) => t.kind === "expense").forEach((t) => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
	const pie = Object.entries(byCat).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
	const trend = Array.from({ length: 6 }, (_, i) => {
		const m = shiftMonth(ym, i - 5), list = store.transactions.filter((t) => t.day.slice(0, 7) === m);
		return { d: MON[+m.slice(5) - 1], Ingresos: total(list, "income"), Gastos: total(list, "expense"), Ahorro: total(list, "saving") + total(list, "invest") };
	});

	// Veredicto del mes en lenguaje claro
	const verdict = !tx.length ? { tone: "", title: "Mes sin registros", text: "Anota tu primer ingreso o gasto para saber cómo vas." }
		: free < 0 ? { tone: "bad", title: "Te estás quedando corto", text: `Este mes salió ${cop(-free)} más de lo que entró. Revisa el presupuesto: la categoría más pesada es ${pie[0]?.name || "sin datos"}.` }
		: rate >= 20 ? { tone: "good", title: "Vas ahorrando bien", text: `Guardaste el ${rate}% de lo que entró. La regla 50/30/20 pide 20%: vas por encima.` }
		: { tone: "warn", title: "Puedes guardar más", text: `Llevas ${rate}% de ahorro y te quedan ${cop(free)} libres. Mover ${cop(Math.max(0, income * 0.2 - saved))} a un cofre te deja en el 20%.` };

	const planIncome = +store.user.settings?.monthly_income || 0;
	const baseIncome = planIncome || income;
	const needsCats = store.budgets.filter((b) => b.bucket === "needs"), wantsCats = store.budgets.filter((b) => b.bucket === "wants");
	const spentIn = (cats) => cats.reduce((a, b) => a + (byCat[b.category] || 0), 0);
	const expenseCats = [...store.budgets.map((b) => b.category), "Otros"];

	const txFields = (kind) => [
		{ name: "kind", label: "Tipo", type: "select", options: Object.entries(KIND) },
		{ name: "amount", label: "Monto en pesos", type: "number", min: 0, required: true, placeholder: "Ej. 85000" },
		{ name: "category", label: "Categoría", type: "select", options: (kind === "income" ? INCOME_CATS : kind === "expense" ? expenseCats : store.funds.map((f) => f.name).concat("Inversión")).map((c) => [c, c]) },
		{ name: "day", label: "Fecha", type: "date" },
		{ name: "note", label: "Nota", placeholder: "Opcional" },
	];

	return (
		<>
			<PageHead title="Cada peso con un destino" sub="Registra, mira cómo vas y decide. Las cuentas claras financian Guatemala, octubre y todo lo demás.">
				<button className="btn primary" onClick={() => setTxModal({ kind: "expense" })}><Plus size={16} /> Registrar movimiento</button>
			</PageHead>
			<div className="between wrap fin-bar">
				<Tabs value={tab} onChange={setTab} options={[["resumen", "Resumen"], ["movimientos", "Movimientos"], ["presupuesto", "Presupuesto"], ["cofres", "Cofres"], ["inversiones", "Inversiones"], ["plan", "Plan de meta"]]} />
				{["resumen", "movimientos", "presupuesto"].includes(tab) && (
					<div className="month-nav">
						<button className="btn icon ghost" onClick={() => setYm(shiftMonth(ym, -1))} aria-label="Mes anterior"><ChevronLeft size={16} /></button>
						<b>{monthName(ym)}</b>
						<button className="btn icon ghost" onClick={() => setYm(shiftMonth(ym, 1))} aria-label="Mes siguiente"><ChevronRight size={16} /></button>
					</div>
				)}
			</div>

			{tab === "resumen" && <>
				<div className="grid g4">
					<Glass className="pad"><Stat label="Entró" value={cop(income)} color="var(--jungle)" /></Glass>
					<Glass className="pad"><Stat label="Salió" value={cop(expense)} color="var(--coral)" /></Glass>
					<Glass className="pad"><Stat label="Guardaste" value={cop(saved)} sub={income ? rate + "% de tus ingresos" : ""} color="var(--gold)" /></Glass>
					<Glass className="pad"><Stat label="Libre para usar" value={cop(free)} color={free < 0 ? "var(--coral)" : undefined} /></Glass>
				</div>
				<Glass className={cx("pad verdict", verdict.tone)}>
					<div><h3>{verdict.title}</h3><p>{verdict.text}</p></div>
					<button className="btn" onClick={() => navigate("/copiloto", { state: { ask: `Analiza mis finanzas de ${monthName(ym)} y dime en qué puedo recortar y cuánto debería mover a cada cofre.` } })}><Sparkles size={15} /> Pedir análisis al copiloto</button>
				</Glass>
				<div className="grid fin-charts">
					<Glass className="pad chart-card">
						<h3>Seis meses de un vistazo</h3>
						<ResponsiveContainer width="100%" height={240}>
							<AreaChart data={trend}>
								<defs>{[["gIn", "#5FA57C"], ["gOut", "#E27D60"]].map(([id, c]) => <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c} stopOpacity=".4" /><stop offset="1" stopColor={c} stopOpacity="0" /></linearGradient>)}</defs>
								<CartesianGrid {...GRID} /><XAxis dataKey="d" {...AXIS} /><YAxis {...AXIS} width={52} tickFormatter={copShort} />
								<Tooltip content={<ChartTip fmt={cop} />} />
								<Area dataKey="Ingresos" stroke="#5FA57C" strokeWidth={2} fill="url(#gIn)" />
								<Area dataKey="Gastos" stroke="#E27D60" strokeWidth={2} fill="url(#gOut)" />
								<Area dataKey="Ahorro" stroke="#E8B95B" strokeWidth={2} fill="none" strokeDasharray="5 4" />
							</AreaChart>
						</ResponsiveContainer>
					</Glass>
					<Glass className="pad chart-card">
						<h3>En qué se fue</h3>
						{pie.length ? (
							<div className="pie-wrap">
								<ResponsiveContainer width="100%" height={200}>
									<PieChart><Pie data={pie} dataKey="value" nameKey="name" innerRadius={56} outerRadius={86} paddingAngle={2} stroke="none">
										{pie.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}</Pie>
										<Tooltip content={<ChartTip fmt={cop} />} /></PieChart>
								</ResponsiveContainer>
								<ul className="legend">{pie.slice(0, 6).map((p, i) => <li key={p.name}><i style={{ background: PIE[i % PIE.length] }} />{p.name}<b className="num">{copShort(p.value)}</b></li>)}</ul>
							</div>
						) : <Empty emoji="🧾" title="Sin gastos este mes">Cuando registres gastos verás aquí cuál categoría pesa más.</Empty>}
					</Glass>
				</div>
			</>}

			{tab === "movimientos" && (
				<Glass className="pad">
					{tx.length ? (
						<ul className="list">
							{tx.map((t) => (
								<li key={t.id} className={cx("item tx", t.kind)}>
									<span className="tx-dot" />
									<div className="grow"><b>{t.category}</b> <small className="muted">{KIND[t.kind]} · {shortDay(t.day)} {t.note && "· " + t.note}</small></div>
									<b className="num">{t.kind === "income" ? "+" : "−"}{cop(t.amount)}</b>
									<button className="btn icon ghost" onClick={() => act.remove("transactions", t.id).then((ok) => ok && t.fund_id && act.boot())} aria-label="Eliminar movimiento"><Trash2 size={14} /></button>
								</li>
							))}
						</ul>
					) : <Empty emoji="🧾" title={"Nada registrado en " + monthName(ym)}>Empieza por tu ingreso del mes y los gastos fijos. Lo demás va saliendo solo.</Empty>}
				</Glass>
			)}

			{tab === "presupuesto" && <>
				<Glass className="pad">
					<div className="between wrap">
						<div><h3>Regla 50/30/20</h3><p className="muted">La mitad para lo necesario, 30% para gustos y 20% para tu futuro. Se calcula sobre tu ingreso mensual.</p></div>
						<Field label="Ingreso mensual planeado">
							<input className="input" type="number" inputMode="decimal" defaultValue={planIncome || ""} placeholder="Ej. 4500000" key={planIncome}
								onBlur={(e) => +e.target.value !== planIncome && act.saveProfile({ settings: { monthly_income: +e.target.value || 0 } })} />
						</Field>
					</div>
					{baseIncome ? (
						<div className="grid g3 rule">
							{[["Necesidades", 0.5, spentIn(needsCats), "var(--sky)"], ["Gustos", 0.3, spentIn(wantsCats), "var(--pink)"], ["Ahorro e inversión", 0.2, saved, "var(--gold)"]].map(([name, share, used, color], i) => {
								const cap = baseIncome * share, over = i < 2 && used > cap;
								return (
									<div key={name} className="rule-box">
										<div className="between"><b>{name}</b><span className="pill num">{share * 100}%</span></div>
										<b className="num big">{cop(used)}</b>
										<Bar pct={(used / cap) * 100} color={color} over={over} />
										<small className={over ? "bad" : "muted"}>{i === 2 ? (used >= cap ? "Meta de ahorro cumplida" : `Faltan ${cop(cap - used)} para el 20%`) : over ? `Te pasaste por ${cop(used - cap)}` : `Quedan ${cop(cap - used)} de ${cop(cap)}`}</small>
									</div>
								);
							})}
						</div>
					) : <p className="muted">Escribe tu ingreso mensual para ver cuánto le toca a cada parte.</p>}
				</Glass>
				<div className="grid g2">
					{[["needs", "Necesidades", needsCats], ["wants", "Gustos", wantsCats]].map(([bucket, title, cats]) => (
						<Glass key={bucket} className="pad">
							<div className="between"><h3>{title}</h3><button className="btn sm" onClick={() => setBudgetModal({ bucket })}><Plus size={14} /> Categoría</button></div>
							<ul className="list">
								{cats.map((b) => {
									const used = byCat[b.category] || 0, over = b.monthly_limit > 0 && used > b.monthly_limit;
									return (
										<li key={b.id} className="budget-row">
											<div className="between"><span>{b.emoji} {b.category}</span>
												<button className="link num" onClick={() => setBudgetModal(b)}>{cop(used)} de {b.monthly_limit ? cop(b.monthly_limit) : "definir tope"} <Pencil size={12} /></button></div>
											<Bar pct={b.monthly_limit ? (used / b.monthly_limit) * 100 : 0} over={over} color={bucket === "needs" ? "var(--sky)" : "var(--pink)"} />
										</li>
									);
								})}
							</ul>
						</Glass>
					))}
				</div>
			</>}

			{tab === "cofres" && (
				<div className="grid g3">
					{store.funds.map((f) => {
						const pct = f.target ? (f.saved / f.target) * 100 : 0, months = monthsUntil(f.deadline, today), left = Math.max(0, f.target - f.saved);
						const perMonth = months ? left / months : left;
						return (
							<Glass tilt key={f.id} className="pad chest" color={f.color}>
								<div className="between"><h3>{f.emoji} {f.name}</h3><button className="btn icon ghost" onClick={() => setFundModal(f)} aria-label="Editar cofre"><Pencil size={14} /></button></div>
								<Liquid pct={pct} color={f.color} height={150}>
									<b className="num huge">{Math.round(pct)}%</b>
									<span className="num">{cop(f.saved)} de {cop(f.target)}</span>
								</Liquid>
								<p className="muted chest-plan">
									{f.filled || left === 0 ? "Cofre lleno. Hora de usarlo para lo que era." : f.deadline
										? <>Faltan {cop(left)}. Para llegar el {shortDay(f.deadline)} guarda <b className="num">{cop(perMonth)}</b> al mes{months ? ` durante ${months} ${months === 1 ? "mes" : "meses"}` : " ya mismo"}.</>
										: <>Faltan {cop(left)}. Ponle fecha para saber cuánto guardar al mes.</>}
								</p>
								<button className="btn primary" onClick={() => setGiveModal(f)}><Plus size={15} /> Aportar</button>
							</Glass>
						);
					})}
					<button className="glass pad add-card" onClick={() => setFundModal({})}><Plus size={22} /> Nuevo cofre</button>
				</div>
			)}

			{tab === "inversiones" && (
				<Glass className="pad">
					<div className="between"><h3>Tu patrimonio trabajando</h3><button className="btn sm" onClick={() => setInvModal({})}><Plus size={14} /> Inversión</button></div>
					{store.investments.length ? <>
						<div className="grid g3 mini-stats">
							<Stat label="Invertido" value={cop(store.investments.reduce((a, i) => a + i.invested, 0))} />
							<Stat label="Vale hoy" value={cop(store.investments.reduce((a, i) => a + i.current_value, 0))} color="var(--gold)" />
							<Stat label="Ganancia" value={cop(store.investments.reduce((a, i) => a + i.current_value - i.invested, 0))} />
						</div>
						<ul className="list">
							{store.investments.map((i) => {
								const gain = i.current_value - i.invested, pct = i.invested ? (gain / i.invested) * 100 : 0;
								return (
									<li key={i.id} className="item">
										<span className="item-emoji">{gain >= 0 ? <TrendingUp size={18} color="var(--jungle)" /> : <TrendingDown size={18} color="var(--coral)" />}</span>
										<div className="grow"><b>{i.name}</b> <small className="muted">{i.kind} {i.note && "· " + i.note}</small></div>
										<span className="num">{cop(i.current_value)} <small className={gain >= 0 ? "good" : "bad"}>{gain >= 0 ? "+" : ""}{pct.toFixed(1)}%</small></span>
										<button className="btn icon ghost" onClick={() => setInvModal(i)} aria-label="Editar inversión"><Pencil size={14} /></button>
									</li>
								);
							})}
						</ul>
					</> : <Empty emoji="🌱" title="Aún no registras inversiones">CDT, fondos, acciones o cripto: anota cuánto pusiste y cuánto vale hoy para ver tu patrimonio crecer.</Empty>}
				</Glass>
			)}

			{tab === "plan" && <GoalPlan store={store} byCat={byCat} avgIncome={baseIncome} onAsk={(ask) => navigate("/copiloto", { state: { ask } })} />}

			<Modal open={!!txModal} onClose={() => setTxModal(null)} title="Registrar movimiento">
				{txModal && <TxForm fields={txFields} initial={{ kind: txModal.kind, day: today }} onSubmit={async (v) => {
					const fund = v.kind === "saving" && store.funds.find((f) => f.name === v.category);
					if (fund) await act.contribute(fund.id, +v.amount); else await act.create("transactions", v);
					setTxModal(null);
				}} />}
			</Modal>
			<Modal open={!!giveModal} onClose={() => setGiveModal(null)} title={"Aportar a " + (giveModal?.name || "")}>
				{giveModal && <Form fields={[{ name: "amount", label: "¿Cuánto guardas hoy?", type: "number", required: true, placeholder: "Ej. 200000", hint: "Usa un número negativo si necesitas retirar." }]}
					submit="Guardar en el cofre" onSubmit={async (v) => { await act.contribute(giveModal.id, +v.amount); setGiveModal(null); }} />}
			</Modal>
			<Modal open={!!fundModal} onClose={() => setFundModal(null)} title={fundModal?.id ? "Editar cofre" : "Nuevo cofre"}>
				{fundModal && <Form key={fundModal.id || "new"} fields={[
					{ name: "name", label: "¿Para qué es?", required: true, placeholder: "Ej. Viaje a Bolivia" }, { name: "emoji", label: "Emoji" },
					{ name: "target", label: "Meta en pesos", type: "number", required: true }, { name: "saved", label: "Ya tienes guardado", type: "number" },
					{ name: "deadline", label: "¿Para cuándo?", type: "date" }, { name: "color", label: "Color", type: "color" },
				]} initial={{ emoji: "💰", color: "#E8B95B", saved: 0, ...fundModal, deadline: fundModal.deadline || "" }}
					onSubmit={async (v) => { if (fundModal.id) await act.update("funds", fundModal.id, v); else await act.create("funds", v); setFundModal(null); }}
					onDelete={fundModal.id ? async () => { await act.remove("funds", fundModal.id); setFundModal(null); } : null} />}
			</Modal>
			<Modal open={!!budgetModal} onClose={() => setBudgetModal(null)} title={budgetModal?.id ? "Editar categoría" : "Nueva categoría"}>
				{budgetModal && <Form key={budgetModal.id || "new"} fields={[
					{ name: "category", label: "Categoría", required: true }, { name: "emoji", label: "Emoji" },
					{ name: "monthly_limit", label: "Tope mensual en pesos", type: "number" },
					{ name: "bucket", label: "Tipo", type: "select", options: [["needs", "Necesidad"], ["wants", "Gusto"]] },
				]} initial={{ emoji: "🧾", monthly_limit: 0, ...budgetModal }}
					onSubmit={async (v) => { const d = { ...v, monthly_limit: v.monthly_limit || 0 }; if (budgetModal.id) await act.update("budgets", budgetModal.id, d); else await act.create("budgets", d); setBudgetModal(null); }}
					onDelete={budgetModal.id ? async () => { await act.remove("budgets", budgetModal.id); setBudgetModal(null); } : null} />}
			</Modal>
			<Modal open={!!invModal} onClose={() => setInvModal(null)} title={invModal?.id ? "Editar inversión" : "Nueva inversión"}>
				{invModal && <Form key={invModal.id || "new"} fields={[
					{ name: "name", label: "Nombre", required: true, placeholder: "Ej. CDT a 180 días" },
					{ name: "kind", label: "Tipo", type: "select", options: ["CDT", "Fondo", "Acciones", "ETF", "Cripto", "Negocio propio", "Otro"].map((k) => [k, k]) },
					{ name: "invested", label: "Cuánto pusiste", type: "number", required: true }, { name: "current_value", label: "Cuánto vale hoy", type: "number", required: true },
					{ name: "note", label: "Nota", placeholder: "Tasa, plazo, plataforma" },
				]} initial={{ kind: "CDT", ...invModal }}
					onSubmit={async (v) => { if (invModal.id) await act.update("investments", invModal.id, v); else await act.create("investments", v); setInvModal(null); }}
					onDelete={invModal.id ? async () => { await act.remove("investments", invModal.id); setInvModal(null); } : null} />}
			</Modal>
		</>
	);
};

// El formulario de movimiento cambia sus categorías según el tipo
function TxForm({ fields, initial, onSubmit }) {
	const [kind, setKind] = useState(initial.kind);
	const f = fields(kind);
	return (
		<>
			<div className="chips kind-pick">{Object.entries(KIND).map(([k, label]) => <button key={k} type="button" className={cx("chip-btn", kind === k && "on")} onClick={() => setKind(k)}>{label}</button>)}</div>
			<Form key={kind} fields={f.slice(1)} initial={{ ...initial, category: f[2].options[0]?.[0] }} submit="Registrar" onSubmit={(v) => onSubmit({ ...v, kind })} />
		</>
	);
}

// Plan de meta: ¿cómo voy a concretar esto con lo que gano?
function GoalPlan({ store, byCat, avgIncome, onAsk }) {
	const [fundId, setFundId] = useState(store.funds[0]?.id);
	const fund = store.funds.find((f) => f.id === +fundId);
	const [v, setV] = useState({ income: avgIncome || "", fixed: "", variable: "", cut: "" });
	const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
	if (!fund) return <Glass className="pad"><Empty emoji="🪙" title="Primero crea un cofre">Un plan necesita una meta con monto y fecha.</Empty></Glass>;

	const months = monthsUntil(fund.deadline) ?? 0, left = Math.max(0, fund.target - fund.saved);
	const need = months ? left / months : left;
	const capacity = (+v.income || 0) - (+v.fixed || 0) - (+v.variable || 0), withCut = capacity + (+v.cut || 0);
	const ready = +v.income > 0;
	const eta = withCut > 0 ? Math.ceil(left / withCut) : null;
	const etaDate = eta != null ? (() => { const d = new Date(); d.setMonth(d.getMonth() + eta); return MONTHS[d.getMonth()] + " de " + d.getFullYear(); })() : null;
	const others = store.funds.filter((f) => f.id !== fund.id && !f.filled).reduce((a, f) => { const m = monthsUntil(f.deadline); return a + (m ? Math.max(0, f.target - f.saved) / m : 0); }, 0);
	const top = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 3);
	const ok = withCut >= need;

	return (
		<div className="grid g2">
			<Glass className="pad">
				<h3>¿Cómo vas a concretarlo?</h3>
				<div className="form">
					<Field label="¿Cuál meta quieres planear?"><select className="input" value={fundId} onChange={(e) => setFundId(e.target.value)}>{store.funds.map((f) => <option key={f.id} value={f.id}>{f.emoji} {f.name}</option>)}</select></Field>
					<Field label="¿Cuánto te entra al mes, sumando todo?"><input className="input" type="number" inputMode="decimal" value={v.income} onChange={set("income")} placeholder="Salario, negocio, extras…" /></Field>
					<Field label="Gastos fijos del mes" hint="Arriendo, servicios, mercado, transporte."><input className="input" type="number" inputMode="decimal" value={v.fixed} onChange={set("fixed")} /></Field>
					<Field label="Gastos variables del mes" hint="Salidas, suscripciones, compras."><input className="input" type="number" inputMode="decimal" value={v.variable} onChange={set("variable")} /></Field>
					<Field label="¿Cuánto sientes que puedes recortar?"><input className="input" type="number" inputMode="decimal" value={v.cut} onChange={set("cut")} placeholder="Sé honesto, no heroico" /></Field>
				</div>
			</Glass>
			<Glass className={cx("pad plan-result", ready && (ok ? "good" : "bad"))} color={fund.color}>
				<small className="muted">{fund.emoji} {fund.name}</small>
				<h3>Necesitas guardar <span className="num gold">{cop(need)}</span> al mes</h3>
				<p className="muted">Faltan {cop(left)}{fund.deadline ? ` y quedan ${months} ${months === 1 ? "mes" : "meses"} hasta el ${shortDay(fund.deadline)} de ${parseDay(fund.deadline).getFullYear()}` : ". Sin fecha definida"}.</p>
				{ready ? <>
					<div className="plan-math">
						<div><span>Te queda libre hoy</span><b className="num">{cop(capacity)}</b></div>
						<div><span>Con el recorte</span><b className="num">{cop(withCut)}</b></div>
						<div><span>La meta pide</span><b className="num">{cop(need)}</b></div>
						<div className="sum"><span>{ok ? "Te sobra" : "Te falta"}</span><b className={cx("num", ok ? "good" : "bad")}>{cop(Math.abs(withCut - need))}</b></div>
					</div>
					<p className="plan-verdict">
						{ok ? `Sí llegas. Programa un aporte de ${cop(need)} el día que te pagan y no lo toques.`
							: withCut > 0 ? `A este ritmo llegas en ${etaDate}, no en la fecha planeada. Opciones: recortar ${cop(need - withCut)} más, subir ingresos o mover la fecha.`
							: "Hoy no queda margen para ahorrar. Antes de esta meta toca bajar gastos fijos o subir ingresos."}
					</p>
					{others > 0 && <p className="muted">Ojo: tus otros cofres piden {cop(others)} al mes entre todos. {withCut >= need + others ? "Alcanza para todos." : "No alcanza para todos a la vez: decide cuál va primero."}</p>}
					{top.length > 0 && <div><span className="field-label">Donde más se te va la plata este mes</span><div className="chips">{top.map(([c, n]) => <span key={c} className="tag">{c} <b className="num">{copShort(n)}</b></span>)}</div></div>}
				</> : <p className="muted">Llena tus ingresos y gastos a la izquierda y te digo si llegas, cuánto falta y qué mover.</p>}
				<button className="btn" onClick={() => onAsk(`Ayúdame a armar un plan financiero mes a mes para llenar el cofre "${fund.name}" (${cop(fund.target)}, llevo ${cop(fund.saved)}${fund.deadline ? ", fecha " + fund.deadline : ""}). Gano ${cop(+v.income)} al mes, mis gastos fijos son ${cop(+v.fixed)}, los variables ${cop(+v.variable)} y creo que puedo recortar ${cop(+v.cut)}. Dime qué recortar y cómo repartir entre mis cofres.`)}>
					<Sparkles size={15} /> Pedir el plan detallado al copiloto
				</button>
			</Glass>
		</div>
	);
}
