"""
API de Cumbre 27.
- Autenticación con JWT y contraseñas con hash.
- CRUD genérico por recurso, siempre filtrado por el usuario del token.
- Acciones de juego (completar, registrar, canjear) que devuelven XP y monedas.
"""
import os
from datetime import date, datetime, timedelta

import requests
from flask import request, jsonify, Blueprint
from flask_cors import CORS
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from sqlalchemy import func
from werkzeug.security import generate_password_hash, check_password_hash

from api.models import (db, User, AppSetting, XPEvent, Pillar, Goal, Habit, HabitLog, DailyLog, Workout,
                        FocusSession, JournalEntry, Fund, Transaction, Budget, Investment,
                        ApartmentItem, VisionItem, Reward, ChatMessage, now)
from api.seed import seed_user_plan
from api.utils import APIException

api = Blueprint('api', __name__)
CORS(api)


@api.route('/health', methods=['GET'])
def health():
    """La usa el cron: despierta el servidor y toca la base de datos."""
    return jsonify({"ok": True, "users": User.query.count()})

RESOURCES = {
    "pillars": Pillar, "goals": Goal, "habits": Habit, "workouts": Workout, "journal": JournalEntry,
    "funds": Fund, "transactions": Transaction, "budgets": Budget, "investments": Investment,
    "apartment": ApartmentItem, "vision": VisionItem, "rewards": Reward,
}
# Campos que solo cambian mediante acciones de juego
LOCKED = {"id", "user_id", "created_at", "completed_at", "bought", "bought_at", "redeemed", "filled"}


# ───────────────────────── utilidades ─────────────────────────

def current_user():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user or not user.is_active:
        raise APIException("Sesión no válida", 401)
    return user


def parse_day(value=None):
    try:
        return date.fromisoformat(str(value)[:10]) if value else date.today()
    except ValueError:
        raise APIException("Fecha no válida, usa AAAA-MM-DD", 400)


def apply_fields(item, data):
    for col in item.__table__.columns:
        if col.name in LOCKED or col.name not in data:
            continue
        value = data[col.name]
        if value == "" and not isinstance(col.type, (db.String, db.Text)):
            value = None
        if value is not None:
            if isinstance(col.type, db.Date):
                value = parse_day(value)
            elif isinstance(col.type, db.Float):
                value = float(value)
            elif isinstance(col.type, db.Integer):
                value = int(value)
        setattr(item, col.name, value)


def award(user, xp=0, coins=0, reason="", kind="misc", key=None):
    """Suma (o resta) XP y monedas y lo deja escrito en el libro mayor."""
    user.xp = max(0, (user.xp or 0) + xp)
    user.coins = max(0, (user.coins or 0) + coins)
    event = XPEvent(user_id=user.id, xp=xp, coins=coins, reason=reason, kind=kind, key=key)
    db.session.add(event)
    return event


def award_once(user, key, **kw):
    if XPEvent.query.filter_by(user_id=user.id, key=key).first():
        return None
    return award(user, key=key, **kw)


def compute_streak(user, today):
    """Días seguidos con al menos la mitad de los hábitos diarios cumplidos (o cubiertos con escudo)."""
    daily = [h.id for h in Habit.query.filter_by(user_id=user.id, period="day", active=True)]
    if not daily:
        return 0
    since = today - timedelta(days=400)
    rows = (db.session.query(HabitLog.day, func.count(HabitLog.id))
            .filter(HabitLog.user_id == user.id, HabitLog.habit_id.in_(daily), HabitLog.day >= since)
            .group_by(HabitLog.day).all())
    done = {d: n for d, n in rows}
    shielded = set((user.settings or {}).get("shielded_days", []))

    def ok(d):
        return d.isoformat() in shielded or done.get(d, 0) * 2 >= len(daily)

    d = today if ok(today) else today - timedelta(days=1)
    streak = 0
    while ok(d) and streak < 400:
        streak += 1
        d -= timedelta(days=1)
    return streak


