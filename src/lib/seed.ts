/**
 * Datos de ejemplo: una repostería por encargo que atiende desde la casa.
 * El negocio es inventado. Lo que no es inventado es la forma en que llegan
 * los mensajes y los líos que eso genera.
 *
 * Un solo reloj: todo sale de Date.now(). Los mensajes que tienen que caer
 * dentro o fuera del horario se anclan a una hora concreta, no a un desfase,
 * para que la demostración muestre lo mismo a cualquier hora que se abra.
 */
import { evaluar, type Contexto } from "./motor";
import {
  AJUSTES_INICIALES, enHorario,
  type Ajustes, type Caida, type Contacto, type Mensaje, type Regla, type Tramo,
} from "./tipos";

export interface Datos {
  contactos: Contacto[];
  mensajes: Mensaje[];
  reglas: Regla[];
  tramos: Tramo[];
  ajustes: Ajustes;
  caidas: Caida[];
}

const MIN = 60000;

export const TRAMOS: Tramo[] = [
  { dia: 0, abre: "09:00", cierra: "13:00", abierto: false },
  { dia: 1, abre: "09:00", cierra: "18:00", abierto: true },
  { dia: 2, abre: "09:00", cierra: "18:00", abierto: true },
  { dia: 3, abre: "09:00", cierra: "18:00", abierto: true },
  { dia: 4, abre: "09:00", cierra: "18:00", abierto: true },
  { dia: 5, abre: "09:00", cierra: "18:00", abierto: true },
  { dia: 6, abre: "09:00", cierra: "13:00", abierto: true },
];

/**
 * Busca hacia atrás un momento que esté en horario y que tres horas antes
 * también lo estuviera, para poder colgar de ahí una mañana entera de mensajes.
 */
function anclaEnHorario(ahora: number, tramos: Tramo[]): number {
  for (let t = ahora; t > ahora - 12 * 24 * 60 * MIN; t -= 15 * MIN) {
    const iso = new Date(t).toISOString();
    const antes = new Date(t - 190 * MIN).toISOString();
    if (enHorario(iso, tramos) && enHorario(antes, tramos)) return t;
  }
  return ahora;
}

/** La noche anterior al ancla, a una hora en la que con seguridad está cerrado. */
function anclaFueraDeHorario(ancla: number): number {
  const d = new Date(ancla);
  d.setHours(23, 10, 0, 0);
  return d.getTime() > ancla ? d.getTime() - 24 * 60 * MIN : d.getTime();
}

function reglas(ahora: number): Regla[] {
  const t = (dias: number) => new Date(ahora - dias * 24 * 60 * MIN).toISOString();
  const base: Omit<Regla, "id" | "actualizadaEn">[] = [
    {
      nombre: "Bienvenida a quien escribe por primera vez",
      prioridad: 75,
      claves: ["hola", "buenas", "buen dia", "buenos dias", "buenas tardes", "buenas noches", "que mas"],
      franja: "siempre", soloPrimeraVez: true, activa: true,
      respuesta:
        "¡Hola! Gracias por escribir a Dulce Marta. Hacemos tortas y postres por encargo, con dos días de anticipación. Cuénteme qué necesita y para qué fecha, y le paso precio.",
    },
    {
      nombre: "Pide hablar con una persona",
      prioridad: 20,
      claves: ["hablar con", "con una persona", "asesor", "un humano", "me llama", "llamada", "me puede llamar"],
      franja: "siempre", soloPrimeraVez: false, activa: true,
      respuesta:
        "Claro. Le aviso a Marta y ella le escribe apenas pueda. Si es urgente, deje su nombre y la fecha del pedido.",
    },
    {
      nombre: "Precios",
      prioridad: 30,
      claves: ["precio", "precios", "cuanto cuesta", "cuanto vale", "valor", "lista", "catalogo"],
      franja: "siempre", soloPrimeraVez: false, activa: true,
      respuesta:
        "Los precios dependen del tamaño y del relleno. Torta de 10 porciones desde $55.000, de 20 porciones desde $95.000, de 30 desde $140.000. Postres individuales desde $8.000.",
    },
    {
      nombre: "Tiempo de entrega",
      prioridad: 40,
      claves: ["cuanto se demora", "para cuando", "con cuanto tiempo", "anticipacion", "para hoy", "para manana"],
      franja: "siempre", soloPrimeraVez: false, activa: true,
      respuesta:
        "Necesitamos dos días de anticipación para tortas y uno para postres. Para fechas especiales como el Día de la Madre pedimos una semana.",
    },
    {
      nombre: "Domicilios y zonas",
      prioridad: 50,
      claves: ["domicilio", "envian", "envio", "llevan", "zona", "barrio", "reclamo en"],
      franja: "siempre", soloPrimeraVez: false, activa: true,
      respuesta:
        "Hacemos domicilio en la ciudad; el costo depende de la zona y va entre $8.000 y $15.000. También puede recoger en la casa, coordinando la hora.",
    },
    {
      nombre: "Formas de pago",
      prioridad: 60,
      claves: ["pago", "pagar", "transferencia", "efectivo", "tarjeta", "abono", "anticipo"],
      franja: "siempre", soloPrimeraVez: false, activa: true,
      respuesta:
        "Recibimos transferencia y efectivo. Para apartar la fecha pedimos el 50% por anticipado y el resto contra entrega.",
    },
    {
      nombre: "Pedidos personalizados",
      prioridad: 70,
      claves: ["personalizado", "diseno", "tematica", "foto", "cumpleanos", "matrimonio", "grado"],
      franja: "siempre", soloPrimeraVez: false, activa: true,
      respuesta:
        "Sí hacemos diseños personalizados. Mándeme una foto de referencia y la fecha, y le digo si alcanzamos y cuánto queda.",
    },
    {
      // Sin claves: comodín. Sólo actúa fuera del horario de atención.
      nombre: "Fuera de horario",
      prioridad: 5,
      claves: [],
      franja: "fuera", soloPrimeraVez: false, activa: true,
      respuesta:
        "Gracias por escribir. En este momento estamos cerrados; atendemos de lunes a viernes de 9:00 a 18:00 y los sábados de 9:00 a 13:00. Le respondemos apenas abramos.",
    },
  ];
  return base.map((r, i) => ({ ...r, id: `r${i + 1}`, actualizadaEn: t(12 - i) }));
}

