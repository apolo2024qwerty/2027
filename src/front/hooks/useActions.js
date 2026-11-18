// Acciones: hablan con la API, actualizan el store y disparan la fiesta (toasts, confeti, sonidos).
import { useMemo, useRef } from "react";
import useGlobalReducer from "./useGlobalReducer";
import { api, setToken } from "../lib/api";
import { levelOf, levelName, todayStr } from "../lib/game";
import { burst, fireworks, play } from "../lib/fx";

let toastId = 0;

export default function useActions() {
  const { store, dispatch } = useGlobalReducer();
  const ref = useRef(store);
  ref.current = store;

  return useMemo(() => {
    const toast = (t) => {
      const id = ++toastId;
      dispatch({ type: "toast", payload: { id, ...t } });
      setTimeout(() => dispatch({ type: "toast_off", payload: id }), t.ms || 3800);
    };
    const fail = (e) => { toast({ tone: "bad", title: e.message }); if (e.status === 401) logout(); return null; };

    // Procesa la parte de juego de cualquier respuesta
    const reward = (res) => {
      if (!res?.user) return;
      const before = levelOf(ref.current.user?.xp);
      dispatch({ type: "game", payload: res });
      const events = res.events || [];
      events.forEach((e) => toast({ tone: e.xp < 0 || (e.coins < 0 && e.kind !== "reward") ? "bad" : "good", title: e.reason, xp: e.xp, coins: e.coins }));
      const gained = events.some((e) => e.xp > 0), lost = events.some((e) => e.xp < 0);
      const big = events.find((e) => e.xp > 0 && ["boss", "chest", "launch", "shield"].includes(e.kind));
      const after = levelOf(res.user.xp);
      if (after > before) {
        dispatch({ type: "celebrate", payload: { emoji: "🚀", title: "Subiste al nivel " + after, subtitle: levelName(after) } });
        fireworks(); play("win");
      } else if (big) {
        if (big.kind === "boss") dispatch({ type: "celebrate", payload: { emoji: "⚔️", title: "Jefe final derrotado", subtitle: big.reason.split(": ")[1] } });
        fireworks(1600); play("win");
      } else if (gained) { burst(events.some((e) => e.kind === "bonus" || e.xp >= 100) ? 1.6 : 0.5); play("coin"); }
      else if (lost) play("lose");
    };

    const call = async (method, path, body, key) => {
      try {
        const res = await api(path, { method, body });
        if (key && res.item) dispatch({ type: "upsert", payload: { key, item: res.item } });
        reward(res);
        return res;
      } catch (e) { return fail(e); }
    };

    const logout = () => { setToken(null); dispatch({ type: "logout" }); };

    return {
      toast, logout, reward,
      async login(username, password, register = false, display_name, invite_code) {
        const res = await api(register ? "/register" : "/login", { method: "POST", body: { username, password, display_name, invite_code } });
        setToken(res.token);
        dispatch({ type: "auth", payload: res });
        return res;
      },
      async boot() {
        try { dispatch({ type: "boot", payload: await api("/bootstrap?day=" + todayStr()) }); }
        catch (e) { fail(e); }
      },
      create: (key, data) => call("POST", "/" + key, data, key),
      update: (key, id, data) => call("PUT", `/${key}/${id}`, data, key),
      async remove(key, id) {
        try { await api(`/${key}/${id}`, { method: "DELETE" }); dispatch({ type: "remove", payload: { key, id } }); return true; }
        catch (e) { return fail(e); }
      },
      async toggleHabit(habit_id, day = todayStr()) {
        const res = await call("POST", `/habits/${habit_id}/toggle`, { day, today: todayStr() });
        if (res) dispatch({ type: "habit_log", payload: res });
        return res;
      },
      useShield: (day) => call("POST", "/shields/use", { day, today: todayStr() }),
      completeGoal: (id) => call("POST", `/goals/${id}/complete`, null, "goals"),
      saveDaily: (day, data) => call("PUT", "/daily/" + day, data, "dailyLogs"),
      logFocus: (data) => call("POST", "/focus", { day: todayStr(), ...data }, "focus"),
      async contribute(id, amount) {
        const res = await call("POST", `/funds/${id}/contribute`, { amount, day: todayStr() }, "funds");
        if (res?.transaction) dispatch({ type: "upsert", payload: { key: "transactions", item: res.transaction } });
        return res;
      },
      toggleApartment: (id) => call("POST", `/apartment/${id}/toggle`, null, "apartment"),
      redeem: (id) => call("POST", `/rewards/${id}/redeem`, null, "rewards"),
      launch: () => call("POST", "/launch"),
      async saveProfile(data) {
        try { const res = await api("/me", { method: "PUT", body: data }); dispatch({ type: "set", payload: { key: "user", value: res.user } }); return res; }
        catch (e) { return fail(e); }
      },
      async resetPlan(password) {
        try { await api("/me/reset", { method: "POST", body: { password } }); dispatch({ type: "boot", payload: await api("/bootstrap?day=" + todayStr()) }); toast({ tone: "good", title: "Tu plan quedó en blanco. A soñar de nuevo." }); return true; }
        catch (e) { return fail(e); }
      },
      async changePassword(current, next) {
        try { await api("/me/password", { method: "PUT", body: { current, new: next } }); toast({ tone: "good", title: "Clave actualizada" }); return true; }
        catch (e) { return fail(e); }
      },
      async ask(message) {
        const res = await api("/ai/chat", { method: "POST", body: { message, day: todayStr() } });
        dispatch({ type: "set", payload: { key: "chat", value: [...ref.current.chat, ...res.messages] } });
        return res;
      },
      async clearChat() {
        try { await api("/ai/chat", { method: "DELETE" }); dispatch({ type: "set", payload: { key: "chat", value: [] } }); } catch (e) { fail(e); }
      },
    };
  }, [dispatch]);
}
