import { InstrumentProposal } from "@prisma/client";

const toDateOnly = (value: Date | null): string | null => {
  if (!value) {
    return null;
  }
  return value.toISOString().slice(0, 10);
};

export const mapInstrument = (item: InstrumentProposal) => ({
  id: item.id,
  proposta: item.proposta,
  instrumento: item.instrumento,
  objeto: item.objeto,
  valor_repasse: Number(item.valorRepasse),
  valor_contrapartida: Number(item.valorContrapartida),
  valor_total: Number(item.valorRepasse) + Number(item.valorContrapartida),
  data_cadastro: toDateOnly(item.dataCadastro),
  data_assinatura: toDateOnly(item.dataAssinatura),
  vigencia_inicio: toDateOnly(item.vigenciaInicio),
  vigencia_fim: toDateOnly(item.vigenciaFim),
  data_prestacao_contas: toDateOnly(item.dataPrestacaoContas),
  data_dou: toDateOnly(item.dataDou),
  concedente: item.concedente,
  convenete_id: item.conveneteId,
  status: item.status,
  responsavel: item.responsavel,
  orgao_executor: item.orgaoExecutor,
  observacoes: item.observacoes,
  ativo: item.ativo,
  created_at: item.createdAt.toISOString(),
  updated_at: item.updatedAt.toISOString()
});
