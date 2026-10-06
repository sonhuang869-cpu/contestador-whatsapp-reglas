import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowDown, ArrowUp, Asterisk, Pencil, Plus, Trash2, Workflow } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { borrarRegla, getReglas, getResumen, guardarRegla, moverRegla, type Resumen } from "@/lib/api";
import { FRANJA_ROTULO, hace, type Franja, type Regla } from "@/lib/tipos";

const esquema = z.object({
  nombre: z.string().trim().min(4, "Póngale un nombre que se entienda de un vistazo."),
  respuesta: z.string().trim().min(15, "La respuesta tiene que decir algo útil: mínimo 15 caracteres."),
  claves: z.string(),
  franja: z.string(),
  soloPrimeraVez: z.boolean(),
});
type Campos = z.infer<typeof esquema>;

const FRANJAS: Franja[] = ["siempre", "dentro", "fuera"];

export default function Reglas() {
  const [reglas, setReglas] = useState<Regla[] | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [editando, setEditando] = useState<Regla | "nueva" | null>(null);
  const [borrando, setBorrando] = useState<Regla | null>(null);
  const [moviendo, setMoviendo] = useState<string | null>(null);

  const form = useForm<Campos>({
    resolver: zodResolver(esquema),
    defaultValues: { nombre: "", respuesta: "", claves: "", franja: "siempre", soloPrimeraVez: false },
  });

  const puxar = async () => {
    setReglas(await getReglas());
    setResumen(await getResumen());
  };
  useEffect(() => { puxar(); }, []);

  useEffect(() => {
    if (editando === "nueva") form.reset({ nombre: "", respuesta: "", claves: "", franja: "siempre", soloPrimeraVez: false });
    else if (editando) form.reset({
      nombre: editando.nombre, respuesta: editando.respuesta,
      claves: editando.claves.join(", "), franja: editando.franja, soloPrimeraVez: editando.soloPrimeraVez,
    });
  }, [editando, form]);

  const maxUsos = useMemo(() => Math.max(1, ...(resumen?.porRegla.map((r) => r.usos) ?? [1])), [resumen]);
  const usos = (id: string) => resumen?.porRegla.find((r) => r.reglaId === id)?.usos ?? 0;

  const enviar = form.handleSubmit(async (v) => {
    const claves = v.claves.split(",").map((c) => c.trim()).filter(Boolean);
    const prioridades = (reglas ?? []).map((r) => r.prioridad);
    await guardarRegla({
      id: editando === "nueva" ? undefined : editando?.id,
      nombre: v.nombre.trim(),
      respuesta: v.respuesta.trim(),
      claves,
      franja: v.franja as Franja,
      soloPrimeraVez: v.soloPrimeraVez,
      prioridad: editando === "nueva" ? Math.max(0, ...prioridades) + 10 : (editando?.prioridad ?? 100),
      activa: editando === "nueva" ? true : (editando?.activa ?? true),
    });
    setEditando(null);
    await puxar();
    toast.success(editando === "nueva" ? "Regla creada" : "Regla actualizada");
  });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Workflow className="size-6 text-primary" aria-hidden /> Reglas
          </h1>
          <p className="text-sm text-muted-foreground">
            Se evalúan de arriba abajo y gana la primera que calza. El orden es la mitad del trabajo.
          </p>
        </div>
        <Button className="h-11 gap-2" data-teste="nueva-regla" onClick={() => setEditando("nueva")}>
          <Plus className="size-4" aria-hidden /> Nueva regla
        </Button>
      </div>

      {!reglas ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : (
        <ol className="space-y-2" data-teste="lista-reglas">
          {reglas.map((r, i) => (
            <li key={r.id}>
              <Card className={r.activa ? "" : "opacity-55"}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col gap-1 pt-0.5">
                      <Button
                        variant="outline" size="icon" className="size-9"
                        aria-label={`Subir ${r.nombre}`} disabled={i === 0 || moviendo !== null}
                        data-teste={`subir-${r.id}`}
                        onClick={async () => { setMoviendo(r.id); await moverRegla(r.id, "arriba"); await puxar(); setMoviendo(null); }}
                      >
                        <ArrowUp className="size-4" aria-hidden />
                      </Button>
                      <Button
                        variant="outline" size="icon" className="size-9"
                        aria-label={`Bajar ${r.nombre}`} disabled={i === reglas.length - 1 || moviendo !== null}
                        data-teste={`bajar-${r.id}`}
                        onClick={async () => { setMoviendo(r.id); await moverRegla(r.id, "abajo"); await puxar(); setMoviendo(null); }}
                      >
                        <ArrowDown className="size-4" aria-hidden />
                      </Button>
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold">
                          <span className="mr-2 font-mono text-sm text-muted-foreground">{i + 1}.</span>
                          {r.nombre}
                        </p>
                        <Switch
                          checked={r.activa}
                          aria-label={r.activa ? `Desactivar ${r.nombre}` : `Activar ${r.nombre}`}
                          data-teste={`activa-${r.id}`}
                          onCheckedChange={async (v) => {
                            await guardarRegla({ ...r, activa: v });
                            await puxar();
                            toast.success(v ? "Regla activa" : "Regla desactivada: deja de contestar");
                          }}
                        />
                      </div>

                      <p className="text-sm text-muted-foreground">{r.respuesta}</p>

                      <div className="flex flex-wrap gap-1.5">
                        {r.claves.length === 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                            <Asterisk className="size-3.5" aria-hidden /> Cualquier mensaje
                          </span>
                        ) : (
                          r.claves.map((c) => (
                            <span key={c} className="rounded-full bg-secondary px-2 py-0.5 font-mono text-xs text-muted-foreground">
                              {c}
                            </span>
                          ))
                        )}
                        {r.franja !== "siempre" && (
                          <span className="rounded-full border border-border px-2 py-0.5 text-xs">{FRANJA_ROTULO[r.franja]}</span>
                        )}
                        {r.soloPrimeraVez && (
                          <span className="rounded-full border border-border px-2 py-0.5 text-xs">Sólo la primera vez</span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-secondary" aria-hidden>
                          <div className="h-full rounded-full bg-primary" style={{ width: `${(usos(r.id) / maxUsos) * 100}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {usos(r.id) === 0 ? "sin usar todavía" : `${usos(r.id)} ${usos(r.id) === 1 ? "mensaje" : "mensajes"}`}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground">{hace(r.actualizadaEn)}</span>
                        <Button variant="ghost" size="icon" className="size-10" aria-label={`Editar ${r.nombre}`} onClick={() => setEditando(r)}>
                          <Pencil className="size-4" aria-hidden />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-10 text-caida" aria-label={`Borrar ${r.nombre}`} onClick={() => setBorrando(r)}>
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}

      <Dialog open={editando !== null} onOpenChange={(v) => !v && setEditando(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando === "nueva" ? "Nueva regla" : "Editar regla"}</DialogTitle>
            <DialogDescription>
              Si deja las palabras clave vacías, la regla calza con cualquier mensaje. Sirve para
              poner un «para todo lo demás» al final de la lista.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={enviar} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" {...form.register("nombre")} data-teste="campo-nombre" />
              {form.formState.errors.nombre && <p className="text-sm text-caida" role="alert">{form.formState.errors.nombre.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="claves">Palabras clave, separadas por coma</Label>
              <Input id="claves" {...form.register("claves")} placeholder="precio, cuanto cuesta, valor" data-teste="campo-claves" />
              <p className="text-xs text-muted-foreground">Vacío: calza con cualquier mensaje.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="respuesta">Respuesta</Label>
              <Textarea id="respuesta" rows={4} {...form.register("respuesta")} data-teste="campo-respuesta" />
              {form.formState.errors.respuesta && <p className="text-sm text-caida" role="alert">{form.formState.errors.respuesta.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="franja">Cuándo puede actuar</Label>
              <select id="franja" {...form.register("franja")} data-teste="campo-franja"
                className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm">
                {FRANJAS.map((f) => <option key={f} value={f}>{FRANJA_ROTULO[f]}</option>)}
              </select>
            </div>
            <label className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
              <span>
                <span className="text-sm font-medium">Sólo para quien escribe por primera vez</span>
                <span className="block text-xs text-muted-foreground">Para el saludo de bienvenida.</span>
              </span>
              <Switch
                checked={form.watch("soloPrimeraVez")}
                onCheckedChange={(v) => form.setValue("soloPrimeraVez", v)}
                aria-label="Sólo la primera vez"
              />
            </label>
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <Button type="submit" className="h-11 sm:flex-1" disabled={form.formState.isSubmitting} data-teste="guardar-regla">
                {form.formState.isSubmitting ? "Guardando…" : "Guardar"}
              </Button>
              <Button type="button" variant="outline" className="h-11 sm:flex-1" onClick={() => setEditando(null)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={borrando !== null} onOpenChange={(v) => !v && setBorrando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar esta regla?</AlertDialogTitle>
            <AlertDialogDescription>
              «{borrando?.nombre}». Los mensajes que contestaba pasarán a quedar para una persona.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={buttonVariants({ variant: "outline" })}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              data-teste="confirmar-borrado"
              onClick={async () => {
                if (!borrando) return;
                await borrarRegla(borrando.id);
                setBorrando(null);
                await puxar();
                toast.success("Regla borrada");
              }}
            >
              Borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
