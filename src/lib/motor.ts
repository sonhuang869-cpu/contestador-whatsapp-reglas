/**
 * El motor de reglas. Es toda la lógica del producto y es una función pura:
 * se le pasa el mensaje, el estado y la hora, y devuelve qué se responde y por qué.
 *
 * Que sea pura es lo que permite probarla, mostrar la traza en pantalla y
 * reemplazar después la capa de WhatsApp sin tocar nada de esto.
 */
import {
  enHorario, normalizar,
  type Ajustes, type Contacto, type Franja, type Mensaje, type MotivoFreno,
  type Regla, type Tramo,
} from "./tipos";

export interface Paso {
  reglaId: string;
  nombre: string;
  prioridad: number;
  /** Por qué esta regla no se usó, o null si fue la que ganó. */
  descarte: null | "inactiva" | "sin_coincidencia" | "franja" | "no_es_primera_vez";
  clavesQueCalzan: string[];
}

export interface Decision {
  /** La regla que ganó, o null si no se responde. */
  regla: Regla | null;
  texto: string | null;
  freno: MotivoFreno | null;
  /** La regla que habría ganado si no hubiera habido freno. */
  reglaFrenada: Regla | null;
  /** Todas las reglas evaluadas, en orden. Esto es lo que se muestra en el simulador. */
  traza: Paso[];
}

export const DESCARTE_ROTULO: Record<NonNullable<Paso["descarte"]>, string> = {
  inactiva: "desactivada",
  sin_coincidencia: "ninguna palabra calza",
  franja: "fuera de su franja horaria",
  no_es_primera_vez: "este contacto no es nuevo",
};

function franjaAplica(franja: Franja, iso: string, tramos: Tramo[]): boolean {
  if (franja === "siempre") return true;
  const dentro = enHorario(iso, tramos);
  return franja === "dentro" ? dentro : !dentro;
}

export interface Contexto {
  reglas: Regla[];
  tramos: Tramo[];
  ajustes: Ajustes;
  contacto: Contacto;
  /** Mensajes previos del mismo contacto, de más viejo a más nuevo. */
  historial: Mensaje[];
}

/**
 * Decide qué hacer con un mensaje entrante.
 *
 * El orden de los frenos importa y es deliberado: primero lo que apaga todo,
 * después lo que protege una conversación que ya tiene dueño, después se busca
 * regla, y al final lo que protege al cliente de recibir lo mismo cinco veces.
 */
export function evaluar(texto: string, ctx: Contexto, ahora: number, llegadaIso?: string): Decision {
  const momento = llegadaIso ?? new Date(ahora).toISOString();
  const traza: Paso[] = [];

  const buscarRegla = (): Regla | null => {
    const t = normalizar(texto);
    const ordenadas = [...ctx.reglas].sort((a, b) => a.prioridad - b.prioridad);
    let ganadora: Regla | null = null;
    for (const r of ordenadas) {
      // Sin claves, la regla es comodín: calza con cualquier mensaje. Es la
      // forma de escribir un «para todo lo demás» al final de la lista.
      const comodin = r.claves.length === 0;
      const calzan = r.claves.filter((c) => t.includes(normalizar(c)));
      let descarte: Paso["descarte"] = null;
      if (!r.activa) descarte = "inactiva";
      else if (!comodin && calzan.length === 0) descarte = "sin_coincidencia";
      else if (!franjaAplica(r.franja, momento, ctx.tramos)) descarte = "franja";
      else if (r.soloPrimeraVez && ctx.historial.some((m) => m.autor === "cliente")) descarte = "no_es_primera_vez";
      traza.push({ reglaId: r.id, nombre: r.nombre, prioridad: r.prioridad, descarte, clavesQueCalzan: calzan });
      if (!descarte && !ganadora) ganadora = r;
    }
    return ganadora;
  };

  const nada = (freno: MotivoFreno, reglaFrenada: Regla | null): Decision =>
    ({ regla: null, texto: null, freno, reglaFrenada, traza });

  // 1. El interruptor general.
  if (!ctx.ajustes.activo) return nada("servicio_apagado", buscarRegla());

  // 2. Si una persona entró a la conversación, el bot se calla.
  const ultimaPersona = [...ctx.historial].reverse().find((m) => m.autor === "persona");
  if (ultimaPersona) {
    const horas = (ahora - new Date(ultimaPersona.en).getTime()) / 3600000;
    if (horas < ctx.ajustes.pausaPersonaHoras) return nada("persona_atendiendo", buscarRegla());
  }

  // 3. ¿Hay regla que calce?
  const regla = buscarRegla();
  if (!regla) return nada("sin_regla", null);

  // 4. ¿Ya se le respondió hace poco? Esto es lo que evita el bombardeo.
  const ultimoBot = [...ctx.historial].reverse().find((m) => m.autor === "bot");
  if (ultimoBot) {
    const min = (new Date(momento).getTime() - new Date(ultimoBot.en).getTime()) / 60000;
    if (min < ctx.ajustes.enfriamientoMin) return nada("enfriamiento", regla);
  }

  // 5. Si venía encolado por una caída, puede haber perdido sentido.
  const esperaMin = (ahora - new Date(momento).getTime()) / 60000;
  if (esperaMin > ctx.ajustes.plazoColaMin) return nada("fuera_de_plazo", regla);

  return {
    regla,
    texto: `${regla.respuesta}\n\n${ctx.ajustes.firma}`,
    freno: null,
    reglaFrenada: null,
    traza,
  };
}
