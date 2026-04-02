export type HseDomainKey =
  | "demandas"
  | "controle"
  | "apoio_gestao"
  | "suporte_colegas"
  | "relacionamentos"
  | "clareza_funcao"
  | "gestao_mudancas";

export interface HseQuestion {
  id: number;
  domain: HseDomainKey;
  domainLabel: string;
  inverted: boolean;
  text: string;
}

export const HSE_QUESTIONS: HseQuestion[] = [
  {
    id: 1,
    domain: "demandas",
    domainLabel: "Demandas",
    inverted: true,
    text: "Diferentes setores/áreas no trabalho exigem coisas de mim que são difíceis de conciliar?",
  },
  {
    id: 2,
    domain: "demandas",
    domainLabel: "Demandas",
    inverted: true,
    text: "Tenho prazos impossíveis de cumprir?",
  },
  {
    id: 3,
    domain: "demandas",
    domainLabel: "Demandas",
    inverted: true,
    text: "Preciso trabalhar com muita intensidade?",
  },
  {
    id: 4,
    domain: "demandas",
    domainLabel: "Demandas",
    inverted: true,
    text: "Preciso deixar algumas tarefas de lado por que tenho muitas demandas?",
  },
  {
    id: 5,
    domain: "demandas",
    domainLabel: "Demandas",
    inverted: true,
    text: "Não consigo fazer pausas suficientes?",
  },
  {
    id: 6,
    domain: "demandas",
    domainLabel: "Demandas",
    inverted: true,
    text: "Sofro pressão para trabalhar longas horas?",
  },
  {
    id: 7,
    domain: "demandas",
    domainLabel: "Demandas",
    inverted: true,
    text: "Preciso trabalhar muito rápido?",
  },
  {
    id: 8,
    domain: "demandas",
    domainLabel: "Demandas",
    inverted: true,
    text: "Tenho pausas temporárias impossíveis de cumprir?",
  },
  {
    id: 9,
    domain: "controle",
    domainLabel: "Controle",
    inverted: false,
    text: "Posso decidir quando fazer uma pausa?",
  },
  {
    id: 10,
    domain: "controle",
    domainLabel: "Controle",
    inverted: false,
    text: "Tenho voz para decidir a velocidade do meu próprio trabalho?",
  },
  {
    id: 11,
    domain: "controle",
    domainLabel: "Controle",
    inverted: false,
    text: "Tenho autonomia para decidir como faço meu trabalho?",
  },
  {
    id: 12,
    domain: "controle",
    domainLabel: "Controle",
    inverted: false,
    text: "Tenho autonomia para decidir o que faço no trabalho?",
  },
  {
    id: 13,
    domain: "controle",
    domainLabel: "Controle",
    inverted: false,
    text: "Tenho alguma influência sobre a forma como realizo meu trabalho?",
  },
  {
    id: 14,
    domain: "controle",
    domainLabel: "Controle",
    inverted: false,
    text: "Meu horário de trabalho pode ser flexível?",
  },
  {
    id: 15,
    domain: "apoio_gestao",
    domainLabel: "Apoio da Gestão",
    inverted: false,
    text: "Recebo informações e suporte que me ajudam no trabalho que eu faço?",
  },
  {
    id: 16,
    domain: "apoio_gestao",
    domainLabel: "Apoio da Gestão",
    inverted: false,
    text: "Posso contar com meu supervisor direto para me ajudar com problemas no trabalho?",
  },
  {
    id: 17,
    domain: "apoio_gestao",
    domainLabel: "Apoio da Gestão",
    inverted: false,
    text: "Posso conversar com meu supervisor direto sobre algo que me incomodou no trabalho?",
  },
  {
    id: 18,
    domain: "apoio_gestao",
    domainLabel: "Apoio da Gestão",
    inverted: false,
    text: "Recebo apoio em trabalhos emocionalmente exigentes?",
  },
  {
    id: 19,
    domain: "apoio_gestao",
    domainLabel: "Apoio da Gestão",
    inverted: false,
    text: "Meu supervisor direto me incentiva no trabalho?",
  },
  {
    id: 20,
    domain: "suporte_colegas",
    domainLabel: "Suporte dos Colegas",
    inverted: false,
    text: "Se o trabalho ficar difícil, meus colegas podem me ajudar?",
  },
  {
    id: 21,
    domain: "suporte_colegas",
    domainLabel: "Suporte dos Colegas",
    inverted: false,
    text: "Recebo o apoio de que preciso dos meus colegas?",
  },
  {
    id: 22,
    domain: "suporte_colegas",
    domainLabel: "Suporte dos Colegas",
    inverted: false,
    text: "Recebo o respeito que mereço dos meus colegas?",
  },
  {
    id: 23,
    domain: "suporte_colegas",
    domainLabel: "Suporte dos Colegas",
    inverted: false,
    text: "Meus colegas estão dispostos a ouvir meus problemas relacionados ao trabalho?",
  },
  {
    id: 24,
    domain: "relacionamentos",
    domainLabel: "Relacionamentos",
    inverted: true,
    text: "Sou perseguido no trabalho?",
  },
  {
    id: 25,
    domain: "relacionamentos",
    domainLabel: "Relacionamentos",
    inverted: true,
    text: "Há atritos ou desentendimentos entre colegas?",
  },
  {
    id: 26,
    domain: "relacionamentos",
    domainLabel: "Relacionamentos",
    inverted: true,
    text: "Falam ou se comportam comigo de forma dura?",
  },
  {
    id: 27,
    domain: "relacionamentos",
    domainLabel: "Relacionamentos",
    inverted: true,
    text: "Os relacionamentos no trabalho estão desgastados?",
  },
  {
    id: 28,
    domain: "clareza_funcao",
    domainLabel: "Clareza de Função",
    inverted: false,
    text: "Eu entendo claramente o que é esperado de mim no trabalho?",
  },
  {
    id: 29,
    domain: "clareza_funcao",
    domainLabel: "Clareza de Função",
    inverted: false,
    text: "Sei como realizar meu trabalho?",
  },
  {
    id: 30,
    domain: "clareza_funcao",
    domainLabel: "Clareza de Função",
    inverted: false,
    text: "Sei claramente quais são minhas funções e responsabilidades?",
  },
  {
    id: 31,
    domain: "clareza_funcao",
    domainLabel: "Clareza de Função",
    inverted: false,
    text: "Compreendo os objetivos e metas do meu departamento?",
  },
  {
    id: 32,
    domain: "clareza_funcao",
    domainLabel: "Clareza de Função",
    inverted: false,
    text: "Compreendo como o meu trabalho contribui para o objetivo geral da organização?",
  },
  {
    id: 33,
    domain: "gestao_mudancas",
    domainLabel: "Gestão de Mudanças",
    inverted: false,
    text: "Tenho oportunidades suficientes para questionar os gestores sobre mudanças no trabalho?",
  },
  {
    id: 34,
    domain: "gestao_mudancas",
    domainLabel: "Gestão de Mudanças",
    inverted: false,
    text: "Os funcionários são sempre consultados sobre mudanças no trabalho?",
  },
  {
    id: 35,
    domain: "gestao_mudancas",
    domainLabel: "Gestão de Mudanças",
    inverted: false,
    text: "Quando há mudanças no trabalho, compreendo claramente como elas serão aplicadas na prática?",
  },
];

export const HSE_DOMAIN_ORDER: { key: HseDomainKey; label: string }[] = [
  { key: "demandas", label: "Demandas" },
  { key: "controle", label: "Controle" },
  { key: "apoio_gestao", label: "Apoio da Gestão" },
  { key: "suporte_colegas", label: "Suporte dos Colegas" },
  { key: "relacionamentos", label: "Relacionamentos" },
  { key: "clareza_funcao", label: "Clareza de Função" },
  { key: "gestao_mudancas", label: "Gestão de Mudanças" },
];
