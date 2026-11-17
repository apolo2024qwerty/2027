"""
Datos iniciales: el Plan Maestro 2027 de Alejo.
`seed_user_plan` también sirve de plantilla de arranque para usuarios nuevos (solo estructura).
"""
from datetime import date
from werkzeug.security import generate_password_hash
from api.models import (db, User, Pillar, Goal, Habit, Fund, Budget, ApartmentItem,
                        VisionItem, Reward)

PILLARS = [
    # (clave, nombre, corto, emoji, color, enfoque)
    ("hogar", "El nuevo cuartel general", "Hogar", "🏠", "#D9A066",
     "Crear un espacio luminoso, estético, ordenado y libre de inhibiciones para crear música y proyectos."),
    ("finanzas", "Finanzas inteligentes y patrimonio", "Finanzas", "💰", "#E8B95B",
     "Control absoluto ante los nuevos gastos de independencia para financiar viajes e inversiones."),
    ("cuerpo", "Cuerpo de verano y alto rendimiento", "Cuerpo", "💪", "#E27D60",
     "Eliminar el sube y baja de 2026, estabilizar un peso saludable y conquistar el asfalto y la montaña."),
    ("aventura", "Aventura, Tribu 2600 y marca personal", "Aventura", "✈️", "#5FA57C",
     "Consolidar la agencia de viajes con energía real, sin esperar multitudes, y hacer crecer la comunidad."),
    ("tech", "Ecosistema tech y negocios", "Negocios", "💻", "#6C9BD9",
     "Pasar de construir productos increíbles a venderlos, cerrar acuerdos societarios y escalar ingresos."),
    ("edu", "Innovación educativa y liderazgo", "Educación", "🎓", "#9B8CE0",
     "Convertir lo creado en el colegio en productos vendibles para otras instituciones."),
    ("musica", "Creatividad, música y expresión", "Música", "🎶", "#D58BB8",
     "Aprovechar la privacidad del apartamento para retomar el arte sin restricciones."),
    ("mente", "Mente, rutina matutina y reinversión", "Mente", "🧠", "#7FC8C0",
     "Usar la independencia como un reinicio total de los hábitos diarios."),
]

# (pilar, título, tipo, trimestre, mes, notas)
GOALS = [
    ("hogar", "Mudanza completada e inauguración del apartamento", "boss", "Q1", 1, "Ejecutar la mudanza oficial e inaugurar."),
    ("hogar", "Equipamiento esencial completo", "side", "Q1", 2, "Lavadora, utensilios de cocina, cortinas, mesa de centro, tapetes y cuadros."),
    ("hogar", "Rincones de identidad listos", "side", "Q1", 3, "Setup de escritorio, rincón de instrumentos sin miedo al ruido, video beam y exhibición de Legos."),

    ("finanzas", "Presupuesto 50/30/20 funcionando desde el día 1", "side", "Q1", 1, "O 'Cada peso cuenta' (base cero), adaptado a los gastos reales de vivir solo."),
    ("finanzas", "Tres bolsillos de ahorro creados y alimentados", "side", "Q2", 4, "Expedición Guatemala, gran viaje de octubre y reserva de emergencia / inversión."),
    ("finanzas", "Fuentes de ingreso diversificadas", "side", "Q4", 10, "Salario del colegio, utilidades de Nébula Estudio, participación de COMPASS y licencias educativas."),

    ("cuerpo", "Carrera local 1 de 3", "side", "Q1", 2, "5K o 10K, enfocada en velocidad o distancia."),
    ("cuerpo", "Carrera local 2 de 3", "side", "Q2", 4, ""),
    ("cuerpo", "Carrera local 3 de 3", "side", "Q2", 6, ""),
    ("cuerpo", "Media Maratón de Bogotá, 21K", "boss", "Q3", 7, "Con preparación óptima y buscando la mejor marca personal."),
    ("cuerpo", "Cumbre en el Nevado del Tolima", "boss", "Q3", 8, "Con el 20% de descuento ganado con el reel."),
    ("cuerpo", "Travesía de Ciudad Perdida", "boss", "Q3", 9, ""),

    ("aventura", "Visa de Estados Unidos aprobada", "side", "Q1", 3, "Habilita viajes frecuentes a USA durante el año."),
    ("aventura", "Campaña de Reels en Instagram lanzada", "side", "Q1", 2, "Con el material que ya existe: medir audiencia, validar nicho y atraer viajeros."),
    ("aventura", "Expedición a Guatemala con Tribu 2600", "boss", "Q2", 4, "Con toda la energía y con las personas que confirmen."),
    ("aventura", "Gran viaje internacional del año", "boss", "Q4", 10, "Europa o un destino exótico por definir."),

    ("tech", "Acuerdo societario de COMPASS firmado", "side", "Q1", 3, "Porcentajes y participación antes de escalar facturación."),
    ("tech", "Primeras ventas B2B de COMPASS", "boss", "Q2", 6, "A instituciones educativas y organizaciones."),
    ("tech", "Cliente nuevo cerrado en Nébula Estudio", "side", "Anual", None, "Fidelización NFC, menús digitales y desarrollos a medida."),
    ("tech", "Camino laboral externo definido", "side", "Q1", 2, "Proceso de selección activo desde diciembre, en equilibrio con los emprendimientos."),

    ("edu", "FinFluent lanzado para todos los estudiantes", "side", "Q1", 1, "Documentando el impacto y el entusiasmo desde inicio de año."),
    ("edu", "FinFluent vendido a otro colegio", "boss", "Q3", 8, "Usando los resultados de CREAR como caso de éxito."),
    ("edu", "Orbit Horizon ofrecido como SaaS a otros colegios", "boss", "Q3", 9, "Empaquetar Lumi como plataforma de planeación docente."),
    ("edu", "Manual / Ecuaciones de Bolsillo en venta", "side", "Q4", 10, "Promover y comercializar el libro."),

    ("musica", "Pieza grabada y compartida, primer trimestre", "side", "Q1", 3, ""),
    ("musica", "Pieza grabada y compartida, segundo trimestre", "side", "Q2", 6, ""),
    ("musica", "Pieza grabada y compartida, tercer trimestre", "side", "Q3", 9, ""),
    ("musica", "Pieza grabada y compartida, cuarto trimestre", "side", "Q4", 12, ""),
]

