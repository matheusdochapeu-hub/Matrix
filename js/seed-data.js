// MATRIX FINANCE - DADOS CONSOLIDADOS SEED (2025-2027)
// Parser de precisao sem duplicacao de totais e com bloco da Scarlet

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
    "vaMensal": 2050.0,
    "vrDiario": 65.0,
    "caronaDiaria": 60.0
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
      "saldo": 0.0,
      "titular": "Matheus",
      "uso": "Recebimento de proventos USP e transferências"
    },
    {
      "id": "inter",
      "nome": "Banco Inter",
      "tipo": "Conta Corrente / Giro",
      "saldo": 250.0,
      "titular": "Matheus",
      "uso": "Pix, barbearia, caronas e pequenos gastos"
    },
    {
      "id": "caixa",
      "nome": "Caixa Econômica",
      "tipo": "Conta Financiamento",
      "saldo": 0.0,
      "titular": "Matheus & Scarlet",
      "uso": "Débito estrito da parcela da casa"
    },
    {
      "id": "santander",
      "nome": "Santander",
      "tipo": "Conta Serviços",
      "saldo": 50.0,
      "titular": "Matheus",
      "uso": "DinDin R$ 50/mês + R$ 50 giro rápido"
    },
    {
      "id": "nubank_matheus",
      "nome": "Nubank (Matheus)",
      "tipo": "Cartão de Crédito",
      "limiteTotal": 2000.0,
      "limiteDisponivel": 266.68,
      "faturaAtual": 220.68,
      "vencimento": "Dia 10",
      "titular": "Matheus"
    },
    {
      "id": "nubank_scarlet",
      "nome": "Nubank Ultravioleta Black",
      "tipo": "Cartão Master da Casa",
      "mensalidade": 89.0,
      "titular": "Scarlet",
      "uso": "Cartão conjunto gerido no App Faturas"
    },
    {
      "id": "mp",
      "nome": "Mercado Pago",
      "tipo": "Conta / Cofrinho",
      "saldo": 0.0,
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
      "saldo": 0.0,
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
      "valorAtual": 2213.80,
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
      "valorAtual": 550.00,
      "vencimento": "2028 (36 meses)",
      "rentabilidadeContratada": "TR + Sorteios Mensais",
      "status": "Aporte automático R$ 50/mês"
    },
    {
      "id": "acoes_csna",
      "ativo": "CSNA3 (Cia Siderúrgica Nacional)",
      "corretora": "XP Investimentos",
      "categoria": "Ações",
      "titular": "Matheus",
      "quantidade": 40,
      "precoMedio": 5.00,
      "precoAtual": 4.10,
      "valorAtual": 164.00,
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
      "precoAtual": 5.30,
      "valorAtual": 726.10,
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
      "valorAtual": 29.00,
      "vencimento": "2028",
      "rentabilidadeContratada": "Proventos",
      "status": "A receber até 2028"
    },
    {
      "id": "reserva_scarlet_nu",
      "ativo": "Reserva de Emergência Scarlet",
      "corretora": "Nubank",
      "categoria": "Reserva de Emergência",
      "titular": "Scarlet",
      "valorAtual": 1250.00,
      "vencimento": "Liquidez Diária",
      "rentabilidadeContratada": "100% CDI (~10,75% a.a.)",
      "status": "Ativo (Caixinha Reserva)"
    },
    {
      "id": "cdb_scarlet_inter",
      "ativo": "CDB Pessoal Scarlet",
      "corretora": "Banco Inter",
      "categoria": "Renda Fixa",
      "titular": "Scarlet",
      "valorAtual": 650.00,
      "vencimento": "2027",
      "rentabilidadeContratada": "102% CDI",
      "status": "Ativo (Aposentadoria / Sonhos)"
    }
  ],
  "holerites": [
    {
      "periodo": "2026-03",
      "orgao": "Ministério Público de São Paulo (MPSP)",
      "cargo": "Oficial de Promotoria I",
      "banco": "Bradesco Ag. 00443 CC 27010-5",
      "vencimentos": 8663.46,
      "descontos": 1729.26,
      "liquido": 6934.2,
      "itens": [
        {
          "cod": "001809",
          "desc": "VENCIMENTO BASICO",
          "tipo": "Vencimento",
          "valor": 2888.68
        },
        {
          "cod": "004820",
          "desc": "GRATIFICACAO DE PROMOTORIA",
          "tipo": "Vencimento",
          "valor": 3553.36
        },
        {
          "cod": "012801",
          "desc": "AUXILIO TRANSPORTE",
          "tipo": "Vencimento",
          "valor": 412.72
        },
        {
          "cod": "012802",
          "desc": "AUXILIO ALIMENTACAO",
          "tipo": "Vencimento",
          "valor": 1450.0
        },
        {
          "cod": "012833",
          "desc": "ASSISTENCIA SAUDE SERVIDORES",
          "tipo": "Vencimento",
          "valor": 358.7
        },
        {
          "cod": "070012",
          "desc": "IMPOSTO DE RENDA NA FONTE",
          "tipo": "Desconto",
          "valor": 521.34
        },
        {
          "cod": "070113",
          "desc": "CONTR PREVID RPPS",
          "tipo": "Desconto",
          "valor": 802.17
        },
        {
          "cod": "070037",
          "desc": "IAMSPE",
          "tipo": "Desconto",
          "valor": 257.68
        }
      ]
    },
    {
      "periodo": "2026-07",
      "orgao": "Universidade de São Paulo (USP)",
      "cargo": "Técnico 1 - Nível A (Admissão 06/07)",
      "banco": "Banco do Brasil Ag. 2211 CC 38154-3",
      "vencimentos": 5428.83,
      "descontos": 736.59,
      "liquido": 4692.24,
      "fgts": 434.3,
      "itens": [
        {
          "cod": "220",
          "desc": "Vencimento (proporcional)",
          "tipo": "Vencimento",
          "valor": 5428.83
        },
        {
          "cod": "339",
          "desc": "Vale Refeição",
          "tipo": "Desconto",
          "valor": 13.65
        },
        {
          "cod": "113",
          "desc": "INSS",
          "tipo": "Desconto",
          "valor": 561.53
        },
        {
          "cod": "108",
          "desc": "Imposto de Renda",
          "tipo": "Desconto",
          "valor": 161.41
        }
      ]
    },
    {
      "periodo": "2026-08",
      "orgao": "Universidade de São Paulo (USP)",
      "cargo": "Técnico 1 - Nível A",
      "banco": "Banco do Brasil Ag. 2211 CC 38154-3",
      "vencimentos": 6264.04,
      "descontos": 1249.16,
      "liquido": 5014.88,
      "fgts": 501.12,
      "itens": [
        {
          "cod": "220",
          "desc": "Vencimento Integral",
          "tipo": "Vencimento",
          "valor": 6264.04
        },
        {
          "cod": "339",
          "desc": "Vale Refeição",
          "tipo": "Desconto",
          "valor": 25.35
        },
        {
          "cod": "197",
          "desc": "Sindicato Trabalhadores da USP",
          "tipo": "Desconto",
          "valor": 62.64
        },
        {
          "cod": "113",
          "desc": "INSS",
          "tipo": "Desconto",
          "valor": 678.46
        },
        {
          "cod": "108",
          "desc": "Imposto de Renda",
          "tipo": "Desconto",
          "valor": 482.71
        }
      ]
    },
    {
      "periodo": "2026-09",
      "orgao": "Universidade de São Paulo (USP)",
      "cargo": "Técnico 1 - Nível A",
      "banco": "Banco do Brasil Ag. 2211 CC 38154-3",
      "vencimentos": 7023.05,
      "descontos": 1236.81,
      "liquido": 5786.24,
      "fgts": 501.12,
      "itens": [
        {
          "cod": "220",
          "desc": "Vencimento",
          "tipo": "Vencimento",
          "valor": 6264.04
        },
        {
          "cod": "709",
          "desc": "Auxílio-Saúde USP",
          "tipo": "Vencimento",
          "valor": 759.01
        },
        {
          "cod": "339",
          "desc": "Vale Refeição",
          "tipo": "Desconto",
          "valor": 13.0
        },
        {
          "cod": "197",
          "desc": "Sindicato Trabalhadores da USP",
          "tipo": "Desconto",
          "valor": 62.64
        },
        {
          "cod": "113",
          "desc": "INSS",
          "tipo": "Desconto",
          "valor": 678.46
        },
        {
          "cod": "108",
          "desc": "Imposto de Renda",
          "tipo": "Desconto",
          "valor": 482.71
        }
      ]
    },
    {
      "periodo": "2026-10",
      "orgao": "Universidade de São Paulo (USP)",
      "cargo": "Técnico 1 - Nível A",
      "banco": "Banco do Brasil Ag. 2211 CC 38154-3",
      "vencimentos": 7023.05,
      "descontos": 1234.86,
      "liquido": 5788.19,
      "fgts": 501.12,
      "itens": [
        {
          "cod": "220",
          "desc": "Vencimento",
          "tipo": "Vencimento",
          "valor": 6264.04
        },
        {
          "cod": "709",
          "desc": "Auxílio-Saúde USP",
          "tipo": "Vencimento",
          "valor": 759.01
        },
        {
          "cod": "339",
          "desc": "Vale Refeição",
          "tipo": "Desconto",
          "valor": 11.05
        },
        {
          "cod": "197",
          "desc": "Sindicato Trabalhadores da USP",
          "tipo": "Desconto",
          "valor": 62.64
        },
        {
          "cod": "113",
          "desc": "INSS",
          "tipo": "Desconto",
          "valor": 678.46
        },
        {
          "cod": "108",
          "desc": "Imposto de Renda",
          "tipo": "Desconto",
          "valor": 482.71
        }
      ]
    }
  ],
  "previsaoDecimoTerceiro2026": {
    "parcela1": {
      "data": "2026-11-30",
      "valorEstimado": 1566.0,
      "descricao": "1ª Parcela 13º Salário USP (50% proporcional 6/12)"
    },
    "parcela2": {
      "data": "2026-12-20",
      "valorEstimado": 1280.0,
      "descricao": "2ª Parcela 13º Salário USP (com retenções de INSS e IR)"
    }
  },
  "simulacoesAtivas": [
    {
      "id": "sim_seguro_scarlet",
      "titulo": "Seguro de Vida Scarlet",
      "categoria": "Proteção / Saúde",
      "valorMensalMin": 100.0,
      "valorMensalMax": 150.0,
      "valorAdotado": 125.0,
      "inicio": "2026-12",
      "impactoAnual": 1500.0,
      "ativo": true,
      "observacao": "Cotação em andamento entre R$ 100 e R$ 150"
    }
  ],
  "anos": {
    "2025": {
      "Maio": {
        "fixos": [
          {
            "id": "fix_3",
            "nome": "Parcela casa",
            "valor": 2565.8,
            "pago": false
          },
          {
            "id": "fix_4",
            "nome": "Água",
            "valor": 31.0,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 132.98,
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
            "valor": 107.32,
            "pago": false
          },
          {
            "id": "fix_8",
            "nome": "Spotify",
            "valor": 11.99,
            "pago": false
          },
          {
            "id": "fix_9",
            "nome": "IPTU",
            "valor": 87.42,
            "pago": false
          },
          {
            "id": "fix_10",
            "nome": "Partido",
            "valor": 100.0,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Onibus",
            "valor": 360.0,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "Ração fórum",
            "valor": 30.0,
            "pago": false
          },
          {
            "id": "fix_17",
            "nome": "Trabalho",
            "valor": 400.0,
            "pago": false
          },
          {
            "id": "fix_18",
            "nome": "Mercado",
            "valor": 1050.14,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_3",
            "nome": "Dívida Santander",
            "valor": 281.48,
            "pago": true
          },
          {
            "id": "out_4",
            "nome": "Dívida RNX",
            "valor": 480.8,
            "pago": true
          },
          {
            "id": "out_5",
            "nome": "Dívida Mercado Pago",
            "valor": 383.97,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Multa",
            "valor": 293.47,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Investimentos",
            "valor": 150.0,
            "pago": true
          },
          {
            "id": "out_13",
            "nome": "Salário Mensal",
            "valor": 6630.56,
            "pago": false
          },
          {
            "id": "out_14",
            "nome": "Total Gastos Fixos",
            "valor": 3526.41,
            "pago": false
          },
          {
            "id": "out_15",
            "nome": "Total Gastos Variáveis",
            "valor": 1450.14,
            "pago": false
          },
          {
            "id": "out_16",
            "nome": "Total Outros Gastos",
            "valor": 1472.332,
            "pago": false
          },
          {
            "id": "out_17",
            "nome": "Saldo Final",
            "valor": 181.678,
            "pago": false
          }
        ],
        "totais": {},
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
            "valor": 1314.51,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 113.15,
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
            "valor": 107.32,
            "pago": false
          },
          {
            "id": "fix_8",
            "nome": "Spotify",
            "valor": 11.99,
            "pago": false
          },
          {
            "id": "fix_9",
            "nome": "IPTU",
            "valor": 87.42,
            "pago": false
          },
          {
            "id": "fix_10",
            "nome": "Partido",
            "valor": 100.0,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Onibus",
            "valor": 200.0,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "Ração fórum",
            "valor": 30.0,
            "pago": false
          },
          {
            "id": "fix_17",
            "nome": "Mercado",
            "valor": 1500.0,
            "pago": false
          },
          {
            "id": "fix_18",
            "nome": "Subtotal",
            "valor": 1500.0,
            "pago": false
          }
        ],
        "outros": [],
        "totais": {},
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
            "valor": 1450.0,
            "pago": false
          },
          {
            "id": "fix_4",
            "nome": "Água",
            "valor": 30.84,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 121.4,
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
            "valor": 107.32,
            "pago": false
          },
          {
            "id": "fix_8",
            "nome": "Spotify",
            "valor": 11.99,
            "pago": false
          },
          {
            "id": "fix_9",
            "nome": "IPTU",
            "valor": 87.42,
            "pago": false
          },
          {
            "id": "fix_10",
            "nome": "Partido",
            "valor": 100.0,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Onibus",
            "valor": 306.0,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "Ração fórum",
            "valor": 30.0,
            "pago": false
          },
          {
            "id": "fix_13",
            "nome": "Psico",
            "valor": 360.0,
            "pago": false
          },
          {
            "id": "fix_14",
            "nome": "Seguro Casa 02/12",
            "valor": 47.0,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_3",
            "nome": "Dívida Santander",
            "valor": 281.48,
            "pago": true
          },
          {
            "id": "out_4",
            "nome": "Dívida Maria",
            "valor": 1200.0,
            "pago": true
          },
          {
            "id": "out_5",
            "nome": "Edna",
            "valor": 500.0,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Préfix 2035",
            "valor": 65.9,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Renda+ 2055",
            "valor": 57.11,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "CDB",
            "valor": 320.0,
            "pago": true
          },
          {
            "id": "out_10",
            "nome": "Clear",
            "valor": 25.0,
            "pago": true
          },
          {
            "id": "out_11",
            "nome": "Inss Maria",
            "valor": 303.0,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "IR - Pai",
            "valor": 277.0,
            "pago": false
          },
          {
            "id": "out_13",
            "nome": "Multa",
            "valor": 195.23,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Notebook",
            "valor": 500.0,
            "pago": false
          },
          {
            "id": "out_15",
            "nome": "Dívida RNX",
            "valor": 480.8,
            "pago": true
          },
          {
            "id": "out_16",
            "nome": "Dívida Mercado Pago",
            "valor": 383.97,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5897.4,
          "13°": 2506.884081,
          "Total Gastos Fixos": 2751.87,
          "Total Gastos Variáveis": 2671.72,
          "Total Outros Gastos": 2908.674,
          "Saldo Final": 72.02008117
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
            "valor": 1291.03,
            "pago": false
          },
          {
            "id": "fix_4",
            "nome": "Água",
            "valor": 30.48,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 133.79,
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
            "valor": 11.99,
            "pago": false
          },
          {
            "id": "fix_9",
            "nome": "IPTU",
            "valor": 87.42,
            "pago": false
          },
          {
            "id": "fix_10",
            "nome": "Partido",
            "valor": 70.0,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Onibus",
            "valor": 363.0,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "Ração fórum",
            "valor": 30.0,
            "pago": false
          },
          {
            "id": "fix_13",
            "nome": "Psico",
            "valor": 360.0,
            "pago": false
          },
          {
            "id": "fix_14",
            "nome": "Seguro Casa 03/12",
            "valor": 47.0,
            "pago": false
          }
        ],
        "outros": [],
        "totais": {},
        "scarlet": {
          "gastos": [],
          "ganhos": 0,
          "faturaNubank": 0
        }
      },
      "Setembro": {
        "fixos": [
          {
            "id": "fix_4",
            "nome": "Água",
            "valor": 35.85,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 109.7,
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
            "valor": 87.42,
            "pago": false
          },
          {
            "id": "fix_10",
            "nome": "Partido",
            "valor": 70.0,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Onibus",
            "valor": 346.5,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "Ração fórum",
            "valor": 30.0,
            "pago": false
          },
          {
            "id": "fix_13",
            "nome": "Psico",
            "valor": 600.0,
            "pago": false
          },
          {
            "id": "fix_14",
            "nome": "Seguro Casa 04/12",
            "valor": 50.0,
            "pago": false
          },
          {
            "id": "fix_15",
            "nome": "Aluguel AP - Sheila",
            "valor": 2000.0,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_3",
            "nome": "Dívida Santander",
            "valor": 281.48,
            "pago": true
          },
          {
            "id": "out_4",
            "nome": "Dívida Maria",
            "valor": 1400.0,
            "pago": true
          },
          {
            "id": "out_5",
            "nome": "Edna",
            "valor": 500.0,
            "pago": false
          },
          {
            "id": "out_7",
            "nome": "Préfix 2035",
            "valor": 58.8,
            "pago": false
          },
          {
            "id": "out_8",
            "nome": "Renda+ 2055",
            "valor": 57.56,
            "pago": false
          },
          {
            "id": "out_9",
            "nome": "CDB",
            "valor": 20.0,
            "pago": false
          },
          {
            "id": "out_10",
            "nome": "Clear",
            "valor": 25.0,
            "pago": false
          },
          {
            "id": "out_11",
            "nome": "Multa",
            "valor": 195.23,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5927.03,
          "Total Gastos Fixos": 3555.42,
          "Total Gastos Variáveis": 0.0,
          "Total Outros Gastos": 1798.618,
          "Saldo Final": 572.992,
          "Fixos + Outros": 5354.038,
          "VARIAVEIS": "Valor",
          "Scarlet": 0.0,
          "Trabalho": 0.0
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
            "valor": 250.0,
            "pago": false
          },
          {
            "id": "fix_4",
            "nome": "Água",
            "valor": 74.41,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 76.57,
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
            "valor": 87.42,
            "pago": false
          },
          {
            "id": "fix_10",
            "nome": "Partido",
            "valor": 70.0,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Onibus",
            "valor": 363.0,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "Ração fórum",
            "valor": 30.0,
            "pago": false
          },
          {
            "id": "fix_13",
            "nome": "Psico",
            "valor": 480.0,
            "pago": false
          },
          {
            "id": "fix_14",
            "nome": "Seguro Casa 05/12",
            "valor": 50.0,
            "pago": false
          },
          {
            "id": "fix_16",
            "nome": "Psico Scarlet",
            "valor": 2500.0,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_3",
            "nome": "Dívida Santander",
            "valor": 281.48,
            "pago": true
          },
          {
            "id": "out_4",
            "nome": "Dívida Maria",
            "valor": 1200.0,
            "pago": true
          },
          {
            "id": "out_5",
            "nome": "Edna",
            "valor": 500.0,
            "pago": false
          },
          {
            "id": "out_7",
            "nome": "Préfix 2035",
            "valor": 58.8,
            "pago": false
          },
          {
            "id": "out_8",
            "nome": "Renda+ 2055",
            "valor": 57.56,
            "pago": false
          },
          {
            "id": "out_9",
            "nome": "CDB",
            "valor": 20.0,
            "pago": false
          },
          {
            "id": "out_10",
            "nome": "Clear",
            "valor": 10.0,
            "pago": false
          },
          {
            "id": "out_11",
            "nome": "Licenciamento Moto",
            "valor": 167.64,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Multa",
            "valor": 78.1,
            "pago": true
          },
          {
            "id": "out_13",
            "nome": "Advogada",
            "valor": 150.0,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5749.01,
          "Total Gastos Fixos": 4207.35,
          "Total Gastos Variáveis": 0.0,
          "Total Outros Gastos": 1677.22,
          "Saldo Final": -135.56,
          "Fixos + Outros": 5884.57,
          "VARIAVEIS": "Valor",
          "Scarlet": 0.0,
          "Trabalho": 0.0
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
            "id": "fix_4",
            "nome": "Água",
            "valor": 31.0,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 160.0,
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
            "valor": 70.0,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Onibus",
            "valor": 330.0,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "Ração fórum",
            "valor": 30.0,
            "pago": false
          },
          {
            "id": "fix_13",
            "nome": "Psico",
            "valor": 480.0,
            "pago": false
          },
          {
            "id": "fix_14",
            "nome": "Seguro Casa 06/12",
            "valor": 47.0,
            "pago": false
          },
          {
            "id": "fix_15",
            "nome": "Aluguel AP - Sheila",
            "valor": 2000.0,
            "pago": false
          },
          {
            "id": "fix_16",
            "nome": "Psico Scarlet",
            "valor": 500.0,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_3",
            "nome": "Dívida Santander",
            "valor": 281.48,
            "pago": true
          },
          {
            "id": "out_4",
            "nome": "Dívida Maria",
            "valor": 1200.0,
            "pago": true
          },
          {
            "id": "out_5",
            "nome": "Edna",
            "valor": 500.0,
            "pago": false
          },
          {
            "id": "out_7",
            "nome": "Préfix 2035",
            "valor": 58.8,
            "pago": false
          },
          {
            "id": "out_8",
            "nome": "Renda+ 2055",
            "valor": 57.56,
            "pago": false
          },
          {
            "id": "out_9",
            "nome": "CDB",
            "valor": 20.0,
            "pago": false
          },
          {
            "id": "out_10",
            "nome": "Clear",
            "valor": 10.0,
            "pago": false
          },
          {
            "id": "out_11",
            "nome": "IR 07/08",
            "valor": 274.49,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Advogada",
            "valor": 150.0,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5779.2,
          "Total Gastos Fixos": 3873.95,
          "Total Gastos Variáveis": 0.0,
          "Total Outros Gastos": 1705.97,
          "Saldo Final": 199.28,
          "Fixos + Outros": 5579.92,
          "VARIAVEIS": "Valor",
          "Scarlet": 0.0,
          "Trabalho": 0.0
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
            "id": "fix_4",
            "nome": "Água",
            "valor": 31.0,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 160.0,
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
            "valor": 70.0,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Onibus",
            "valor": 181.5,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "Ração fórum",
            "valor": 30.0,
            "pago": false
          },
          {
            "id": "fix_13",
            "nome": "Psico",
            "valor": 480.0,
            "pago": false
          },
          {
            "id": "fix_14",
            "nome": "Seguro Casa 07/12",
            "valor": 47.0,
            "pago": false
          },
          {
            "id": "fix_15",
            "nome": "Psico Scarlet",
            "valor": 500.0,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_3",
            "nome": "Dívida Santander",
            "valor": 281.48,
            "pago": true
          },
          {
            "id": "out_4",
            "nome": "Edna",
            "valor": 500.0,
            "pago": false
          },
          {
            "id": "out_5",
            "nome": "Selic",
            "valor": 165.61,
            "pago": false
          },
          {
            "id": "out_6",
            "nome": "Préfix 2035",
            "valor": 58.8,
            "pago": false
          },
          {
            "id": "out_7",
            "nome": "Renda+ 2055",
            "valor": 57.56,
            "pago": false
          },
          {
            "id": "out_8",
            "nome": "CDB",
            "valor": 20.0,
            "pago": false
          },
          {
            "id": "out_9",
            "nome": "Clear",
            "valor": 25.0,
            "pago": false
          },
          {
            "id": "out_10",
            "nome": "Dívida Maria",
            "valor": 800.0,
            "pago": true
          },
          {
            "id": "out_11",
            "nome": "IR 08/08",
            "valor": 274.49,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5690.2,
          "13°": 1865.112882,
          "Total Gastos Fixos": 1725.45,
          "Total Gastos Variáveis": 0.0,
          "Total Outros Gastos": 1555.97,
          "Saldo Final": 4273.892882,
          "Fixos + Outros": 3281.42,
          "VARIAVEIS": "Valor",
          "Scarlet": 0.0,
          "Trabalho": 0.0
        },
        "scarlet": {
          "gastos": [],
          "ganhos": 0,
          "faturaNubank": 0
        }
      }
    },
    "2026": {
      "Janeiro": {
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
            "valor": 35.85,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 119.55,
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
            "valor": 100.0,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Onibus",
            "valor": 263.0,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "Ração fórum",
            "valor": 30.0,
            "pago": false
          },
          {
            "id": "fix_13",
            "nome": "Psico",
            "valor": 480.0,
            "pago": false
          },
          {
            "id": "fix_14",
            "nome": "Seguro Casa 09/12",
            "valor": 50.0,
            "pago": false
          },
          {
            "id": "fix_15",
            "nome": "Psico Scarlet",
            "valor": 500.0,
            "pago": false
          },
          {
            "id": "fix_16",
            "nome": "Gasolina Mês",
            "valor": 750.0,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_3",
            "nome": "Alberto",
            "valor": 30.0,
            "pago": true
          },
          {
            "id": "out_4",
            "nome": "Cesar",
            "valor": 150.0,
            "pago": true
          },
          {
            "id": "out_5",
            "nome": "Roupas",
            "valor": 60.0,
            "pago": true
          },
          {
            "id": "out_6",
            "nome": "Viagem",
            "valor": 60.0,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Presentes",
            "valor": 60.0,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Edna",
            "valor": 500.0,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Renda+ 2055",
            "valor": 60.0,
            "pago": true
          },
          {
            "id": "out_10",
            "nome": "Clear",
            "valor": 60.0,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 6867.99,
          "13°": 0.0,
          "Total Gastos Fixos": 3974.84,
          "Total Gastos Variáveis": 0.0,
          "Total Outros Gastos": 1160.0,
          "Saldo Final": 1733.15,
          "Fixos + Outros": 5134.84,
          "VARIAVEIS": "Valor",
          "Scarlet": 0.0,
          "Trabalho": 0.0
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
            "valor": 1352.06,
            "pago": false
          },
          {
            "id": "fix_4",
            "nome": "Água",
            "valor": 30.48,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 114.1,
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
            "valor": 100.0,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Onibus",
            "valor": 215.0,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "Ração fórum",
            "valor": 30.0,
            "pago": false
          },
          {
            "id": "fix_13",
            "nome": "Psico",
            "valor": 480.0,
            "pago": false
          },
          {
            "id": "fix_14",
            "nome": "Seguro Casa 10/12",
            "valor": 47.0,
            "pago": false
          },
          {
            "id": "fix_15",
            "nome": "Psico Scarlet",
            "valor": 500.0,
            "pago": false
          },
          {
            "id": "fix_16",
            "nome": "Gasolina Mês",
            "valor": 650.0,
            "pago": false
          },
          {
            "id": "fix_17",
            "nome": "MEI",
            "valor": 86.05,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_3",
            "nome": "Alberto",
            "valor": 30.0,
            "pago": true
          },
          {
            "id": "out_4",
            "nome": "Cesar",
            "valor": 150.0,
            "pago": true
          },
          {
            "id": "out_5",
            "nome": "Roupas",
            "valor": 60.0,
            "pago": true
          },
          {
            "id": "out_6",
            "nome": "Viagem",
            "valor": 60.0,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Presentes",
            "valor": 60.0,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Edna",
            "valor": 500.0,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Renda+ 2055",
            "valor": 60.0,
            "pago": true
          },
          {
            "id": "out_10",
            "nome": "Clear",
            "valor": 100.0,
            "pago": true
          },
          {
            "id": "out_11",
            "nome": "Google One",
            "valor": 149.9,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Morrys",
            "valor": 1200.0,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 6941.63,
          "Total Gastos Fixos": 3921.99,
          "Total Gastos Variáveis": 0.0,
          "Total Outros Gastos": 2549.9,
          "Saldo Final": 469.74,
          "Fixos + Outros": 6471.89,
          "VARIAVEIS": "Valor",
          "Scarlet": 0.0,
          "Trabalho": 0.0
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
            "valor": 1353.67,
            "pago": false
          },
          {
            "id": "fix_4",
            "nome": "Água",
            "valor": 30.48,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 122.51,
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
            "valor": 100.0,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Onibus",
            "valor": 180.0,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "Ração fórum",
            "valor": 30.0,
            "pago": false
          },
          {
            "id": "fix_13",
            "nome": "Psico",
            "valor": 480.0,
            "pago": false
          },
          {
            "id": "fix_14",
            "nome": "Seguro Casa 11/12",
            "valor": 50.0,
            "pago": false
          },
          {
            "id": "fix_16",
            "nome": "Gasolina Mês",
            "valor": 650.0,
            "pago": false
          },
          {
            "id": "fix_17",
            "nome": "MEI",
            "valor": 87.0,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_3",
            "nome": "Alberto",
            "valor": 30.0,
            "pago": true
          },
          {
            "id": "out_4",
            "nome": "Cesar",
            "valor": 150.0,
            "pago": true
          },
          {
            "id": "out_5",
            "nome": "Roupas",
            "valor": 60.0,
            "pago": true
          },
          {
            "id": "out_6",
            "nome": "Viagem",
            "valor": 60.0,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Presentes",
            "valor": 60.0,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Edna",
            "valor": 500.0,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Renda+ 2055",
            "valor": 60.0,
            "pago": true
          },
          {
            "id": "out_11",
            "nome": "Strava",
            "valor": 149.9,
            "pago": true
          },
          {
            "id": "out_13",
            "nome": "Nubank",
            "valor": 202.0,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Multa",
            "valor": 130.0,
            "pago": true
          },
          {
            "id": "out_15",
            "nome": "Auro Marmores",
            "valor": 300.0,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 6977.23,
          "Total Gastos Fixos": 3400.96,
          "Total Gastos Variáveis": 0.0,
          "Total Outros Gastos": 1889.9,
          "Saldo Final": 1686.37,
          "Fixos + Outros": 5290.86,
          "VARIAVEIS": "Valor",
          "Scarlet": 0.0,
          "Trabalho": 0.0
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
            "valor": 1526.76,
            "pago": false
          },
          {
            "id": "fix_4",
            "nome": "Água",
            "valor": 30.84,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 129.97,
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
            "valor": 100.0,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Onibus",
            "valor": 150.0,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "Ração fórum",
            "valor": 30.0,
            "pago": false
          },
          {
            "id": "fix_13",
            "nome": "Psico",
            "valor": 480.0,
            "pago": false
          },
          {
            "id": "fix_14",
            "nome": "Seguro Casa 12/12",
            "valor": 50.0,
            "pago": false
          },
          {
            "id": "fix_15",
            "nome": "MEI",
            "valor": 87.0,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_3",
            "nome": "Alberto",
            "valor": 55.0,
            "pago": true
          },
          {
            "id": "out_4",
            "nome": "Cesar",
            "valor": 150.0,
            "pago": true
          },
          {
            "id": "out_5",
            "nome": "Roupas",
            "valor": 60.0,
            "pago": true
          },
          {
            "id": "out_6",
            "nome": "Viagem",
            "valor": 60.0,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Presentes",
            "valor": 60.0,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Edna",
            "valor": 500.0,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Renda+ 2055",
            "valor": 102.59,
            "pago": true
          },
          {
            "id": "out_11",
            "nome": "Carro Doc licenciamento",
            "valor": 295.83,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Cofrinho ML a repor",
            "valor": 1100.0,
            "pago": true
          },
          {
            "id": "out_13",
            "nome": "Nubank 03/10",
            "valor": 131.29,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Nubank Scarlet",
            "valor": 3203.4,
            "pago": true
          },
          {
            "id": "out_15",
            "nome": "C6 viagem",
            "valor": 210.0,
            "pago": true
          },
          {
            "id": "out_16",
            "nome": "Certidões de nascimento",
            "valor": 149.76,
            "pago": true
          },
          {
            "id": "out_17",
            "nome": "Multa Carro",
            "valor": 78.09,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 6934.2,
          "Total Fixos": 2901.87,
          "Total Variáveis": -3110.0,
          "Total Outros Gastos": 6335.96,
          "Saldo Final": 806.37,
          "Fixos + Outros": 9237.83,
          "VARIAVEIS": "Valor",
          "Estúdio": -600.0,
          "Venda Ações Clear": -2510.0
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
            "valor": 1558.15,
            "pago": false
          },
          {
            "id": "fix_4",
            "nome": "Água",
            "valor": 30.48,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 116.61,
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
            "valor": 100.0,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Onibus",
            "valor": 250.0,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "Ração fórum",
            "valor": 30.0,
            "pago": false
          },
          {
            "id": "fix_13",
            "nome": "Psico",
            "valor": 360.0,
            "pago": false
          },
          {
            "id": "fix_15",
            "nome": "MEI",
            "valor": 87.0,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_3",
            "nome": "Alberto",
            "valor": 30.0,
            "pago": true
          },
          {
            "id": "out_4",
            "nome": "Cesar",
            "valor": 150.0,
            "pago": true
          },
          {
            "id": "out_5",
            "nome": "Roupas",
            "valor": 60.0,
            "pago": false
          },
          {
            "id": "out_6",
            "nome": "Viagem",
            "valor": 60.0,
            "pago": false
          },
          {
            "id": "out_7",
            "nome": "Presentes",
            "valor": 60.0,
            "pago": false
          },
          {
            "id": "out_8",
            "nome": "Edna",
            "valor": 500.0,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Renda+ 2055",
            "valor": 100.0,
            "pago": true
          },
          {
            "id": "out_11",
            "nome": "Nubank 04/10",
            "valor": 217.34,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Scarlet",
            "valor": 2200.0,
            "pago": true
          },
          {
            "id": "out_13",
            "nome": "C6",
            "valor": 180.0,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 7093.0,
          "Total Gastos Fixos": 2849.54,
          "Total Gastos Variáveis": 0.0,
          "Total Outros Gastos": 3377.34,
          "Saldo Final": 866.12,
          "Fixos + Outros": 6226.88,
          "VARIAVEIS": "Valor",
          "Estúdio": 0.0,
          "Trabalho": 0.0
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
            "valor": 1659.76,
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
            "valor": 129.26,
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
            "valor": 100.0,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Onibus",
            "valor": 310.0,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "Ração fórum",
            "valor": 30.0,
            "pago": false
          },
          {
            "id": "fix_13",
            "nome": "Psico",
            "valor": 480.0,
            "pago": false
          },
          {
            "id": "fix_14",
            "nome": "MEI",
            "valor": 87.0,
            "pago": false
          },
          {
            "id": "fix_15",
            "nome": "Seguro casa",
            "valor": 50.0,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_3",
            "nome": "Alberto",
            "valor": 30.0,
            "pago": true
          },
          {
            "id": "out_4",
            "nome": "Cesar",
            "valor": 150.0,
            "pago": true
          },
          {
            "id": "out_5",
            "nome": "Roupas",
            "valor": 60.0,
            "pago": false
          },
          {
            "id": "out_6",
            "nome": "Viagem",
            "valor": 60.0,
            "pago": false
          },
          {
            "id": "out_7",
            "nome": "Presentes",
            "valor": 60.0,
            "pago": false
          },
          {
            "id": "out_8",
            "nome": "Edna",
            "valor": 500.0,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Renda+ 2055",
            "valor": 70.0,
            "pago": true
          },
          {
            "id": "out_10",
            "nome": "Clear",
            "valor": 120.0,
            "pago": false
          },
          {
            "id": "out_11",
            "nome": "Scarlet",
            "valor": 2500.0,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Nubank 05/10",
            "valor": 217.29,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 7423.2,
          "Total Gastos Fixos": 3195.3,
          "Total Gastos Variáveis": -600.0,
          "Total Outros Gastos": 3499.88,
          "Saldo Final": 1328.02,
          "Fixos + Outros": 6695.18,
          "VARIAVEIS": "Valor",
          "Estúdio": -600.0,
          "Trabalho": 0.0,
          "Total": -600.0
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
            "valor": 1362.62,
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
            "valor": 160.0,
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
            "valor": 100.0,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "Ração fórum",
            "valor": 30.0,
            "pago": false
          },
          {
            "id": "fix_13",
            "nome": "Psico",
            "valor": 480.0,
            "pago": false
          },
          {
            "id": "fix_15",
            "nome": "MEI",
            "valor": 86.05,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_3",
            "nome": "Alberto",
            "valor": 30.0,
            "pago": true
          },
          {
            "id": "out_4",
            "nome": "Cesar",
            "valor": 150.0,
            "pago": true
          },
          {
            "id": "out_5",
            "nome": "Roupas",
            "valor": 60.0,
            "pago": false
          },
          {
            "id": "out_6",
            "nome": "Viagem",
            "valor": 60.0,
            "pago": false
          },
          {
            "id": "out_7",
            "nome": "Presentes",
            "valor": 60.0,
            "pago": false
          },
          {
            "id": "out_8",
            "nome": "Edna",
            "valor": 500.0,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Renda+ 2055",
            "valor": 70.0,
            "pago": true
          },
          {
            "id": "out_10",
            "nome": "Clear",
            "valor": 120.0,
            "pago": false
          },
          {
            "id": "out_11",
            "nome": "INSS Maria",
            "valor": 178.31,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Bradesco",
            "valor": 1598.81,
            "pago": true
          },
          {
            "id": "out_13",
            "nome": "Nubank 06/10",
            "valor": 346.68,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Scarlet",
            "valor": 3000.0,
            "pago": false
          },
          {
            "id": "out_15",
            "nome": "Caixa",
            "valor": 334.76,
            "pago": true
          },
          {
            "id": "out_16",
            "nome": "Multa",
            "valor": 78.09,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 10293.0,
          "Total Gastos Fixos": 2567.95,
          "Total Gastos Variáveis": -600.0,
          "Total Outros Gastos": 4967.66,
          "Saldo Final": 3357.39,
          "Fixos + Outros": 7535.61,
          "VARIAVEIS": "Valor",
          "Estúdio": -600.0,
          "Trabalho": 0.0
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
            "valor": 1364.92,
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
            "valor": 147.66,
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
            "valor": 130.0,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Ração fórum",
            "valor": 30.0,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "Psico",
            "valor": 480.0,
            "pago": false
          },
          {
            "id": "fix_13",
            "nome": "MEI",
            "valor": 86.05,
            "pago": false
          },
          {
            "id": "fix_14",
            "nome": "Caronas",
            "valor": 1240.5,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_3",
            "nome": "Alberto",
            "valor": 30.0,
            "pago": true
          },
          {
            "id": "out_4",
            "nome": "Cesar",
            "valor": 150.0,
            "pago": true
          },
          {
            "id": "out_5",
            "nome": "Roupas",
            "valor": 120.0,
            "pago": false
          },
          {
            "id": "out_6",
            "nome": "Viagem",
            "valor": 120.0,
            "pago": false
          },
          {
            "id": "out_7",
            "nome": "Presentes",
            "valor": 120.0,
            "pago": false
          },
          {
            "id": "out_8",
            "nome": "Edna",
            "valor": 500.0,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Renda+ 2055",
            "valor": 105.0,
            "pago": false
          },
          {
            "id": "out_10",
            "nome": "Tesouro Reserva",
            "valor": 100.0,
            "pago": true
          },
          {
            "id": "out_11",
            "nome": "Santander",
            "valor": 100.0,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Nubank 07/10",
            "valor": 549.57,
            "pago": false
          },
          {
            "id": "out_13",
            "nome": "Scarlet",
            "valor": 2200.0,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "INSS Maria",
            "valor": 179.0,
            "pago": true
          },
          {
            "id": "out_15",
            "nome": "Crypto",
            "valor": 10.0,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5042.0,
          "VA": 0.0,
          "VR": 0.0,
          "Rescisão": 1298.75,
          "Estúdio": 600.0,
          "Subtotal Ganhos": 6940.75,
          "Total Gastos Fixos": 3828.41,
          "Total Outros Gastos": 3270.0,
          "Subtotal Gastos": 7098.41,
          "Ganhos - Gastos": -157.66
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
            "valor": 1366.84,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 109.79,
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
            "valor": 100.0,
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
            "valor": 130.0,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Ração fórum",
            "valor": 30.0,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "Psico",
            "valor": 600.0,
            "pago": false
          },
          {
            "id": "fix_13",
            "nome": "MEI",
            "valor": 86.05,
            "pago": false
          },
          {
            "id": "fix_14",
            "nome": "Caronas",
            "valor": 1468.49,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_6",
            "nome": "Renda+ 2055",
            "valor": 415.0,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Tesouro Reserva",
            "valor": 400.0,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Santander",
            "valor": 100.0,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Cripto",
            "valor": 10.0,
            "pago": true
          },
          {
            "id": "out_11",
            "nome": "Alberto",
            "valor": 40.0,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Cesar",
            "valor": 150.0,
            "pago": true
          },
          {
            "id": "out_13",
            "nome": "Nubank",
            "valor": 841.66,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Edna",
            "valor": 500.0,
            "pago": true
          },
          {
            "id": "out_15",
            "nome": "Scarlet",
            "valor": 490.0,
            "pago": true
          },
          {
            "id": "out_16",
            "nome": "INSS Maria",
            "valor": 179.0,
            "pago": true
          },
          {
            "id": "out_17",
            "nome": "Dívida Maria",
            "valor": 4000.0,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5024.325834,
          "Rescisão MPSP": 6954.13,
          "Estúdio": 600.0,
          "Subtotal Ganhos": 12578.45583,
          "Total Gastos Fixos": 4200.48,
          "Total Outros Gastos": 7125.66,
          "Subtotal Gastos": 11326.14,
          "Ganhos - Gastos": 1252.315834,
          "Investimentos": 925.0,
          "Ideal": 1507.29775
        },
        "scarlet": {
          "gastos": [],
          "ganhos": 4600.0,
          "faturaNubank": 3719.26
        }
      },
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
            "valor": 130.0,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Ração fórum",
            "valor": 30.0,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "Psico",
            "valor": 480.0,
            "pago": false
          },
          {
            "id": "fix_13",
            "nome": "MEI",
            "valor": 87.0,
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
            "valor": 103.0,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Santander",
            "valor": 100.0,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Cripto",
            "valor": 10.0,
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
            "valor": 240.0,
            "pago": true
          },
          {
            "id": "out_13",
            "nome": "Cesar",
            "valor": 150.0,
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
            "valor": 500.0,
            "pago": true
          },
          {
            "id": "out_16",
            "nome": "Scarlet",
            "valor": 800.0,
            "pago": true
          },
          {
            "id": "out_17",
            "nome": "INSS Maria",
            "valor": 179.0,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5786.24,
          "VA": 2050.0,
          "VR": 1300.0,
          "Estúdio": 600.0,
          "Subtotal Ganhos": 6386.24,
          "Total Gastos Fixos": 4343.26,
          "Total Outros Gastos": 2563.79,
          "Subtotal Gastos": 6907.05,
          "Ganhos - Gastos": -520.81,
          "Unimed": 867.72,
          "Auxílio saúde": 759.01,
          "Subtotal": 108.71,
          "Investimentos": 213.0,
          "Ideal": 1735.872
        },
        "scarlet": {
          "gastos": [],
          "ganhos": 3629.86,
          "faturaNubank": 4835.22
        }
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
            "valor": 160.0,
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
            "valor": 118.0,
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
            "valor": 130.0,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Ração fórum",
            "valor": 30.0,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "Psico",
            "valor": 480.0,
            "pago": false
          },
          {
            "id": "fix_13",
            "nome": "MEI",
            "valor": 87.0,
            "pago": false
          },
          {
            "id": "fix_14",
            "nome": "Caronas",
            "valor": 1200.0,
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
            "valor": 103.0,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Tesouro Reserva",
            "valor": 1766.0,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Santander",
            "valor": 100.0,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Cripto",
            "valor": 10.0,
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
            "valor": 250.0,
            "pago": true
          },
          {
            "id": "out_13",
            "nome": "Cesar",
            "valor": 150.0,
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
            "valor": 500.0,
            "pago": true
          },
          {
            "id": "out_16",
            "nome": "Scarlet",
            "valor": 2000.0,
            "pago": true
          },
          {
            "id": "out_17",
            "nome": "INSS Maria",
            "valor": 179.0,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5788.19,
          "VA": 2050.0,
          "VR": 1235.0,
          "Estúdio": 600.0,
          "BB": 7066.0,
          "Subtotal Ganhos": 13454.19,
          "Total Gastos Fixos": 4704.82,
          "Total Outros Gastos": 7161.38,
          "Subtotal Gastos": 11866.2,
          "Ganhos - Gastos": 1587.99,
          "Investimentos": 1979.0,
          "Ideal": 1736.457
        },
        "scarlet": {
          "gastos": [],
          "ganhos": 1100.0,
          "faturaNubank": 4568.57
        }
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
            "valor": 160.0,
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
            "valor": 118.0,
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
            "valor": 130.0,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Ração fórum",
            "valor": 30.0,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "Psico",
            "valor": 480.0,
            "pago": false
          },
          {
            "id": "fix_13",
            "nome": "MEI",
            "valor": 87.0,
            "pago": false
          },
          {
            "id": "fix_14",
            "nome": "Caronas",
            "valor": 840.0,
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
            "valor": 103.0,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Santander",
            "valor": 50.0,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Cripto",
            "valor": 10.0,
            "pago": true
          },
          {
            "id": "out_11",
            "nome": "BB",
            "valor": 48.0,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Alberto",
            "valor": 250.0,
            "pago": true
          },
          {
            "id": "out_13",
            "nome": "Cesar",
            "valor": 150.0,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Nubank",
            "valor": 150.0,
            "pago": true
          },
          {
            "id": "out_15",
            "nome": "Edna",
            "valor": 500.0,
            "pago": true
          },
          {
            "id": "out_17",
            "nome": "INSS Maria",
            "valor": 179.0,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5788.19,
          "VA": 2050.0,
          "VR": 910.0,
          "13º": 0.0,
          "Resgate Reserva": 0.0,
          "Subtotal Ganhos": 5788.19,
          "Total Gastos Fixos": 4344.68,
          "Total Outros Gastos": 1440.0,
          "Subtotal Gastos": 5784.68,
          "Ganhos - Gastos": 3.51,
          "Recesso": "2026-12-19 00:00:00",
          "Investimentos": 163.0,
          "Ideal": 1736.457
        },
        "scarlet": {
          "gastos": [],
          "ganhos": 5200.0,
          "faturaNubank": 1568.05
        }
      }
    },
    "2027": {
      "Janeiro": {
        "fixos": [
          {
            "id": "fix_3",
            "nome": "Parcela casa",
            "valor": 1399.0,
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
            "valor": 160.0,
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
            "valor": 160.0,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Psico",
            "valor": 480.0,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "MEI",
            "valor": 87.0,
            "pago": false
          },
          {
            "id": "fix_13",
            "nome": "Caronas",
            "valor": 1300.0,
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
            "valor": 1881.0,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_6",
            "nome": "Renda+ 2055",
            "valor": 103.0,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Tesouro Reserva",
            "valor": 260.0,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Santander",
            "valor": 100.0,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Cripto",
            "valor": 10.0,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Alberto",
            "valor": 250.0,
            "pago": true
          },
          {
            "id": "out_13",
            "nome": "Cesar",
            "valor": 150.0,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Nubank",
            "valor": 150.0,
            "pago": true
          },
          {
            "id": "out_15",
            "nome": "Edna",
            "valor": 600.0,
            "pago": true
          }
        ],
        "totais": {
          "IPTU": 1035.91,
          "IPVA CARRO": 1017.765,
          "LIC CARRO": 187.0,
          "CREFITO": 451.0,
          "SEG CARRO": 0.0,
          "REVISÃO CARRO": 0.0,
          "IPTU PAIS": "R$ 0.00",
          "IPVA UNO PAI": 0.0,
          "COLETA LIXO": 0.0
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
            "valor": 1399.0,
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
            "valor": 160.0,
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
            "valor": 160.0,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Psico",
            "valor": 480.0,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "MEI",
            "valor": 87.0,
            "pago": false
          },
          {
            "id": "fix_13",
            "nome": "Caronas",
            "valor": 1300.0,
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
            "valor": 1881.0,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_6",
            "nome": "Renda+ 2055",
            "valor": 103.0,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Tesouro Reserva",
            "valor": 260.0,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Santander",
            "valor": 50.0,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Cripto",
            "valor": 10.0,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Alberto",
            "valor": 250.0,
            "pago": true
          },
          {
            "id": "out_13",
            "nome": "Cesar",
            "valor": 150.0,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Nubank",
            "valor": 150.0,
            "pago": true
          },
          {
            "id": "out_15",
            "nome": "Edna",
            "valor": 600.0,
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
          "VA": 2050.0,
          "VR": 1365.0,
          "Gace": 0.0,
          "Subtotal Ganhos": 5786.24,
          "Total Gastos Fixos": 6597.51,
          "Total Outros Gastos": 1573.0,
          "Subtotal Gastos": 8170.51,
          "Ganhos - Gastos": -2384.27,
          "Investimentos": 423.0,
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
            "valor": 31.0,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 160.0,
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
            "valor": 160.0,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Psico",
            "valor": 480.0,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "MEI",
            "valor": 87.0,
            "pago": false
          },
          {
            "id": "fix_13",
            "nome": "Caronas",
            "valor": 1300.0,
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
            "valor": 1881.0,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_6",
            "nome": "Renda+ 2055",
            "valor": 103.0,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Tesouro Reserva",
            "valor": 260.0,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Santander",
            "valor": 50.0,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Cripto",
            "valor": 10.0,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Alberto",
            "valor": 250.0,
            "pago": true
          },
          {
            "id": "out_13",
            "nome": "Cesar",
            "valor": 150.0,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Nubank",
            "valor": 150.0,
            "pago": true
          },
          {
            "id": "out_15",
            "nome": "Edna",
            "valor": 600.0,
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
          "VA": 2050.0,
          "VR": 1365.0,
          "Gace": 0.0,
          "Subtotal Ganhos": 5786.24,
          "Total Gastos Fixos": 6521.81,
          "Total Outros Gastos": 1573.0,
          "Subtotal Gastos": 8094.81,
          "Ganhos - Gastos": -2308.57,
          "Investimentos": 423.0,
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
            "valor": 31.0,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 160.0,
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
            "valor": 160.0,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Psico",
            "valor": 480.0,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "MEI",
            "valor": 87.0,
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
            "valor": 1881.0,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_6",
            "nome": "Renda+ 2055",
            "valor": 103.0,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Tesouro Reserva",
            "valor": 260.0,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Santander",
            "valor": 50.0,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Cripto",
            "valor": 10.0,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Alberto",
            "valor": 250.0,
            "pago": true
          },
          {
            "id": "out_13",
            "nome": "Nubank",
            "valor": 150.0,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Edna",
            "valor": 600.0,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5557.91,
          "VA": 2050.0,
          "VR": 1365.0,
          "Gace": 0.0,
          "Subtotal Ganhos": 5557.91,
          "Total Gastos Fixos": 5221.81,
          "Total Outros Gastos": 1423.0,
          "Subtotal Gastos": 6644.81,
          "Ganhos - Gastos": -1086.9,
          "Investimentos": 423.0,
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
            "valor": 31.0,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 160.0,
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
            "valor": 160.0,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Psico",
            "valor": 480.0,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "MEI",
            "valor": 87.0,
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
            "valor": 1881.0,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_6",
            "nome": "Renda+ 2055",
            "valor": 103.0,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Tesouro Reserva",
            "valor": 260.0,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Santander",
            "valor": 50.0,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Cripto",
            "valor": 10.0,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Alberto",
            "valor": 250.0,
            "pago": true
          },
          {
            "id": "out_13",
            "nome": "Nubank",
            "valor": 150.0,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Edna",
            "valor": 600.0,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5557.91,
          "VA": 2050.0,
          "VR": 1365.0,
          "Gace": 0.0,
          "Subtotal Ganhos": 5557.91,
          "Total Gastos Fixos": 5221.81,
          "Total Outros Gastos": 1423.0,
          "Subtotal Gastos": 6644.81,
          "Ganhos - Gastos": -1086.9,
          "Investimentos": 423.0,
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
            "valor": 31.0,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 160.0,
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
            "valor": 160.0,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Psico",
            "valor": 480.0,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "MEI",
            "valor": 87.0,
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
            "valor": 1881.0,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_6",
            "nome": "Renda+ 2055",
            "valor": 103.0,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Tesouro Reserva",
            "valor": 260.0,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Santander",
            "valor": 50.0,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Cripto",
            "valor": 10.0,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Alberto",
            "valor": 250.0,
            "pago": true
          },
          {
            "id": "out_13",
            "nome": "Nubank",
            "valor": 150.0,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Edna",
            "valor": 600.0,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5557.91,
          "VA": 2050.0,
          "VR": 1365.0,
          "Gace": 0.0,
          "Subtotal Ganhos": 5557.91,
          "Total Gastos Fixos": 5313.16,
          "Total Outros Gastos": 1423.0,
          "Subtotal Gastos": 6736.16,
          "Ganhos - Gastos": -1178.25,
          "Investimentos": 423.0,
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
            "valor": 31.0,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 160.0,
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
            "valor": 160.0,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Psico",
            "valor": 480.0,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "MEI",
            "valor": 87.0,
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
            "valor": 1881.0,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_6",
            "nome": "Renda+ 2055",
            "valor": 103.0,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Tesouro Reserva",
            "valor": 260.0,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Santander",
            "valor": 50.0,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Cripto",
            "valor": 10.0,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Alberto",
            "valor": 250.0,
            "pago": true
          },
          {
            "id": "out_13",
            "nome": "Nubank",
            "valor": 150.0,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Edna",
            "valor": 600.0,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5557.91,
          "VA": 2050.0,
          "VR": 1365.0,
          "Gace": 0.0,
          "Subtotal Ganhos": 5557.91,
          "Total Gastos Fixos": 5313.16,
          "Total Outros Gastos": 1423.0,
          "Subtotal Gastos": 6736.16,
          "Ganhos - Gastos": -1178.25,
          "Investimentos": 423.0,
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
            "valor": 31.0,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 160.0,
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
            "valor": 160.0,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Psico",
            "valor": 480.0,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "MEI",
            "valor": 87.0,
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
            "valor": 1881.0,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_6",
            "nome": "Renda+ 2055",
            "valor": 103.0,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Tesouro Reserva",
            "valor": 260.0,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Santander",
            "valor": 50.0,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Cripto",
            "valor": 10.0,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Alberto",
            "valor": 250.0,
            "pago": true
          },
          {
            "id": "out_13",
            "nome": "Nubank",
            "valor": 150.0,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Edna",
            "valor": 600.0,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5557.91,
          "VA": 2050.0,
          "VR": 1365.0,
          "Gace": 0.0,
          "Subtotal Ganhos": 5557.91,
          "Total Gastos Fixos": 5313.16,
          "Total Outros Gastos": 1423.0,
          "Subtotal Gastos": 6736.16,
          "Ganhos - Gastos": -1178.25,
          "Investimentos": 423.0,
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
            "valor": 31.0,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 160.0,
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
            "valor": 160.0,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Psico",
            "valor": 480.0,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "MEI",
            "valor": 87.0,
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
            "valor": 1881.0,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_6",
            "nome": "Renda+ 2055",
            "valor": 103.0,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Tesouro Reserva",
            "valor": 260.0,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Santander",
            "valor": 100.0,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Cripto",
            "valor": 10.0,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Alberto",
            "valor": 250.0,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Edna",
            "valor": 600.0,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5557.91,
          "VA": 2050.0,
          "VR": 1365.0,
          "Gace": 0.0,
          "Subtotal Ganhos": 5557.91,
          "Total Gastos Fixos": 5313.16,
          "Total Outros Gastos": 1323.0,
          "Subtotal Gastos": 6636.16,
          "Ganhos - Gastos": -1078.25,
          "Investimentos": 473.0,
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
            "valor": 31.0,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 160.0,
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
            "valor": 160.0,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Psico",
            "valor": 480.0,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "MEI",
            "valor": 87.0,
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
            "valor": 1881.0,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_6",
            "nome": "Renda+ 2055",
            "valor": 103.0,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Tesouro Reserva",
            "valor": 260.0,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Santander",
            "valor": 50.0,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Cripto",
            "valor": 10.0,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Alberto",
            "valor": 250.0,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Edna",
            "valor": 600.0,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5557.91,
          "VA": 2050.0,
          "VR": 1365.0,
          "Gace": 0.0,
          "Subtotal Ganhos": 5557.91,
          "Total Gastos Fixos": 5313.16,
          "Total Outros Gastos": 1273.0,
          "Subtotal Gastos": 6586.16,
          "Ganhos - Gastos": -1028.25,
          "Investimentos": 423.0,
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
            "valor": 31.0,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 160.0,
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
            "valor": 160.0,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Psico",
            "valor": 480.0,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "MEI",
            "valor": 87.0,
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
            "valor": 1881.0,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_6",
            "nome": "Renda+ 2055",
            "valor": 103.0,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Tesouro Reserva",
            "valor": 260.0,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Santander",
            "valor": 50.0,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Cripto",
            "valor": 10.0,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Alberto",
            "valor": 250.0,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Edna",
            "valor": 600.0,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5557.91,
          "13º": 3132.0,
          "VA": 2050.0,
          "VR": 1365.0,
          "Gace": 0.0,
          "Subtotal Ganhos": 8689.91,
          "Total Gastos Fixos": 5313.16,
          "Total Outros Gastos": 1273.0,
          "Subtotal Gastos": 6586.16,
          "Ganhos - Gastos": 2103.75,
          "Investimentos": 423.0,
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
            "valor": 31.0,
            "pago": false
          },
          {
            "id": "fix_5",
            "nome": "Eletricidade",
            "valor": 160.0,
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
            "valor": 160.0,
            "pago": false
          },
          {
            "id": "fix_11",
            "nome": "Psico",
            "valor": 480.0,
            "pago": false
          },
          {
            "id": "fix_12",
            "nome": "MEI",
            "valor": 87.0,
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
            "valor": 1881.0,
            "pago": false
          }
        ],
        "outros": [
          {
            "id": "out_6",
            "nome": "Renda+ 2055",
            "valor": 103.0,
            "pago": true
          },
          {
            "id": "out_7",
            "nome": "Tesouro Reserva",
            "valor": 260.0,
            "pago": true
          },
          {
            "id": "out_8",
            "nome": "Santander",
            "valor": 50.0,
            "pago": true
          },
          {
            "id": "out_9",
            "nome": "Cripto",
            "valor": 10.0,
            "pago": true
          },
          {
            "id": "out_12",
            "nome": "Alberto",
            "valor": 250.0,
            "pago": true
          },
          {
            "id": "out_14",
            "nome": "Edna",
            "valor": 600.0,
            "pago": true
          }
        ],
        "totais": {
          "Salário Mensal": 5557.91,
          "13º": 2427.3,
          "VA": 2050.0,
          "VR": 1365.0,
          "Gace": 0.0,
          "Subtotal Ganhos": 7985.21,
          "Total Gastos Fixos": 5313.16,
          "Total Outros Gastos": 1273.0,
          "Subtotal Gastos": 6586.16,
          "Ganhos - Gastos": 1399.05,
          "Investimentos": 423.0,
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

if (typeof window !== "undefined") { window.MATRIX_SEED_DATA = MATRIX_SEED_DATA; }
