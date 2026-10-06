import { useEffect, useState } from "react";
import { PowerOff, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getAjustes, getHorario, guardarAjustes, guardarHorario } from "@/lib/api";
import { DIAS, duracion, type Ajustes as TAjustes, type Tramo } from "@/lib/tipos";

function Numero({ id, etiqueta, ayuda, valor, min, max, sufijo, onChange }: {
  id: string; etiqueta: string; ayuda: string; valor: number; min: number; max: number;
  sufijo: string; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{etiqueta}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id} type="number" inputMode="numeric" min={min} max={max}
          value={valor} data-teste={id} className="h-11 w-28"
          onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || 0)))}
        />
        <span className="text-sm text-muted-foreground">{sufijo}</span>
      </div>
      <p className="text-xs text-muted-foreground">{ayuda}</p>
    </div>
  );
}

export default function Ajustes() {
  const [a, setA] = useState<TAjustes | null>(null);
  const [tramos, setTramos] = useState<Tramo[] | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { getAjustes().then(setA); getHorario().then(setTramos); }, []);

  const guardar = async () => {
    if (!a || !tramos) return;
    setGuardando(true);
    try {
      await guardarAjustes(a);
      await guardarHorario(tramos);
      toast.success("Ajustes guardados");
    } finally { setGuardando(false); }
  };

  const apagar = async (activo: boolean) => {
    if (!a) return;
    const nuevo = { ...a, activo };
    setA(nuevo);
    await guardarAjustes(nuevo);
    toast[activo ? "success" : "error"](
      activo ? "Contestador encendido" : "Contestador apagado: nada sale, todo queda registrado",
    );
  };

  if (!a || !tramos)
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Settings2 className="size-6 text-primary" aria-hidden /> Ajustes
        </h1>
        <p className="text-sm text-muted-foreground">
          Lo que protege al cliente de recibir lo que no debe, y a usted de quedar mal.
        </p>
      </div>

      <Card className={a.activo ? "" : "border-caida/40"}>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex items-start gap-3">
            <PowerOff className={`mt-0.5 size-5 shrink-0 ${a.activo ? "text-muted-foreground" : "text-caida"}`} aria-hidden />
            <div>
              <Label htmlFor="activo" className="font-medium">Contestador encendido</Label>
              <p className="text-sm text-muted-foreground">
                Apagado, no sale ningún mensaje automático. Lo que llega se sigue registrando,
                para poder contestarlo a mano.
              </p>
            </div>
          </div>
          <Switch id="activo" checked={a.activo} data-teste="activo" onCheckedChange={apagar} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div>
            <h2 className="font-semibold">Frenos</h2>
            <p className="text-sm text-muted-foreground">
              Tres números que separan un contestador útil de uno que molesta.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Numero
              id="enfriamiento" etiqueta="Enfriamiento" sufijo="minutos" min={0} max={240}
              valor={a.enfriamientoMin} onChange={(v) => setA({ ...a, enfriamientoMin: v })}
              ayuda="Tiempo mínimo antes de volver a contestarle automáticamente al mismo contacto. En cero, cinco mensajes seguidos son cinco respuestas iguales."
            />
            <Numero
              id="pausa" etiqueta="Pausa por persona" sufijo="horas" min={0} max={72}
              valor={a.pausaPersonaHoras} onChange={(v) => setA({ ...a, pausaPersonaHoras: v })}
              ayuda="Cuánto se calla el contestador en un hilo después de que contesta una persona."
            />
            <Numero
              id="plazo" etiqueta="Plazo de la cola" sufijo="minutos" min={5} max={720}
              valor={a.plazoColaMin} onChange={(v) => setA({ ...a, plazoColaMin: v })}
              ayuda={`Si el equipo estuvo caído, un mensaje que esperó más de ${duracion(a.plazoColaMin)} ya no se contesta solo.`}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="firma">Firma de las respuestas automáticas</Label>
            <Textarea id="firma" rows={2} value={a.firma} data-teste="firma"
              onChange={(e) => setA({ ...a, firma: e.target.value })} />
            <p className="text-xs text-muted-foreground">
              Va al final de cada respuesta. Decir que es automático evita el reclamo de quien
              creyó que estaba hablando con alguien.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div>
            <h2 className="font-semibold">Horario de atención</h2>
            <p className="text-sm text-muted-foreground">
              Las reglas marcadas «sólo en horario» o «sólo fuera de horario» miran esto.
            </p>
          </div>
          <ul className="space-y-2">
            {tramos.map((t, i) => (
              <li key={t.dia} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
                <Switch
                  checked={t.abierto}
                  aria-label={`${DIAS[t.dia]}: ${t.abierto ? "abierto" : "cerrado"}`}
                  data-teste={`dia-${t.dia}`}
                  onCheckedChange={(v) => setTramos(tramos.map((x, j) => (j === i ? { ...x, abierto: v } : x)))}
                />
                <span className={`w-24 text-sm font-medium ${t.abierto ? "" : "text-muted-foreground"}`}>{DIAS[t.dia]}</span>
                <Input
                  type="time" value={t.abre} disabled={!t.abierto} aria-label={`${DIAS[t.dia]} abre`}
                  className="h-11 w-32"
                  onChange={(e) => setTramos(tramos.map((x, j) => (j === i ? { ...x, abre: e.target.value } : x)))}
                />
                <span className="text-sm text-muted-foreground">a</span>
                <Input
                  type="time" value={t.cierra} disabled={!t.abierto} aria-label={`${DIAS[t.dia]} cierra`}
                  className="h-11 w-32"
                  onChange={(e) => setTramos(tramos.map((x, j) => (j === i ? { ...x, cierra: e.target.value } : x)))}
                />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Button className="h-12 w-full" disabled={guardando} data-teste="guardar-ajustes" onClick={guardar}>
        {guardando ? "Guardando…" : "Guardar ajustes y horario"}
      </Button>
    </div>
  );
}
