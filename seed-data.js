// seed-data.js - Dados Especializados para Redes de Distribuição com Vinculação de Materiais por Equipe

const INITIAL_TEAMS = [
  {
    id: "eq-fao-v001m",
    code: "PI-FAO-V001M",
    name: "PI-FAO-V001M (Linha Viva MT Cesta Aérea)",
    leader: "Raimundo Nonato da Silva",
    contact: "(86) 99401-1001",
    specialty: "Manutenção em Linha Viva MT (13.8kV / 34.5kV) - Base Floriano / Picos",
    status: "active",
    membersCount: 4,
    color: "#ff5500",
    allocatedMaterials: [
      { id: "mat-1", name: "Chave fusível 15kV", qty: 6, unit: "unidades" },
      { id: "mat-5", name: "Para-raios 15kV", qty: 6, unit: "unidades" },
      { id: "mat-7", name: "Bastão 15kV", qty: 2, unit: "peças" },
      { id: "mat-9", name: "Laço 1/0", qty: 20, unit: "peças" },
      { id: "mat-10", name: "Laço 4 AWG", qty: 15, unit: "peças" },
      { id: "mat-12", name: "Alça 1/0", qty: 12, unit: "peças" },
      { id: "mat-15", name: "Conector CN10", qty: 30, unit: "unidades" },
      { id: "mat-19", name: "Conector estribo 4 - 2 AWG", qty: 10, unit: "peças" },
      { id: "mat-20", name: "Conector estribo 1/0 e 2/0", qty: 10, unit: "peças" },
      { id: "mat-21", name: "Isolador pilar 15kV", qty: 8, unit: "peças" },
      { id: "mat-25", name: "Parafuso cabeça quadrada 250mm", qty: 12, unit: "peças" },
      { id: "mat-34", name: "Cabo 1/0 CAA / CA", qty: 150, unit: "metros" }
    ]
  },
  {
    id: "eq-the-v002m",
    code: "PI-THE-V002M",
    name: "PI-THE-V002M (Linha Viva MT Ao Contato)",
    leader: "Francisco das Chagas Gomes",
    contact: "(86) 99401-1002",
    specialty: "Manutenção Preventiva de Alimentadores MT - Base Teresina Norte",
    status: "active",
    membersCount: 4,
    color: "#ea580c",
    allocatedMaterials: [
      { id: "mat-1", name: "Chave fusível 15kV", qty: 4, unit: "unidades" },
      { id: "mat-3", name: "Chave faca 15kV", qty: 2, unit: "unidades" },
      { id: "mat-5", name: "Para-raios 15kV", qty: 6, unit: "unidades" },
      { id: "mat-9", name: "Laço 1/0", qty: 15, unit: "peças" },
      { id: "mat-21", name: "Isolador pilar 15kV", qty: 6, unit: "peças" }
    ]
  },
  {
    id: "eq-pic-m001",
    code: "PI-PIC-M001",
    name: "PI-PIC-M001 (Linha Morta & Obras MT/BT)",
    leader: "José Ribamar Alencar",
    contact: "(89) 99401-1003",
    specialty: "Construção de Redes, Troca de Postes DT e Transformadores - Base Picos",
    status: "active",
    membersCount: 5,
    color: "#f97316",
    allocatedMaterials: [
      { id: "mat-38", name: "Poste Concreto Duplo T 11/300daN", qty: 4, unit: "unidades" },
      { id: "mat-41", name: "Cruzeta de Concreto Leve 2400mm", qty: 4, unit: "peças" },
      { id: "mat-32", name: "Mão francesa perfilada 710mm", qty: 8, unit: "peças" },
      { id: "mat-25", name: "Parafuso cabeça quadrada 250mm", qty: 20, unit: "peças" },
      { id: "mat-27", name: "Parafuso olhal 250mm", qty: 10, unit: "peças" },
      { id: "mat-35", name: "Cabo cobreado 10mm (aterramento)", qty: 60, unit: "metros" }
    ]
  },
  {
    id: "eq-par-e001",
    code: "PI-PAR-E001",
    name: "PI-PAR-E001 (Plantão Emergencial PNR 24h)",
    leader: "Antônio Carlos Ferreira",
    contact: "(86) 99401-1004",
    specialty: "Atendimento Rápido de Faltas e Restabelecimento - Base Parnaíba",
    status: "active",
    membersCount: 3,
    color: "#fb923c",
    allocatedMaterials: [
      { id: "mat-1", name: "Chave fusível 15kV", qty: 3, unit: "unidades" },
      { id: "mat-43", name: "Elo Fusível Tipo 5K / 10K", qty: 25, unit: "unidades" },
      { id: "mat-14", name: "Grampo de Ancoragem / Linha Viva", qty: 10, unit: "peças" },
      { id: "mat-15", name: "Conector CN10", qty: 20, unit: "unidades" }
    ]
  }
];

