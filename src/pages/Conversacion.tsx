import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Bot, Inbox, Send, UserRound, Workflow } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Estado } from "@/components/Estado";
import { getHilo, recibir, responderAMano, type DetalleHilo } from "@/lib/api";
import { FRENO_DETALLE, hace, reloj } from "@/lib/tipos";
import NoEncontrada from "@/pages/NoEncontrada";

export default function Conversacion() {
  const { id = "" } = useParams();
  const [d, setD] = useState<DetalleHilo | null | "cargando">("cargando");
  const [comoCliente, setComoCliente] = useState("");
  const [comoPersona, setComoPersona] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const fin = useRef<HTMLDivElement>(null);

  const puxar = async () => setD(await getHilo(id));
  useEffect(() => {
    let vivo = true;
    getHilo(id).then((r) => vivo && setD(r));
    return () => { vivo = false; };
  }, [id]);

  useEffect(() => { if (d && d !== "cargando") fin.current?.scrollIntoView({ block: "nearest" }); }, [d]);

  const correr = async (k: string, fn: () => Promise<unknown>) => {
    setOcupado(k);
    try { await fn(); await puxar(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo"); }
    finally { setOcupado(null); }
  };

  if (d === "cargando")
    return <div className="mx-auto max-w-3xl space-y-4"><Skeleton className="h-9 w-56" /><Skeleton className="h-96 w-full rounded-xl" /></div>;
  if (!d) return <NoEncontrada />;

  const regla = (rid?: string) => d.reglas.find((r) => r.id === rid);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <Link to="/conversaciones" className="-ml-1 inline-flex min-h-11 items-center gap-1.5 px-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Volver a las conversaciones
      </Link>

      <div>
        <h1 className="truncate text-2xl font-bold tracking-tight">{d.contacto.nombre}</h1>
        <p className="text-sm text-muted-foreground">
          {d.contacto.telefono} · primera vez {hace(d.contacto.primeraVezEn)}
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          {d.mensajes.map((m) => {
            const mio = m.autor !== "cliente";
            const clase = m.autor === "cliente" ? "b-cliente" : m.autor === "bot" ? "b-bot" : "b-persona";
            return (
              <div key={m.id} className={`flex ${mio ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[88%] space-y-1.5 sm:max-w-[78%]">
                  <div className={`rounded-2xl px-3.5 py-2.5 ${clase}`}>
                    <p className="text-sm whitespace-pre-line">{m.texto}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{reloj(m.en)}</span>
                      {m.autor === "bot" && (
                        <span className="inline-flex items-center gap-1"><Bot className="size-3.5" aria-hidden /> automático</span>
                      )}
                      {m.autor === "persona" && (
                        <span className="inline-flex items-center gap-1"><UserRound className="size-3.5" aria-hidden /> Marta</span>
                      )}
                      {m.encolado && (
                        <span className="inline-flex items-center gap-1 text-frenado">
                          <Inbox className="size-3.5" aria-hidden /> llegó durante la caída
                        </span>
                      )}
                    </div>
                  </div>

                  {m.autor === "bot" && regla(m.reglaId) && (
                    <p className="flex items-center gap-1.5 pl-1 text-xs text-muted-foreground">
                      <Workflow className="size-3.5 shrink-0" aria-hidden />
                      lo contestó la regla{" "}
                      <Link to="/reglas" className="inline-flex min-h-9 items-center text-primary underline-offset-2 hover:underline">
                        {regla(m.reglaId)!.nombre}
                      </Link>
                    </p>
                  )}

                  {m.autor === "cliente" && m.freno && (
                    <div className="rounded-lg border border-border bg-secondary/40 p-3" data-teste="freno">
                      <Estado freno={m.freno} />
                      <p className="mt-1.5 text-xs text-muted-foreground">{FRENO_DETALLE[m.freno]}</p>
                      {m.reglaFrenada && regla(m.reglaFrenada) && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Habría contestado la regla «{regla(m.reglaFrenada)!.nombre}».
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={fin} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <label htmlFor="persona" className="text-sm font-medium">Responder a mano, como Marta</label>
          <Textarea
            id="persona"
            rows={3}
            value={comoPersona}
            onChange={(e) => setComoPersona(e.target.value)}
            placeholder="Escriba la respuesta…"
            data-teste="texto-persona"
          />
          <p className="text-xs text-muted-foreground">
            Apenas una persona entra al hilo, el contestador se calla aquí durante unas horas,
            para no interrumpir una conversación que ya tiene dueño.
          </p>
          <Button
            className="h-11 w-full gap-2"
            disabled={!!ocupado || !comoPersona.trim()}
            data-teste="enviar-persona"
            onClick={() => correr("per", async () => {
              await responderAMano(d.contacto.id, comoPersona);
              setComoPersona("");
              toast.success("Enviado. El contestador queda en pausa en este hilo.");
            })}
          >
            <Send className="size-4" aria-hidden /> Enviar y tomar la conversación
          </Button>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="space-y-3 p-4">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Simular un mensaje de {d.contacto.nombre.split(" ")[0]}
          </p>
          <p className="text-sm text-muted-foreground">
            Escriba lo que diría el cliente y vea qué hace el contestador con este hilo tal como está.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Textarea
              rows={2}
              value={comoCliente}
              onChange={(e) => setComoCliente(e.target.value)}
              placeholder="¿Hacen domicilios los sábados?"
              aria-label="Mensaje del cliente"
              data-teste="texto-cliente"
              className="flex-1"
            />
            <Button
              variant="outline"
              className="h-11 gap-2 sm:self-end"
              disabled={!!ocupado || !comoCliente.trim()}
              data-teste="enviar-cliente"
              onClick={() => correr("cli", async () => {
                const r = await recibir(d.contacto.id, comoCliente);
                setComoCliente("");
                if (r.regla) toast.success(`Contestó la regla «${r.regla.nombre}»`);
                else toast.info("No se contestó. Mire el motivo bajo el mensaje.");
              })}
            >
              Enviar como cliente
            </Button>
          </div>
        </CardContent>
      </Card>

      <Link to="/conversaciones" className={`${buttonVariants({ variant: "outline" })} h-11 w-full`}>
        Volver a las conversaciones
      </Link>
    </div>
  );
}
