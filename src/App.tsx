import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { Layout } from "@/components/layout/Layout";
import Monitor from "@/pages/Monitor";
import NoEncontrada from "@/pages/NoEncontrada";

const Conversaciones = lazy(() => import("@/pages/Conversaciones"));
const Conversacion = lazy(() => import("@/pages/Conversacion"));
const Reglas = lazy(() => import("@/pages/Reglas"));
const Simulador = lazy(() => import("@/pages/Simulador"));
const Ajustes = lazy(() => import("@/pages/Ajustes"));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Cargando">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Monitor />} />
            <Route path="conversaciones" element={<Conversaciones />} />
            <Route path="conversacion/:id" element={<Conversacion />} />
            <Route path="reglas" element={<Reglas />} />
            <Route path="simulador" element={<Simulador />} />
            <Route path="ajustes" element={<Ajustes />} />
            <Route path="*" element={<NoEncontrada />} />
          </Route>
        </Routes>
      </Suspense>
      <Toaster position="top-right" richColors theme="dark" />
    </BrowserRouter>
  );
}
