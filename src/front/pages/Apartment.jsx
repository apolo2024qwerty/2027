// Apartamento: el plano de tu espacio. Cada compra enciende un objeto en 3D.
import { useState } from "react";
import { Plus, Lock, Pencil } from "lucide-react";
import useGlobalReducer from "../hooks/useGlobalReducer";
import useActions from "../hooks/useActions";
import { Glass, PageHead, Modal, Form, Ring, cx } from "../components/ui";
import { cop } from "../lib/game";

const ROOMS = ["Sala", "Estudio", "Cocina", "Habitación", "Zona de ropas", "Baño"];

export const Apartment = () => {
	const { store } = useGlobalReducer();
	const act = useActions();
	const [modal, setModal] = useState(null);
	const items = store.apartment;
	const rooms = [...new Set([...ROOMS.filter((r) => items.some((i) => i.room === r)), ...items.map((i) => i.room)])];
	const bought = items.filter((i) => i.bought).length;
	const pending = items.filter((i) => !i.bought).reduce((a, i) => a + (i.cost || 0), 0);

	return (
		<>
			<PageHead title="Tu espacio, como lo sueñas" sub="Anota lo que quieres para tu casa, cuarto u oficina. Toca cada objeto cuando lo consigas: pasa de sombra a color y suma 30 XP.">
				<button className="btn primary" onClick={() => setModal({})}><Plus size={16} /> Agregar objeto</button>
			</PageHead>

			<Glass className="pad apt">
				<div className="apt-head">
					<Ring pct={items.length ? (bought / items.length) * 100 : 0} size={84} stroke={8}><b className="num">{bought}/{items.length}</b></Ring>
					<div>
						<h3>{bought === items.length && items.length ? "Tu espacio está completo. Bienvenido a casa." : !items.length ? "Anota lo primero que quieres para tu espacio" : `Faltan ${items.length - bought} por conseguir`}</h3>
						<p className="muted">{pending > 0 ? `Presupuesto pendiente: ${cop(pending)}` : "Ponle precio a cada objeto para saber cuánto falta invertir."}</p>
					</div>
				</div>
				<div className="iso-wrap">
					<div className="iso">
						{rooms.map((room) => {
							const list = items.filter((i) => i.room === room), n = list.filter((i) => i.bought).length;
							return (
								<div key={room} className={cx("room", n === list.length && "full")} style={{ "--fill": list.length ? n / list.length : 0 }}>
									<span className="room-name">{room}</span>
									<div className="room-items">
										{list.map((i) => (
											<button key={i.id} className={cx("prop", i.bought && "on")} onClick={() => act.toggleApartment(i.id)} aria-pressed={i.bought} aria-label={`${i.name}: ${i.bought ? "comprado" : "pendiente"}`} title={i.name}>
												<span className="prop-face">{i.emoji}</span>
											</button>
										))}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</Glass>

			<div className="grid g4">
				{items.map((i) => (
					<Glass key={i.id} className={cx("pad unlock", i.bought && "on")}>
						<div className="between">
							<span className="unlock-emoji">{i.emoji}</span>
							<button className="btn icon ghost" onClick={() => setModal(i)} aria-label="Editar objeto"><Pencil size={14} /></button>
						</div>
						<b>{i.name}</b>
						<small className="muted">{i.room}{i.cost ? " · " + cop(i.cost) : ""}</small>
						<button className={cx("btn sm", !i.bought && "primary")} onClick={() => act.toggleApartment(i.id)}>
							{i.bought ? "Comprado" : <><Lock size={13} /> Marcar como comprado</>}
						</button>
					</Glass>
				))}
			</div>

			<Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? "Editar objeto" : "Nuevo objeto"}>
				{modal && <Form key={modal.id || "new"} fields={[
					{ name: "name", label: "¿Qué falta en casa?", required: true, placeholder: "Ej. Lámpara de pie" }, { name: "emoji", label: "Emoji" },
					{ name: "room", label: "Espacio", type: "select", options: ROOMS.map((r) => [r, r]) },
					{ name: "cost", label: "Precio estimado en pesos", type: "number" },
				]} initial={{ emoji: "📦", room: "Sala", ...modal }}
					onSubmit={async (v) => { const d = { ...v, cost: v.cost || 0 }; if (modal.id) await act.update("apartment", modal.id, d); else await act.create("apartment", d); setModal(null); }}
					onDelete={modal.id ? async () => { await act.remove("apartment", modal.id); setModal(null); } : null} />}
			</Modal>
		</>
	);
};
