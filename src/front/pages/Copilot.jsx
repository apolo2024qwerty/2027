// Copiloto IA (Groq): responde con tus metas, hábitos y finanzas reales como contexto.
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Send, Sparkles, Trash2 } from "lucide-react";
import useGlobalReducer from "../hooks/useGlobalReducer";
import useActions from "../hooks/useActions";
import { Glass, PageHead, cx } from "../components/ui";

const IDEAS = [
	"¿En qué debería enfocarme esta semana según mi plan?",
	"Mira mi Rueda de la Vida y dime por cuál área empezar.",
	"¿Cómo voy con mis hábitos y cuál estoy descuidando?",
	"Ayúdame a convertir un sueño en una meta con fecha y primer paso.",
	"Ordena mis metas del primer trimestre por prioridad.",
	"¿Qué puedo recortar este mes para ahorrar más?",
];

// Markdown mínimo: títulos, listas y negritas
function Rich({ text }) {
	const bold = (s, k) => s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") ? <strong key={k + "-" + i}>{p.slice(2, -2)}</strong> : p));
	const blocks = [];
	let list = null;
	text.split("\n").forEach((line, i) => {
		const item = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)/);
		if (item) { (list ||= []).push(<li key={i}>{bold(item[1], i)}</li>); return; }
		if (list) { blocks.push(<ul key={"l" + i}>{list}</ul>); list = null; }
		const head = line.match(/^#{1,4}\s+(.*)/);
		if (head) blocks.push(<h4 key={i}>{bold(head[1], i)}</h4>);
		else if (line.trim()) blocks.push(<p key={i}>{bold(line, i)}</p>);
	});
	if (list) blocks.push(<ul key="l-end">{list}</ul>);
	return <div className="rich">{blocks}</div>;
}

export const Copilot = () => {
	const { store } = useGlobalReducer();
	const act = useActions();
	const location = useLocation();
	const [text, setText] = useState("");
	const [pending, setPending] = useState(null);
	const [error, setError] = useState("");
	const end = useRef(null);
	const sent = useRef(false);

	const send = async (message) => {
		const msg = (message ?? text).trim();
		if (!msg || pending) return;
		setText(""); setError(""); setPending(msg);
		try { await act.ask(msg); } catch (e) { setError(e.message); setText(msg); }
		setPending(null);
	};

	// Pregunta que llega desde Finanzas
	useEffect(() => {
		if (location.state?.ask && !sent.current) { sent.current = true; send(location.state.ask); window.history.replaceState({}, ""); }
	}, []); // eslint-disable-line
	useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [store.chat.length, pending]);

	return (
		<>
			<PageHead title="Tu copiloto para el 2027" sub="Conoce tus metas, hábitos, cofres y movimientos. Pregúntale como le preguntarías a un amigo ordenado.">
				{store.chat.length > 0 && <button className="btn ghost" onClick={act.clearChat}><Trash2 size={15} /> Borrar conversación</button>}
			</PageHead>
			<Glass className="chat">
				<div className="chat-log">
					{!store.chat.length && !pending && (
						<div className="chat-empty">
							<Sparkles size={34} color="var(--gold)" />
							<h3>¿Por dónde empezamos?</h3>
							{!store.aiReady && <p className="form-error">Falta GROQ_API_KEY en el archivo .env del backend.</p>}
							<div className="ideas">{IDEAS.map((q) => <button key={q} className="idea" onClick={() => send(q)}>{q}</button>)}</div>
						</div>
					)}
					{store.chat.map((m) => (
						<div key={m.id} className={cx("bubble", m.role)}>{m.role === "user" ? m.content : <Rich text={m.content} />}</div>
					))}
					{pending && <><div className="bubble user">{pending}</div><div className="bubble assistant typing"><i /><i /><i /></div></>}
					{error && <p className="form-error" role="alert">{error}</p>}
					<div ref={end} />
				</div>
				<form className="chat-box" onSubmit={(e) => { e.preventDefault(); send(); }}>
					<textarea className="input" rows={1} value={text} placeholder="Escribe tu pregunta" onChange={(e) => setText(e.target.value)}
						onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
					<button className="btn primary icon lg" disabled={!text.trim() || !!pending} aria-label="Enviar"><Send size={18} /></button>
				</form>
			</Glass>
		</>
	);
};
