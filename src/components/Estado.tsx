import { BellOff, Clock, MessageSquareOff, PauseCircle, PowerOff, Send } from "lucide-react";
import { FRENO_ROTULO, type MotivoFreno } from "@/lib/tipos";

const ICONO: Record<MotivoFreno, typeof Clock> = {
  servicio_apagado: PowerOff,
  persona_atendiendo: PauseCircle,
  sin_regla: MessageSquareOff,
  enfriamiento: BellOff,
  fuera_de_plazo: Clock,
};

const TONO: Record<MotivoFreno, string> = {
  servicio_apagado: "border-caida/40 bg-caida/10 text-caida",
  persona_atendiendo: "border-primary/40 bg-primary/10 text-primary",
  sin_regla: "border-mudo/40 bg-mudo/10 text-mudo",
  enfriamiento: "border-frenado/40 bg-frenado/10 text-frenado",
  fuera_de_plazo: "border-frenado/40 bg-frenado/10 text-frenado",
};

/** Qué pasó con un mensaje entrante: se respondió, o se frenó y por qué. */
export function Estado({ freno, corto }: { freno: MotivoFreno | null; corto?: boolean }) {
  if (!freno)
    return (
      <span
        data-estado="respondido"
        className="inline-flex items-center gap-1.5 rounded-full border border-enviado/40 bg-enviado/10 px-2 py-0.5 text-xs font-medium text-enviado"
      >
        <Send className="size-3.5 shrink-0" aria-hidden />
        {corto ? <span className="sr-only">Respondido automáticamente</span> : "Respondido"}
      </span>
    );
  const Icono = ICONO[freno];
  return (
    <span
      data-estado={freno}
      title={corto ? FRENO_ROTULO[freno] : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${TONO[freno]}`}
    >
      <Icono className="size-3.5 shrink-0" aria-hidden />
      {corto ? <span className="sr-only">{FRENO_ROTULO[freno]}</span> : FRENO_ROTULO[freno]}
    </span>
  );
}
