# Guia Completo: Transformar o Sistema em App Android e Publicar na Google Play Store

Este documento detalha o passo a passo prático para transformar o **REDE VIVA 360** em um aplicativo instalado no celular Android e publicá-lo na Google Play Store.

---

## 📱 Visão Geral: Como uma Aplicação Web vira um App Android?

O Google permite empacotar sites modernos como aplicativos nativos através da tecnologia **TWA (Trusted Web Activity)** ou **Capacitor / WebView**.
O app roda com tela cheia, sem barra de navegação de navegador, com ícone próprio na gaveta de aplicativos e funcionando offline em campo graças ao **Service Worker** e **Manifest** que já implementamos!

---

## 🚀 Método 1 (O mais rápido e recomendado: PWABuilder - 15 minutos)

Não precisa instalar Android Studio nem programar em Java/Kotlin. O próprio serviço oficial da Microsoft / Google gera o `.aab` (pacote exigido pela Google Play).

### Passo 1: Colocar o site online (Hospedagem Gratuita)
Para gerar o pacote da Play Store, os arquivos precisam estar em um link HTTPS. Você pode subir gratuitamente em qualquer um destes:
1. **Vercel** (recomendado):
   - Acesse [vercel.com](https://vercel.com)
   - Arraste a pasta `gestao-equipes-rdo` ou conecte via GitHub.
   - Você receberá um link gratuito HTTPS (ex: `redeviva360.vercel.app`).
2. **Netlify**:
   - Acesse [netlify.com](https://app.netlify.com/drop)
   - Arraste a pasta inteira para o navegador. Link pronto na hora!
3. **GitHub Pages**:
   - Crie um repositório no GitHub, faça upload dos arquivos e ative o GitHub Pages nas configurações.

### Passo 2: Gerar o pacote Android no PWABuilder
1. Acesse: **[https://www.pwabuilder.com](https://www.pwabuilder.com)**
2. Cole a URL do seu site (ex: `https://redeviva360.vercel.app`) e clique em **Start**.
3. O PWABuilder validará o `manifest.json`, `sw.js` e o ícone (o projeto já está 100% configurado para nota máxima).
4. Clique no botão **Package for Stores** e selecione **Android**.
5. Preencha as informações básicas:
   - **Package ID**: ex: `br.com.redeviva.distribuicao`
   - **App name**: `Rede Viva 360`
   - **Launcher name**: `RedeViva360`
   - **Signing key**: Marque "Generate new key" (salve o arquivo de chave gerado!).
6. Clique em **Generate** e baixe o arquivo zip contendo o `.aab` (Android App Bundle).

---

## 🛠️ Método 2: Capacitor (100% Nativo no Android Studio)

Se você preferir gerar um projeto nativo no seu computador:
1. Tenha o **Node.js** e o **Android Studio** instalados.
2. Na pasta do projeto, abra o terminal e execute:
   ```bash
   npm init -y
   npm install @capacitor/core @capacitor/cli @capacitor/android
   npx cap init "Rede Viva 360" "com.redeviva.distribuicao" --web-dir .
   npx cap add android
   npx cap sync
   npx cap open android
   ```
3. O Android Studio abrirá. No menu superior, vá em:
   **Build > Generate Signed Bundle / APK > Android App Bundle (.aab)**.

---

## 🏪 Como Publicar na Google Play Store (Passo a Passo)

### 1. Criar a Conta de Desenvolvedor Google
- Acesse: **[https://play.google.com/console](https://play.google.com/console)**
- Faça login com sua conta Google.
- Pague a taxa única de cadastro de **US$ 25** (taxa vitalícia cobrada pelo Google).
- Conclua a verificação de identidade com documento (RG ou CNH).

### 2. Criar um Novo Aplicativo
1. No painel do Google Play Console, clique em **Criar app**.
2. **Nome do app**: `Rede Viva 360 - Gestão Linha Viva & RDO`
3. **Idioma padrão**: Português (Brasil).
4. **Tipo**: Aplicativo (Gratuito ou Pago).
5. Aceite as políticas do desenvolvedor e clique em **Criar app**.

### 3. Ficha Principal da Loja (Materiais Gráficos)
Para seu app ser aceito, você precisará preencher a página da loja:
- **Descrição breve** (até 80 caracteres):
  *Gestão de equipes de linha viva, RDOs diários, check-in e materiais de distribuição.*
- **Descrição completa** (até 4000 caracteres):
  *Aplicativo completo para eletricistas, encarregados e frotas de distribuição de energia elétrica padrão Equatorial Piauí. Emissão de RDO, controle de ferramentas de viatura (cautela), saldo de almoxarifado, check-in e registro fotográfico.*
- **Ícone do app**: Imagem PNG 512 x 512 px.
- **Imagem de destaque**: Imagem PNG/JPG 1024 x 500 px.
- **Capturas de tela (Prints)**: No mínimo 2 prints da tela do app em celular (tire prints do painel de indicadores, da folha de RDO e da cautela de materiais).

### 4. Política de Privacidade
A Google Play exige uma URL de política de privacidade:
- Crie gratuitamente no [privacypolicies.com](https://www.privacypolicies.com) ou [app-privacy-policy-generator.firebaseapp.com](https://app-privacy-policy-generator.firebaseapp.com).
- Hospede como um arquivo `privacy.html` no mesmo site ou no GitHub Gist.

### 5. Enviar o Pacote (.aab)
1. No menu lateral da Google Play Console, vá em **Produção** (ou **Versões fechadas**).
2. Clique em **Criar nova versão**.
3. Faça upload do arquivo `.aab` gerado pelo PWABuilder ou Capacitor.
4. Adicione notas da versão (ex: *Versão inicial do Rede Viva 360*).
5. Clique em **Salvar e Revisar**.

### ⚠️ Regra Importante do Google (Contas Pessoais vs Contas PJ):
- **Contas de Pessoa Física (criadas após nov/2023)**: O Google exige uma etapa de **Teste Fechado com 12 ou 20 testadores voluntários por 14 dias contínuos** antes de autorizar o envio para a loja pública. Você pode cadastrar e-mails de colegas de equipe, eletricistas e amigos para instalar pelo link de teste.
- **Contas de Pessoa Jurídica (com CNPJ da empresa)**: Não possuem a trava de 14 dias de teste obrigatório, liberando a publicação direta após análise da equipe do Google (1 a 3 dias úteis).

---

## 📲 Instalação Direta Instantânea no Celular (Sem precisar de Play Store!)

Você sabia que **qualquer eletricista ou encarregado já pode instalar o app no celular agora mesmo**, sem pagar os US$ 25 do Google?
1. Abra o link do seu site no **Google Chrome do celular Android**.
2. O Chrome mostrará um aviso: **"Adicionar Rede Viva 360 à tela inicial"** ou toque nos 3 pontinhos do Chrome e selecione **"Instalar aplicativo"**.
3. Um ícone do app aparecerá na gaveta de aplicativos do celular, abrindo em tela cheia como se tivesse sido baixado da Google Play Store!