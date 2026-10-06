# Contestador · respuestas automáticas de WhatsApp

Contestador por reglas, pensado para correr en el equipo de la casa. Llega un
mensaje, se recorren las reglas en orden, y gana la primera que calza. Lo que no
calza queda para una persona.

Todo corre en el navegador. La repostería del ejemplo —Dulce Marta—, los clientes
y los mensajes son inventados, y **no se conecta con WhatsApp**: lo que se ve es el
motor de reglas decidiendo. Los datos quedan en `localStorage`, sobreviven al
recargar, y «Restaurar demostración» vuelve al estado inicial.

## Lo que separa esto de un contestador que molesta

Un contestador que sólo responde es fácil. Los cinco frenos son el producto:

| Freno | Qué evita |
|---|---|
| **Enfriamiento** | Cinco mensajes seguidos del cliente no son cinco veces el mismo texto. |
| **Persona atendiendo** | Si alguien ya contestó a mano, el bot no interrumpe esa conversación. |
| **Sin regla** | Si nada calza, no se inventa una respuesta: queda para una persona. |
| **Fuera de plazo** | Si el equipo estuvo caído, un «le respondo enseguida» que llega cuatro horas tarde no sale. |
| **Servicio apagado** | Un interruptor general que corta las salidas sin dejar de registrar lo que entra. |

## Qué se puede probar

- **Monitor** — estado del equipo, la caída de luz, cuántos mensajes quedaron
  encolados y por qué cada uno no se contestó solo.
- **Sandra Milena Ruiz** — mandó tres mensajes en tres minutos. Recibió una
  respuesta, no tres.
- **Óscar Betancourt** — Marta le contestó a mano; el bot se calló en ese hilo.
- **Liliana Mejía** — preguntó algo que ninguna regla cubre. Nadie improvisó.
- **Claudia Patricia Soto** y **Hernán Gallego** — llegaron durante el corte de
  luz. Uno se contestó al volver la conexión; el otro ya había esperado demasiado.
- **Reglas** — subir o bajar una cambia quién contesta. Desactivarla la salta.
  Dejar las palabras clave vacías la convierte en comodín.
- **Simulador** — escribir cualquier mensaje y ver la traza completa: qué reglas
  se evaluaron, cuáles se saltaron y por qué. Se puede probar en horario, fuera
  de horario, y contra un hilo real o contra un contacto nuevo.
- **Ajustes** — horario de atención, los tres números de los frenos, y el
  interruptor general.

## Rutas

| Ruta | Qué es |
|---|---|
| `/` | Monitor |
| `/conversaciones` | Todos los hilos, con filtros por lo que pasó |
| `/conversacion/:id` | Un hilo, con el motivo bajo cada mensaje sin contestar |
| `/reglas` | Las reglas, en orden, con alta, edición, borrado y reordenamiento |
| `/simulador` | Probar un mensaje y ver la traza |
| `/ajustes` | Horario, frenos e interruptor general |

No hay login: la demostración entra directo al monitor.

## Dónde está la lógica

- `src/lib/motor.ts` — `evaluar()` es una función pura: mensaje, estado y hora
  entran; qué se responde y por qué sale. Es toda la decisión del producto, y es
  lo que permite mostrar la traza en pantalla.
- `src/lib/api.ts` — la API simulada, con latencia. Cambiarla por el servicio
  real significa editar sólo este archivo.
- `src/lib/seed.ts` — los datos de ejemplo, con un solo reloj.
- `src/lib/tipos.ts` — el dominio y el horario.

## Correr

```bash
npm install
npm run dev     # desarrollo
npm run build   # producción
```

## Stack

Vite · React · TypeScript · Tailwind · shadcn/ui · React Router.

Justin Gnoh · octubre de 2026