const CONTACTOS: Omit<Contacto, "id" | "primeraVezEn">[] = [
  { nombre: "Paola Jaramillo", telefono: "+57 311 220 4471" },
  { nombre: "Freddy Osorio", telefono: "+57 320 884 1096" },
  { nombre: "Sandra Milena Ruiz", telefono: "+57 300 471 9923" },
  { nombre: "Óscar Betancourt", telefono: "+57 315 663 2208" },
  { nombre: "Liliana Mejía", telefono: "+57 318 905 7734" },
  { nombre: "Johan Castaño", telefono: "+57 312 338 6650" },
  { nombre: "Marcela Vélez", telefono: "+57 314 779 1182" },
  { nombre: "Édison Arango", telefono: "+57 321 046 5517" },
  { nombre: "Tatiana Londoño", telefono: "+57 310 592 8803" },
  { nombre: "Hernán Gallego", telefono: "+57 319 124 7769" },
  { nombre: "Claudia Patricia Soto", telefono: "+57 313 860 3395" },
];

interface Entrada { autor: "cliente" | "persona"; texto: string; offsetMin: number }
interface Hilo {
  /** "horario" cuelga del ancla dentro del horario; "noche" de la noche cerrada. */
  reloj: "horario" | "noche";
  /** Minutos antes del ancla en que empieza el hilo. */
  desde: number;
  entradas: Entrada[];
  /** El hilo llegó durante una caída del servicio. */
  encolado?: boolean;
  nuevo?: boolean;
}

const HILOS: Hilo[] = [
  // 1. saludo de alguien nuevo: gana la bienvenida
  { reloj: "horario", desde: 12, nuevo: true, entradas: [{ autor: "cliente", texto: "Hola, buenas tardes", offsetMin: 0 }] },

  // 2. pregunta directa de precio
  { reloj: "horario", desde: 24, nuevo: true, entradas: [{ autor: "cliente", texto: "Buenas, ¿cuánto cuesta una torta para 20 personas?", offsetMin: 0 }] },

  // 3. tres mensajes seguidos: el enfriamiento evita el bombardeo
  {
    reloj: "horario", desde: 39, nuevo: true,
    entradas: [
      { autor: "cliente", texto: "Hola", offsetMin: 0 },
      { autor: "cliente", texto: "Necesito una torta para el sábado", offsetMin: 1 },
      { autor: "cliente", texto: "¿Cuánto vale?", offsetMin: 2 },
    ],
  },

  // 4. una persona entró al hilo: el bot se calla
  {
    reloj: "horario", desde: 58, nuevo: true,
    entradas: [
      { autor: "cliente", texto: "Buenos días, ¿hacen tortas para matrimonio?", offsetMin: 0 },
      { autor: "persona", texto: "Hola Óscar, sí hacemos. ¿Para qué fecha y cuántas personas?", offsetMin: 4 },
      { autor: "cliente", texto: "Para el 29, seríamos unos 80 invitados. ¿Cuánto me costaría?", offsetMin: 11 },
    ],
  },

  // 5. nadie cubre la pregunta: queda para responder a mano
  { reloj: "horario", desde: 71, nuevo: true, entradas: [{ autor: "cliente", texto: "¿Ustedes manejan opciones sin gluten para celíacos?", offsetMin: 0 }] },

  // 6. pide que la llamen
  { reloj: "horario", desde: 86, nuevo: true, entradas: [{ autor: "cliente", texto: "¿Me puede llamar alguien? Prefiero explicarlo por teléfono", offsetMin: 0 }] },

  // 7. domicilios
  { reloj: "horario", desde: 102, nuevo: true, entradas: [{ autor: "cliente", texto: "¿Hacen domicilio al barrio Laureles?", offsetMin: 0 }] },

  // 8. cliente conocido que sólo saluda: la bienvenida ya no aplica
  {
    reloj: "horario", desde: 124,
    entradas: [
      { autor: "cliente", texto: "Hola", offsetMin: 0 },
    ],
  },

  // 9. llegó de noche: contesta la regla de fuera de horario
  { reloj: "noche", desde: 0, nuevo: true, entradas: [{ autor: "cliente", texto: "Buenas noches, ¿tienen postres para mañana?", offsetMin: 0 }] },

  // 10 y 11 llegaron durante la caída del equipo
  { reloj: "horario", desde: 228, nuevo: true, encolado: true, entradas: [{ autor: "cliente", texto: "¿Puedo pagar con transferencia?", offsetMin: 0 }] },
  { reloj: "horario", desde: 110, nuevo: true, encolado: true, entradas: [{ autor: "cliente", texto: "Quiero una torta con foto para un grado", offsetMin: 0 }] },
];