def game(user, events=(), today=None, **extra):
    """Respuesta estándar de una acción de juego."""
    db.session.commit()
    events = [e for e in events if e is not None]
    body = {"user": user.serialize(), "events": [e.serialize() for e in events],
            "streak": compute_streak(user, today or date.today())}
    body.update(extra)
    return jsonify(body)


def owned(model, item_id, user):
    item = model.query.filter_by(id=item_id, user_id=user.id).first()
    if not item:
        raise APIException("No encontrado", 404)
    return item


# ───────────────────────── autenticación ─────────────────────────

def get_setting(key, default=""):
    row = AppSetting.query.filter_by(key=key).first()
    return row.value if row else default


def set_setting(key, value):
    row = AppSetting.query.filter_by(key=key).first()
    if not row:
        row = AppSetting(key=key)
        db.session.add(row)
    row.value = str(value)


@api.route('/public/config', methods=['GET'])
def public_config():
    """Lo lee el login para saber si se pueden crear cuentas: open, code o closed."""
    return jsonify({"registration": get_setting("registration", "open")})


def find_user(username):
    return User.query.filter(func.lower(User.username) == (username or "").strip().lower()).first()


@api.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    if len(username) < 3 or len(password) < 4:
        raise APIException("El usuario necesita 3 caracteres o más y la clave 4 o más", 400)
    mode = get_setting("registration", "open")
    if mode == "closed":
        raise APIException("El registro está cerrado. Pídele una cuenta al administrador.", 403)
    if mode == "code" and (data.get("invite_code") or "").strip() != get_setting("invite_code"):
        raise APIException("El código de invitación no es correcto", 403)
    if find_user(username):
        raise APIException("Ese usuario ya existe", 409)
    user = User(username=username, password_hash=generate_password_hash(password),
                display_name=(data.get("display_name") or username).strip(),
                settings={"board_style": "collage", "water_goal": 2500, "sky": "auto", "monthly_income": 0})
    db.session.add(user)
    db.session.commit()
    seed_user_plan(user, full=False)
    return jsonify({"token": create_access_token(identity=str(user.id)), "user": user.serialize()}), 201


@api.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    user = find_user(data.get("username"))
    if not user or not check_password_hash(user.password_hash, data.get("password") or ""):
        raise APIException("Usuario o clave incorrectos", 401)
    if not user.is_active:
        raise APIException("Esta cuenta está desactivada. Habla con el administrador.", 403)
    return jsonify({"token": create_access_token(identity=str(user.id)), "user": user.serialize()})


@api.route('/me', methods=['PUT'])
@jwt_required()
def update_me():
    user = current_user()
    data = request.get_json(silent=True) or {}
    for field in ("display_name", "motto", "email"):
        if field in data:
            setattr(user, field, (data[field] or "").strip() or (None if field == "email" else ""))
    if isinstance(data.get("settings"), dict):
        user.settings = {**(user.settings or {}), **data["settings"]}
    db.session.commit()
    return jsonify({"user": user.serialize()})


@api.route('/me/password', methods=['PUT'])
@jwt_required()
def change_password():
    user = current_user()
    data = request.get_json(silent=True) or {}
    if not check_password_hash(user.password_hash, data.get("current") or ""):
        raise APIException("La clave actual no coincide", 400)
    if len(data.get("new") or "") < 6:
        raise APIException("La clave nueva necesita 6 caracteres o más", 400)
    user.password_hash = generate_password_hash(data["new"])
    db.session.commit()
    return jsonify({"ok": True})