# (pilar, nombre, emoji, periodo, veces, xp)
HABITS = [
    ("mente", "Despertar temprano", "🌅", "day", 1, 10),
    ("mente", "Yoga o movilidad en la sala", "🧘", "day", 1, 10),
    ("mente", "Planear el día antes de abrir pantallas", "📝", "day", 1, 10),
    ("cuerpo", "Dieta limpia y sostenible", "🥗", "day", 1, 10),
    ("finanzas", "Registrar ingresos y gastos", "🧾", "day", 1, 10),
    ("hogar", "15 minutos de orden antes de dormir", "🧹", "day", 1, 10),
    ("cuerpo", "Sesión de running", "🏃", "week", 3, 15),
    ("cuerpo", "Ciclovía del domingo", "🚴", "week", 1, 20),
    ("musica", "Práctica de piano", "🎹", "week", 3, 15),
    ("musica", "Bloque protegido de violín", "🎻", "week", 2, 15),
    ("mente", "Revisión de cierre de mes", "🧭", "month", 1, 50),
]

APARTMENT = [
    ("Lavadora", "Zona de ropas", "🧺"), ("Utensilios de cocina", "Cocina", "🍳"),
    ("Cortinas", "Sala", "🪟"), ("Mesa de centro", "Sala", "🪵"), ("Tapetes", "Sala", "🧶"),
    ("Cuadros", "Sala", "🖼️"), ("Video beam", "Sala", "📽️"),
    ("Setup de escritorio", "Estudio", "🖥️"), ("Rincón de piano y violín", "Estudio", "🎹"),
    ("Exhibición de Legos", "Estudio", "🧱"),
]

# Montos de ejemplo: se editan desde Finanzas.
FUNDS = [
    ("Expedición Guatemala", "🌋", "#5FA57C", 4500000, date(2027, 4, 1)),
    ("Gran viaje de octubre", "🧳", "#6C9BD9", 12000000, date(2027, 10, 1)),
    ("Visa USA", "🗽", "#9B8CE0", 900000, date(2027, 3, 1)),
    ("Apartamento", "🏠", "#D9A066", 6000000, date(2027, 3, 31)),
    ("Reserva de emergencia e inversión", "🛟", "#E8B95B", 10000000, date(2027, 12, 31)),
]

