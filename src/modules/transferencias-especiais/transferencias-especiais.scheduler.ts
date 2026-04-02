import { env } from "../../config/env";
import { monitorarMudancasSituacaoTransferenciasEspeciais } from "./transferencias-especiais-notify.service";

let running = false;

const runCycle = async () => {
  if (running) {
    return;
  }

  running = true;
  try {
    const result = await monitorarMudancasSituacaoTransferenciasEspeciais();
    // eslint-disable-next-line no-console
    console.log("[transferencias-especiais] ciclo de monitoramento concluido", result);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[transferencias-especiais] falha no monitoramento", error);
  } finally {
    running = false;
  }
};

export const startTransferenciasEspeciaisMonitoring = () => {
  if (!env.transferenciasEspeciaisNotifyEnabled) {
    return () => {};
  }

  const intervalMs = Number.isFinite(env.transferenciasEspeciaisNotifyPollIntervalMs)
    ? Math.max(env.transferenciasEspeciaisNotifyPollIntervalMs, 120000)
    : 900000;

  void runCycle();
  const timer = setInterval(() => {
    void runCycle();
  }, intervalMs);

  return () => clearInterval(timer);
};