@api.route('/bootstrap', methods=['GET'])
@jwt_required()
def bootstrap():
    """Todo lo que el front necesita para arrancar, en una sola llamada."""
    user = current_user()
    today = parse_day(request.args.get("day"))
    uid = user.id

    def rows(model, order=None, limit=None):
        q = model.query.filter_by(user_id=uid)
        if order is not None:
            q = q.order_by(order)
        if limit:
            q = q.limit(limit)
        return [r.serialize() for r in q]

    return jsonify({
        "user": user.serialize(),
        "streak": compute_streak(user, today),
        "pillars": rows(Pillar, Pillar.position),
        "goals": rows(Goal, Goal.position),
        "habits": rows(Habit, Habit.position),
        "habitLogs": [{"habit_id": l.habit_id, "day": l.day.isoformat()} for l in HabitLog.query.filter_by(user_id=uid)],
        "dailyLogs": rows(DailyLog, DailyLog.day),
        "workouts": rows(Workout, Workout.day.desc()),
        "focus": rows(FocusSession, FocusSession.id.desc(), 400),
        "journal": rows(JournalEntry, JournalEntry.id.desc()),
        "funds": rows(Fund, Fund.id),
        "transactions": rows(Transaction, Transaction.day.desc()),
        "budgets": rows(Budget, Budget.id),
        "investments": rows(Investment, Investment.id),
        "apartment": rows(ApartmentItem, ApartmentItem.id),
        "vision": rows(VisionItem, VisionItem.position),
        "rewards": rows(Reward, Reward.cost),
        "xpEvents": rows(XPEvent, XPEvent.id.desc(), 400),
        "chat": list(reversed(rows(ChatMessage, ChatMessage.id.desc(), 60))),
        "aiReady": bool(os.getenv("GROQ_API_KEY")),
    })


# ───────────────────────── acciones de juego ─────────────────────────

@api.route('/habits/<int:habit_id>/toggle', methods=['POST'])
@jwt_required()
def toggle_habit(habit_id):
    user = current_user()
    habit = owned(Habit, habit_id, user)
    data = request.get_json(silent=True) or {}
    day = parse_day(data.get("day"))
    today = parse_day(data.get("today"))
    log = HabitLog.query.filter_by(habit_id=habit.id, day=day).first()
    events = []
    if log:
        db.session.delete(log)
        events.append(award(user, xp=-habit.xp, reason=f"Desmarcado: {habit.name}", kind="habit"))
        done = False
    else:
        db.session.add(HabitLog(user_id=user.id, habit_id=habit.id, day=day))
        events.append(award(user, xp=habit.xp, coins=1, reason=habit.name, kind="habit"))
        done = True
    db.session.flush()

    if done:
        daily = [h.id for h in Habit.query.filter_by(user_id=user.id, period="day", active=True)]
        n = HabitLog.query.filter(HabitLog.user_id == user.id, HabitLog.day == day, HabitLog.habit_id.in_(daily)).count()
        if daily and n == len(daily):
            events.append(award_once(user, f"perfect:{day}", xp=30, coins=10, reason="Día perfecto: todos los hábitos", kind="bonus"))
        streak = compute_streak(user, today)
        if streak and streak % 7 == 0:
            start = today - timedelta(days=streak)
            shield = award_once(user, f"shield:{start}:{streak}", xp=50, coins=15,
                                reason=f"Racha de {streak} días: ganaste un escudo", kind="shield")
            if shield:
                user.shields = (user.shields or 0) + 1
                events.append(shield)
    return game(user, events, today, habit_id=habit.id, day=day.isoformat(), done=done)


@api.route('/shields/use', methods=['POST'])
@jwt_required()
def use_shield():
    user = current_user()
    data = request.get_json(silent=True) or {}
    day = parse_day(data.get("day")).isoformat()
    if (user.shields or 0) < 1:
        raise APIException("No tienes escudos. Se gana uno cada 7 días de racha.", 400)
    settings = dict(user.settings or {})
    days = list(settings.get("shielded_days", []))
    if day not in days:
        days.append(day)
        user.shields -= 1
        settings["shielded_days"] = days
        user.settings = settings
    return game(user, [], parse_day(data.get("today")))


