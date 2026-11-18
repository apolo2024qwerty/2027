// Piezas de interfaz compartidas.
import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";

export const cx = (...a) => a.filter(Boolean).join(" ");

// Panel de vidrio. `tilt` lo inclina en 3D siguiendo el cursor.
export function Glass({ tilt, className, style, color, children, ...rest }) {
  const ref = useRef(null);
  const move = (e) => {
    const el = ref.current, r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", (-y * 7).toFixed(2) + "deg");
    el.style.setProperty("--ry", (x * 9).toFixed(2) + "deg");
    el.style.setProperty("--mx", ((x + 0.5) * 100).toFixed(1) + "%");
    el.style.setProperty("--my", ((y + 0.5) * 100).toFixed(1) + "%");
  };
  const leave = () => { ref.current.style.setProperty("--rx", "0deg"); ref.current.style.setProperty("--ry", "0deg"); };
  return (
    <div ref={ref} className={cx("glass", tilt && "tilt", className)} style={{ ...(color ? { "--c": color } : {}), ...style }}
      onMouseMove={tilt ? move : undefined} onMouseLeave={tilt ? leave : undefined} {...rest}>
      {children}
    </div>
  );
}

export function PageHead({ title, sub, children }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="muted">{sub}</p>}
      </div>
      {children && <div className="row wrap">{children}</div>}
    </header>
  );
}

export function Ring({ pct = 0, size = 64, stroke = 6, color = "var(--gold)", children }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, Math.max(0, pct)) / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1)" }} />
      </svg>
      <div className="ring-in">{children}</div>
    </div>
  );
}

export const Bar = ({ pct = 0, color, over }) => (
  <div className={cx("bar", over && "over")}><i style={{ width: Math.min(100, Math.max(0, pct)) + "%", background: color }} /></div>
);

// Recipiente con líquido animado (cofres, agua)
export function Liquid({ pct = 0, color = "var(--gold)", height = 150, children }) {
  const p = Math.min(100, Math.max(0, pct));
  return (
    <div className="liquid" style={{ height, "--c": color }}>
      <div className="liquid-fill" style={{ height: `calc(${p}% + 8px)` }}>
        <svg className="wave" viewBox="0 0 240 16" preserveAspectRatio="none"><path d="M0 8 Q30 0 60 8 T120 8 T180 8 T240 8 V16 H0Z" /></svg>
        <svg className="wave w2" viewBox="0 0 240 16" preserveAspectRatio="none"><path d="M0 8 Q30 16 60 8 T120 8 T180 8 T240 8 V16 H0Z" /></svg>
      </div>
      <div className="liquid-in">{children}</div>
    </div>
  );
}

export function CheckBtn({ on, onClick, color, label, size }) {
  return (
    <button type="button" className={cx("check", on && "on", size)} style={color ? { "--c": color } : undefined} onClick={onClick} aria-pressed={!!on} aria-label={label}>
      <Check size={size === "lg" ? 20 : 15} strokeWidth={3} />
    </button>
  );
}