// Catálogo Master com saldo de estoque dinâmico (stock)
const INITIAL_MATERIALS = [
  // --- Chaves e Proteção ---
  { id: "mat-1", name: "Chave fusível 15kV", unit: "unidades", category: "Chaves & Proteção", defaultQty: 20, stock: 45, totalUsed: 28 },
  { id: "mat-2", name: "Chave fusível 36kV", unit: "unidades", category: "Chaves & Proteção", defaultQty: 10, stock: 22, totalUsed: 14 },
  { id: "mat-3", name: "Chave faca 15kV", unit: "unidades", category: "Chaves & Proteção", defaultQty: 12, stock: 30, totalUsed: 18 },
  { id: "mat-4", name: "Chave faca 36kV", unit: "unidades", category: "Chaves & Proteção", defaultQty: 8, stock: 16, totalUsed: 8 },
  { id: "mat-5", name: "Para-raios 15kV", unit: "unidades", category: "Chaves & Proteção", defaultQty: 25, stock: 58, totalUsed: 42 },
  { id: "mat-6", name: "Para-raios 36kV", unit: "unidades", category: "Chaves & Proteção", defaultQty: 12, stock: 26, totalUsed: 16 },

  // --- Ferramental Linha Viva ---
  { id: "mat-7", name: "Bastão 15kV", unit: "peças", category: "Ferramental Linha Viva", defaultQty: 8, stock: 14, totalUsed: 12 },
  { id: "mat-8", name: "Bastão 34kV", unit: "peças", category: "Ferramental Linha Viva", defaultQty: 6, stock: 12, totalUsed: 10 },

  // --- Preformados & Fixação ---
  { id: "mat-9", name: "Laço 1/0", unit: "peças", category: "Preformados & Fixação", defaultQty: 100, stock: 210, totalUsed: 145 },
  { id: "mat-10", name: "Laço 4 AWG", unit: "peças", category: "Preformados & Fixação", defaultQty: 100, stock: 195, totalUsed: 130 },
  { id: "mat-11", name: "Laço 2 AWG", unit: "peças", category: "Preformados & Fixação", defaultQty: 80, stock: 140, totalUsed: 95 },
  { id: "mat-12", name: "Alça 1/0", unit: "peças", category: "Preformados & Fixação", defaultQty: 80, stock: 160, totalUsed: 110 },
  { id: "mat-13", name: "Alça 4/0", unit: "peças", category: "Preformados & Fixação", defaultQty: 60, stock: 120, totalUsed: 85 },
  { id: "mat-14", name: "Grampo de Ancoragem / Linha Viva", unit: "peças", category: "Preformados & Fixação", defaultQty: 50, stock: 95, totalUsed: 78 },

  // --- Conectores ---
  { id: "mat-15", name: "Conector CN10", unit: "unidades", category: "Conexões & Emendas", defaultQty: 200, stock: 450, totalUsed: 260 },
  { id: "mat-16", name: "Conector CN13", unit: "unidades", category: "Conexões & Emendas", defaultQty: 150, stock: 320, totalUsed: 220 },
  { id: "mat-17", name: "Conector CN15", unit: "unidades", category: "Conexões & Emendas", defaultQty: 150, stock: 280, totalUsed: 190 },
  { id: "mat-18", name: "Conector CN6", unit: "unidades", category: "Conexões & Emendas", defaultQty: 200, stock: 410, totalUsed: 310 },
  { id: "mat-19", name: "Conector estribo 4 - 2 AWG", unit: "peças", category: "Conexões & Emendas", defaultQty: 60, stock: 135, totalUsed: 115 },
  { id: "mat-20", name: "Conector estribo 1/0 e 2/0", unit: "peças", category: "Conexões & Emendas", defaultQty: 60, stock: 150, totalUsed: 140 },

  // --- Isoladores ---
  { id: "mat-21", name: "Isolador pilar 15kV", unit: "peças", category: "Isoladores & Cruzetas", defaultQty: 50, stock: 112, totalUsed: 88 },
  { id: "mat-22", name: "Isolador pilar 36kV", unit: "peças", category: "Isoladores & Cruzetas", defaultQty: 30, stock: 65, totalUsed: 46 },
  { id: "mat-23", name: "Isolador pino", unit: "peças", category: "Isoladores & Cruzetas", defaultQty: 60, stock: 145, totalUsed: 102 },
  { id: "mat-24", name: "Isolador de suspensão polimérico 15kV", unit: "peças", category: "Isoladores & Cruzetas", defaultQty: 40, stock: 85, totalUsed: 64 },

  // --- Parafusos & Ferragens ---
  { id: "mat-25", name: "Parafuso cabeça quadrada 250mm", unit: "peças", category: "Ferragens & Fixação", defaultQty: 100, stock: 240, totalUsed: 180 },
  { id: "mat-26", name: "Parafuso cabeça quadrada 300mm", unit: "peças", category: "Ferragens & Fixação", defaultQty: 100, stock: 220, totalUsed: 165 },
  { id: "mat-27", name: "Parafuso olhal 250mm", unit: "peças", category: "Ferragens & Fixação", defaultQty: 80, stock: 185, totalUsed: 140 },
  { id: "mat-28", name: "Parafuso olhal 300mm", unit: "peças", category: "Ferragens & Fixação", defaultQty: 80, stock: 170, totalUsed: 125 },
  { id: "mat-29", name: "Manilha sapatilha", unit: "peças", category: "Ferragens & Fixação", defaultQty: 60, stock: 130, totalUsed: 92 },
  { id: "mat-30", name: "Gancho olhal", unit: "peças", category: "Ferragens & Fixação", defaultQty: 60, stock: 125, totalUsed: 88 },
  { id: "mat-31", name: "Sapatinha", unit: "peças", category: "Ferragens & Fixação", defaultQty: 80, stock: 160, totalUsed: 110 },
  { id: "mat-32", name: "Mão francesa perfilada 710mm", unit: "peças", category: "Ferragens & Fixação", defaultQty: 50, stock: 105, totalUsed: 74 },
  { id: "mat-33", name: "Cinta de poste 170mm", unit: "peças", category: "Ferragens & Fixação", defaultQty: 50, stock: 115, totalUsed: 82 },

  // --- Cabos ---
  { id: "mat-34", name: "Cabo 1/0 CAA / CA", unit: "metros", category: "Cabos & Condutores", defaultQty: 1000, stock: 3500, totalUsed: 2150 },
  { id: "mat-35", name: "Cabo cobreado 10mm (aterramento)", unit: "metros", category: "Cabos & Condutores", defaultQty: 400, stock: 950, totalUsed: 620 },
  { id: "mat-36", name: "Cabo 4 AWG CAA", unit: "metros", category: "Cabos & Condutores", defaultQty: 800, stock: 1800, totalUsed: 1350 },
  { id: "mat-37", name: "Cabo Multiplexado BT 3x35+35mm²", unit: "metros", category: "Cabos & Condutores", defaultQty: 500, stock: 1200, totalUsed: 890 },

  // --- Postes & Cruzetas (Equatorial Piauí) ---
  { id: "mat-38", name: "Poste Concreto Duplo T 11/300daN", unit: "unidades", category: "Postes & Cruzetas", defaultQty: 15, stock: 32, totalUsed: 22 },
  { id: "mat-39", name: "Poste Concreto Duplo T 11/600daN", unit: "unidades", category: "Postes & Cruzetas", defaultQty: 12, stock: 24, totalUsed: 16 },
  { id: "mat-40", name: "Poste Concreto Duplo T 12/600daN", unit: "unidades", category: "Postes & Cruzetas", defaultQty: 10, stock: 18, totalUsed: 12 },
  { id: "mat-41", name: "Cruzeta de Concreto Leve 2400mm", unit: "peças", category: "Postes & Cruzetas", defaultQty: 25, stock: 52, totalUsed: 38 },
  { id: "mat-42", name: "Cruzeta de Concreto Leve 2000mm", unit: "peças", category: "Postes & Cruzetas", defaultQty: 20, stock: 40, totalUsed: 26 },
  { id: "mat-43", name: "Elo Fusível Tipo 5K / 10K", unit: "unidades", category: "Chaves & Proteção", defaultQty: 100, stock: 260, totalUsed: 175 },
  { id: "mat-44", name: "Haste de Aterramento Aço-Cobre 5/8\" x 2.40m", unit: "peças", category: "Conexões & Emendas", defaultQty: 30, stock: 75, totalUsed: 48 },

  // --- Banco Regulador de Tensão (BRT - NT.00006 / NT.00022) ---
  { id: "mat-45", name: "Banco Regulador de Tensão Monofásico (BRT 15kV / 34.5kV)", unit: "conjuntos", category: "Equipamentos Especiais (BRT)", defaultQty: 2, stock: 6, totalUsed: 4 },
  { id: "mat-46", name: "Plataforma Metálica de Suporte para BRT", unit: "unidades", category: "Equipamentos Especiais (BRT)", defaultQty: 2, stock: 5, totalUsed: 3 },
  { id: "mat-47", name: "Chave Faca Bypass Unipolar 15kV 600A", unit: "unidades", category: "Chaves & Proteção", defaultQty: 6, stock: 18, totalUsed: 12 },

  // --- Lançamento de Cabos & Condutores Especiais ---
  { id: "mat-48", name: "Cabo de Alumínio 336.4 MCM Linnet (CAA)", unit: "metros", category: "Cabos & Condutores", defaultQty: 1000, stock: 2800, totalUsed: 1400 },
  { id: "mat-49", name: "Carretilha / Roldana de Lançamento de Linha Viva", unit: "peças", category: "Ferramental Linha Viva", defaultQty: 10, stock: 24, totalUsed: 14 },
  { id: "mat-50", name: "Cabo Multiplexado BT 3x70+54.6mm²", unit: "metros", category: "Cabos & Condutores", defaultQty: 600, stock: 1500, totalUsed: 920 }
];

