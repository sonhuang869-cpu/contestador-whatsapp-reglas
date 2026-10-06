import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, CircleCheck, DoorClosed, DoorOpen, Inbox, PlugZap, Send, ShieldAlert, UserRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Estado } from "@/components/Estado";
import { getCaidas, getHilos, getResumen, type HiloVista, type Resumen } from "@/lib/api";
import { FRENO_DETALLE, FRENO_ROTULO, duracion, hace, reloj, type Caida, type MotivoFreno } from "@/lib/tipos";

function Dato({ valor, rotulo, tono, Icono }: { valor: string; rotulo: string; tono: string; Icono: typeof Inbox }) {
  return (
    <Card>
      <CardContent className="p-4">
        <Icono className={`mb-2 size-5 ${tono}`} aria-hidden />
        <p className="text-2xl font-bold tabular-nums">{valor}</p>
        <p className="text-sm text-muted-foreground">{rotulo}</p>
      </CardContent>
    </Card>
  );
}

export default function Monitor() {
  const [r, setR] = useState<Resumen | null>(null);
  const [hilos, setHilos] = useState<HiloVista[] | null>(null);
  const [caidas, setCaidas] = useState<Caida[]>([]);

  useEffect(() => {
    let vivo = true;
    const cargar = () => {
      getResumen().then((x) => vivo && setR(x));
      getHilos().then((x) => vivo && setHilos(x));
      getCaidas().then((x) => vivo && setCaidas(x));
    };
    cargar();
    const t = setInterval(cargar, 6000);
    return () => { vivo = false; clearInterval(t); };
  }, []);

  if (!r || !hilos)
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );

  const frenos = (Object.keys(FRENO_ROTULO) as MotivoFreno[])
    .map((k) => ({ k, n: r.porFreno[k] }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Monitor</h1>
        <p className="text-sm text-muted-foreground">Qué está haciendo el contestador ahora mismo.</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
          <span className="flex items-center gap-2 text-sm">
            {r.abiertoAhora
              ? <><DoorOpen className="size-4 shrink-0 text-enviado" aria-hidden /> <span className="font-medium text-enviado">Abierto</span></>
              : <><DoorClosed className="size-4 shrink-0 text-muted-foreground" aria-hidden /> <span className="font-medium">Cerrado</span></>}
            <span className="text-muted-foreground">
              {r.abiertoAhora ? "se contesta con las reglas normales" : "contesta la regla de fuera de horario"}
            </span>
          </span>

          {caidas.length > 0 && (
            <span className="flex items-center gap-2 text-sm" data-teste="caida">
              <PlugZap className="size-4 shrink-0 text-caida" aria-hidden />
              <span className="font-medium text-caida">{duracion(r.minutosCaidos)} sin servicio</span>
              <span className="text-muted-foreground">{caidas[0].causa.toLowerCase()}, {hace(caidas[0].inicio)}</span>
            </span>
          )}

          {r.encolados > 0 && (
            <span className="flex items-center gap-2 text-sm">
              <Inbox className="size-4 shrink-0 text-frenado" aria-hidden />
              <span className="font-medium">{r.encolados} llegaron durante la caída</span>
            </span>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Dato valor={String(r.entrantes)} rotulo="Mensajes recibidos" tono="text-muted-foreground" Icono={Inbox} />
        <Dato valor={String(r.respondidos)} rotulo="Contestados solos" tono="text-enviado" Icono={Send} />
        <Dato valor={`${r.automatizacion}%`} rotulo="Se resolvió sin nadie" tono="text-primary" Icono={CircleCheck} />
        <Dato valor={String(r.entrantes - r.respondidos)} rotulo="Quedaron para una persona" tono="text-frenado" Icono={ShieldAlert} />
      </div>

      {frenos.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div>
              <h2 className="font-semibold">Por qué no se contestó solo</h2>
              <p className="text-sm text-muted-foreground">
                Cada freno existe para evitar un problema concreto. No son errores.
              </p>
            </div>
            <ul className="space-y-2" data-teste="frenos">
              {frenos.map(({ k, n }) => (
                <li key={k} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Estado freno={k} />
                    <span className="font-mono text-sm tabular-nums text-muted-foreground">
                      {n} {n === 1 ? "mensaje" : "mensajes"}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">{FRENO_DETALLE[k]}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold">Lo último que llegó</h2>
            <Link to="/conversaciones" className="inline-flex min-h-9 items-center text-sm text-primary underline-offset-2 hover:underline">
              ver todas
            </Link>
          </div>
          <ul className="space-y-2" data-teste="feed">
            {hilos.slice(0, 7).map((h) => (
              <li key={h.contacto.id}>
                <Link
                  to={`/conversacion/${h.contacto.id}`}
                  className="block rounded-lg border border-border bg-card p-3 transition-colors hover:bg-secondary/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="truncate font-medium">{h.contacto.nombre}</span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{reloj(h.ultimo.en)}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                    {h.ultimo.autor !== "cliente" && (
                      <span className="mr-1 inline-flex align-[-2px] text-foreground/60">
                        {h.ultimo.autor === "bot"
                          ? <Bot className="size-3.5" aria-label="Respuesta automática" />
                          : <UserRound className="size-3.5" aria-label="Respuesta de Marta" />}
                      </span>
                    )}
                    {h.ultimo.texto}
                  </p>
                  <div className="mt-2"><Estado freno={h.freno} /></div>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