@api.route('/goals/<int:goal_id>/complete', methods=['POST'])
@jwt_required()
def complete_goal(goal_id):
    user = current_user()
    goal = owned(Goal, goal_id, user)
    if goal.status == "done":
        goal.status, goal.completed_at, goal.progress = "pending", None, 0
        event = award(user, xp=-goal.xp, coins=-goal.coins, reason=f"Reabierta: {goal.title}", kind="goal")
    else:
        goal.status, goal.completed_at, goal.progress = "done", now(), 100
        label = "Jefe final derrotado" if goal.kind == "boss" else "Misión cumplida"
        event = award(user, xp=goal.xp, coins=goal.coins, reason=f"{label}: {goal.title}", kind=goal.kind)
    return game(user, [event], item=goal.serialize())


@api.route('/daily/<day>', methods=['PUT'])
@jwt_required()
def upsert_daily(day):
    user = current_user()
    d = parse_day(day)
    data = request.get_json(silent=True) or {}
    log = DailyLog.query.filter_by(user_id=user.id, day=d).first()
    if not log:
        log = DailyLog(user_id=user.id, day=d, water_ml=0)
        db.session.add(log)
    apply_fields(log, {k: v for k, v in data.items() if k != "day"})
    events = []
    goal_ml = int((user.settings or {}).get("water_goal", 2500))
    if (log.water_ml or 0) >= goal_ml:
        events.append(award_once(user, f"water:{d}", xp=10, coins=2, reason="Meta de agua del día", kind="body"))
    if log.mood:
        events.append(award_once(user, f"mood:{d}", xp=5, reason="Registro de ánimo", kind="mind"))
    if log.sleep_hours:
        events.append(award_once(user, f"sleep:{d}", xp=5, reason="Registro de sueño", kind="body"))
    db.session.flush()
    return game(user, events, item=log.serialize())


