import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Activity, Beaker, Menu, MessagesSquare, RotateCcw, Settings2, Workflow } from "lucide-react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getAjustes, restaurar } from "@/lib/api";

const ENLACES = [
  { a: "/", rotulo: "Monitor", Icono: Activity, exacto: true },
  { a: "/conversaciones", rotulo: "Conversaciones", Icono: MessagesSquare },
  { a: "/reglas", rotulo: "Reglas", Icono: Workflow },
  { a: "/simulador", rotulo: "Simulador", Icono: Beaker },
  { a: "/ajustes", rotulo: "Ajustes", Icono: Settings2 },
];

function Navegacion({ alNavegar }: { alNavegar?: () => void }) {
  return (
    <nav className="space-y-1" aria-label="Secciones">
      {ENLACES.map(({ a, rotulo, Icono, exacto }) => (
        <NavLink
          key={a}
          to={a}
          end={exacto}
          onClick={alNavegar}
          className={({ isActive }) =>
            `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
              isActive ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-secondary"
            }`
          }
        >
          <Icono className="size-4 shrink-0" aria-hidden />
          {rotulo}
        </NavLink>
      ))}
    </nav>
  );
}

function Marca({ activo }: { activo: boolean | null }) {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Activity className="size-5" aria-hidden />
      </span>
      <div className="leading-tight">
        <p className="text-sm font-bold">Contestador</p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {activo === null ? (
            "cargando…"
          ) : activo ? (
            <>
              <span className="latido inline-block size-1.5 rounded-full bg-enviado text-enviado" aria-hidden />
              en el equipo de la casa
            </>
          ) : (
            <span className="text-caida">servicio apagado</span>
          )}
        </p>
      </div>
    </div>
  );
}

function BotonRestaurar({ alTerminar }: { alTerminar: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger className={`${buttonVariants({ variant: "outline" })} h-11 w-full gap-2`}>
        <RotateCcw className="size-4" aria-hidden /> Restaurar demostración
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Restaurar la demostración?</AlertDialogTitle>
          <AlertDialogDescription>
            Se pierden las reglas que haya creado, los cambios de orden y los mensajes
            que haya simulado. Vuelven los once hilos de ejemplo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className={buttonVariants({ variant: "outline" })}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants()}
            onClick={async () => { await restaurar(); toast.success("Demostración restaurada"); alTerminar(); }}
          >
            Restaurar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function Layout() {
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState<boolean | null>(null);
  const navegar = useNavigate();

  useEffect(() => {
    let vivo = true;
    const leer = () => getAjustes().then((a) => vivo && setActivo(a.activo));
    leer();
    const t = setInterval(leer, 4000);
    return () => { vivo = false; clearInterval(t); };
  }, []);

  const alInicio = () => { setAbierto(false); navegar("/", { replace: true }); };

  return (
    <div className="min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1400px]">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card/50 p-4 lg:flex">
          <div className="mb-6"><Marca activo={activo} /></div>
          <Navegacion />
          <div className="mt-auto pt-4"><BotonRestaurar alTerminar={alInicio} /></div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-border bg-card/50 px-4 py-3 lg:hidden">
            <Sheet open={abierto} onOpenChange={setAbierto}>
              <SheetTrigger
                className={`${buttonVariants({ variant: "outline", size: "icon" })} size-11`}
                aria-label="Abrir menú"
              >
                <Menu className="size-5" aria-hidden />
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-4">
                <SheetTitle className="mb-5"><Marca activo={activo} /></SheetTitle>
                <Navegacion alNavegar={() => setAbierto(false)} />
                <div className="mt-6"><BotonRestaurar alTerminar={alInicio} /></div>
              </SheetContent>
            </Sheet>
            <Marca activo={activo} />
          </header>

          <main className="min-w-0 flex-1 p-4 sm:p-6">
            <Outlet />
          </main>

          <footer className="border-t border-border px-4 py-5 text-xs text-muted-foreground sm:px-6">
            Demostración para evaluación. La repostería, los clientes y los mensajes son
            inventados, y no se conecta con WhatsApp: lo que ve es el motor de reglas
            decidiendo sobre mensajes de ejemplo. Los datos quedan en este navegador.
            Justin Gnoh · octubre de 2026
          </footer>
        </div>
      </div>
    </div>
  );
}