export function generar(): Datos {
  const ahora = Date.now();
  const ancla = anclaEnHorario(ahora, TRAMOS);
  const noche = anclaFueraDeHorario(ancla);
  const rs = reglas(ahora);
  const ajustes = { ...AJUSTES_INICIALES };

  // La caída del equipo de la casa: 70 minutos sin luz.
  const caidaInicio = ancla - 235 * MIN;
  const caidaFin = ancla - 70 * MIN;
  const caidas: Caida[] = [
    { id: "c1", inicio: new Date(caidaInicio).toISOString(), fin: new Date(caidaFin).toISOString(), causa: "Corte de luz en la casa" },
  ];

  const contactos: Contacto[] = [];
  const mensajes: Mensaje[] = [];

  HILOS.forEach((h, i) => {
    const raiz = h.reloj === "noche" ? noche : ancla - h.desde * MIN;
    const contactoId = `p${i + 1}`;
    const primera = new Date(raiz).toISOString();
    contactos.push({
      ...CONTACTOS[i], id: contactoId,
      primeraVezEn: h.nuevo ? primera : new Date(raiz - 26 * 24 * 60 * MIN).toISOString(),
    });

    // Un contacto que no es nuevo arrastra un mensaje viejo, para que la regla
    // de bienvenida lo reconozca como conocido.
    const historial: Mensaje[] = [];
    const entradas: Entrada[] = h.nuevo
      ? h.entradas
      : [{ autor: "cliente", texto: "Gracias Marta, quedó muy rica la torta", offsetMin: -26 * 24 * 60 }, ...h.entradas];

    entradas.forEach((e, j) => {
      const en = new Date(raiz + e.offsetMin * MIN).toISOString();
      const propio: Mensaje = {
        id: `m${i + 1}_${j + 1}`, contactoId, autor: e.autor, texto: e.texto, en,
        encolado: h.encolado && e.autor === "cliente" ? true : undefined,
      };
      mensajes.push(propio);
      historial.push(propio);
      if (e.autor !== "cliente") return;

      // El mensaje encolado sólo se evalúa cuando vuelve la conexión.
      const momentoDeEvaluacion = h.encolado ? caidaFin : new Date(en).getTime() + 2000;
      const ctx: Contexto = {
        reglas: rs, tramos: TRAMOS, ajustes,
        contacto: contactos[contactos.length - 1],
        historial: historial.slice(0, -1),
      };
      const d = evaluar(e.texto, ctx, momentoDeEvaluacion, en);

      if (d.texto && d.regla) {
        const respuesta: Mensaje = {
          id: `m${i + 1}_${j + 1}b`, contactoId, autor: "bot", texto: d.texto,
          en: new Date(momentoDeEvaluacion + 3000).toISOString(), reglaId: d.regla.id,
          encolado: h.encolado ? true : undefined,
        };
        mensajes.push(respuesta);
        historial.push(respuesta);
      } else if (d.freno) {
        propio.freno = d.freno;
        propio.reglaFrenada = d.reglaFrenada?.id;
      }
    });
  });

  mensajes.sort((a, b) => a.en.localeCompare(b.en));
  return { contactos, mensajes, reglas: rs, tramos: TRAMOS, ajustes, caidas };
}
