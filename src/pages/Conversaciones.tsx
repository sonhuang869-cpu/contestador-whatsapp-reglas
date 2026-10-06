import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Search, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Estado } from "@/components/Estado";
import { getHilos, type HiloVista } from "@/lib/api";
import { FRENO_ROTULO, hace, normalizar, type MotivoFreno } from "@/lib/tipos";

type Filtro = "todas" | "respondidas" | MotivoFreno;

const FILTROS: { clave: Filtro; rotulo: string }[] = [
  { clave: "todas", rotulo: "Todas" },
  { clave: "respondidas", rotulo: "Respondidas solas" },
  { clave: "sin_regla", rotulo: "Sin regla" },
  { clave: "enfriamiento", rotulo: "Enfriadas" },
  { clave: "persona_atendiendo", rotulo: "Con persona" },
  { clave: "fuera_de_plazo", rotulo: "Fuera de plazo" },
];

export default function Conversaciones() {
  const [datos, setDatos] = useState<HiloVista[] | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    let vivo = true;
    getHilos().then((d) => vivo && setDatos(d));
    return () => { vivo = false; };
  }, []);

  const cuentas = useMemo(() => {
    const c: Record<string, number> = { todas: datos?.length ?? 0, respondidas: 0 };
    datos?.forEach((h) => {
      if (h.freno) c[h.freno] = (c[h.freno] ?? 0) + 1;
      else c.respondidas += 1;
    });
    return c;
  }, [datos]);

  const visibles = useMemo(() => {
    if (!datos) return [];
    const q = normalizar(busqueda);
    return datos.filter((h) => {
      const pasaFiltro =
        filtro === "todas" ? true : filtro === "respondidas" ? h.freno === null : h.freno === filtro;
      const pasaBusqueda =
        !q || normalizar(h.contacto.nombre).includes(q) || normalizar(h.ultimo.texto).includes(q);
      return pasaFiltro && pasaBusqueda;
    });
  }, [datos, filtro, busqueda]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Conversaciones</h1>
        <p className="text-sm text-muted-foreground">
          Todo lo que llegó por WhatsApp y qué hizo el contestador con cada mensaje.
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o mensaje"
          aria-label="Buscar conversaciones"
          className="h-11 pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar">
        {FILTROS.map(({ clave, rotulo }) => (
          <button
            key={clave}
            type="button"
            data-teste={`filtro-${clave}`}
            aria-pressed={filtro === clave}
            onClick={() => setFiltro(clave)}
            className={`min-h-9 rounded-full border px-3 text-xs font-medium transition-colors ${
              filtro === clave ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"
            }`}
          >
            {rotulo}
            {datos && <span className="ml-1.5 opacity-70">{cuentas[clave] ?? 0}</span>}
          </button>
        ))}
      </div>

      {!datos ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : visibles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground" data-teste="vacio">
          No hay conversaciones{filtro === "todas" ? "" : ` en «${FILTROS.find((f) => f.clave === filtro)?.rotulo ?? FRENO_ROTULO[filtro as MotivoFreno]}»`}
          {busqueda && ` que digan «${busqueda}»`}.
        </p>
      ) : (
        <ul className="space-y-2" data-teste="lista">
          {visibles.map((h) => (
            <li key={h.contacto.id}>
              <Link
                to={`/conversacion/${h.contacto.id}`}
                data-teste="fila"
                className="block rounded-xl border border-border bg-card p-3 transition-colors hover:bg-secondary/60"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="truncate font-semibold">{h.contacto.nombre}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{hace(h.ultimo.en)}</span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                  {h.ultimo.autor !== "cliente" && (
                    <span className="mr-1 inline-flex align-[-2px] text-foreground/60">
                      {h.ultimo.autor === "bot"
                        ? <Bot className="size-3.5" aria-label="Respuesta automática" />
                        : <UserRound className="size-3.5" aria-label="Respuesta de Marta" />}
                    </span>
                  )}
                  {h.ultimo.texto}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Estado freno={h.freno} />
                  <span className="text-xs text-muted-foreground">{h.mensajes} mensajes</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