export function Tabs({ value, onChange, options, name = "tab-pill" }) {
  return (
    <div className="tabs" role="tablist">
      {options.map(([id, label]) => (
        <button key={id} role="tab" aria-selected={value === id} className={cx("tab", value === id && "active")} onClick={() => onChange(id)}>
          {value === id && <motion.span layoutId={name} className="tab-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="modal-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div className={cx("modal glass", wide && "wide")} role="dialog" aria-modal="true" aria-label={title}
            initial={{ y: 30, scale: 0.96, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 20, scale: 0.97, opacity: 0 }} transition={{ type: "spring", stiffness: 380, damping: 30 }}>
            <div className="between" style={{ marginBottom: 16 }}>
              <h3>{title}</h3>
              <button className="btn icon ghost" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>, document.body);
}

export const Field = ({ label, children, hint }) => (
  <label className="field"><span>{label}</span>{children}{hint && <small className="muted">{hint}</small>}</label>
);

// Formulario simple controlado: fields = [{name,label,type,options,placeholder,step}]
export function Form({ fields, initial = {}, onSubmit, submit = "Guardar", onDelete }) {
  const [v, setV] = useState(() => ({ ...Object.fromEntries(fields.map((f) => [f.name, f.default ?? ""])), ...initial }));
  const [busy, setBusy] = useState(false);
  const set = (name, value) => setV((s) => ({ ...s, [name]: value }));
  return (
    <form className="form" onSubmit={async (e) => { e.preventDefault(); setBusy(true); await onSubmit(v); setBusy(false); }}>
      {fields.map((f) => (
        <Field key={f.name} label={f.label} hint={f.hint}>
          {f.type === "select" ? (
            <select className="input" value={v[f.name] ?? ""} onChange={(e) => set(f.name, e.target.value)}>
              {f.options.map(([val, lab]) => <option key={val} value={val}>{lab}</option>)}
            </select>
          ) : f.type === "textarea" ? (
            <textarea className="input" rows={f.rows || 3} value={v[f.name] ?? ""} placeholder={f.placeholder} onChange={(e) => set(f.name, e.target.value)} />
          ) : (
            <input className="input" type={f.type || "text"} step={f.step} min={f.min} required={f.required} value={v[f.name] ?? ""} placeholder={f.placeholder}
              inputMode={f.type === "number" ? "decimal" : undefined} onChange={(e) => set(f.name, e.target.value)} />
          )}
        </Field>
      ))}
      <div className="between form-foot">
        {onDelete ? <button type="button" className="btn danger ghost" onClick={onDelete}>Eliminar</button> : <span />}
        <button className="btn primary" disabled={busy}>{submit}</button>
      </div>
    </form>
  );
}

export const Empty = ({ emoji = "🌄", title, children }) => (
  <div className="empty"><div className="empty-emoji">{emoji}</div><strong>{title}</strong>{children && <p className="muted">{children}</p>}</div>
);

export const Stat = ({ label, value, sub, color }) => (
  <div className="stat" style={color ? { "--c": color } : undefined}>
    <span className="muted">{label}</span>
    <b className="num">{value}</b>
    {sub && <small className="muted">{sub}</small>}
  </div>
);

// Tooltip sobrio para Recharts
export const ChartTip = ({ active, payload, label, fmt = (v) => v }) => active && payload?.length ? (
  <div className="chart-tip">
    <small className="muted">{label}</small>
    {payload.map((p) => <div key={p.dataKey} className="row" style={{ gap: 6 }}><i style={{ background: p.color || p.fill }} />{p.name}: <b>{fmt(p.value)}</b></div>)}
  </div>
) : null;
export const AXIS = { stroke: "rgba(243,238,228,.45)", fontSize: 11, tickLine: false, axisLine: false };
export const GRID = { stroke: "rgba(255,255,255,.07)", vertical: false };

// Slider con el valor en vivo mientras se arrastra; guarda al soltar.
export function Slider({ value, fallback, onCommit, label, unit = "", ...rest }) {
  const [v, setV] = useState(value ?? fallback);
  const [moving, setMoving] = useState(false);
  useEffect(() => { setV(value ?? fallback); }, [value]); // eslint-disable-line
  const commit = () => { setMoving(false); if (String(v) !== String(value)) onCommit(v); };
  const shown = value != null || moving;
  return (
    <label className="field slider">
      <span>{label}: <b className={"num slider-val" + (moving ? " live" : "")}>{shown ? String(v).replace(".", ",") + unit : "desliza para registrar"}</b></span>
      <input type="range" value={v} onChange={(e) => { setV(e.target.value); setMoving(true); }} onPointerUp={commit} onKeyUp={commit} onBlur={() => moving && commit()} {...rest} />
    </label>
  );
}
