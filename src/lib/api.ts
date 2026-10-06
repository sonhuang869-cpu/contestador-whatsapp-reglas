/**
 * API simulada. Los componentes la usan como si fuera un cliente HTTP; en
 * producción esto es el servicio que corre en el equipo de la casa.
 */
import { evaluar, type Contexto, type Decision } from "./motor";
import { generar, type Datos } from "./seed";
import {
  enHorario,
  type Ajustes, type Caida, type Contacto, type Mensaje, type MotivoFreno,
  type Regla, type Tramo,
} from "./tipos";

const K = "wa-reglas:datos:v1";
const espera = (ms?: number) => new Promise((r) => setTimeout(r, ms ?? 200 + Math.random() * 350));

function leer(): Datos {
  try {
    const crudo = localStorage.getItem(K);
    if (crudo) {
      const d = JSON.parse(crudo) as Datos;
      if (d?.reglas?.length && d?.mensajes?.length) return d;
    }
  } catch { /* ventana privada */ }
  const nuevo = generar();
  guardar(nuevo);
  return nuevo;
}
function guardar(d: Datos) {
  try { localStorage.setItem(K, JSON.stringify(d)); } catch { /* sin espacio */ }
}

function contexto(d: Datos, contactoId: string, hasta?: string): Contexto {
  return {
    reglas: d.reglas, tramos: d.tramos, ajustes: d.ajustes,
    contacto: d.contactos.find((c) => c.id === contactoId)!,
    historial: d.mensajes
      .filter((m) => m.contactoId === contactoId && (!hasta || m.en < hasta))
      .sort((a, b) => a.en.localeCompare(b.en)),
  };
}

export interface HiloVista {
  contacto: Contacto;
  ultimo: Mensaje;
  mensajes: number;
  freno: MotivoFreno | null;
  respondido: boolean;
}

export async function getHilos(): Promise<HiloVista[]> {
  await espera();
  const d = leer();
  return d.contactos.map((c) => {
    const ms = d.mensajes.filter((m) => m.contactoId === c.id).sort((a, b) => a.en.localeCompare(b.en));
    const ultimoCliente = [...ms].reverse().find((m) => m.autor === "cliente");
    return {
      contacto: c,
      ultimo: ms[ms.length - 1],
      mensajes: ms.length,
      freno: ultimoCliente?.freno ?? null,
      respondido: ms[ms.length - 1]?.autor === "bot",
    };
  }).sort((a, b) => b.ultimo.en.localeCompare(a.ultimo.en));
}

export interface DetalleHilo {
  contacto: Contacto;
  mensajes: Mensaje[];
  reglas: Regla[];
}

export async function getHilo(contactoId: string): Promise<DetalleHilo | null> {
  await espera();
  const d = leer();
  const c = d.contactos.find((x) => x.id === contactoId);
  if (!c) return null;
  return {
    contacto: c,
    mensajes: d.mensajes.filter((m) => m.contactoId === contactoId).sort((a, b) => a.en.localeCompare(b.en)),
    reglas: d.reglas,
  };
}

/**
 * Qué haría el motor con un texto, sin tocar nada. Devuelve la traza completa.
 *
 * Sin contacto, se prueba contra alguien que escribe por primera vez: así se ven
 * las reglas solas, sin el enfriamiento ni la pausa de un hilo real. Con contacto,
 * se prueba contra ese hilo tal como está, que es la otra pregunta útil.
 */
export type Momento = "ahora" | "dentro" | "fuera";

/**
 * El instante en que se finge que llega el mensaje. Hace falta porque alguien
 * que configura el contestador a las ocho de la mañana no puede probar las
 * reglas de horario: todo le respondería «estamos cerrados».
 */
export function instante(momento: Momento, tramos: Tramo[], desde = Date.now()): number {
  if (momento === "ahora") return desde;
  if (momento === "dentro") {
    for (let t = desde; t > desde - 12 * 24 * 60 * 60000; t -= 15 * 60000)
      if (enHorario(new Date(t).toISOString(), tramos)) return t;
    return desde;
  }
  for (let t = desde; t > desde - 12 * 24 * 60 * 60000; t -= 15 * 60000)
    if (!enHorario(new Date(t).toISOString(), tramos)) return t;
  return desde;
}

export async function simular(
  texto: string, contactoId: string | null, momento: Momento = "ahora",
): Promise<Decision & { nuevo: boolean; evaluadoEn: string }> {
  await espera(320);
  const d = leer();
  const ahora = instante(momento, d.tramos);
  const ctx: Contexto = contactoId
    ? contexto(d, contactoId)
    : {
        reglas: d.reglas, tramos: d.tramos, ajustes: d.ajustes,
        contacto: { id: "nuevo", nombre: "Contacto nuevo", telefono: "—", primeraVezEn: new Date(ahora).toISOString() },
        historial: [],
      };
  return {
    ...evaluar(texto, ctx, ahora),
    nuevo: ctx.historial.every((m) => m.autor !== "cliente"),
    evaluadoEn: new Date(ahora).toISOString(),
  };
}

