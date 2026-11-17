// Sala de control: solo la ve el administrador. Usuarios, accesos y quién puede registrarse.
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { UserPlus, Trash2, KeyRound, ShieldCheck, Ban, Check } from "lucide-react";
import useGlobalReducer from "../hooks/useGlobalReducer";
import useActions from "../hooks/useActions";
import { api } from "../lib/api";
import { Glass, PageHead, Modal, Form, Stat, cx } from "../components/ui";
import { levelOf, shortDay, iso } from "../lib/game";

const MODES = [["open", "Abierto", "Cualquiera con el enlace puede crear su cuenta."], ["code", "Con código", "Solo quien tenga el código de invitación."], ["closed", "Cerrado", "Nadie se registra; las cuentas las creas tú."]];
const day = (s) => (s ? shortDay(iso(new Date(s + "Z"))) : "nunca");

export const Control = () => {
	const { store } = useGlobalReducer();
	const act = useActions();
	const [users, setUsers] = useState(null);
	const [settings, setSettings] = useState({ registration: "open", invite_code: "" });
	const [code, setCode] = useState("");
	const [modal, setModal] = useState(null); // { type: "new" | "pass" | "delete", user }
	const [confirm, setConfirm] = useState("");

	const call = async (path, opts) => {
		try { return await api(path, opts); } catch (e) { act.toast({ tone: "bad", title: e.message }); return null; }
	};
	const load = async () => { const r = await call("/admin/users"); if (r) { setUsers(r.users); setSettings(r.settings); setCode(r.settings.invite_code); } };
	useEffect(() => { if (store.user.is_admin) load(); }, []); // eslint-disable-line

	if (!store.user.is_admin) return <Navigate to="/" replace />;

	const patch = async (u, body, msg) => {
		const r = await call("/admin/users/" + u.id, { method: "PUT", body });
		if (r) { setUsers((list) => list.map((x) => (x.id === u.id ? r.user : x))); act.toast({ tone: "good", title: msg }); }
		return r;
	};
	const saveSettings = async (body) => { const r = await call("/admin/settings", { method: "PUT", body }); if (r) { setSettings(r.settings); act.toast({ tone: "good", title: "Acceso actualizado" }); } };
	const remove = async () => {
		const r = await call("/admin/users/" + modal.user.id, { method: "DELETE" });
		if (r) { setUsers((list) => list.filter((x) => x.id !== modal.user.id)); act.toast({ tone: "good", title: "Cuenta eliminada" }); setModal(null); }
	};
	const list = users || [];

	return (
		<>
			<PageHead title="Sala de control" sub="Solo tú ves esta sección. Aquí decides quién entra, creas cuentas y retiras las que no deben estar.">
				<button className="btn primary" onClick={() => setModal({ type: "new" })}><UserPlus size={16} /> Crear cuenta</button>
			</PageHead>

			<div className="grid g3">
				<Glass className="pad"><Stat label="Cuentas" value={list.length} /></Glass>
				<Glass className="pad"><Stat label="Activas" value={list.filter((u) => u.is_active).length} color="var(--jungle)" /></Glass>
				<Glass className="pad"><Stat label="Desactivadas" value={list.filter((u) => !u.is_active).length} color="var(--coral)" /></Glass>
			</div>

			<Glass className="pad">
				<h3>¿Quién puede registrarse?</h3>
				<div className="zones">
					{MODES.map(([id, name, desc]) => (
						<button key={id} className={cx("zone", settings.registration === id && "on")} onClick={() => saveSettings({ registration: id, invite_code: code })}>
							<b>{name}</b><small>{desc}</small>
						</button>
					))}
				</div>
				<div className="row wrap">
					<input className="input" style={{ maxWidth: 280 }} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Código de invitación, ej. CUMBRE-2027" />
					<button className="btn" disabled={code === settings.invite_code} onClick={() => saveSettings({ invite_code: code })}>Guardar código</button>
				</div>
			</Glass>

			<Glass className="pad">
				<h3>Cuentas</h3>
				{!users ? <p className="muted">Cargando…</p> : (
					<ul className="list">
						{list.map((u) => {
							const me = u.id === store.user.id;
							return (
								<li key={u.id} className={cx("account", !u.is_active && "off")}>
									<span className="avatar">{(u.display_name || u.username)[0]}</span>
									<div className="grow account-id">
										<b>{u.display_name} {u.is_admin && <span className="tag live"><ShieldCheck size={12} /> admin</span>} {!u.is_active && <span className="tag" style={{ "--c": "var(--coral)" }}>desactivada</span>}</b>
										<small className="muted">@{u.username} · desde {day(u.created_at)} · última actividad: {day(u.last_activity)}</small>
									</div>
									<div className="account-stats num">
										<span>Nivel {levelOf(u.xp)}</span><span>{u.xp} XP</span><span>{u.goals_done}/{u.goals} metas</span><span>{u.habit_marks} hábitos</span>
									</div>
									<div className="row">
										<button className="btn icon" title="Cambiar su clave" aria-label="Cambiar clave" onClick={() => setModal({ type: "pass", user: u })}><KeyRound size={15} /></button>
										{!me && <button className="btn icon" title={u.is_active ? "Desactivar: no podrá entrar" : "Reactivar"} aria-label={u.is_active ? "Desactivar" : "Reactivar"}
											onClick={() => patch(u, { is_active: !u.is_active }, u.is_active ? "Cuenta desactivada" : "Cuenta reactivada")}>{u.is_active ? <Ban size={15} /> : <Check size={15} />}</button>}
										{!me && <button className="btn icon danger" title="Eliminar la cuenta y todos sus datos" aria-label="Eliminar" onClick={() => { setConfirm(""); setModal({ type: "delete", user: u }); }}><Trash2 size={15} /></button>}
									</div>
								</li>
							);
						})}
					</ul>
				)}
			</Glass>

			<Modal open={modal?.type === "new"} onClose={() => setModal(null)} title="Crear cuenta">
				<Form fields={[
					{ name: "display_name", label: "Nombre", required: true },
					{ name: "username", label: "Usuario", required: true, hint: "Con este entra. Mínimo 3 caracteres." },
					{ name: "password", label: "Clave inicial", required: true, hint: "Mínimo 6 caracteres. La persona puede cambiarla en su perfil." },
				]} submit="Crear" onSubmit={async (v) => {
					const r = await call("/admin/users", { method: "POST", body: v });
					if (r) { setUsers((l) => [...l, r.user]); act.toast({ tone: "good", title: "Cuenta creada" }); setModal(null); }
				}} />
			</Modal>

			<Modal open={modal?.type === "pass"} onClose={() => setModal(null)} title={"Nueva clave para @" + (modal?.user?.username || "")}>
				<Form fields={[{ name: "password", label: "Clave nueva", required: true, hint: "Mínimo 6 caracteres." }]} submit="Cambiar clave"
					onSubmit={async (v) => { if (await patch(modal.user, { password: v.password }, "Clave cambiada")) setModal(null); }} />
			</Modal>

			<Modal open={modal?.type === "delete"} onClose={() => setModal(null)} title="Eliminar cuenta">
				{modal?.type === "delete" && (
					<div className="form">
						<p>Vas a borrar a <b>{modal.user.display_name}</b> (@{modal.user.username}) con todo su plan, hábitos, finanzas y bitácora. Esto no se puede deshacer.</p>
						<p className="muted">Si solo quieres que no entre, usa Desactivar: conserva sus datos.</p>
						<label className="field"><span>Escribe <b>{modal.user.username}</b> para confirmar</span>
							<input className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoFocus /></label>
						<div className="between form-foot">
							<button className="btn" onClick={() => setModal(null)}>Cancelar</button>
							<button className="btn danger" disabled={confirm !== modal.user.username} onClick={remove}><Trash2 size={15} /> Eliminar para siempre</button>
						</div>
					</div>
				)}
			</Modal>
		</>
	);
};
