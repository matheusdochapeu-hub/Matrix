# 🟢 MATRIX FINANCE 360

> **Central Integrada de Inteligência e Gestão Financeira PWA**  
> Desenvolvido exclusivamente para a gestão 360º da vida financeira de **Matheus** e **Scarlet**.

[![PWA Ready](https://img.shields.io/badge/PWA-Instalável%20%26%20Offline-00ff66.svg)](https://developer.mozilla.org/pt-BR/docs/Web/Progressive_web_apps)
[![Estilo Matrix](https://img.shields.io/badge/Tema-Matrix%20Clean-050807.svg)](#)
[![Google Apps Script](https://img.shields.io/badge/Backend-Google%20Apps%20Script-blue.svg)](apps_script.gs)

---

## 💻 Visão Geral

O **MATRIX** é a torre de controle das finanças do casal, unindo o passado histórico (2025), o presente real (2026) e as projeções futuras (2027+) com dados consolidados das suas planilhas e holerites.

O app opera em modo **Progressive Web App (PWA)**, funcionando 100% offline com persistência local e suporte à sincronização de alta confiabilidade em nuvem via **Google Apps Script** (modelo inspirado no FisioFlow, com travas de concorrência e restauração instantânea em qualquer dispositivo).

---

## ⚡ Principais Módulos

### 1. 📊 Fluxo de Caixa Mensal (Navegação 2025, 2026, 2027)
- **Divisão Fiel por Blocos**:
  - 🔒 **Gastos Fixos**: Parcela Caixa, Caronas, Unimed, Água, Luz, Internet, etc.
  - 🛍️ **Gastos Variáveis / Outros**: Aportes de investimentos, cartões de crédito, parcelas e apoio a familiares.
  - ⚠️ **Contas de Início de Ano (Janeiro)**: IPTU, IPVA do carro, Licenciamento, CREFITO da Scarlet, etc.
  - 📥 **Receitas & Fechamento**: Salário líquido em conta corrente (BB), Vale Alimentação (VA de R$ 2.050,00 para o Maracaju 88), Vale Refeição (VR), 13º Salário e Estúdio.
- **Controle Interativo**: Alterne entre *Pago* (✅) e *Pendente* (⏳), edite valores inline ou adicione novos lançamentos com 1 toque.

### 2. 🔮 Simulador "E se?" (Laboratório de Projeções Futuras)
- **A ferramenta essencial para quem quer planejar o futuro**: Permite testar o impacto de qualquer compromisso novo antes de assumi-lo.
- **Exemplo Real Configurado**: Cotação do **Seguro de Vida da Scarlet** (R$ 100 ~ R$ 150/mês). O simulador projeta o orçamento mês a mês pelos próximos 14 a 24 meses e indica:
  - 🟢 **Folga Segura**: Sobra de caixa confortável.
  - 🟡 **Atenção**: Margem de folga apertada (< R$ 200).
  - 🔴 **Déficit**: Onde o orçamento estoura e quanto precisará ser ajustado.

### 3. 📄 Processamento de Holerites & 13º Salário
- **Leitor Local em PDF**: Arraste e solte holerites da **USP (Marteweb)** ou do **MPSP** diretamente na tela. O sistema lê as rubricas (Vencimento, Auxílio-Saúde, VR, INSS, IRRF, Sindicato, FGTS e Líquido) localmente no navegador, sem enviar seus dados para servidores externos.
- **Formulário de Conferência & Manual**: Edite qualquer linha ou lance manualmente com facilidade.
- **Inteligência do 13º Salário USP (2026)**:
  - **1ª Parcela (30/11)**: R$ 1.566,00 (50% do proporcional de 6 meses trabalhados).
  - **2ª Parcela (20/12)**: ~R$ 1.280,00 (segunda metade deduzidos os encargos legais).

### 4. 📅 Calendário Oficial USP São Carlos & Caronas
- **Cálculo Automático de Dias Úteis**: Considera finais de semana, feriados nacionais, estaduais de SP e municipais (São Carlos e Ribeirão Preto).
- **Recesso USP de Final de Ano**: Programado automaticamente de 18/12 a 04/01.
- **Cálculo de Deslocamento**:
  - Carona diária (Ribeirão Preto ⇄ São Carlos): R$ 60,00 / dia útil trabalhado.
  - Vale Refeição (VR): R$ 65,00 / dia trabalhado.
- **Folgas e Férias Customizadas**: Clique em qualquer dia para registrar férias ou folgas e atualizar automaticamente o custo de caronas no orçamento do mês.

### 5. 🏠 Financiamento Caixa & Amortizador Extraordinário
- **Acompanhamento Real**: Saldo devedor de R$ 157.884,49, 271 meses restantes, parcela atual de ~R$ 1.395,88 a 8,9899% a.a. (Tabela Price).
- **Abatimento Bianual com FGTS da USP**: Computa os depósitos mensais de FGTS de R$ 501,12 do cargo celetista USP, acumulando ~R$ 12.026,88 a cada 24 meses para abatimento.
- **Simulador de Amortização**: Compare estratégias de **Reduzir Prazo** (eliminando juros futuros brutalmente) vs **Reduzir Parcela** (aliviando o caixa mensal).

### 6. 📈 Painel de Investimentos 360
- Consolidação de todas as instituições e contas:
  - **XP Investimentos**: Tesouro Direto Renda+ 2055 (R$ 466,07) + Ações CSNA3 e MGLU3 (R$ 918,07).
  - **Banco Inter**: Tesouro Direto Renda+ 2055 (R$ 852,82) + Criptomoedas Bitcoin (R$ 44,69).
  - **Banco do Brasil**: Tesouro Reserva (R$ 2.213,80).
  - **Santander**: DinDin Capitalização (R$ 550,00).
  - **Clear Corretora**: Proventos a receber até 2028 (R$ 29,00).
  - **Scarlet**: Rastreamento de investimentos no BTG Pactual e BB.

### 7. ☁️ Backup & Conexões Não-Invasivas
- Sincronização em nuvem via **Google Apps Script** (`apps_script.gs`).
- Exportação e restauração local instantânea em arquivo `.json`.
- Conexão de leitura com os 3 apps satélites (`maracaju88`, `parcelado-a-vista` e `fisioflow`), preservando a autonomia total de cada um.

---

## 🚀 Como Executar

Basta abrir o arquivo [index.html](file:///c:/Users/matheus.ribeiro/Desktop/Matheus/5.%20IA/matrix/index.html) no navegador (Google Chrome, Edge ou Safari), ou servir via servidor web local / GitHub Pages.
No celular, clique no menu do navegador e selecione **"Adicionar à tela de início"** para instalar o app como PWA independente com o ícone temático verde Matrix.
