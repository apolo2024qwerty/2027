# Level Up 2027

Plataforma gamificada para planear y cumplir tu 2027. Backend Flask + SQLAlchemy + JWT, frontend React + Vite.

## Arrancar en local (dos terminales)

**Terminal 1, backend**

```bash
pipenv install          # instala Flask, SQLAlchemy, JWT, requests...
pipenv run upgrade      # crea las tablas (SQLite local: cumbre27.db)
pipenv run start        # http://localhost:3001
```

La primera vez que arranca crea el usuario **1ALE** con clave **5678** y todo el Plan Maestro 2027.
Si no tienes Python 3.13, cambia `python_version` en el `Pipfile` por tu versión.

**Terminal 2, frontend**

```bash
npm install
npm run dev             # http://localhost:3000
```

El archivo `.env` ya trae `VITE_BACKEND_URL=http://localhost:3001` y la clave de Groq.

## Qué hay adentro

| Sección | Ruta | Qué hace |
|---|---|---|
| Login | `/login` | Cumbre 3D (three.js) con despegue al entrar. Registro de usuarios nuevos. |
| Base | `/` | Cuenta regresiva, misiones de hoy, próximos jefes, agua, ánimo, plata del mes. |
| Plan 2027 | `/plan` | 8 pilares, metas por pilar / trimestre, jefes finales. |
| Tablero de visión | `/vision` | 5 estilos: collage, galería, película, mosaico, constelación. Imágenes por enlace. |
| El estreno | `/estreno` | Presentación tipo lanzamiento, repetible, con cohete 3D y firma del compromiso. |
| Hábitos | `/habitos` | Racha, escudos, mapa de calor de 20 semanas, hábitos diarios/semanales/mensuales. |
| Cuerpo | `/cuerpo` | Agua, sueño, peso, entrenamientos y gráficas. |
| Enfoque | `/enfoque` | Zonas pomodoro (25/50/90), sonido ambiente, cronómetro de redes con premio o castigo. |
| Respira | `/respira` | Respiración guiada (caja, 4-7-8, coherencia) y registro de emociones. |
| Bitácora | `/bitacora` | Diario con victoria y gratitud. |
| Finanzas | `/finanzas` | Resumen con veredicto, movimientos, 50/30/20, cofres, inversiones, plan de meta. |
| Apartamento | `/apartamento` | Plano isométrico con objetos desbloqueables. |
| Botín y logros | `/botin` | Ruta de 12 niveles, 15 medallas, tienda de premios, historial de XP. |
| Copiloto IA | `/copiloto` | Chat con Groq que conoce tus metas, hábitos y finanzas. |

## Reglas del juego

- Hábito: +XP del hábito y +1 moneda. Día perfecto (todos los diarios): +30 XP, +10 monedas.
- Racha: cuenta el día si cumples la mitad o más de los hábitos diarios. Cada 7 días ganas un escudo.
- Misión: +100 XP. Jefe final: +500 XP. Reabrir una meta devuelve los puntos.
- Enfoque: 2 XP por cada 5 minutos. Redes: +5 XP si vuelves a tiempo, −2 XP por minuto extra.
- Cofre lleno: +200 XP. Objeto del apartamento: +30 XP.
- Las monedas se canjean por premios que tú defines.

## Estructura

```
src/api/models.py    modelos (todo cuelga de user_id)
src/api/routes.py    auth JWT, CRUD genérico, acciones de juego, copiloto
src/api/seed.py      Plan Maestro 2027 inicial
src/front/store.js   estado global (reducer)
src/front/hooks/useActions.js   llamadas a la API + premios
src/front/context/Timers.jsx    pomodoro y cronómetro de redes globales
src/front/pages/     una página por sección
src/front/index.css  sistema visual · pages.css estilos por sección
```

## Para desplegar después

- **Supabase**: pon `DATABASE_URL` en `.env` y corre `pipenv run upgrade`.
- **Render** (backend): variables `DATABASE_URL`, `JWT_SECRET_KEY`, `FLASK_APP_KEY`, `GROQ_API_KEY`, `GROQ_MODEL`.
- **Vercel** (frontend): variable `VITE_BACKEND_URL` con la URL de Render.
- El modelo de Groq se configura en `GROQ_MODEL` (lista separada por comas; se usa el primero que responda).

Comandos útiles: `pipenv run flask seed` (sembrar si la base está vacía), `pipenv run flask reset-plan` (borrar todo y volver al plan inicial).