@api.route('/focus', methods=['POST'])
@jwt_required()
def log_focus():
    user = current_user()
    data = request.get_json(silent=True) or {}
    kind = data.get("kind", "focus")
    minutes = max(0.0, float(data.get("minutes") or 0))
    planned = float(data.get("planned") or 0)
    session = FocusSession(user_id=user.id, kind=kind, minutes=round(minutes, 1), planned=planned,
                           label=(data.get("label") or "")[:120], day=parse_day(data.get("day")))
    db.session.add(session)
    events = []
    if kind == "focus" and minutes >= 5:
        xp = int(minutes // 5) * 2
        events.append(award(user, xp=xp, coins=3 if minutes >= 25 else 1,
                            reason=f"{int(minutes)} min de enfoque" + (f": {session.label}" if session.label else ""), kind="focus"))
    elif kind == "social":
        over = minutes - planned
        if planned and over > 1:
            events.append(award(user, xp=-min(30, int(over) * 2), reason=f"Redes: te pasaste {int(over)} min", kind="social"))
        elif planned:
            events.append(award(user, xp=5, coins=1, reason="Pausa de redes respetada", kind="social"))
    elif kind == "breath" and minutes >= 1:
        events.append(award(user, xp=5, reason="Sesión de respiración", kind="mind"))
    db.session.flush()
    return game(user, events, item=session.serialize())


@api.route('/funds/<int:fund_id>/contribute', methods=['POST'])
@jwt_required()
def contribute(fund_id):
    user = current_user()
    fund = owned(Fund, fund_id, user)
    data = request.get_json(silent=True) or {}
    amount = float(data.get("amount") or 0)
    if amount == 0:
        raise APIException("Escribe un monto", 400)
    fund.saved = max(0, (fund.saved or 0) + amount)
    tx = Transaction(user_id=user.id, day=parse_day(data.get("day")), kind="saving", category=fund.name,
                     amount=amount, note="Aporte al cofre", fund_id=fund.id)
    db.session.add(tx)
    events = []
    if amount > 0:
        events.append(award(user, xp=10, coins=2, reason=f"Aporte a {fund.name}", kind="finance"))
        if fund.target and fund.saved >= fund.target and not fund.filled:
            fund.filled = True
            events.append(award(user, xp=200, coins=50, reason=f"Cofre lleno: {fund.name}", kind="chest"))
    db.session.flush()
    return game(user, events, item=fund.serialize(), transaction=tx.serialize())


@api.route('/apartment/<int:item_id>/toggle', methods=['POST'])
@jwt_required()
def toggle_apartment(item_id):
    user = current_user()
    item = owned(ApartmentItem, item_id, user)
    item.bought = not item.bought
    item.bought_at = now() if item.bought else None
    sign = 1 if item.bought else -1
    event = award(user, xp=30 * sign, coins=10 * sign,
                  reason=("Desbloqueado: " if item.bought else "Bloqueado de nuevo: ") + item.name, kind="home")
    return game(user, [event], item=item.serialize())


@api.route('/rewards/<int:reward_id>/redeem', methods=['POST'])
@jwt_required()
def redeem(reward_id):
    user = current_user()
    reward = owned(Reward, reward_id, user)
    if (user.coins or 0) < reward.cost:
        raise APIException(f"Te faltan {reward.cost - user.coins} monedas", 400)
    reward.redeemed = (reward.redeemed or 0) + 1
    event = award(user, coins=-reward.cost, reason=f"Canjeado: {reward.name}", kind="reward")
    return game(user, [event], item=reward.serialize())


@api.route('/launch', methods=['POST'])
@jwt_required()
def launch():
    """Firmar el compromiso al final del estreno. El premio se da una sola vez."""
    user = current_user()
    event = award_once(user, "launch-2027", xp=150, coins=50, reason="Plan 2027 lanzado y firmado", kind="launch")
    return game(user, [event])


# ───────────────────────── copiloto (Groq) ─────────────────────────

def money(n):
    return "$" + f"{int(n or 0):,}".replace(",", ".")


def build_context(user, today):
    uid = user.id
    pillars = {p.id: p for p in Pillar.query.filter_by(user_id=uid)}
    lines = [f"Hoy es {today.isoformat()}. Usuario: {user.display_name}. Lema: {user.motto}",
             f"Juego: {user.xp} XP, {user.coins} monedas, racha de {compute_streak(user, today)} días, {user.shields} escudos.",
             "", "METAS 2027 (por pilar):"]
    for g in Goal.query.filter_by(user_id=uid).order_by(Goal.pillar_id, Goal.position):
        p = pillars.get(g.pillar_id)
        state = {"done": "CUMPLIDA", "doing": "en curso"}.get(g.status, "pendiente")
        lines.append(f"- [{p.short if p else 'General'}] {g.title} ({'jefe final' if g.kind == 'boss' else 'misión'}, {g.quarter}"
                     f"{', mes ' + str(g.month) if g.month else ''}) → {state}. {g.notes or ''}")

    week_ago = today - timedelta(days=6)
    lines += ["", "HÁBITOS (últimos 7 días):"]
    for h in Habit.query.filter_by(user_id=uid, active=True):
        n = HabitLog.query.filter(HabitLog.habit_id == h.id, HabitLog.day >= week_ago, HabitLog.day <= today).count()
        per = {"day": "diario", "week": f"{h.target}/semana", "month": f"{h.target}/mes"}[h.period]
        lines.append(f"- {h.name} ({per}): {n} veces")

    month_start = today.replace(day=1)
    txs = Transaction.query.filter(Transaction.user_id == uid, Transaction.day >= month_start).all()
    income = sum(t.amount for t in txs if t.kind == "income")
    expense = sum(t.amount for t in txs if t.kind == "expense")
    saving = sum(t.amount for t in txs if t.kind in ("saving", "invest"))
    lines += ["", f"FINANZAS del mes (COP): ingresos {money(income)}, gastos {money(expense)}, ahorro/inversión {money(saving)}.",
              f"Ingreso mensual planeado: {money((user.settings or {}).get('monthly_income', 0))}."]
    by_cat = {}
    for t in txs:
        if t.kind == "expense":
            by_cat[t.category] = by_cat.get(t.category, 0) + t.amount
    for b in Budget.query.filter_by(user_id=uid):
        if b.monthly_limit or by_cat.get(b.category):
            lines.append(f"- Presupuesto {b.category}: gastado {money(by_cat.get(b.category, 0))} de {money(b.monthly_limit)}")
    lines.append("COFRES de ahorro:")
    for f in Fund.query.filter_by(user_id=uid):
        lines.append(f"- {f.name}: {money(f.saved)} de {money(f.target)}" + (f", fecha {f.deadline}" if f.deadline else ""))
    for i in Investment.query.filter_by(user_id=uid):
        lines.append(f"- Inversión {i.name} ({i.kind}): invertido {money(i.invested)}, vale {money(i.current_value)}")

    logs = DailyLog.query.filter(DailyLog.user_id == uid, DailyLog.day >= week_ago).all()
    if logs:
        lines += ["", "CUERPO Y ÁNIMO (7 días): " + "; ".join(
            f"{l.day.isoformat()[5:]} agua {l.water_ml or 0}ml, sueño {l.sleep_hours or '?'}h, ánimo {l.mood or '?'}/5" for l in logs)]
    focus_min = sum(s.minutes for s in FocusSession.query.filter(FocusSession.user_id == uid, FocusSession.kind == "focus", FocusSession.day >= week_ago))
    social_min = sum(s.minutes for s in FocusSession.query.filter(FocusSession.user_id == uid, FocusSession.kind == "social", FocusSession.day >= week_ago))
    lines.append(f"ENFOQUE (7 días): {int(focus_min)} min de trabajo profundo, {int(social_min)} min en redes.")
    pending = [a.name for a in ApartmentItem.query.filter_by(user_id=uid, bought=False)]
    if pending:
        lines.append("APARTAMENTO, falta comprar: " + ", ".join(pending))
    for j in JournalEntry.query.filter_by(user_id=uid).order_by(JournalEntry.id.desc()).limit(3):
        lines.append(f"BITÁCORA {j.day}: {j.title}. {(j.body or '')[:300]}")
    return "\n".join(lines)


SYSTEM_PROMPT = """Eres el Copiloto de Cumbre 27, la plataforma donde {name} planea y cumple su 2027.
Hablas en español de Colombia, cercano, directo y concreto. Nada de relleno ni frases motivacionales vacías.
Usas los datos reales del usuario que vienen abajo: cita cifras, metas y fechas cuando ayuden.
Si te piden un plan (financiero, de entrenamiento, de semana), entrégalo en pasos cortos con números y fechas.
Si un dato no está en el contexto, dilo y pregunta. No inventes cifras. Los montos son pesos colombianos.
No das asesoría financiera ni médica profesional: das orden, cuentas claras y opciones.

DATOS ACTUALES DEL USUARIO
{context}"""

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


@api.route('/ai/chat', methods=['POST'])
@jwt_required()
def ai_chat():
    user = current_user()
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    if not message:
        raise APIException("Escribe un mensaje", 400)
    key = os.getenv("GROQ_API_KEY")
    if not key:
        raise APIException("Falta GROQ_API_KEY en el archivo .env del backend", 503)

    history = ChatMessage.query.filter_by(user_id=user.id).order_by(ChatMessage.id.desc()).limit(12).all()
    messages = [{"role": "system", "content": SYSTEM_PROMPT.format(
        name=user.display_name, context=build_context(user, parse_day(data.get("day"))))}]
    messages += [{"role": m.role, "content": m.content} for m in reversed(history)]
    messages.append({"role": "user", "content": message})

    # Groq retira modelos con frecuencia: se prueba el configurado y luego los de respaldo.
    models = [m.strip() for m in os.getenv("GROQ_MODEL", "openai/gpt-oss-120b,qwen/qwen3.6-27b,openai/gpt-oss-20b").split(",") if m.strip()]
    reply, last_error = None, "sin respuesta"
    for model in models:
        try:
            r = requests.post(GROQ_URL, timeout=60, headers={"Authorization": f"Bearer {key}"},
                              json={"model": model, "messages": messages, "temperature": 0.6, "max_tokens": 1200})
            if r.ok:
                reply = r.json()["choices"][0]["message"]["content"]
                break
            last_error = (r.json().get("error") or {}).get("message", r.text[:200])
            if r.status_code in (401, 403):
                break
        except (requests.RequestException, ValueError, KeyError) as e:
            last_error = str(e)
    if reply is None:
        raise APIException(f"El copiloto no respondió: {last_error}", 502)

    user_msg = ChatMessage(user_id=user.id, role="user", content=message)
    bot_msg = ChatMessage(user_id=user.id, role="assistant", content=reply)
    db.session.add_all([user_msg, bot_msg])
    db.session.commit()
    return jsonify({"messages": [user_msg.serialize(), bot_msg.serialize()]})


@api.route('/ai/chat', methods=['DELETE'])
@jwt_required()
def ai_clear():
    user = current_user()
    ChatMessage.query.filter_by(user_id=user.id).delete()
    db.session.commit()
    return jsonify({"ok": True})


# ───────────────────────── sala de control (solo admin) ─────────────────────────

# Orden de borrado: primero lo que depende de otras tablas
USER_TABLES = [HabitLog, XPEvent, ChatMessage, DailyLog, Workout, FocusSession, JournalEntry, Transaction,
               Goal, Habit, Budget, Investment, ApartmentItem, VisionItem, Reward, Fund, Pillar]


def admin_user():
    user = current_user()
    if not user.is_admin:
        raise APIException("Solo el administrador puede hacer esto", 403)
    return user


def admin_row(u):
    last = db.session.query(func.max(XPEvent.created_at)).filter(XPEvent.user_id == u.id).scalar()
    return {
        **u.serialize(),
        "goals": Goal.query.filter_by(user_id=u.id).count(),
        "goals_done": Goal.query.filter_by(user_id=u.id, status="done").count(),
        "habit_marks": HabitLog.query.filter_by(user_id=u.id).count(),
        "last_activity": last.isoformat() if last else None,
    }


@api.route('/admin/users', methods=['GET'])
@jwt_required()
def admin_users():
    admin_user()
    return jsonify({
        "users": [admin_row(u) for u in User.query.order_by(User.id)],
        "settings": {"registration": get_setting("registration", "open"), "invite_code": get_setting("invite_code")},
    })


@api.route('/admin/users', methods=['POST'])
@jwt_required()
def admin_create_user():
    """Crear una cuenta a mano (sirve cuando el registro está cerrado)."""
    admin_user()
    data = request.get_json(silent=True) or {}
    username, password = (data.get("username") or "").strip(), data.get("password") or ""
    if len(username) < 3 or len(password) < 6:
        raise APIException("El usuario necesita 3 caracteres o más y la clave 6 o más", 400)
    if find_user(username):
        raise APIException("Ese usuario ya existe", 409)
    user = User(username=username, password_hash=generate_password_hash(password),
                display_name=(data.get("display_name") or username).strip(),
                settings={"board_style": "collage", "water_goal": 2500, "sky": "auto", "monthly_income": 0})
    db.session.add(user)
    db.session.commit()
    seed_user_plan(user, full=False)
    return jsonify({"user": admin_row(user)}), 201


@api.route('/admin/users/<int:user_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def admin_change_user(user_id):
    me = admin_user()
    target = db.session.get(User, user_id)
    if not target:
        raise APIException("Ese usuario no existe", 404)
    if target.id == me.id and request.method == 'DELETE':
        raise APIException("No puedes borrar tu propia cuenta desde aquí", 400)

    if request.method == 'DELETE':
        for model in USER_TABLES:
            model.query.filter_by(user_id=target.id).delete(synchronize_session=False)
        db.session.delete(target)
        db.session.commit()
        return jsonify({"ok": True, "id": user_id})

    data = request.get_json(silent=True) or {}
    if target.id == me.id and (data.get("is_active") is False or data.get("is_admin") is False):
        raise APIException("No puedes desactivarte ni quitarte el rol de administrador", 400)
    if "is_active" in data:
        target.is_active = bool(data["is_active"])
    if "is_admin" in data:
        target.is_admin = bool(data["is_admin"])
    if data.get("password"):
        if len(data["password"]) < 6:
            raise APIException("La clave nueva necesita 6 caracteres o más", 400)
        target.password_hash = generate_password_hash(data["password"])
    db.session.commit()
    return jsonify({"user": admin_row(target)})


@api.route('/admin/settings', methods=['PUT'])
@jwt_required()
def admin_settings():
    admin_user()
    data = request.get_json(silent=True) or {}
    if data.get("registration") in ("open", "code", "closed"):
        set_setting("registration", data["registration"])
    if "invite_code" in data:
        set_setting("invite_code", (data["invite_code"] or "").strip()[:60])
    if get_setting("registration", "open") == "code" and not get_setting("invite_code"):
        raise APIException("Escribe un código de invitación antes de activar ese modo", 400)
    db.session.commit()
    return jsonify({"settings": {"registration": get_setting("registration", "open"), "invite_code": get_setting("invite_code")}})


# ───────────────────────── CRUD genérico ─────────────────────────

CREATE_BONUS = {
    "workouts": lambda u, i: award(u, xp=15, coins=3, reason=f"Entrenamiento registrado ({i.minutes} min)", kind="body"),
    "journal": lambda u, i: award_once(u, f"journal:{i.day}", xp=10, coins=2, reason="Entrada en la bitácora", kind="mind"),
    "transactions": lambda u, i: award_once(u, f"tx:{i.day}", xp=5, reason="Movimientos del día registrados", kind="finance"),
}


def get_model(resource):
    model = RESOURCES.get(resource)
    if not model:
        raise APIException("Recurso desconocido", 404)
    return model


@api.route('/<resource>', methods=['POST'])
@jwt_required()
def create_item(resource):
    model = get_model(resource)
    user = current_user()
    item = model(user_id=user.id)
    apply_fields(item, request.get_json(silent=True) or {})
    if hasattr(item, "day") and item.day is None:
        item.day = date.today()
    db.session.add(item)
    try:
        db.session.flush()
    except Exception:
        db.session.rollback()
        raise APIException("Faltan datos obligatorios", 400)
    bonus = CREATE_BONUS.get(resource)
    events = [bonus(user, item)] if bonus else []
    return game(user, events, item=item.serialize())


@api.route('/<resource>/<int:item_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def change_item(resource, item_id):
    model = get_model(resource)
    user = current_user()
    item = owned(model, item_id, user)
    if request.method == 'DELETE':
        if resource == "transactions" and item.fund_id and item.kind == "saving":
            fund = Fund.query.filter_by(id=item.fund_id, user_id=user.id).first()
            if fund:
                fund.saved = max(0, (fund.saved or 0) - item.amount)
        db.session.delete(item)
        db.session.commit()
        return jsonify({"ok": True, "id": item_id})
    data = dict(request.get_json(silent=True) or {})
    if resource == "goals" and data.get("status") == "done":
        data.pop("status")  # cumplir una meta pasa por /goals/<id>/complete
    apply_fields(item, data)
    db.session.commit()
    return jsonify({"item": item.serialize()})
