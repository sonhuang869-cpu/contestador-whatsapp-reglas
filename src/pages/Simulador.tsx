import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Beaker, Check, Dot, Loader2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Estado } from "@/components/Estado";
import { DESCARTE_ROTULO } from "@/lib/motor";
import { getHilos, simular, type HiloVista, type Momento } from "@/lib/api";
import { FRENO_DETALLE, reloj } from "@/lib/tipos";

const EJEMPLOS = [
  "¿Cuánto cuesta una torta para 20 personas?",
  "Hola, buenas tardes",
  "¿Hacen domicilio y cuánto vale?",
  "¿Tienen opciones veganas?",
  "Necesito que me llame alguien",
];

type Resultado = Awaited<ReturnType<typeof simular>>;

export default function Simulador() {
  const [texto, setTexto] = useState("");
  const [contra, setContra] = useState<string>("");
  const [momento, setMomento] = useState<Momento>("ahora");
  const [hilos, setHilos] = useState<HiloVista[]>([]);
  const [r, setR] = useState<Resultado | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => { getHilos().then(setHilos); }, []);

  const correr = async (t: string) => {
    setTexto(t);
    setCargando(true);
    try { setR(await simular(t, contra || null, momento)); } finally { setCargando(false); }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Beaker className="size-6 text-primary" aria-hidden /> Simulador
        </h1>
        <p className="text-sm text-muted-foreground">
          Escriba un mensaje y vea qué regla ganaría, cuáles se saltaron y por qué. No toca nada.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={3}
            placeholder="¿Para cuándo me la pueden tener?"
            aria-label="Mensaje de prueba"
            data-teste="texto-simulador"
          />
          <div className="flex flex-wrap gap-1.5">
            {EJEMPLOS.map((e) => (
              <button key={e} type="button" onClick={() => correr(e)}
                className="min-h-9 rounded-full border border-border px-3 text-xs hover:bg-secondary">
                {e}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="contra" className="text-sm font-medium">Probar contra</label>
            <select
              id="contra"
              value={contra}
              onChange={(e) => setContra(e.target.value)}
              data-teste="contra"
              className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm"
            >
              <option value="">Un contacto nuevo, sin historial</option>
              {hilos.map((h) => <option key={h.contacto.id} value={h.contacto.id}>{h.contacto.nombre}</option>)}
            </select>
            <p className="text-xs text-muted-foreground">
              Con un contacto real se ven además los frenos de ese hilo: el enfriamiento y la pausa
              por persona dependen de lo que ya pasó ahí.
            </p>
          </div>
          <div className="space-y-1.5">
            <span className="text-sm font-medium">¿En qué momento llega?</span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Momento de la prueba">
              {([
                ["ahora", "Ahora mismo"],
                ["dentro", "En horario de atención"],
                ["fuera", "Fuera de horario"],
              ] as [Momento, string][]).map(([k, rotulo]) => (
                <button
                  key={k}
                  type="button"
                  data-teste={`momento-${k}`}
                  aria-pressed={momento === k}
                  onClick={() => setMomento(k)}
                  className={`min-h-9 rounded-full border px-3 text-xs font-medium transition-colors ${
                    momento === k ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"
                  }`}
                >
                  {rotulo}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Las reglas de horario cambian el resultado. Si está configurando a las ocho de la
              mañana, «ahora mismo» le va a contestar siempre que está cerrado.
            </p>
          </div>

          <Button className="h-11 w-full gap-2" disabled={!texto.trim() || cargando} data-teste="probar" onClick={() => correr(texto)}>
            {cargando && <Loader2 className="size-4 animate-spin" aria-hidden />} Ver qué haría
          </Button>
        </CardContent>
      </Card>

      {r && (
        <Card data-teste="resultado">
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Estado freno={r.freno} />
              {r.regla && <span className="text-sm text-muted-foreground">ganó «{r.regla.nombre}»</span>}
              <span className="ml-auto font-mono text-xs text-muted-foreground" data-teste="evaluado-en">
                evaluado a las {reloj(r.evaluadoEn)}
              </span>
            </div>

            {r.freno && (
              <p className="rounded-lg border border-border bg-secondary/40 p-3 text-sm text-muted-foreground">
                {FRENO_DETALLE[r.freno]}
                {r.reglaFrenada && ` Habría contestado la regla «${r.reglaFrenada.nombre}».`}
              </p>
            )}

            {r.texto && (
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <Send className="size-3.5" aria-hidden /> Se enviaría
                </p>
                <div className="b-bot rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-line">{r.texto}</div>
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Cómo se recorrieron las reglas
              </p>
              <ol className="space-y-1" data-teste="traza">
                {r.traza.map((p, i) => {
                  const gano = r.regla?.id === p.reglaId;
                  return (
                    <li
                      key={p.reglaId}
                      data-paso={p.descarte ?? "candidata"}
                      className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-sm ${
                        gano ? "border-enviado/40 bg-enviado/10" : "border-border"
                      }`}
                    >
                      <span className="mt-0.5 shrink-0">
                        {p.descarte
                          ? <X className="size-4 text-muted-foreground" aria-hidden />
                          : gano
                            ? <Check className="size-4 text-enviado" aria-hidden />
                            : <Dot className="size-4 text-muted-foreground" aria-hidden />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="font-mono text-xs text-muted-foreground">{i + 1}.</span>{" "}
                        <span className={gano ? "font-semibold" : ""}>{p.nombre}</span>
                        <span className="block text-xs text-muted-foreground">
                          {p.descarte
                            ? DESCARTE_ROTULO[p.descarte]
                            : p.clavesQueCalzan.length
                              ? `calza por: ${p.clavesQueCalzan.join(", ")}`
                              : "calza con cualquier mensaje"}
                          {!p.descarte && !gano && " · pero ya había ganado otra antes"}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>

            <p className="text-xs text-muted-foreground">
              ¿Falta una respuesta, o contesta la que no es? El orden y las palabras se cambian en{" "}
              <Link to="/reglas" className="text-primary underline underline-offset-2">Reglas</Link>.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