BUDGETS = [
    ("Arriendo y administración", "needs", "🏠"), ("Servicios e internet", "needs", "💡"),
    ("Mercado", "needs", "🛒"), ("Transporte", "needs", "🚌"), ("Salud", "needs", "🩺"),
    ("Salidas y restaurantes", "wants", "🍻"), ("Suscripciones", "wants", "📺"),
    ("Hobbies y música", "wants", "🎶"), ("Ropa y deporte", "wants", "👟"),
]

VISION = [
    ("Cumbre del Nevado del Tolima", "5.215 metros. Arriba no hay excusas.", "🏔️", "#BFE0EE"),
    ("Guatemala con la Tribu", "Volcanes, fogata y la gente que sí fue.", "🌋", "#5FA57C"),
    ("21K de Bogotá", "Cruzar la meta con mi mejor marca.", "🏅", "#E27D60"),
    ("Mi apartamento", "Luz, orden y música a cualquier hora.", "🏠", "#D9A066"),
    ("Piano y violín sin miedo", "Sonar en mi propio espacio.", "🎻", "#D58BB8"),
    ("COMPASS vendiendo", "De construir a facturar.", "🧭", "#6C9BD9"),
    ("Ciudad Perdida", "Selva, escalones y silencio.", "🌿", "#7FC8C0"),
    ("El gran viaje de octubre", "Europa o lo exótico. Se decide soñando.", "🧳", "#E8B95B"),
]

REWARDS = [
    ("Noche de pizza y película en el video beam", "🍕", 60),
    ("Partitura o libro nuevo", "📚", 120),
    ("Día completo en la montaña, sin pantallas", "⛰️", 150),
    ("Set de Lego para la exhibición", "🧱", 400),
]

XP_BY_KIND = {"side": (100, 20), "boss": (500, 100)}


def seed_user_plan(user, full=True):
    """Crea el plan base de un usuario. full=False deja solo la estructura (pilares, hábitos y presupuesto)."""
    pillars = {}
    for i, (key, name, short, emoji, color, focus) in enumerate(PILLARS):
        p = Pillar(user_id=user.id, name=name, short=short, emoji=emoji, color=color, focus=focus if full else "", position=i)
        db.session.add(p)
        pillars[key] = p
    db.session.flush()

    for i, (pk, name, emoji, period, target, xp) in enumerate(HABITS):
        db.session.add(Habit(user_id=user.id, pillar_id=pillars[pk].id, name=name, emoji=emoji,
                             period=period, target=target, xp=xp, position=i))
    for cat, bucket, emoji in BUDGETS:
        db.session.add(Budget(user_id=user.id, category=cat, bucket=bucket, emoji=emoji, monthly_limit=0))

    if full:
        for i, (pk, title, kind, quarter, month, notes) in enumerate(GOALS):
            xp, coins = XP_BY_KIND[kind]
            db.session.add(Goal(user_id=user.id, pillar_id=pillars[pk].id, title=title, kind=kind,
                                quarter=quarter, month=month, notes=notes, xp=xp, coins=coins, position=i))
        for name, room, emoji in APARTMENT:
            db.session.add(ApartmentItem(user_id=user.id, name=name, room=room, emoji=emoji))
        for name, emoji, color, target, deadline in FUNDS:
            db.session.add(Fund(user_id=user.id, name=name, emoji=emoji, color=color, target=target, deadline=deadline))
        for i, (title, caption, emoji, color) in enumerate(VISION):
            db.session.add(VisionItem(user_id=user.id, title=title, caption=caption, emoji=emoji, color=color, position=i))
        for name, emoji, cost in REWARDS:
            db.session.add(Reward(user_id=user.id, name=name, emoji=emoji, cost=cost))
    db.session.commit()


def ensure_seed():
    """Crea el usuario 1ALE con su plan si la base está vacía. Devuelve True si sembró."""
    if User.query.first():
        return False
    user = User(
        username="1ALE",
        password_hash=generate_password_hash("5678"),
        display_name="Alejo Sánchez",
        is_admin=True,
        motto="Nuevo cuartel general, nueva disciplina, mismo fuego creador.",
        settings={"board_style": "collage", "water_goal": 2500, "sky": "auto", "monthly_income": 0},
    )
    db.session.add(user)
    db.session.commit()
    seed_user_plan(user, full=True)
    return True
