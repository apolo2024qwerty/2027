"""
Datos iniciales de Level Up 2027.
Cada cuenta arranca con la Rueda de la Vida (8 áreas), unos hábitos de arranque y un presupuesto base.
Las metas, cofres, tablero de visión y demás los escribe cada persona.
"""
from werkzeug.security import generate_password_hash
from api.models import (db, User, AppSetting, Pillar, Habit, Budget, Reward, HabitLog, XPEvent, ChatMessage,
                        DailyLog, Workout, FocusSession, JournalEntry, Transaction, Goal, Investment,
                        ApartmentItem, VisionItem, Fund)

# (clave, nombre, corto, emoji, color, pregunta guía)
PILLARS = [
    ("salud", "Salud", "Salud", "💪", "#F0A64A", "¿Cómo quieres sentirte en tu cuerpo y con tu energía este año?"),
    ("dinero", "Dinero", "Dinero", "💰", "#E6CF52", "¿Qué quieres ordenar, ahorrar o empezar a ganar?"),
    ("amor", "Amor", "Amor", "❤️", "#86C55F", "¿Cómo quieres cuidar tu relación de pareja, o la que tienes contigo?"),
    ("familia", "Familia", "Familia", "🏡", "#62CDB0", "¿Qué momentos quieres vivir con tu familia?"),
    ("profesion", "Profesión", "Profesión", "💼", "#62B4E8", "¿A dónde quieres llevar tu trabajo, tu estudio o tu negocio?"),
    ("desarrollo", "Desarrollo personal", "Crecimiento", "🌱", "#8C93F2", "¿Qué quieres aprender y en quién te quieres convertir?"),
    ("ocio", "Ocio", "Ocio", "🎨", "#D48BF0", "¿Qué te divierte y te recarga? Viajes, hobbies, descanso."),
    ("amigos", "Amigos", "Amigos", "🤝", "#F08E7E", "¿Con quién quieres compartir más tiempo este año?"),
]

# (área, nombre, emoji, periodo, veces, xp)
HABITS = [
    ("salud", "Tomar agua al despertar", "💧", "day", 1, 10),
    ("salud", "Moverme 20 minutos", "🏃", "day", 1, 10),
    ("desarrollo", "Planear el día antes de abrir pantallas", "📝", "day", 1, 10),
    ("desarrollo", "Leer 10 páginas", "📖", "day", 1, 10),
    ("dinero", "Registrar ingresos y gastos", "🧾", "day", 1, 10),
    ("familia", "Llamar o ver a alguien que quiero", "📞", "week", 2, 15),
    ("ocio", "Un rato solo para mí", "🎧", "week", 2, 15),
    ("desarrollo", "Revisión de cierre de mes", "🧭", "month", 1, 50),
]

BUDGETS = [
    ("Vivienda", "needs", "🏠"), ("Servicios e internet", "needs", "💡"),
    ("Mercado", "needs", "🛒"), ("Transporte", "needs", "🚌"), ("Salud", "needs", "🩺"),
    ("Salidas y restaurantes", "wants", "🍽️"), ("Suscripciones", "wants", "📺"),
    ("Hobbies", "wants", "🎨"), ("Ropa y gustos", "wants", "🛍️"),
]

REWARDS = [
    ("Mi antojo favorito", "🍕", 60),
    ("Noche de película sin culpa", "🎬", 120),
    ("Una tarde libre solo para mí", "🌤️", 250),
]

BASE_SETTINGS = {"board_style": "collage", "water_goal": 2500, "sky": "auto", "scene": "orbitas", "accent": "oro", "monthly_income": 0}

# Orden de borrado: primero lo que depende de otras tablas
USER_TABLES = [HabitLog, XPEvent, ChatMessage, DailyLog, Workout, FocusSession, JournalEntry, Transaction,
               Goal, Habit, Budget, Investment, ApartmentItem, VisionItem, Reward, Fund, Pillar]


def seed_user_plan(user, **_):
    """Plantilla de arranque de cualquier cuenta: la Rueda de la Vida, hábitos sugeridos y presupuesto base."""
    pillars = {}
    for i, (key, name, short, emoji, color, focus) in enumerate(PILLARS):
        p = Pillar(user_id=user.id, name=name, short=short, emoji=emoji, color=color, focus=focus, position=i)
        db.session.add(p)
        pillars[key] = p
    db.session.flush()
    for i, (pk, name, emoji, period, target, xp) in enumerate(HABITS):
        db.session.add(Habit(user_id=user.id, pillar_id=pillars[pk].id, name=name, emoji=emoji,
                             period=period, target=target, xp=xp, position=i))
    for cat, bucket, emoji in BUDGETS:
        db.session.add(Budget(user_id=user.id, category=cat, bucket=bucket, emoji=emoji, monthly_limit=0))
    for name, emoji, cost in REWARDS:
        db.session.add(Reward(user_id=user.id, name=name, emoji=emoji, cost=cost))
    db.session.commit()


def wipe_user_data(user):
    """Borra todo lo que el usuario registró. La cuenta, la clave y el rol se conservan."""
    for model in USER_TABLES:
        model.query.filter_by(user_id=user.id).delete(synchronize_session=False)


def reset_user_plan(user):
    """Deja la cuenta como recién creada: Rueda de la Vida en blanco, sin XP ni monedas."""
    wipe_user_data(user)
    user.xp, user.coins, user.shields = 0, 0, 0
    settings = dict(user.settings or {})
    settings.pop("wheel", None)
    settings["monthly_income"] = 0
    user.settings = settings
    db.session.flush()
    seed_user_plan(user)


def ensure_seed():
    """Crea el usuario 1ALE si la base está vacía. Devuelve True si sembró."""
    if User.query.first():
        return False
    user = User(username="1ALE", password_hash=generate_password_hash("5678"), display_name="Alejo Sánchez",
                is_admin=True, motto="Mi 2027 empieza hoy.", settings=dict(BASE_SETTINGS))
    db.session.add(user)
    db.session.add(AppSetting(key="plan_v2", value="1"))
    db.session.commit()
    seed_user_plan(user)
    return True


def upgrade_to_wheel():
    """Se ejecuta una sola vez: limpia el plan de ejemplo que venía precargado en 1ALE y lo pasa a la Rueda de la Vida."""
    if AppSetting.query.filter_by(key="plan_v2").first():
        return False
    user = User.query.filter(db.func.lower(User.username) == "1ale").first()
    if user:
        reset_user_plan(user)
        user.motto = "Mi 2027 empieza hoy."
    db.session.add(AppSetting(key="plan_v2", value="1"))
    db.session.commit()
    return bool(user)
