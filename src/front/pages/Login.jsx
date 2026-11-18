import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowUpRight } from "lucide-react";
import useGlobalReducer from "../hooks/useGlobalReducer";
import useActions from "../hooks/useActions";
import { DreamScene } from "../components/DreamScene";
import { Sky } from "../components/Sky";
import { Glass, Field, cx } from "../components/ui";
import { skyPhase } from "../lib/game";
import { play } from "../lib/fx";
import { api } from "../lib/api";

const daysTo2027 = () => Math.ceil((new Date(2027, 0, 1) - new Date()) / 86400000);

export const Login = () => {
  const { store } = useGlobalReducer();
  const act = useActions();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", password: "", display_name: "", invite_code: "" });
  const [registration, setRegistration] = useState("open");
  useEffect(() => { api("/public/config").then((c) => setRegistration(c.registration)).catch(() => {}); }, []);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [launch, setLaunch] = useState(false);

  if (store.token && !launch) return <Navigate to="/" replace />;

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setError(""); };
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      setLaunch(true); // evita la redirección inmediata mientras dura el despegue
      await act.login(form.username, form.password, mode === "register", form.display_name, form.invite_code);
      play("win");
      setTimeout(() => navigate("/", { replace: true }), 1500);
    } catch (err) {
      setLaunch(false); setBusy(false); setError(err.message); play("lose");
    }
  };
  const left = daysTo2027();
  const flying = launch && store.token;

  return (
    <div className={cx("login", flying && "flying")}>
      <Sky phase={skyPhase("dusk")} scene="limpio" />
      <DreamScene launch={flying} />

      <motion.div className="login-copy" initial="hide" animate="show" variants={{ show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } } }}>
        <motion.div className="brand" variants={rise}><span className="brand-mark" /><span>Level Up<b>2027</b></span></motion.div>
        <motion.h1 className="login-year" variants={rise} aria-label="2027">
          {"2027".split("").map((d, i) => <motion.span key={i} variants={digit}>{d}</motion.span>)}
        </motion.h1>
        <motion.p className="login-lead" variants={rise}>Ponle fecha a lo que sueñas. Juega tu año. Sube de nivel todos los días.</motion.p>
        <motion.p className="login-count" variants={rise}>
          {left > 0 ? <><b className="num">{left}</b> días para que empiece</> : <>Día <b className="num">{1 - left}</b> de tu 2027</>}
        </motion.p>
      </motion.div>

      <motion.div className="login-card-wrap" initial={{ opacity: 0, y: 40, rotateX: 14 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay: 0.5, type: "spring", stiffness: 120, damping: 18 }}>
        <Glass tilt className={cx("login-card", error && "shake")}>
          <h2>{mode === "login" ? "Entra a tu 2027" : "Empieza a planear tu 2027"}</h2>
          <p className="muted">{mode === "login" ? "Tus metas, tus rachas y tus ahorros te están esperando." : "Empiezas con tu Rueda de la Vida: ocho áreas para llenar con lo que sueñas."}</p>
          <form onSubmit={submit} className="form">
            {mode === "register" && <Field label="Tu nombre"><input className="input" value={form.display_name} onChange={set("display_name")} placeholder="Como quieres que te llame" /></Field>}
            {mode === "register" && registration === "code" && <Field label="Código de invitación"><input className="input" value={form.invite_code} onChange={set("invite_code")} required /></Field>}
            <Field label="Usuario"><input className="input" value={form.username} onChange={set("username")} autoCapitalize="characters" autoComplete="username" required autoFocus /></Field>
            <Field label="Clave">
              <div className="input-wrap">
                <input className="input" type={show ? "text" : "password"} value={form.password} onChange={set("password")} autoComplete={mode === "login" ? "current-password" : "new-password"} required />
                <button type="button" className="btn icon ghost" onClick={() => setShow(!show)} aria-label={show ? "Ocultar clave" : "Ver clave"}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
            </Field>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="btn primary lg" disabled={busy}>
              {busy ? "Entrando…" : mode === "login" ? "Entrar a mi 2027" : "Crear mi cuenta"} <ArrowUpRight size={18} />
            </button>
          </form>
          {registration !== "closed" || mode === "register" ? (
            <button className="link" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
              {mode === "login" ? "¿Primera vez? Crea tu cuenta" : "Ya tengo cuenta"}
            </button>
          ) : <small className="muted" style={{ textAlign: "center" }}>Las cuentas nuevas las crea el administrador.</small>}
        </Glass>
      </motion.div>
      <div className="login-flash" />
    </div>
  );
};

const rise = { hide: { opacity: 0, y: 26 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.2, 0.8, 0.2, 1] } } };
const digit = { hide: { opacity: 0, y: 80, rotateX: -70 }, show: { opacity: 1, y: 0, rotateX: 0, transition: { type: "spring", stiffness: 90, damping: 14 } } };
