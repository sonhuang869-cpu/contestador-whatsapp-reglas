/**
 * Dominio: un servicio de respuestas automáticas de WhatsApp que corre en el
 * equipo de la casa. Lo que decide qué se responde son reglas en orden, no un
 * modelo: la primera que calza gana.
 */

export type Autor = "cliente" | "bot" | "persona";

/** Por qué una respuesta que iba a salir no salió. Cada motivo protege algo distinto. */
export type MotivoFreno =
  | "servicio_apagado"
  | "persona_atendiendo"
  | "sin_regla"
  | "enfriamiento"
  | "fuera_de_plazo";

export const FRENO_ROTULO: Record<MotivoFreno, string> = {
  servicio_apagado: "El servicio estaba apagado",
  persona_atendiendo: "Una persona ya está en la conversación",
  sin_regla: "Ninguna regla calza con el mensaje",
  enfriamiento: "Ya se le respondió hace poco",
  fuera_de_plazo: "Llegó tarde: estuvo encolado demasiado tiempo",
};

export const FRENO_DETALLE: Record<MotivoFreno, string> = {
  servicio_apagado: "El interruptor general está en apagado. Nada sale, pero todo queda registrado.",
  persona_atendiendo:
    "Alguien contestó a mano en este hilo. El bot se calla hasta que pase la pausa, para no interrumpir una conversación que ya tiene dueño.",
  sin_regla: "Ninguna regla activa tiene una palabra de este mensaje. Queda para responder a mano.",
  enfriamiento:
    "Este contacto ya recibió una respuesta automática hace pocos minutos. Sin esto, cinco mensajes seguidos del cliente son cinco veces el mismo texto.",
  fuera_de_plazo:
    "El equipo estuvo sin conexión y el mensaje esperó más de lo tolerado. Un «te respondo enseguida» que llega cuatro horas tarde es peor que el silencio.",
};

export interface Contacto {
  id: string;
  nombre: string;
  telefono: string;
  /** Primera vez que escribió. Sirve para la condición "sólo la primera vez". */
  primeraVezEn: string;
}

export interface Mensaje {
  id: string;
  contactoId: string;
  autor: Autor;
  texto: string;
  en: string;
  /** Qué regla generó este mensaje, cuando lo generó el bot. */
  reglaId?: string;
  /** Llegó mientras el equipo estaba sin conexión. */
  encolado?: boolean;
  /** Se evaluó y no se respondió. El mensaje del cliente queda igual; esto explica el silencio. */
  freno?: MotivoFreno;
  /** La regla que habría ganado si no hubiera habido freno. */
  reglaFrenada?: string;
}

/** Cuándo puede actuar una regla, respecto al horario de atención. */
export type Franja = "siempre" | "dentro" | "fuera";

export const FRANJA_ROTULO: Record<Franja, string> = {
  siempre: "A toda hora",
  dentro: "Sólo en horario de atención",
  fuera: "Sólo fuera de horario",
};

export interface Regla {
  id: string;
  nombre: string;
  /** Menor número, se evalúa antes. La primera que calza gana. */
  prioridad: number;
  claves: string[];
  franja: Franja;
  /** Sólo para quien escribe por primera vez. Sirve para el saludo de bienvenida. */
  soloPrimeraVez: boolean;
  respuesta: string;
  activa: boolean;
  actualizadaEn: string;
}

export interface Tramo {
  /** 0 domingo … 6 sábado */
  dia: number;
  abre: string;
  cierra: string;
  abierto: boolean;
}

export const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export interface Ajustes {
  /** Interruptor general. Apagado, nada sale. */
  activo: boolean;
  /** Minutos que deben pasar antes de volver a responder automáticamente al mismo contacto. */
  enfriamientoMin: number;
  /** Horas que el bot se calla en un hilo después de que contesta una persona. */
  pausaPersonaHoras: number;
  /** Minutos que un mensaje encolado puede esperar antes de que ya no valga la pena responder. */
  plazoColaMin: number;
  /** Se agrega al final de cada respuesta automática. Decir que es un bot evita reclamos. */
  firma: string;
}

export const AJUSTES_INICIALES: Ajustes = {
  activo: true,
  enfriamientoMin: 30,
  pausaPersonaHoras: 6,
  plazoColaMin: 90,
  firma: "Mensaje automático. Si necesita algo más, escriba y le responde una persona.",
};

/** Una caída del equipo de la casa: luz, internet o el computador suspendido. */
export interface Caida {
  id: string;
  inicio: string;
  fin: string | null;
  causa: string;
}

export function normalizar(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const aMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** ¿La fecha cae dentro del horario de atención configurado? */
export function enHorario(iso: string, tramos: Tramo[]): boolean {
  const d = new Date(iso);
  const t = tramos.find((x) => x.dia === d.getDay());
  if (!t || !t.abierto) return false;
  const min = d.getHours() * 60 + d.getMinutes();
  return min >= aMinutos(t.abre) && min < aMinutos(t.cierra);
}

export function hace(iso: string, ahora = Date.now()): string {
  const m = Math.max(0, Math.round((ahora - new Date(iso).getTime()) / 60000));
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h ${m % 60} min`;
  const d = Math.floor(h / 24);
  return d === 1 ? "hace 1 día" : `hace ${d} días`;
}

export const reloj = (iso: string) =>
  new Date(iso).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });

export const duracion = (min: number) =>
  min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min`;
