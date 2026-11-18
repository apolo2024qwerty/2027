import { useState } from "react";
import { LogOut, RotateCcw } from "lucide-react";
import useGlobalReducer from "../hooks/useGlobalReducer";
import useActions from "../hooks/useActions";
import { Glass, PageHead, Form, Field, Modal, cx } from "../components/ui";
import { SCENES } from "../components/Sky";
import { ACCENTS } from "../lib/game";
import { soundOn, setSound } from "../lib/fx";

const SKIES = [["auto", "Según la hora"], ["dawn", "Amanecer"], ["day", "Día"], ["dusk", "Atardecer"], ["night", "Noche"]];

export const Profile = () => {
	const { store } = useGlobalReducer();
	const act = useActions();
	const [sound, setS] = useState(soundOn());
	const [reset, setReset] = useState(false);
	const s = store.user.settings || {};

	return (
		<>
			<PageHead title="Tu cuenta" sub={"Sesión iniciada como @" + store.user.username}>
				<button className="btn danger ghost" onClick={act.logout}><LogOut size={15} /> Cerrar sesión</button>
			</PageHead>
			<div className="grid g2">
				<Glass className="pad">
					<h3>Cómo te ve la plataforma</h3>
					<Form fields={[
						{ name: "display_name", label: "Nombre", required: true },
						{ name: "motto", label: "Tu lema para 2027", type: "textarea", rows: 2 },
						{ name: "email", label: "Correo (opcional)", type: "email" },
						{ name: "water_goal", label: "Meta diaria de agua en ml", type: "number", min: 500, step: 50 },
					]} initial={{ display_name: store.user.display_name, motto: store.user.motto, email: store.user.email || "", water_goal: s.water_goal || 2500 }}
						onSubmit={async (v) => { const r = await act.saveProfile({ ...v, settings: { water_goal: +v.water_goal || 2500 } }); if (r) act.toast({ tone: "good", title: "Perfil guardado" }); }} />
				</Glass>

				<div className="col">
					<Glass className="pad">
						<h3>Hazlo tuyo</h3>
						<span className="field-label">Paisaje de fondo</span>
						<div className="scene-grid">
							{Object.entries(SCENES).map(([id, sc]) => (
								<button key={id} className={cx("scene-tile", (s.scene || "orbitas") === id && "on")} onClick={() => act.saveProfile({ settings: { scene: id } })}>
									<span className="scene-thumb">
										{sc.layers === null ? <svg viewBox="0 0 120 60"><ellipse cx="60" cy="74" rx="52" ry="34" /><ellipse cx="60" cy="74" rx="82" ry="56" /><circle cx="22" cy="34" r="4" className="w1" /><circle cx="92" cy="24" r="5" className="w2" /></svg>
											: <svg viewBox="0 0 1440 320" preserveAspectRatio="none">{sc.layers.map((d, i) => <path key={i} d={d} opacity={0.45 + i * 0.25} />)}</svg>}
									</span>
									{sc.label}
								</button>
							))}
						</div>
						<span className="field-label">Color de acento</span>
						<div className="chips">
							{Object.entries(ACCENTS).map(([id, [label, color]]) => (
								<button key={id} className={cx("chip-btn accent-chip", (s.accent || "oro") === id && "on")} style={{ "--c": color }} onClick={() => act.saveProfile({ settings: { accent: id } })}><i style={{ background: color }} /> {label}</button>
							))}
						</div>
						<span className="field-label">Cielo</span>
						<div className="chips">
							{SKIES.map(([id, label]) => <button key={id} className={cx("chip-btn", (s.sky || "auto") === id && "on")} onClick={() => act.saveProfile({ settings: { sky: id } })}>{label}</button>)}
						</div>
						<Field label="Sonidos al ganar XP">
							<div className="chips">
								<button className={cx("chip-btn", sound && "on")} onClick={() => { setSound(true); setS(true); }}>Encendidos</button>
								<button className={cx("chip-btn", !sound && "on")} onClick={() => { setSound(false); setS(false); }}>Apagados</button>
							</div>
						</Field>
					</Glass>
					<Glass className="pad">
						<h3>Cambiar la clave</h3>
						<p className="muted">Se guarda cifrada con hash. Usa 6 caracteres o más.</p>
						<Form fields={[
							{ name: "current", label: "Clave actual", type: "password", required: true },
							{ name: "next", label: "Clave nueva", type: "password", required: true },
						]} submit="Actualizar clave" onSubmit={(v) => act.changePassword(v.current, v.next)} />
					</Glass>
					<Glass className="pad">
						<h3>Empezar de cero</h3>
						<p className="muted">Borra tus metas, hábitos, registros, finanzas, XP y monedas, y te deja la Rueda de la Vida en blanco. Tu cuenta y tu clave se conservan.</p>
						<button className="btn danger ghost" onClick={() => setReset(true)}><RotateCcw size={15} /> Reiniciar mi plan</button>
					</Glass>
				</div>
			</div>
			<Modal open={reset} onClose={() => setReset(false)} title="¿Reiniciar todo tu plan?">
				<p className="muted">Esto no se puede deshacer. Escribe tu clave para confirmar.</p>
				<Form fields={[{ name: "password", label: "Tu clave", type: "password", required: true }]} submit="Borrar y empezar de cero"
					onSubmit={async (v) => { if (await act.resetPlan(v.password)) setReset(false); }} />
			</Modal>
		</>
	);
};
