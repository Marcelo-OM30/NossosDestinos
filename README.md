# Roteiro a Dois - Lugares para Ir com o Amor

Uma simples aplicação web para listar lugares para visitar com a pessoa amada.
Os dados são salvos no Firebase e a aplicação pode ser hospedada no GitHub Pages.

## Como Configurar

### 1. Firebase Setup

1.  Vá para [Firebase Console](https://console.firebase.google.com/) e crie um novo projeto.
2.  Adicione um aplicativo da Web ao seu projeto:
    *   Clique no ícone `</>` (Adicionar app) na visão geral do projeto.
    *   Registre o app (dê um apelido, não precisa configurar o Firebase Hosting aqui).
    *   Copie o objeto `firebaseConfig` fornecido.
3.  No menu lateral, vá em "Realtime Database" (ou "Firestore").
    *   Crie um banco de dados.
        *   Ao criar o Realtime Database, você precisará escolher uma localização (ex: Estados Unidos, Bélgica, Singapura). Para esta aplicação, qualquer uma delas funcionará bem. Escolha a mais próxima de você ou a padrão.
    *   Comece no modo de teste para regras de segurança. O Firebase pode configurar regras temporizadas por padrão (ex: permitindo acesso por 30 dias ou até uma data específica).
        Exemplo de regras temporizadas (o Firebase pode gerar algo similar):
        ```json
        // Exemplo para Realtime Database (modo de teste com expiração)
        {
          "rules": {
            ".read": "now < 1750734000000",  // Exemplo: 2025-6-24
            ".write": "now < 1750734000000"  // Exemplo: 2025-6-24
          }
        }
        ```
        Ou, para um teste rápido e se as regras acima não funcionarem de imediato, você pode usar:
        ```json
        // Exemplo para Realtime Database (modo de teste aberto)
        {
          "rules": {
            ".read": "true",
            ".write": "true"
          }
        }
        ```
    *   **Importante:** Regras abertas (`"true"`) ou temporizadas são para desenvolvimento/teste. Para uso prolongado ou se a privacidade dos dados for crítica, você precisará configurar regras de segurança mais robustas (ex: baseadas em autenticação de usuários). Lembre-se de "Publicar" suas regras no console do Firebase.
4.  Cole o objeto `firebaseConfig` copiado no arquivo `script.js` no local indicado. Certifique-se de adicionar também a `databaseURL` se estiver usando o Realtime Database e ela não estiver no `firebaseConfig` inicial.

**Nota:** Para esta configuração, que usa o Firebase SDK via tags `<script>` no `index.html`, você **não** precisa rodar `npm install firebase`. O comando `npm install` é usado em projetos Node.js ou que utilizam bundlers JavaScript.

### 2. Rodar Localmente

*   Abra o arquivo `index.html` no seu navegador.

### 3. Deploy no GitHub Pages

1.  Crie um repositório no GitHub.
2.  Adicione os arquivos `index.html`, `style.css`, `script.js` e `README.md` ao repositório.
    ```bash
    git init
    git add .
    git commit -m "Commit inicial"
    git branch -M main
    git remote add origin SEU_URL_DE_REPOSITORIO_AQUI.git
    git push -u origin main
    ```
3.  No seu repositório GitHub, vá em "Settings" > "Pages".
4.  Em "Branch", selecione `main` (ou `master`) e a pasta `/ (root)`. Clique em "Save".
5.  Aguarde alguns minutos. O link da sua aplicação aparecerá nesta mesma página.

## Como Usar

*   Abra o link do GitHub Pages.
*   Digite o nome do lugar e uma descrição.
*   Clique em "Adicionar Lugar".
*   O lugar aparecerá na lista e será salvo no Firebase, acessível para quem tiver o link.
