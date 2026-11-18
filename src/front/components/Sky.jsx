// El cielo de fondo: cambia con la hora real (amanecer, día, atardecer, noche).
// El paisaje del horizonte lo elige cada persona en su perfil y se guarda en su cuenta.
import { useMemo } from "react";

const rand = (seed) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

// Cada escena son tres capas (lejos, medio, cerca) dibujadas sobre un lienzo de 1440 × 320
export const SCENES = {
  orbitas: { label: "Órbitas", layers: null },
  olas: { label: "Olas", layers: [
    "M0 200 C180 150 320 250 520 200 S860 140 1040 200 S1320 250 1440 190 V320 H0Z",
    "M0 240 C200 200 380 290 600 240 S940 190 1140 245 S1360 280 1440 235 V320 H0Z",
    "M0 285 C240 255 420 315 680 280 S1060 250 1240 288 S1400 300 1440 282 V320 H0Z" ] },
  ciudad: { label: "Ciudad", layers: [
    "M0 320V190h60v-40h50v60h70V110h64v100h50v-50h80v70h60V90h30v-30h20v30h30v130h70v-60h90v40h50V130h76v90h60v-50h70v60h60V100h56v120h70v-70h90v50h40V320Z",
    "M0 320V240h90v-50h70v70h50v-90h84v60h60v40h110v-80h64v100h80v-60h100v-50h70v90h60v-40h90v60h70v-100h76v70h110v-50h90v80h66V320Z",
    "M0 320V280h130v-30h90v40h160v-50h100v40h140v-30h120v50h170v-40h110v30h150v-50h120v40h150V320Z" ] },
  colinas: { label: "Colinas", layers: [
    "M0 230 Q180 110 380 200 T760 170 T1120 190 T1440 150 V320 H0Z",
    "M0 265 Q220 180 460 250 T900 225 T1440 240 V320 H0Z",
    "M0 300 Q300 245 620 290 T1440 275 V320 H0Z" ] },
  montanas: { label: "Montañas", layers: [
    "M0 240 L140 150 L260 210 L400 96 L520 190 L640 130 L780 220 L900 120 L1010 80 L1120 170 L1260 110 L1440 200 V320 H0Z",
    "M0 270 L180 190 L300 240 L470 150 L600 235 L760 170 L880 240 L1040 160 L1180 230 L1320 180 L1440 250 V320 H0Z",
    "M0 300 L200 240 L360 285 L560 225 L720 280 L900 235 L1080 290 L1260 245 L1440 290 V320 H0Z" ] },
  limpio: { label: "Solo cielo", layers: [] },
};

// Órbitas: arcos concéntricos con mundos de colores, el fondo por defecto
const Orbits = () => (
  <svg className="sky-orbits" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice">
    {[[330, "#62B4E8", 1040, 706], [470, "#D48BF0", 400, 610], [620, "#F0A64A", 1190, 520], [790, "#62CDB0", 150, 470], [980, "#F08E7E", 1010, 96]].map(([r, c, x, y], i) => (
      <g key={i}>
        <ellipse cx="720" cy="1010" rx={r * 1.5} ry={r} className="orbit-line" />
        <circle cx={x} cy={y} r={9 + (i % 3) * 5} fill={c} className="orbit-world" />
        <circle cx={x} cy={y} r={26 + (i % 3) * 10} fill={c} opacity=".14" className="orbit-halo" />
      </g>
    ))}
    <ellipse cx="720" cy="1010" rx="260" ry="170" className="orbit-core" />
  </svg>
);

export function Sky({ phase = "night", soft, scene = "orbitas" }) {
  const stars = useMemo(() => {
    const r = rand(2027);
    return Array.from({ length: 90 }, () => `${(r() * 100).toFixed(2)}vw ${(r() * 62).toFixed(2)}vh 0 ${r() > 0.85 ? 1 : 0}px rgba(255,255,255,${(0.35 + r() * 0.6).toFixed(2)})`).join(",");
  }, []);
  const layers = (SCENES[scene] || SCENES.orbitas).layers;
  return (
    <div className={"sky" + (soft ? " soft" : "")} data-phase={phase} data-scene={scene} aria-hidden="true">
      <div className="sky-stars" style={{ boxShadow: stars }} />
      <div className="sky-orb" />
      <div className="sky-haze" />
      {layers === null ? <Orbits /> : layers.map((d, i) => (
        <svg key={scene + i} className={"sky-ridge r" + (3 - i)} viewBox="0 0 1440 320" preserveAspectRatio="none"><path d={d} /></svg>
      ))}
    </div>
  );
}