const getTodayDateStr = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
};

const INITIAL_CHECKINS = [
  {
    id: "chk-eqtl-1",
    teamId: "eq-fao-v001m",
    teamCode: "PI-FAO-V001M",
    teamName: "PI-FAO-V001M (Linha Viva MT Cesta Aérea)",
    leaderName: "Raimundo Nonato da Silva",
    date: getTodayDateStr(0),
    checkInTime: "07:15",
    checkOutTime: null,
    location: "SE Floriano I - Alimentador AL-02 (Trecho Chave CF-114)",
    status: "active",
    workedHours: 0,
    regime: "Linha Viva",
    notes: "APR 2026/102 aprovada pelo COD. Manutenção em linha viva com cesta isolada."
  },
  {
    id: "chk-eqtl-2",
    teamId: "eq-the-v002m",
    teamCode: "PI-THE-V002M",
    teamName: "PI-THE-V002M (Linha Viva MT Ao Contato)",
    leaderName: "Francisco das Chagas Gomes",
    date: getTodayDateStr(0),
    checkInTime: "07:30",
    checkOutTime: null,
    location: "SE Macaúba - Alimentador AL-03 (Teresina)",
    status: "active",
    workedHours: 0,
    regime: "Linha Viva",
    notes: "Substituição de isolador pilar 15kV e para-raios sob potencial."
  },
  {
    id: "chk-eqtl-3",
    teamId: "eq-pic-m001",
    teamCode: "PI-PIC-M001",
    teamName: "PI-PIC-M001 (Linha Morta & Obras MT/BT)",
    leaderName: "José Ribamar Alencar",
    date: getTodayDateStr(0),
    checkInTime: "07:00",
    checkOutTime: "16:45",
    location: "BR-316 km 312 - Zona Rural Picos/PI",
    status: "completed",
    workedHours: 9.75,
    regime: "Linha Morta",
    notes: "Desenergização formal, bloqueio LOTO e aterramento temporário ATR instalados."
  }
];

