import { createBrowserRouter, createRoutesFromElements, Route, Link } from "react-router-dom";
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
  <div className="loader"><p>Este sendero no existe.</p><Link className="btn primary" to="/">Volver a la base</Link></div>
);

export const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* Pantallas completas, fuera del marco de la app */}
      <Route path="/login" element={<Login />} />
      <Route path="/estreno" element={<Premiere />} />

      {/* Todo lo demás vive dentro del Layout (barra lateral + HUD) */}
      <Route path="/" element={<Layout />} errorElement={<NotFound />}>
        <Route index element={<Home />} />
        <Route path="plan" element={<Plan />} />
        <Route path="vision" element={<Vision />} />
        <Route path="habitos" element={<Habits />} />
        <Route path="cuerpo" element={<Body />} />
        <Route path="enfoque" element={<Focus />} />
        <Route path="respira" element={<Breathe />} />
        <Route path="bitacora" element={<Journal />} />
        <Route path="finanzas" element={<Finance />} />
        <Route path="apartamento" element={<Apartment />} />
        <Route path="botin" element={<Loot />} />
        <Route path="copiloto" element={<Copilot />} />
        <Route path="perfil" element={<Profile />} />
        <Route path="control" element={<Control />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </>
  ),
  { basename: import.meta.env.VITE_BASENAME || "/" }
);
