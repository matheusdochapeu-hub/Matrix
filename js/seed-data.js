const MATRIX_SEED_DATA = {
  "versao": "1.0.0",
  "atualizadoEm": "2026-11-05T15:20:00Z",
  "perfil": {
    "usuario": "Matheus Rodrigues Ribeiro",
    "esposa": "Scarlet Santos",
    "cidade": "Ribeirão Preto - SP",
    "trabalho": "USP - São Carlos (PUSP-SC / DVMANOPER-52)",
    "cargo": "Técnico 1 - Nível A (Celetista 40h)",
    "numUsp": "11757179-1",
    "dataAdmissaoUsp": "2026-07-06",
    "salarioBase": 6264.04,
    "auxilioSaude": 759.01,
    "vaMensal": 2050,
    "vrDiario": 65,
    "caronaDiaria": 60
  },
  "financiamentoCaixa": {
    "banco": "Caixa Econômica Federal",
    "finalidade": "Financiamento Imobiliário Casa Maracaju",
    "prestacaoAtual": 42,
    "totalPrestacoes": 271,
    "parcelaAtual": 1395.88,
    "saldoDevedor": 157884.49,
    "taxaJurosAnual": 8.9899,
    "sistema": "Price",
    "fgtsMensalUsp": 501.12,
    "intervaloAbatimentoFgtsMeses": 24,
    "ultimoAbatimentoFgts": "2025-01"
  },
  "bancos": [
    {
      "id": "bb",
      "nome": "Banco do Brasil",
      "tipo": "Conta Salário / Corrente",
      "saldo": 0,
      "titular": "Matheus",
      "uso": "Recebimento de proventos USP e transferências"
    },
    {
      "id": "inter",
      "nome": "Banco Inter",
      "tipo": "Conta Corrente / Giro",
      "saldo": 250,
      "titular": "Matheus",
      "uso": "Pix, barbearia, caronas e pequenos gastos"
    },
    {
      "id": "caixa",
      "nome": "Caixa Econômica",
      "tipo": "Conta Financiamento",
      "saldo": 0,
      "titular": "Matheus & Scarlet",
      "uso": "Débito estrito da parcela da casa"
    },
    {
      "id": "santander",
      "nome": "Santander",
      "tipo": "Conta Serviços",
      "saldo": 50,
      "titular": "Matheus",
      "uso": "DinDin R$ 50/mês + R$ 50 giro rápido"
    },
    {
      "id": "nubank_matheus",
      "nome": "Nubank (Matheus)",
      "tipo": "Cartão de Crédito",
      "limiteTotal": 2000,
      "limiteDisponivel": 266.68,
      "faturaAtual": 220.68,
      "vencimento": "Dia 10",
      "titular": "Matheus"
    },
    {
      "id": "nubank_scarlet",
      "nome": "Nubank Ultravioleta Black",
      "tipo": "Cartão Master da Casa",
      "mensalidade": 89,
      "titular": "Scarlet",
      "uso": "Cartão conjunto gerido no App Faturas"
    },
    {
      "id": "mp",
      "nome": "Mercado Pago",
      "tipo": "Conta / Cofrinho",
      "saldo": 0,
      "cofrinho": 40.14,
      "titular": "Matheus",
      "uso": "Recebimento de prêmios de loteria"
    },
    {
      "id": "btg",
      "nome": "BTG Pactual",
      "tipo": "Investimentos",
      "titular": "Scarlet",
      "uso": "Aportes e custódia da Scarlet"
    },
    {
      "id": "bradesco",
      "nome": "Bradesco (Antigo MPSP)",
      "tipo": "Inativa / Zerada",
      "saldo": 0,
      "titular": "Matheus",
      "uso": "Ex-conta MPSP"
    }
  ],
  "investimentos": [
    {
      "id": "renda_plus_xp",
      "ativo": "Tesouro Direto Renda+ 2055",
      "corretora": "XP Investimentos",
      "categoria": "Previdência / Aposentadoria",
      "titular": "Matheus",
      "valorAtual": 466.07,
      "vencimento": "2055",
      "rentabilidadeContratada": "IPCA + 6,50% a.a.",
      "status": "Ativo (Foco de novos aportes)"
    },
    {
      "id": "renda_plus_inter",
      "ativo": "Tesouro Direto Renda+ 2055",
      "corretora": "Banco Inter",
      "categoria": "Previdência / Aposentadoria",
      "titular": "Matheus",
      "valorAtual": 852.82,
      "vencimento": "2055",
      "rentabilidadeContratada": "IPCA + 6,50% a.a.",
      "status": "Congelado para novos aportes"
    },
    {
      "id": "btc_inter",
      "ativo": "Bitcoin (BTC)",
      "corretora": "Banco Inter Cripto",
      "categoria": "Criptomoedas",
      "titular": "Matheus",
      "valorAtual": 44.69,
      "vencimento": "Longo Prazo",
      "rentabilidadeContratada": "Renda Variável",
      "status": "Ativo (Aportes mensais)"
    },
    {
      "id": "tesouro_reserva_bb",
      "ativo": "Tesouro Reserva",
      "corretora": "BB Investimentos",
      "categoria": "Reserva de Emergência / Início de Ano",
      "titular": "Matheus",
      "valorAtual": 2213.8,
      "vencimento": "Liquidez Diária",
      "rentabilidadeContratada": "100% Selic (~10,75% a.a.)",
      "status": "Alocado p/ faturas e contas de início de ano"
    },
    {
      "id": "dindin_santander",
      "ativo": "Título de Capitalização DinDin",
      "corretora": "Santander",
      "categoria": "Capitalização",
      "titular": "Matheus",
      "valorAtual": 550,
      "vencimento": "60 meses (Resgate R$ 3.000,00)",
      "rentabilidadeContratada": "TR + Sorteios (Resgate R$ 3.000,00)",
      "status": "Aporte automático R$ 50/mês (60 meses)"
    },
    {
      "id": "acoes_csna",
      "ativo": "CSNA3 (Cia Siderúrgica Nacional)",
      "corretora": "XP Investimentos",
      "categoria": "Ações",
      "titular": "Matheus",
      "quantidade": 40,
      "precoMedio": 5,
      "precoAtual": 4.1,
      "valorAtual": 164,
      "vencimento": "Indeterminado / B3",
      "rentabilidadeContratada": "Dividend Yield ~6% a.a.",
      "status": "Custódia"
    },
    {
      "id": "acoes_mglu",
      "ativo": "MGLU3 (Magazine Luiza)",
      "corretora": "XP Investimentos",
      "categoria": "Ações",
      "titular": "Matheus",
      "quantidade": 137,
      "precoMedio": 5.82,
      "precoAtual": 5.3,
      "valorAtual": 726.1,
      "vencimento": "Indeterminado / B3",
      "rentabilidadeContratada": "Renda Variável B3",
      "status": "Custódia"
    },
    {
      "id": "clear_proventos",
      "ativo": "Dividendos / Proventos Provisionados",
      "corretora": "Clear (Inativa)",
      "categoria": "Proventos até 2028",
      "titular": "Matheus",
      "valorAtual": 29,
      "vencimento": "2028",
      "rentabilidadeContratada": "Proventos",
      "status": "A receber até 2028"
    },
    {
      "id": "renda_plus_scarlet",
      "ativo": "Tesouro Direto Renda+ 2055",
      "corretora": "Tesouro Direto",
      "categoria": "Previdência / Aposentadoria",
      "titular": "Scarlet",
      "valorAtual": 1250,
      "vencimento": "2055",
      "rentabilidadeContratada": "IPCA + 6,50% a.a.",
      "status": "Ativo (Aposentadoria 2055)"
    },
    {
      "id": "cdb_scarlet_inter",
      "ativo": "CDB Pessoal Scarlet",
      "corretora": "Banco Inter",
      "categoria": "Renda Fixa",
      "titular": "Scarlet",
      "valorAtual": 650,
      "vencimento": "2027",
      "rentabilidadeContratada": "102% CDI",
      "status": "Ativo (Aposentadoria / Sonhos)"
    }
  ],
  "holerites": [
    {
      "periodo": "2026-10",
      "ano": "2026",
      "mesNome": "Outubro",
      "orgao": "Universidade de São Paulo (USP)",
      "cargo": "Técnico 1 - Nível A",
      "banco": "Banco do Brasil Ag. 2211 CC 38154-3",
      "vencimentos": 6739.45,
      "descontos": 951.26,
      "liquido": 5788.19,
      "fgts": 468.2,
      "itens": [
        {
          "cod": "220",
          "desc": "Vencimento",
          "tipo": "Vencimento",
          "valor": 5852.5
        },
        {
          "cod": "709",
          "desc": "Auxílio-Saúde USP",
          "tipo": "Vencimento",
          "valor": 886.95
        },
        {
          "cod": "339",
          "desc": "Vale Refeição (Desconto)",
          "tipo": "Desconto",
          "valor": 93.6
        },
        {
          "cod": "197",
          "desc": "Sindicato Sintusp",
          "tipo": "Desconto",
          "valor": 58.53
        },
        {
          "cod": "113",
          "desc": "INSS",
          "tipo": "Desconto",
          "valor": 679.13
        },
        {
          "cod": "108",
          "desc": "Imposto de Renda (IRRF)",
          "tipo": "Desconto",
          "valor": 120
        }
      ]
    }
  ],
  "previsaoDecimoTerceiro2026": {
    "parcela1": {
      "data": "2026-11-30",
      "valorEstimado": 1566,
      "descricao": "1ª Parcela 13º Salário USP (50% proporcional 6/12)"
    },
    "parcela2": {
      "data": "2026-12-20",
      "valorEstimado": 1280,
      "descricao": "2ª Parcela 13º Salário USP (com retenções de INSS e IR)"
    }
  },
  "simulacoesAtivas": [
    {
      "id": "sim_seguro_scarlet",
      "titulo": "Seguro de Vida Scarlet",
      "categoria": "Proteção / Saúde",
      "valorMensalMin": 100,
      "valorMensalMax": 150,
      "valorAdotado": 125,
      "inicio": "2026-12",
      "impactoAnual": 1500,
      "ativo": true,
      "observacao": "Cotação em andamento entre R$ 100 e R$ 150"
    }
  ],
  "calendarioCustom": {
    "overrides": {
      "2026-10-28": {
        "tipo": "presencial",
        "motivo": "Trabalho Presencial (Dia do Servidor trabalhado)"
      }
    },
    "folgas": []
  },
  "anos": {
    "2026": {
      "Outubro": {
        "fixos": [
          {
            "id": "fix_3",
            "nome": "Parcela casa",
            "valor": 1369.02,
            "pago": false
          },
          {
            "id": "fix_4",
            "nome": "Água",
            "valor": 31.84,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 103.29,
            "pago": false
          },
          {
            "id": "fix_6",
            "nome": "Internet",
            "valor": 99.9,
            "pago": false
          },
          {
            "id": "fix_7",
            "nome": "Dentista",
            "valor": 118.3,
            "pago": false
          },
          {
            "id": "fix_8",
            "nome": "Spotify",
            "valor": 12.99,
            "pago": false
          },
          {
            "id": "fix_9",
            "nome": "IPTU",
            "valor": 91.35,
            "pago": false
          },
          {
            "id": "fix_10",
            "nome": "Partido",
            "valor": 130,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Ração fórum",
            "valor": 30,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "Psico",
            "valor": 480,
            "pago": false
          },
          {
            "id": "fix_13",
            "nome": "MEI",
            "valor": 87,
            "pago": false
          },
          {
            "id": "fix_14",
            "nome": "Caronas",
            "valor": 921.85,
            "pago": false
          },
          {
            "id": "fix_15",
            "nome": "Unimed",
            "valor": 867.72,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_6",
            "nome": "Renda+ 2055",
            "valor": 103,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Santander",
            "valor": 100,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Cripto",
            "valor": 10,
            "pago": true
          },
          {
            "id": "out_11",
            "nome": "BB",
            "valor": 327.38,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Alberto",
            "valor": 240,
            "pago": true
          },
          {
            "id": "out_13",
            "nome": "Cesar",
            "valor": 150,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Nubank",
            "valor": 154.41,
            "pago": true
          },
          {
            "id": "out_15",
            "nome": "Edna",
            "valor": 500,
            "pago": true
          },
          {
            "id": "out_16",
            "nome": "Scarlet",
            "categoria": "Cartão",
            "conta": "salario_bb",
            "descricao": "Transferência da conta USP para pagamento da fatura Nubank da Scarlet",
            "valor": 800,
            "pago": true
          },
          {
            "id": "out_17",
            "nome": "INSS Maria",
            "valor": 179,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5786.24,
          "VA": 2050,
          "VR": 1300,
          "Estúdio": 600,
          "Subtotal Ganhos": 6386.24,
          "Total Gastos Fixos": 4343.26,
          "Total Outros Gastos": 2563.79,
          "Subtotal Gastos": 6907.05,
          "Ganhos - Gastos": -520.81,
          "Unimed": 867.72,
          "Auxílio saúde": 759.01,
          "Subtotal": 108.71,
          "Investimentos": 213,
          "Ideal": 1735.872
        },
        "scarlet": {
          "gastos": [],
          "ganhos": 3629.86,
          "faturaNubank": 4835.22
        },
        "receitas": [
          {
            "id": "rec_sal_Outubro_2026",
            "nome": "Salário Líquido USP (Banco do Brasil)",
            "valor": 5786.24,
            "categoria": "Salário / Proventos",
            "conta": "bb",
            "renda": "salario_usp",
            "pago": true
          },
          {
            "id": "rec_estudio_Outubro_2026",
            "nome": "Renda Extra",
            "valor": 600,
            "categoria": "Renda Extra",
            "conta": "debito_inter",
            "pago": true
          },
          {
            "id": "rec_vr_Outubro_2026",
            "nome": "Vale Refeição (VR)",
            "valor": 1300,
            "categoria": "Benefício (Não Pecúnia)",
            "naoPecunia": true,
            "pago": true
          },
          {
            "id": "rec_va_Outubro_2026",
            "nome": "Vale Alimentação (VA - Maracaju 88)",
            "valor": 2050,
            "categoria": "Benefício (Não Pecúnia)",
            "naoPecunia": true,
            "pago": true
          }
        ]
      },
      "Novembro": {
        "fixos": [
          {
            "id": "fix_3",
            "nome": "Parcela casa",
            "valor": 1395.88,
            "pago": false
          },
          {
            "id": "fix_4",
            "nome": "Água",
            "valor": 31.98,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 160,
            "pago": false
          },
          {
            "id": "fix_6",
            "nome": "Internet",
            "valor": 99.9,
            "pago": false
          },
          {
            "id": "fix_7",
            "nome": "Dentista",
            "valor": 118,
            "pago": false
          },
          {
            "id": "fix_8",
            "nome": "Spotify",
            "valor": 12.99,
            "pago": false
          },
          {
            "id": "fix_9",
            "nome": "IPTU",
            "valor": 91.35,
            "pago": false
          },
          {
            "id": "fix_10",
            "nome": "Partido",
            "valor": 130,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Ração fórum",
            "valor": 30,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "Psico",
            "valor": 480,
            "pago": false
          },
          {
            "id": "fix_13",
            "nome": "MEI",
            "valor": 87,
            "pago": false
          },
          {
            "id": "fix_14",
            "nome": "Caronas",
            "valor": 1200,
            "pago": false
          },
          {
            "id": "fix_15",
            "nome": "Unimed",
            "valor": 867.72,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_6",
            "nome": "Renda+ 2055",
            "valor": 103,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Tesouro Reserva",
            "valor": 1766,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Santander",
            "valor": 100,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Cripto",
            "valor": 10,
            "pago": true
          },
          {
            "id": "out_11",
            "nome": "BB",
            "valor": 1882.64,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Alberto",
            "valor": 250,
            "pago": true
          },
          {
            "id": "out_13",
            "nome": "Cesar",
            "valor": 150,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Nubank",
            "valor": 220.74,
            "pago": true
          },
          {
            "id": "out_15",
            "nome": "Edna",
            "valor": 500,
            "pago": true
          },
          {
            "id": "out_16",
            "nome": "Scarlet",
            "categoria": "Cartão",
            "conta": "salario_bb",
            "descricao": "Transferência da conta USP para pagamento da fatura Nubank da Scarlet",
            "valor": 2000,
            "pago": true
          },
          {
            "id": "out_17",
            "nome": "INSS Maria",
            "valor": 179,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5788.19,
          "VA": 2050,
          "VR": 1235,
          "Estúdio": 600,
          "BB": 7066,
          "Subtotal Ganhos": 13454.19,
          "Total Gastos Fixos": 4704.82,
          "Total Outros Gastos": 7161.38,
          "Subtotal Gastos": 11866.2,
          "Ganhos - Gastos": 1587.99,
          "Investimentos": 1979,
          "Ideal": 1736.457
        },
        "scarlet": {
          "gastos": [],
          "ganhos": 1100,
          "faturaNubank": 4568.57
        },
        "receitas": [
          {
            "id": "rec_sal_Novembro_2026",
            "nome": "Salário Líquido USP (Banco do Brasil)",
            "valor": 5788.19,
            "categoria": "Salário / Proventos",
            "conta": "bb",
            "renda": "salario_usp",
            "pago": true
          },
          {
            "id": "rec_estudio_Novembro_2026",
            "nome": "Renda Extra",
            "valor": 600,
            "categoria": "Renda Extra",
            "conta": "debito_inter",
            "pago": true
          },
          {
            "id": "rec_vr_Novembro_2026",
            "nome": "Vale Refeição (VR)",
            "valor": 1235,
            "categoria": "Benefício (Não Pecúnia)",
            "naoPecunia": true,
            "pago": true
          },
          {
            "id": "rec_va_Novembro_2026",
            "nome": "Vale Alimentação (VA - Maracaju 88)",
            "valor": 2050,
            "categoria": "Benefício (Não Pecúnia)",
            "naoPecunia": true,
            "pago": true
          }
        ]
      },
      "Dezembro": {
        "fixos": [
          {
            "id": "fix_3",
            "nome": "Parcela casa",
            "valor": 1395.88,
            "pago": false
          },
          {
            "id": "fix_4",
            "nome": "Água",
            "valor": 31.84,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 160,
            "pago": false
          },
          {
            "id": "fix_6",
            "nome": "Internet",
            "valor": 99.9,
            "pago": false
          },
          {
            "id": "fix_7",
            "nome": "Dentista",
            "valor": 118,
            "pago": false
          },
          {
            "id": "fix_8",
            "nome": "Spotify",
            "valor": 12.99,
            "pago": false
          },
          {
            "id": "fix_9",
            "nome": "IPTU",
            "valor": 91.35,
            "pago": false
          },
          {
            "id": "fix_10",
            "nome": "Partido",
            "valor": 130,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Ração fórum",
            "valor": 30,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "Psico",
            "valor": 480,
            "pago": false
          },
          {
            "id": "fix_13",
            "nome": "MEI",
            "valor": 87,
            "pago": false
          },
          {
            "id": "fix_14",
            "nome": "Caronas",
            "valor": 840,
            "pago": false
          },
          {
            "id": "fix_15",
            "nome": "Unimed",
            "valor": 867.72,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_6",
            "nome": "Renda+ 2055",
            "valor": 103,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Santander",
            "valor": 50,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Cripto",
            "valor": 10,
            "pago": true
          },
          {
            "id": "out_11",
            "nome": "BB",
            "valor": 48,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Alberto",
            "valor": 250,
            "pago": true
          },
          {
            "id": "out_13",
            "nome": "Cesar",
            "valor": 150,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Nubank",
            "valor": 150,
            "pago": true
          },
          {
            "id": "out_15",
            "nome": "Edna",
            "valor": 500,
            "pago": true
          },
          {
            "id": "out_17",
            "nome": "INSS Maria",
            "valor": 179,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5788.19,
          "VA": 2050,
          "VR": 910,
          "13º": 0,
          "Resgate Reserva": 0,
          "Subtotal Ganhos": 5788.19,
          "Total Gastos Fixos": 4344.68,
          "Total Outros Gastos": 1440,
          "Subtotal Gastos": 5784.68,
          "Ganhos - Gastos": 3.51,
          "Recesso": "2026-12-19 00:00:00",
          "Investimentos": 163,
          "Ideal": 1736.457
        },
        "scarlet": {
          "gastos": [],
          "ganhos": 5200,
          "faturaNubank": 1568.05
        },
        "receitas": [
          {
            "id": "rec_sal_Dezembro_2026",
            "nome": "Salário Líquido USP (Banco do Brasil)",
            "valor": 5788.19,
            "categoria": "Salário / Proventos",
            "conta": "bb",
            "renda": "salario_usp",
            "pago": true
          },
          {
            "id": "rec_vr_Dezembro_2026",
            "nome": "Vale Refeição (VR)",
            "valor": 910,
            "categoria": "Benefício (Não Pecúnia)",
            "naoPecunia": true,
            "pago": true
          },
          {
            "id": "rec_va_Dezembro_2026",
            "nome": "Vale Alimentação (VA - Maracaju 88)",
            "valor": 2050,
            "categoria": "Benefício (Não Pecúnia)",
            "naoPecunia": true,
            "pago": true
          }
        ]
      }
    },
    "2027": {
      "Janeiro": {
        "fixos": [
          {
            "id": "fix_3",
            "nome": "Parcela casa",
            "valor": 1399,
            "pago": false
          },
          {
            "id": "fix_4",
            "nome": "Água",
            "valor": 31.84,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 160,
            "pago": false
          },
          {
            "id": "fix_6",
            "nome": "Internet",
            "valor": 99.9,
            "pago": false
          },
          {
            "id": "fix_7",
            "nome": "Dentista",
            "valor": 113.06,
            "pago": false
          },
          {
            "id": "fix_8",
            "nome": "Spotify",
            "valor": 12.99,
            "pago": false
          },
          {
            "id": "fix_10",
            "nome": "Partido",
            "valor": 160,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Psico",
            "valor": 480,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "MEI",
            "valor": 87,
            "pago": false
          },
          {
            "id": "fix_13",
            "nome": "Caronas",
            "valor": 1300,
            "pago": false
          },
          {
            "id": "fix_14",
            "nome": "Unimed",
            "valor": 867.72,
            "pago": false
          },
          {
            "id": "fix_15",
            "nome": "Contas inicio Ano",
            "valor": 2691.675,
            "pago": false
          },
          {
            "id": "fix_16",
            "nome": "Consignado",
            "valor": 1881,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_6",
            "nome": "Renda+ 2055",
            "valor": 103,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Tesouro Reserva",
            "valor": 260,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Santander",
            "valor": 100,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Cripto",
            "valor": 10,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Alberto",
            "valor": 250,
            "pago": true
          },
          {
            "id": "out_13",
            "nome": "Cesar",
            "valor": 150,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Nubank",
            "valor": 150,
            "pago": true
          },
          {
            "id": "out_15",
            "nome": "Edna",
            "valor": 600,
            "pago": true
          }
        ],
        "totais": {
          "IPTU": 1035.91,
          "IPVA CARRO": 1017.765,
          "LIC CARRO": 187,
          "CREFITO": 451,
          "SEG CARRO": 0,
          "REVISÃO CARRO": 0,
          "IPTU PAIS": "R$ 0.00",
          "IPVA UNO PAI": 0,
          "COLETA LIXO": 0
        },
        "scarlet": {
          "gastos": [],
          "ganhos": 0,
          "faturaNubank": 0
        }
      },
      "Fevereiro": {
        "fixos": [
          {
            "id": "fix_3",
            "nome": "Parcela casa",
            "valor": 1399,
            "pago": false
          },
          {
            "id": "fix_4",
            "nome": "Água",
            "valor": 31.84,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 160,
            "pago": false
          },
          {
            "id": "fix_6",
            "nome": "Internet",
            "valor": 99.9,
            "pago": false
          },
          {
            "id": "fix_7",
            "nome": "Dentista",
            "valor": 118.06,
            "pago": false
          },
          {
            "id": "fix_8",
            "nome": "Spotify",
            "valor": 12.99,
            "pago": false
          },
          {
            "id": "fix_10",
            "nome": "Partido",
            "valor": 160,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Psico",
            "valor": 480,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "MEI",
            "valor": 87,
            "pago": false
          },
          {
            "id": "fix_13",
            "nome": "Caronas",
            "valor": 1300,
            "pago": false
          },
          {
            "id": "fix_14",
            "nome": "Unimed",
            "valor": 867.72,
            "pago": false
          },
          {
            "id": "fix_15",
            "nome": "Consignado",
            "valor": 1881,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_6",
            "nome": "Renda+ 2055",
            "valor": 103,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Tesouro Reserva",
            "valor": 260,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Santander",
            "valor": 50,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Cripto",
            "valor": 10,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Alberto",
            "valor": 250,
            "pago": true
          },
          {
            "id": "out_13",
            "nome": "Cesar",
            "valor": 150,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Nubank",
            "valor": 150,
            "pago": true
          },
          {
            "id": "out_15",
            "nome": "Edna",
            "valor": 600,
            "pago": true
          },
          {
            "id": "out_18",
            "nome": "Google One",
            "valor": 149.9,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5786.24,
          "VA": 2050,
          "VR": 1365,
          "Gace": 0,
          "Subtotal Ganhos": 5786.24,
          "Total Gastos Fixos": 6597.51,
          "Total Outros Gastos": 1573,
          "Subtotal Gastos": 8170.51,
          "Ganhos - Gastos": -2384.27,
          "Investimentos": 423,
          "Ideal": 1735.872
        },
        "scarlet": {
          "gastos": [],
          "ganhos": 0,
          "faturaNubank": 0
        }
      },
      "Março": {
        "fixos": [
          {
            "id": "fix_3",
            "nome": "Parcela casa",
            "valor": 1329.14,
            "pago": false
          },
          {
            "id": "fix_4",
            "nome": "Água",
            "valor": 31,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 160,
            "pago": false
          },
          {
            "id": "fix_6",
            "nome": "Internet",
            "valor": 99.9,
            "pago": false
          },
          {
            "id": "fix_7",
            "nome": "Dentista",
            "valor": 113.06,
            "pago": false
          },
          {
            "id": "fix_8",
            "nome": "Spotify",
            "valor": 12.99,
            "pago": false
          },
          {
            "id": "fix_10",
            "nome": "Partido",
            "valor": 160,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Psico",
            "valor": 480,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "MEI",
            "valor": 87,
            "pago": false
          },
          {
            "id": "fix_13",
            "nome": "Caronas",
            "valor": 1300,
            "pago": false
          },
          {
            "id": "fix_14",
            "nome": "Unimed",
            "valor": 867.72,
            "pago": false
          },
          {
            "id": "fix_15",
            "nome": "Consignado",
            "valor": 1881,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_6",
            "nome": "Renda+ 2055",
            "valor": 103,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Tesouro Reserva",
            "valor": 260,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Santander",
            "valor": 50,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Cripto",
            "valor": 10,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Alberto",
            "valor": 250,
            "pago": true
          },
          {
            "id": "out_13",
            "nome": "Cesar",
            "valor": 150,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Nubank",
            "valor": 150,
            "pago": true
          },
          {
            "id": "out_15",
            "nome": "Edna",
            "valor": 600,
            "pago": true
          },
          {
            "id": "out_18",
            "nome": "Strava",
            "valor": 149.9,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5786.24,
          "VA": 2050,
          "VR": 1365,
          "Gace": 0,
          "Subtotal Ganhos": 5786.24,
          "Total Gastos Fixos": 6521.81,
          "Total Outros Gastos": 1573,
          "Subtotal Gastos": 8094.81,
          "Ganhos - Gastos": -2308.57,
          "Investimentos": 423,
          "Ideal": 1735.872
        },
        "scarlet": {
          "gastos": [],
          "ganhos": 0,
          "faturaNubank": 0
        }
      },
      "Abril": {
        "fixos": [
          {
            "id": "fix_3",
            "nome": "Parcela casa",
            "valor": 1329.14,
            "pago": false
          },
          {
            "id": "fix_4",
            "nome": "Água",
            "valor": 31,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 160,
            "pago": false
          },
          {
            "id": "fix_6",
            "nome": "Internet",
            "valor": 99.9,
            "pago": false
          },
          {
            "id": "fix_7",
            "nome": "Dentista",
            "valor": 113.06,
            "pago": false
          },
          {
            "id": "fix_8",
            "nome": "Spotify",
            "valor": 12.99,
            "pago": false
          },
          {
            "id": "fix_10",
            "nome": "Partido",
            "valor": 160,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Psico",
            "valor": 480,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "MEI",
            "valor": 87,
            "pago": false
          },
          {
            "id": "fix_14",
            "nome": "Unimed",
            "valor": 867.72,
            "pago": false
          },
          {
            "id": "fix_15",
            "nome": "Consignado",
            "valor": 1881,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_6",
            "nome": "Renda+ 2055",
            "valor": 103,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Tesouro Reserva",
            "valor": 260,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Santander",
            "valor": 50,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Cripto",
            "valor": 10,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Alberto",
            "valor": 250,
            "pago": true
          },
          {
            "id": "out_13",
            "nome": "Nubank",
            "valor": 150,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Edna",
            "valor": 600,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5557.91,
          "VA": 2050,
          "VR": 1365,
          "Gace": 0,
          "Subtotal Ganhos": 5557.91,
          "Total Gastos Fixos": 5221.81,
          "Total Outros Gastos": 1423,
          "Subtotal Gastos": 6644.81,
          "Ganhos - Gastos": -1086.9,
          "Investimentos": 423,
          "Ideal": 1667.373
        },
        "scarlet": {
          "gastos": [],
          "ganhos": 0,
          "faturaNubank": 0
        }
      },
      "Maio": {
        "fixos": [
          {
            "id": "fix_3",
            "nome": "Parcela casa",
            "valor": 1329.14,
            "pago": false
          },
          {
            "id": "fix_4",
            "nome": "Água",
            "valor": 31,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 160,
            "pago": false
          },
          {
            "id": "fix_6",
            "nome": "Internet",
            "valor": 99.9,
            "pago": false
          },
          {
            "id": "fix_7",
            "nome": "Dentista",
            "valor": 113.06,
            "pago": false
          },
          {
            "id": "fix_8",
            "nome": "Spotify",
            "valor": 12.99,
            "pago": false
          },
          {
            "id": "fix_10",
            "nome": "Partido",
            "valor": 160,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Psico",
            "valor": 480,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "MEI",
            "valor": 87,
            "pago": false
          },
          {
            "id": "fix_14",
            "nome": "Unimed",
            "valor": 867.72,
            "pago": false
          },
          {
            "id": "fix_15",
            "nome": "Consignado",
            "valor": 1881,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_6",
            "nome": "Renda+ 2055",
            "valor": 103,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Tesouro Reserva",
            "valor": 260,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Santander",
            "valor": 50,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Cripto",
            "valor": 10,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Alberto",
            "valor": 250,
            "pago": true
          },
          {
            "id": "out_13",
            "nome": "Nubank",
            "valor": 150,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Edna",
            "valor": 600,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5557.91,
          "VA": 2050,
          "VR": 1365,
          "Gace": 0,
          "Subtotal Ganhos": 5557.91,
          "Total Gastos Fixos": 5221.81,
          "Total Outros Gastos": 1423,
          "Subtotal Gastos": 6644.81,
          "Ganhos - Gastos": -1086.9,
          "Investimentos": 423,
          "Ideal": 1667.373
        },
        "scarlet": {
          "gastos": [],
          "ganhos": 0,
          "faturaNubank": 0
        }
      },
      "Junho": {
        "fixos": [
          {
            "id": "fix_3",
            "nome": "Parcela casa",
            "valor": 1329.14,
            "pago": false
          },
          {
            "id": "fix_4",
            "nome": "Água",
            "valor": 31,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 160,
            "pago": false
          },
          {
            "id": "fix_6",
            "nome": "Internet",
            "valor": 99.9,
            "pago": false
          },
          {
            "id": "fix_7",
            "nome": "Dentista",
            "valor": 113.06,
            "pago": false
          },
          {
            "id": "fix_8",
            "nome": "Spotify",
            "valor": 12.99,
            "pago": false
          },
          {
            "id": "fix_9",
            "nome": "IPTU",
            "valor": 91.35,
            "pago": false
          },
          {
            "id": "fix_10",
            "nome": "Partido",
            "valor": 160,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Psico",
            "valor": 480,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "MEI",
            "valor": 87,
            "pago": false
          },
          {
            "id": "fix_14",
            "nome": "Unimed",
            "valor": 867.72,
            "pago": false
          },
          {
            "id": "fix_15",
            "nome": "Consignado",
            "valor": 1881,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_6",
            "nome": "Renda+ 2055",
            "valor": 103,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Tesouro Reserva",
            "valor": 260,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Santander",
            "valor": 50,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Cripto",
            "valor": 10,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Alberto",
            "valor": 250,
            "pago": true
          },
          {
            "id": "out_13",
            "nome": "Nubank",
            "valor": 150,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Edna",
            "valor": 600,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5557.91,
          "VA": 2050,
          "VR": 1365,
          "Gace": 0,
          "Subtotal Ganhos": 5557.91,
          "Total Gastos Fixos": 5313.16,
          "Total Outros Gastos": 1423,
          "Subtotal Gastos": 6736.16,
          "Ganhos - Gastos": -1178.25,
          "Investimentos": 423,
          "Ideal": 1667.373
        },
        "scarlet": {
          "gastos": [],
          "ganhos": 0,
          "faturaNubank": 0
        }
      },
      "Julho": {
        "fixos": [
          {
            "id": "fix_3",
            "nome": "Parcela casa",
            "valor": 1329.14,
            "pago": false
          },
          {
            "id": "fix_4",
            "nome": "Água",
            "valor": 31,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 160,
            "pago": false
          },
          {
            "id": "fix_6",
            "nome": "Internet",
            "valor": 99.9,
            "pago": false
          },
          {
            "id": "fix_7",
            "nome": "Dentista",
            "valor": 113.06,
            "pago": false
          },
          {
            "id": "fix_8",
            "nome": "Spotify",
            "valor": 12.99,
            "pago": false
          },
          {
            "id": "fix_9",
            "nome": "IPTU",
            "valor": 91.35,
            "pago": false
          },
          {
            "id": "fix_10",
            "nome": "Partido",
            "valor": 160,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Psico",
            "valor": 480,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "MEI",
            "valor": 87,
            "pago": false
          },
          {
            "id": "fix_14",
            "nome": "Unimed",
            "valor": 867.72,
            "pago": false
          },
          {
            "id": "fix_15",
            "nome": "Consignado",
            "valor": 1881,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_6",
            "nome": "Renda+ 2055",
            "valor": 103,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Tesouro Reserva",
            "valor": 260,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Santander",
            "valor": 50,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Cripto",
            "valor": 10,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Alberto",
            "valor": 250,
            "pago": true
          },
          {
            "id": "out_13",
            "nome": "Nubank",
            "valor": 150,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Edna",
            "valor": 600,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5557.91,
          "VA": 2050,
          "VR": 1365,
          "Gace": 0,
          "Subtotal Ganhos": 5557.91,
          "Total Gastos Fixos": 5313.16,
          "Total Outros Gastos": 1423,
          "Subtotal Gastos": 6736.16,
          "Ganhos - Gastos": -1178.25,
          "Investimentos": 423,
          "Ideal": 1667.373
        },
        "scarlet": {
          "gastos": [],
          "ganhos": 0,
          "faturaNubank": 0
        }
      },
      "Agosto": {
        "fixos": [
          {
            "id": "fix_3",
            "nome": "Parcela casa",
            "valor": 1329.14,
            "pago": false
          },
          {
            "id": "fix_4",
            "nome": "Água",
            "valor": 31,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 160,
            "pago": false
          },
          {
            "id": "fix_6",
            "nome": "Internet",
            "valor": 99.9,
            "pago": false
          },
          {
            "id": "fix_7",
            "nome": "Dentista",
            "valor": 113.06,
            "pago": false
          },
          {
            "id": "fix_8",
            "nome": "Spotify",
            "valor": 12.99,
            "pago": false
          },
          {
            "id": "fix_9",
            "nome": "IPTU",
            "valor": 91.35,
            "pago": false
          },
          {
            "id": "fix_10",
            "nome": "Partido",
            "valor": 160,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Psico",
            "valor": 480,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "MEI",
            "valor": 87,
            "pago": false
          },
          {
            "id": "fix_14",
            "nome": "Unimed",
            "valor": 867.72,
            "pago": false
          },
          {
            "id": "fix_15",
            "nome": "Consignado",
            "valor": 1881,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_6",
            "nome": "Renda+ 2055",
            "valor": 103,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Tesouro Reserva",
            "valor": 260,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Santander",
            "valor": 50,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Cripto",
            "valor": 10,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Alberto",
            "valor": 250,
            "pago": true
          },
          {
            "id": "out_13",
            "nome": "Nubank",
            "valor": 150,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Edna",
            "valor": 600,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5557.91,
          "VA": 2050,
          "VR": 1365,
          "Gace": 0,
          "Subtotal Ganhos": 5557.91,
          "Total Gastos Fixos": 5313.16,
          "Total Outros Gastos": 1423,
          "Subtotal Gastos": 6736.16,
          "Ganhos - Gastos": -1178.25,
          "Investimentos": 423,
          "Ideal": 1667.373
        },
        "scarlet": {
          "gastos": [],
          "ganhos": 0,
          "faturaNubank": 0
        }
      },
      "Setembro": {
        "fixos": [
          {
            "id": "fix_3",
            "nome": "Parcela casa",
            "valor": 1329.14,
            "pago": false
          },
          {
            "id": "fix_4",
            "nome": "Água",
            "valor": 31,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 160,
            "pago": false
          },
          {
            "id": "fix_6",
            "nome": "Internet",
            "valor": 99.9,
            "pago": false
          },
          {
            "id": "fix_7",
            "nome": "Dentista",
            "valor": 113.06,
            "pago": false
          },
          {
            "id": "fix_8",
            "nome": "Spotify",
            "valor": 12.99,
            "pago": false
          },
          {
            "id": "fix_9",
            "nome": "IPTU",
            "valor": 91.35,
            "pago": false
          },
          {
            "id": "fix_10",
            "nome": "Partido",
            "valor": 160,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Psico",
            "valor": 480,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "MEI",
            "valor": 87,
            "pago": false
          },
          {
            "id": "fix_14",
            "nome": "Unimed",
            "valor": 867.72,
            "pago": false
          },
          {
            "id": "fix_15",
            "nome": "Consignado",
            "valor": 1881,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_6",
            "nome": "Renda+ 2055",
            "valor": 103,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Tesouro Reserva",
            "valor": 260,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Santander",
            "valor": 100,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Cripto",
            "valor": 10,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Alberto",
            "valor": 250,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Edna",
            "valor": 600,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5557.91,
          "VA": 2050,
          "VR": 1365,
          "Gace": 0,
          "Subtotal Ganhos": 5557.91,
          "Total Gastos Fixos": 5313.16,
          "Total Outros Gastos": 1323,
          "Subtotal Gastos": 6636.16,
          "Ganhos - Gastos": -1078.25,
          "Investimentos": 473,
          "Ideal": 1667.373
        },
        "scarlet": {
          "gastos": [],
          "ganhos": 0,
          "faturaNubank": 0
        }
      },
      "Outubro": {
        "fixos": [
          {
            "id": "fix_3",
            "nome": "Parcela casa",
            "valor": 1329.14,
            "pago": false
          },
          {
            "id": "fix_4",
            "nome": "Água",
            "valor": 31,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 160,
            "pago": false
          },
          {
            "id": "fix_6",
            "nome": "Internet",
            "valor": 99.9,
            "pago": false
          },
          {
            "id": "fix_7",
            "nome": "Dentista",
            "valor": 113.06,
            "pago": false
          },
          {
            "id": "fix_8",
            "nome": "Spotify",
            "valor": 12.99,
            "pago": false
          },
          {
            "id": "fix_9",
            "nome": "IPTU",
            "valor": 91.35,
            "pago": false
          },
          {
            "id": "fix_10",
            "nome": "Partido",
            "valor": 160,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Psico",
            "valor": 480,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "MEI",
            "valor": 87,
            "pago": false
          },
          {
            "id": "fix_14",
            "nome": "Unimed",
            "valor": 867.72,
            "pago": false
          },
          {
            "id": "fix_15",
            "nome": "Consignado",
            "valor": 1881,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_6",
            "nome": "Renda+ 2055",
            "valor": 103,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Tesouro Reserva",
            "valor": 260,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Santander",
            "valor": 50,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Cripto",
            "valor": 10,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Alberto",
            "valor": 250,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Edna",
            "valor": 600,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5557.91,
          "VA": 2050,
          "VR": 1365,
          "Gace": 0,
          "Subtotal Ganhos": 5557.91,
          "Total Gastos Fixos": 5313.16,
          "Total Outros Gastos": 1273,
          "Subtotal Gastos": 6586.16,
          "Ganhos - Gastos": -1028.25,
          "Investimentos": 423,
          "Ideal": 1667.373
        },
        "scarlet": {
          "gastos": [],
          "ganhos": 0,
          "faturaNubank": 0
        }
      },
      "Novembro": {
        "fixos": [
          {
            "id": "fix_3",
            "nome": "Parcela casa",
            "valor": 1329.14,
            "pago": false
          },
          {
            "id": "fix_4",
            "nome": "Água",
            "valor": 31,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 160,
            "pago": false
          },
          {
            "id": "fix_6",
            "nome": "Internet",
            "valor": 99.9,
            "pago": false
          },
          {
            "id": "fix_7",
            "nome": "Dentista",
            "valor": 113.06,
            "pago": false
          },
          {
            "id": "fix_8",
            "nome": "Spotify",
            "valor": 12.99,
            "pago": false
          },
          {
            "id": "fix_9",
            "nome": "IPTU",
            "valor": 91.35,
            "pago": false
          },
          {
            "id": "fix_10",
            "nome": "Partido",
            "valor": 160,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Psico",
            "valor": 480,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "MEI",
            "valor": 87,
            "pago": false
          },
          {
            "id": "fix_14",
            "nome": "Unimed",
            "valor": 867.72,
            "pago": false
          },
          {
            "id": "fix_15",
            "nome": "Consignado",
            "valor": 1881,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_6",
            "nome": "Renda+ 2055",
            "valor": 103,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Tesouro Reserva",
            "valor": 260,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Santander",
            "valor": 50,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Cripto",
            "valor": 10,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Alberto",
            "valor": 250,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Edna",
            "valor": 600,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5557.91,
          "13º": 3132,
          "VA": 2050,
          "VR": 1365,
          "Gace": 0,
          "Subtotal Ganhos": 8689.91,
          "Total Gastos Fixos": 5313.16,
          "Total Outros Gastos": 1273,
          "Subtotal Gastos": 6586.16,
          "Ganhos - Gastos": 2103.75,
          "Investimentos": 423,
          "Ideal": 1667.373
        },
        "scarlet": {
          "gastos": [],
          "ganhos": 0,
          "faturaNubank": 0
        }
      },
      "Dezembro": {
        "fixos": [
          {
            "id": "fix_3",
            "nome": "Parcela casa",
            "valor": 1329.14,
            "pago": false
          },
          {
            "id": "fix_4",
            "nome": "Água",
            "valor": 31,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 160,
            "pago": false
          },
          {
            "id": "fix_6",
            "nome": "Internet",
            "valor": 99.9,
            "pago": false
          },
          {
            "id": "fix_7",
            "nome": "Dentista",
            "valor": 113.06,
            "pago": false
          },
          {
            "id": "fix_8",
            "nome": "Spotify",
            "valor": 12.99,
            "pago": false
          },
          {
            "id": "fix_9",
            "nome": "IPTU",
            "valor": 91.35,
            "pago": false
          },
          {
            "id": "fix_10",
            "nome": "Partido",
            "valor": 160,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Psico",
            "valor": 480,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "MEI",
            "valor": 87,
            "pago": false
          },
          {
            "id": "fix_14",
            "nome": "Unimed",
            "valor": 867.72,
            "pago": false
          },
          {
            "id": "fix_15",
            "nome": "Consignado",
            "valor": 1881,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_6",
            "nome": "Renda+ 2055",
            "valor": 103,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Tesouro Reserva",
            "valor": 260,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Santander",
            "valor": 50,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Cripto",
            "valor": 10,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Alberto",
            "valor": 250,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Edna",
            "valor": 600,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5557.91,
          "13º": 2427.3,
          "VA": 2050,
          "VR": 1365,
          "Gace": 0,
          "Subtotal Ganhos": 7985.21,
          "Total Gastos Fixos": 5313.16,
          "Total Outros Gastos": 1273,
          "Subtotal Gastos": 6586.16,
          "Ganhos - Gastos": 1399.05,
          "Investimentos": 423,
          "Ideal": 1667.373
        },
        "scarlet": {
          "gastos": [],
          "ganhos": 0,
          "faturaNubank": 0
        }
      }
    }
  }
};
