# ⚡ REDE VIVA 360 - Gestão Operacional de Redes de Distribuição MT/BT

Sistema web e PWA especializado para gestão de equipes de **Linha Viva** e **Linha Morta**, emissão de **Relatórios Diários de Operação (RDO)** no padrão **Equatorial Energia Piauí**, controle dinâmico de saldo de viatura/almoxarifado, croqui técnico de campo interativo (**Canvas EXTEC**) e envio instantâneo de resumos formatados no **WhatsApp**.

---

## 🚀 Como Acessar e Usar

- **No Navegador**: Abra diretamente o arquivo [`index.html`](index.html).
- **Hospedado no GitHub Pages**: Acesse pelo link público gerado pelo repositório.
- **No Celular (PWA / App)**: Abra pelo Google Chrome e toque em *"Instalar aplicativo"* ou *"Adicionar à tela inicial"*.

---

## 🌟 Principais Módulos do Sistema

### 1. 📋 Emissor Oficial de RDO (Padrão Equatorial Piauí)
- **Normas Técnicas Integradas (NT.00006 e NT.00022)**:
  - **Instalação de BRT (Banco Regulador de Tensão Monofásico)**: Botões de preenchimento automático para içamento em poste duplo DT, chaves faca bypass, seccionadoras, para-raios e malha de aterramento.
  - **Lançamento de Condutores MT/BT**: Sequência de carretilhas, tracionamento, regulagem de flecha conforme temperatura do Piauí e amarração com laços/alças preformadas.
- **Folha Técnica Oficial A4**:
  - Layout projetado para caber estritamente em **1 página única A4**, sem quebras acidentais.
  - Exportação direta para **PDF** via `html2pdf.js`.
  - Assinatura centralizada do **Encarregado Técnico da Equipe Operacional**.

### 2. 🎨 Módulo Canvas EXTEC (Croqui Técnico de Campo)
- Prancheta digital integrada com suporte completo a **Touchscreen** (celular e tablet) e mouse.
- **Ferramentas**: Caneta, Linha Reta, Borracha, Espessura e Paleta de Cores Elétricas.
- **Carimbos de Engenharia**: Poste (P), BRT ⚡, Chave ⚡, Trafo ⚡ e Aterramento ⏚ (ATR).
- **Modelos 1-Clique**:
  - `⚡ Esboço BRT`: Desenha o corte esquemático do poste duplo com plataforma e equipamentos.
  - `⚡ Esboço Cabos`: Desenha o diagrama dos 4 postes com curva de flecha e cotas de 45m.
- O croqui desenhado é automaticamente salvo e impresso no **Box 6** do RDO oficial.

### 3. 📲 Resumo Formatado para WhatsApp
- Botão **"WhatsApp"** tanto na folha técnica quanto na lista de relatórios.
- Modal com texto formatado contendo emojis do setor elétrico (⚡, 📋, 📅, 👷‍♂️, 📍, 🛠️, 📦, ✅) e negritos compatíveis com o WhatsApp (`*texto*`).
- **1-Clique**: Botão *"Copiar Texto Formatado"* e botão *"Enviar no WhatsApp"* direto para contatos ou grupos operacionais.

### 4. 📦 Almoxarifado Base & Cautela de Viatura
- Catálogo master com os principais materiais de Linha Viva (chaves fusíveis 15/36kV, para-raios, bastões, laços 1/0, alças, conectores, isoladores e ferragens).
- Controle dinâmico de estoque com botões rápidos de incremento e decremento (`+` / `-`).
- Vinculação de materiais diretamente para viaturas (ex: `PI-FAO-V001M`).
- Emissão do **Termo de Cautela da Viatura em PDF** com assinatura exclusiva do encarregado.
- Importação direta de planilhas Google Sheets e arquivos CSV.

### 5. 👥 Equipes & ⏱️ Check-in / Check-out
- Cadastro, edição e exclusão de equipes com estorno automático de materiais de viatura para a base.
- Controle de jornada com cálculo automático de horas trabalhadas em campo.
- Dashboard executivo com gráficos de produtividade, insumos e indicadores em tempo real.

---

## 📂 Estrutura de Arquivos

```text
├── index.html                  # Interface completa da aplicação SPA
├── styles.css                  # Tema Laranja Mecânica, layout A4 e responsividade
├── app.js                      # Lógica de negócio, gráficos, Canvas EXTEC e WhatsApp
├── seed-data.js                # Catálogo inicial Equatorial e equipes
├── manifest.json               # Configurações do PWA para Android
├── sw.js                       # Service Worker para funcionamento offline
├── icon.svg                    # Ícone vetorial oficial
├── COMO_HOSPEDAR_NO_GITHUB.md  # Passo a passo para colocar no ar no GitHub Pages
└── COMO_PUBLICAR_GOOGLE_PLAY.md# Instruções para gerar APK/AAB e publicar na Play Store
```

---

Desenvolvido para operações de campo e distribuição de energia elétrica (Equatorial Piauí).