const INITIAL_RDOS = [
  {
    id: "RDO-EQTL-001",
    teamId: "eq-fao-v001m",
    teamCode: "PI-FAO-V001M",
    teamName: "PI-FAO-V001M (Linha Viva MT Cesta Aérea)",
    leader: "Raimundo Nonato da Silva",
    regime: "Linha Viva (Energizada)",
    substation: "SE Floriano I",
    feeder: "AL-02 (13.8kV)",
    osNumber: "OS-99120/2026",
    aprNumber: "APR-2026/102",
    client: "Equatorial Piauí Distribuidora",
    project: "Manutenção Preventiva de Rede Viva MT",
    location: "Av. Bucar Neto, altura nº 850 - Floriano/PI",
    structureType: "Estrutura N3 e N4 (Cruzeta Normal)",
    date: getTodayDateStr(0),
    weatherMorning: "Ensolarado",
    weatherAfternoon: "Nublado",
    groundCondition: "Praticável",
    status: "Aprovado",
    safetyCheck: {
      aprApproved: true,
      atrInstalled: false,
      dielectricChecked: true,
      ppeInspected: true
    },
    labor: [
      { role: "Encarregado Especialista Linha Viva", qty: 1 },
      { role: "Eletricista de Linha Viva (Cesta)", qty: 2 },
      { role: "Motorista / Operador de Guindauto", qty: 1 }
    ],
    activities: [
      { description: "Instalação de mantas e lençóis isolantes classe 4 nos condutores da fase A, B e C", progress: 100, status: "Concluído" },
      { description: "Substituição sob tensão de 2 chaves fusíveis 15kV oxidadas", progress: 100, status: "Concluído" },
      { description: "Instalação de para-raios 15kV e conexão com estribos 1/0", progress: 100, status: "Concluído" },
      { description: "Aplicação de laços 1/0 preformados e fixação de isoladores", progress: 90, status: "Em Andamento" }
    ],
    materials: [
      { name: "Chave fusível 15kV", qty: 2, unit: "unidades" },
      { name: "Para-raios 15kV", qty: 2, unit: "unidades" },
      { name: "Laço 1/0", qty: 4, unit: "peças" },
      { name: "Conector estribo 1/0 e 2/0", qty: 4, unit: "peças" },
      { name: "Parafuso cabeça quadrada 250mm", qty: 2, unit: "peças" }
    ],
    occurrences: "Intervenção realizada sem interrupção de energia aos clientes (DEC/FEC preservados).",
    observations: "Viatura PI-FAO-V001M reabastecida com materiais para a programação de amanhã.",
    photos: []
  },
  {
    id: "RDO-EQTL-002",
    teamId: "eq-pic-m001",
    teamCode: "PI-PIC-M001",
    teamName: "PI-PIC-M001 (Linha Morta & Obras MT/BT)",
    leader: "José Ribamar Alencar",
    regime: "Linha Morta (Desenergizada)",
    substation: "SE Picos Centro",
    feeder: "AL-04 (13.8kV)",
    osNumber: "OS-99135/2026",
    aprNumber: "APR-2026/108",
    client: "Equatorial Piauí Distribuidora",
    project: "Substituição de Poste Abalroado e Recondutoramento",
    location: "BR-316 km 312 - Zona Rural Picos/PI",
    structureType: "Estrutura N1 e N4",
    date: getTodayDateStr(0),
    weatherMorning: "Ensolarado",
    weatherAfternoon: "Ensolarado",
    groundCondition: "Praticável",
    status: "Aprovado",
    safetyCheck: {
      aprApproved: true,
      atrInstalled: true,
      dielectricChecked: true,
      ppeInspected: true
    },
    labor: [
      { role: "Encarregado Geral de Obras MT/BT", qty: 1 },
      { role: "Eletricista Montador de Rede", qty: 2 },
      { role: "Ajudante de Eletricista", qty: 2 },
      { role: "Operador de Munck", qty: 1 }
    ],
    activities: [
      { description: "Desligamento e aterramento temporário ATR a montante e jusante", progress: 100, status: "Concluído" },
      { description: "Implantação e engastamento de poste duplo T 11/600daN", progress: 100, status: "Concluído" },
      { description: "Montagem de cruzeta 2400mm e esticamento do cabo 1/0", progress: 100, status: "Concluído" }
    ],
    materials: [
      { name: "Poste Concreto Duplo T 11/600daN", qty: 1, unit: "unidades" },
      { name: "Cruzeta de Concreto Leve 2400mm", qty: 1, unit: "peças" },
      { name: "Mão francesa perfilada 710mm", qty: 2, unit: "peças" },
      { name: "Alça 1/0", qty: 4, unit: "peças" },
      { name: "Cabo cobreado 10mm (aterramento)", qty: 15, unit: "metros" }
    ],
    occurrences: "Desligamento programado restabelecido às 14:30 pontualmente.",
    observations: "Aterramento concluído dentro das normas Equatorial.",
    photos: []
  }
];
