import { Link } from "react-router-dom";
import { Radar } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NoEncontrada() {
  return (
    <div className="grid min-h-[55vh] place-items-center">
      <div className="max-w-sm px-6 text-center">
        <Radar className="mx-auto mb-3 size-10 text-muted-foreground/60" aria-hidden />
        <h1 className="text-2xl font-bold">Esa página no existe</h1>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">
          Puede que la conversación se haya restaurado o que el enlace esté mal escrito.
        </p>
        <Link to="/" className={`${buttonVariants()} h-11`}>Ir al monitor</Link>
      </div>
    </div>
  );
}