/** Llega un mensaje de verdad y el motor decide. */
export async function recibir(contactoId: string, texto: string): Promise<Decision> {
  await espera(420);
  const d = leer();
  const ahora = Date.now();
  const en = new Date(ahora).toISOString();
  const ctx = contexto(d, contactoId);

  const entrante: Mensaje = { id: `m${ahora.toString(36)}c`, contactoId, autor: "cliente", texto, en };
  const dec = evaluar(texto, ctx, ahora, en);

  if (dec.texto && dec.regla) {
    d.mensajes.push(entrante, {
      id: `m${ahora.toString(36)}b`, contactoId, autor: "bot", texto: dec.texto,
      en: new Date(ahora + 3000).toISOString(), reglaId: dec.regla.id,
    });
  } else {
    entrante.freno = dec.freno ?? undefined;
    entrante.reglaFrenada = dec.reglaFrenada?.id;
    d.mensajes.push(entrante);
  }
  guardar(d);
  return dec;
}

/** Responder a mano: a partir de aquí el bot se calla en este hilo. */
export async function responderAMano(contactoId: string, texto: string): Promise<void> {
  await espera();
  const d = leer();
  d.mensajes.push({
    id: `m${Date.now().toString(36)}p`, contactoId, autor: "persona",
    texto: texto.trim(), en: new Date().toISOString(),
  });
  guardar(d);
}

export async function getReglas(): Promise<Regla[]> {
  await espera();
  return leer().reglas.slice().sort((a, b) => a.prioridad - b.prioridad);
}

export async function guardarRegla(r: Omit<Regla, "id" | "actualizadaEn"> & { id?: string }): Promise<Regla> {
  await espera();
  const d = leer();
  const ahora = new Date().toISOString();
  if (r.id) {
    const previa = d.reglas.find((x) => x.id === r.id);
    if (!previa) throw new Error("La regla no existe.");
    Object.assign(previa, r, { actualizadaEn: ahora });
    guardar(d);
    return previa;
  }
  const nueva: Regla = { ...r, id: `r${Date.now().toString(36)}`, actualizadaEn: ahora };
  d.reglas.push(nueva);
  guardar(d);
  return nueva;
}

export async function borrarRegla(id: string): Promise<void> {
  await espera();
  const d = leer();
  d.reglas = d.reglas.filter((r) => r.id !== id);
  guardar(d);
}

/** Subir o bajar una regla intercambia prioridades con la vecina. */
export async function moverRegla(id: string, direccion: "arriba" | "abajo"): Promise<void> {
  await espera(180);
  const d = leer();
  const orden = d.reglas.slice().sort((a, b) => a.prioridad - b.prioridad);
  const i = orden.findIndex((r) => r.id === id);
  const j = direccion === "arriba" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= orden.length) return;
  const p = orden[i].prioridad;
  orden[i].prioridad = orden[j].prioridad;
  orden[j].prioridad = p;
  guardar(d);
}

export async function getHorario(): Promise<Tramo[]> {
  await espera(150);
  return leer().tramos;
}

export async function guardarHorario(tramos: Tramo[]): Promise<void> {
  await espera();
  const d = leer();
  d.tramos = tramos;
  guardar(d);
}

export async function getAjustes(): Promise<Ajustes> {
  await espera(150);
  return leer().ajustes;
}

export async function guardarAjustes(a: Ajustes): Promise<void> {
  await espera();
  const d = leer();
  d.ajustes = a;
  guardar(d);
}

export async function getCaidas(): Promise<Caida[]> {
  await espera(150);
  return leer().caidas.slice().sort((a, b) => b.inicio.localeCompare(a.inicio));
}

export interface Resumen {
  entrantes: number;
  respondidos: number;
  automatizacion: number;
  porFreno: Record<MotivoFreno, number>;
  porRegla: { reglaId: string; nombre: string; usos: number }[];
  abiertoAhora: boolean;
  minutosCaidos: number;
  encolados: number;
}

export async function getResumen(): Promise<Resumen> {
  await espera();
  const d = leer();
  const entrantes = d.mensajes.filter((m) => m.autor === "cliente");
  const respondidos = d.mensajes.filter((m) => m.autor === "bot");

  const porFreno = {
    servicio_apagado: 0, persona_atendiendo: 0, sin_regla: 0, enfriamiento: 0, fuera_de_plazo: 0,
  } as Record<MotivoFreno, number>;
  entrantes.forEach((m) => { if (m.freno) porFreno[m.freno] += 1; });

  const usos = new Map<string, number>();
  respondidos.forEach((m) => { if (m.reglaId) usos.set(m.reglaId, (usos.get(m.reglaId) ?? 0) + 1); });

  return {
    entrantes: entrantes.length,
    respondidos: respondidos.length,
    automatizacion: entrantes.length ? Math.round((respondidos.length / entrantes.length) * 100) : 0,
    porFreno,
    porRegla: d.reglas.map((r) => ({ reglaId: r.id, nombre: r.nombre, usos: usos.get(r.id) ?? 0 }))
      .sort((a, b) => b.usos - a.usos),
    abiertoAhora: enHorario(new Date().toISOString(), d.tramos),
    minutosCaidos: d.caidas.reduce(
      (s, c) => s + Math.round(((c.fin ? new Date(c.fin).getTime() : Date.now()) - new Date(c.inicio).getTime()) / 60000), 0),
    encolados: d.mensajes.filter((m) => m.encolado && m.autor === "cliente").length,
  };
}

export async function restaurar(): Promise<void> {
  await espera();
  try { localStorage.removeItem(K); } catch { /* ignora */ }
  leer();
}
