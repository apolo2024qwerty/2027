"""
Modelos de Level Up 2027.
Todo cuelga de User (user_id) para que la plataforma sea multiusuario desde el día 1.
"""
from datetime import date, datetime, timezone
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

HIDDEN = {"password_hash"}


def now():
    return datetime.now(timezone.utc)


class Base(db.Model):
    __abstract__ = True
    id = db.Column(db.Integer, primary_key=True)

    def serialize(self):
        out = {}
        for c in self.__table__.columns:
            if c.name in HIDDEN:
                continue
            v = getattr(self, c.name)
            if isinstance(v, (date, datetime)):
                v = v.isoformat()
            out[c.name] = v
        return out


class Owned(Base):
    """Cualquier registro que pertenece a un usuario."""
    __abstract__ = True
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)


# ───────────────────────── Usuario y juego ─────────────────────────

class User(Base):
    __tablename__ = "users"
    username = db.Column(db.String(40), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    display_name = db.Column(db.String(80), nullable=False, default="")
    motto = db.Column(db.String(200), default="")
    xp = db.Column(db.Integer, nullable=False, default=0)
    coins = db.Column(db.Integer, nullable=False, default=0)
    shields = db.Column(db.Integer, nullable=False, default=0)
    settings = db.Column(db.JSON, nullable=False, default=dict)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    is_admin = db.Column(db.Boolean, nullable=False, default=False, server_default=db.false())
    created_at = db.Column(db.DateTime, default=now)

    def __repr__(self):
        return f"<User {self.username}>"


class AppSetting(Base):
    """Ajustes globales de la plataforma (por ejemplo, quién puede registrarse)."""
    __tablename__ = "app_settings"
    key = db.Column(db.String(60), unique=True, nullable=False)
    value = db.Column(db.String(300), nullable=False, default="")


class XPEvent(Owned):
    """Libro mayor del juego: cada punto ganado o perdido queda aquí."""
    __tablename__ = "xp_events"
    xp = db.Column(db.Integer, nullable=False, default=0)
    coins = db.Column(db.Integer, nullable=False, default=0)
    reason = db.Column(db.String(160), nullable=False)
    kind = db.Column(db.String(30), default="misc")
    key = db.Column(db.String(80), index=True)  # para premios que solo se dan una vez
    created_at = db.Column(db.DateTime, default=now)


# ───────────────────────── Plan del año ─────────────────────────

class Pillar(Owned):
    __tablename__ = "pillars"
    name = db.Column(db.String(80), nullable=False)
    short = db.Column(db.String(30), default="")
    emoji = db.Column(db.String(8), default="⭐")
    color = db.Column(db.String(9), default="#E8B95B")
    focus = db.Column(db.Text, default="")
    position = db.Column(db.Integer, default=0)


class Goal(Owned):
    __tablename__ = "goals"
    pillar_id = db.Column(db.Integer, db.ForeignKey("pillars.id", ondelete="SET NULL"), index=True)
    title = db.Column(db.String(200), nullable=False)
    notes = db.Column(db.Text, default="")
    kind = db.Column(db.String(12), default="side")  # side = misión, boss = jefe final
    quarter = db.Column(db.String(6), default="Q1")  # Q1..Q4 o Anual
    month = db.Column(db.Integer)  # 1..12 opcional
    xp = db.Column(db.Integer, default=100)
    coins = db.Column(db.Integer, default=20)
    status = db.Column(db.String(12), default="pending")  # pending, doing, done
    progress = db.Column(db.Integer, default=0)
    image_url = db.Column(db.String(500), default="")
    completed_at = db.Column(db.DateTime)
    position = db.Column(db.Integer, default=0)


class Habit(Owned):
    __tablename__ = "habits"
    pillar_id = db.Column(db.Integer, db.ForeignKey("pillars.id", ondelete="SET NULL"))
    name = db.Column(db.String(120), nullable=False)
    emoji = db.Column(db.String(8), default="✅")
    period = db.Column(db.String(8), default="day")  # day, week, month
    target = db.Column(db.Integer, default=1)  # veces por periodo
    xp = db.Column(db.Integer, default=10)
    active = db.Column(db.Boolean, default=True)
    position = db.Column(db.Integer, default=0)


class HabitLog(Owned):
    __tablename__ = "habit_logs"
    habit_id = db.Column(db.Integer, db.ForeignKey("habits.id", ondelete="CASCADE"), nullable=False, index=True)
    day = db.Column(db.Date, nullable=False, index=True)
    __table_args__ = (db.UniqueConstraint("habit_id", "day", name="uq_habit_day"),)


# ───────────────────────── Cuerpo y mente ─────────────────────────

class DailyLog(Owned):
    """Un registro por día: agua, sueño, ánimo, energía."""
    __tablename__ = "daily_logs"
    day = db.Column(db.Date, nullable=False, index=True)
    water_ml = db.Column(db.Integer, default=0)
    sleep_hours = db.Column(db.Float)
    mood = db.Column(db.Integer)  # 1..5
    energy = db.Column(db.Integer)  # 1..5
    emotion = db.Column(db.String(30), default="")
    weight_kg = db.Column(db.Float)
    __table_args__ = (db.UniqueConstraint("user_id", "day", name="uq_user_day"),)


class Workout(Owned):
    __tablename__ = "workouts"
    day = db.Column(db.Date, nullable=False, index=True)
    kind = db.Column(db.String(20), default="run")  # run, bike, strength, yoga, hike, other
    minutes = db.Column(db.Integer, default=0)
    km = db.Column(db.Float, default=0)
    note = db.Column(db.String(200), default="")


class FocusSession(Owned):
    __tablename__ = "focus_sessions"
    kind = db.Column(db.String(10), default="focus")  # focus, social, breath
    label = db.Column(db.String(120), default="")
    minutes = db.Column(db.Float, default=0)
    planned = db.Column(db.Float, default=0)
    day = db.Column(db.Date, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=now)


class JournalEntry(Owned):
    __tablename__ = "journal"
    day = db.Column(db.Date, nullable=False, index=True)
    title = db.Column(db.String(160), default="")
    body = db.Column(db.Text, default="")
    win = db.Column(db.String(200), default="")
    gratitude = db.Column(db.String(200), default="")
    created_at = db.Column(db.DateTime, default=now)


# ───────────────────────── Finanzas ─────────────────────────

class Fund(Owned):
    """Cofre: una meta de ahorro con nombre, monto y fecha."""
    __tablename__ = "funds"
    name = db.Column(db.String(100), nullable=False)
    emoji = db.Column(db.String(8), default="💰")
    color = db.Column(db.String(9), default="#E8B95B")
    target = db.Column(db.Float, default=0)
    saved = db.Column(db.Float, default=0)
    deadline = db.Column(db.Date)
    filled = db.Column(db.Boolean, default=False)


class Transaction(Owned):
    __tablename__ = "transactions"
    day = db.Column(db.Date, nullable=False, index=True)
    kind = db.Column(db.String(10), nullable=False, default="expense")  # income, expense, saving, invest
    category = db.Column(db.String(60), default="Otros")
    amount = db.Column(db.Float, nullable=False, default=0)
    note = db.Column(db.String(200), default="")
    fund_id = db.Column(db.Integer, db.ForeignKey("funds.id", ondelete="SET NULL"))


class Budget(Owned):
    __tablename__ = "budgets"
    category = db.Column(db.String(60), nullable=False)
    bucket = db.Column(db.String(10), default="needs")  # needs, wants
    emoji = db.Column(db.String(8), default="🧾")
    monthly_limit = db.Column(db.Float, default=0)


class Investment(Owned):
    __tablename__ = "investments"
    name = db.Column(db.String(100), nullable=False)
    kind = db.Column(db.String(40), default="CDT")
    invested = db.Column(db.Float, default=0)
    current_value = db.Column(db.Float, default=0)
    note = db.Column(db.String(200), default="")


# ───────────────────────── Hogar, visión, botín ─────────────────────────

class ApartmentItem(Owned):
    __tablename__ = "apartment_items"
    name = db.Column(db.String(100), nullable=False)
    room = db.Column(db.String(30), default="Sala")
    emoji = db.Column(db.String(8), default="📦")
    cost = db.Column(db.Float, default=0)
    bought = db.Column(db.Boolean, default=False)
    bought_at = db.Column(db.DateTime)


class VisionItem(Owned):
    __tablename__ = "vision_items"
    title = db.Column(db.String(120), nullable=False)
    caption = db.Column(db.String(200), default="")
    image_url = db.Column(db.String(600), default="")
    emoji = db.Column(db.String(8), default="✨")
    color = db.Column(db.String(9), default="#E8B95B")
    position = db.Column(db.Integer, default=0)


class Reward(Owned):
    """Premios que el usuario se compra con sus monedas."""
    __tablename__ = "rewards"
    name = db.Column(db.String(120), nullable=False)
    emoji = db.Column(db.String(8), default="🎁")
    cost = db.Column(db.Integer, default=50)
    redeemed = db.Column(db.Integer, default=0)


class ChatMessage(Owned):
    __tablename__ = "chat_messages"
    role = db.Column(db.String(12), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=now)
