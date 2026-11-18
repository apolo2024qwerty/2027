// Bitácora: el diario del año.
import { useState } from "react";
import { Trash2, Feather } from "lucide-react";
import useGlobalReducer from "../hooks/useGlobalReducer";
import useActions from "../hooks/useActions";
import { Glass, PageHead, Field, Empty } from "../components/ui";
import { todayStr, niceDay } from "../lib/game";

const PROMPTS = [
	"¿Qué hiciste hoy que te acerca a tu 2027?",
	"¿Qué te costó hoy y qué aprendiste de eso?",
	"Si hoy fuera una escena de tu año, ¿cómo se llamaría?",
	"¿A quién le debes un gracias esta semana?",
	"¿Qué vas a hacer mañana antes de abrir cualquier pantalla?",
];
const MOODS = ["", "😣", "😕", "😐", "🙂", "🤩"];

export const Journal = () => {
	const { store } = useGlobalReducer();
	const act = useActions();
	const today = todayStr();
	const blank = { title: "", body: "", win: "", gratitude: "" };
	const [v, setV] = useState(blank);
	const [busy, setBusy] = useState(false);
	const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
	const prompt = PROMPTS[new Date().getDate() % PROMPTS.length];
	const moodOf = (day) => MOODS[store.dailyLogs.find((d) => d.day === day)?.mood || 0];

	const save = async (e) => {
		e.preventDefault();
		if (!v.body.trim() && !v.win.trim()) return;
		setBusy(true);
		const res = await act.create("journal", { ...v, day: today, title: v.title || niceDay(today) });
		if (res) setV(blank);
		setBusy(false);
	};

	return (
		<>
			<PageHead title="La bitácora de tu año" sub="Escribir cinco líneas al día es la forma más barata de no perderte tu propia vida. La primera entrada del día suma XP." />
			<div className="grid journal-grid">
				<Glass className="pad">
					<form className="form" onSubmit={save}>
						<p className="journal-prompt"><Feather size={16} /> {prompt}</p>
						<Field label="Título (opcional)"><input className="input" value={v.title} onChange={set("title")} placeholder={niceDay(today)} /></Field>
						<Field label="Lo que pasó y lo que pensé"><textarea className="input" rows={7} value={v.body} onChange={set("body")} placeholder="Sin filtro. Nadie más lo lee." /></Field>
						<Field label="Mi victoria de hoy"><input className="input" value={v.win} onChange={set("win")} placeholder="Por pequeña que sea" /></Field>
						<Field label="Agradezco"><input className="input" value={v.gratitude} onChange={set("gratitude")} /></Field>
						<button className="btn primary" disabled={busy}>Guardar entrada</button>
					</form>
				</Glass>

				<div className="timeline">
					{store.journal.length ? store.journal.map((j) => (
						<Glass key={j.id} className="pad entry">
							<div className="between">
								<div><small className="muted">{niceDay(j.day)} {moodOf(j.day)}</small><h3>{j.title}</h3></div>
								<button className="btn icon ghost" onClick={() => act.remove("journal", j.id)} aria-label="Eliminar entrada"><Trash2 size={14} /></button>
							</div>
							{j.body && <p className="entry-body">{j.body}</p>}
							{j.win && <p className="entry-line"><span>🏅</span> {j.win}</p>}
							{j.gratitude && <p className="entry-line"><span>🙏</span> {j.gratitude}</p>}
						</Glass>
					)) : <Glass className="pad"><Empty emoji="📓" title="Página en blanco">Tu primera entrada inaugura la bitácora. En diciembre de 2027 vas a agradecer haberla empezado hoy.</Empty></Glass>}
				</div>
			</div>
		</>
	);
};
