import { createBrowserRouter, createRoutesFromElements, Route, Link, Navigate, useSearchParams } from "react-router-dom";
import { Tabs } from "./components/ui";
import { Layout } from "./pages/Layout";
import { Login } from "./pages/Login";
import { Home } from "./pages/Home";
import { Plan } from "./pages/Plan";
import { Habits } from "./pages/Habits";
import { Body } from "./pages/Body";
import { Focus } from "./pages/Focus";
import { Breathe } from "./pages/Breathe";
import { Journal } from "./pages/Journal";
import { Finance } from "./pages/Finance";
import { Apartment } from "./pages/Apartment";
import { Vision } from "./pages/Vision";
import { Loot } from "./pages/Loot";
import { Copilot } from "./pages/Copilot";
import { Profile } from "./pages/Profile";
import { Premiere } from "./pages/Premiere";
import { Control } from "./pages/Control";

const NotFound = () => (
  <div className="loader"><p>Esta página no existe.</p><Link className="btn primary" to="/">Volver al inicio</Link></div>
);

// Secciones unidas: dos pantallas bajo un mismo punto del menú. La pestaña activa viaja en la URL (?ver=).
const Hub = ({ tabs }) => {
  const [params, setParams] = useSearchParams();
  const active = tabs.find((t) => t.id === params.get("ver")) || tabs[0];
  return (
    <>
      <div className="hub-tabs"><Tabs name="hub-pill" value={active.id} options={tabs.map((t) => [t.id, t.label])}
        onChange={(id) => setParams(id === tabs[0].id ? {} : { ver: id }, { replace: true })} /></div>
      <div key={active.id} className="hub-body">{active.el}</div>
    </>
  );
};
const HomeHub = () => <Hub tabs={[{ id: "hoy", label: "☀️ Hoy", el: <Home /> }, { id: "botin", label: "🏆 Botín y logros", el: <Loot /> }]} />;
const HabitsHub = () => <Hub tabs={[{ id: "habitos", label: "🔥 Hábitos", el: <Habits /> }, { id: "cuerpo", label: "💧 Cuerpo", el: <Body /> }]} />;
const FocusHub = () => <Hub tabs={[{ id: "enfoque", label: "🎯 Enfoque", el: <Focus /> }, { id: "respira", label: "🌬️ Respira", el: <Breathe /> }]} />;

export const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* Pantallas completas, fuera del marco de la app */}
      <Route path="/login" element={<Login />} />
      <Route path="/estreno" element={<Premiere />} />

      {/* Todo lo demás vive dentro del Layout (barra lateral + HUD) */}
      <Route path="/" element={<Layout />} errorElement={<NotFound />}>
        <Route index element={<HomeHub />} />
        <Route path="plan" element={<Plan />} />
        <Route path="vision" element={<Vision />} />
        <Route path="habitos" element={<HabitsHub />} />
        <Route path="cuerpo" element={<Navigate to="/habitos?ver=cuerpo" replace />} />
        <Route path="enfoque" element={<FocusHub />} />
        <Route path="respira" element={<Navigate to="/enfoque?ver=respira" replace />} />
        <Route path="bitacora" element={<Journal />} />
        <Route path="finanzas" element={<Finance />} />
        <Route path="apartamento" element={<Apartment />} />
        <Route path="botin" element={<Navigate to="/?ver=botin" replace />} />
        <Route path="copiloto" element={<Copilot />} />
        <Route path="perfil" element={<Profile />} />
        <Route path="control" element={<Control />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </>
  ),
  { basename: import.meta.env.VITE_BASENAME || "/" }
);
