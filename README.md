# Nossos Destinos - Lugares para Ir com o Amor

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
    *   **Importante: Persistência dos Dados e Regras de Segurança**
        *   Os dados salvos no Firebase **são persistentes** e não sumirão enquanto o projeto Firebase e o Realtime Database existirem e as regras permitirem acesso.
        *   Regras abertas (`"true"`) ou temporizadas (como `"now < timestamp"`) são para desenvolvimento/teste.
        *   **Se suas regras são temporizadas (ex: `"now < 1750734000000"`), elas EXPIRARÃO na data especificada. Após a expiração, a aplicação NÃO CONSEGUIRÁ mais ler ou salvar dados até que as regras sejam atualizadas.**
        *   Para uso prolongado, você precisará atualizar essas regras antes que expirem ou configurar regras de segurança mais robustas (ex: baseadas em autenticação de usuários).
        *   Lembre-se de "Publicar" suas regras no console do Firebase após qualquer alteração.
4.  Cole o objeto `firebaseConfig` copiado no arquivo `script.js` no local indicado. Certifique-se de adicionar também a `databaseURL` se estiver usando o Realtime Database e ela não estiver no `firebaseConfig` inicial.

**Nota:** Para esta configuração, que usa o Firebase SDK via tags `<script>` no `index.html`, você **não** precisa rodar `npm install firebase`. O comando `npm install` é usado em projetos Node.js ou que utilizam bundlers JavaScript.

### 2. Rodar Localmente

*   Abra o arquivo `index.html` no seu navegador.

### 3. Deploy no GitHub Pages

1.  Crie um repositório no GitHub (ex: `NossosDestinos`).
2.  Adicione os arquivos `index.html`, `style.css`, `script.js` e `README.md` ao repositório.
    ```bash
    git init
    git add .
    git commit -m "Commit inicial"
    git branch -M main
    # Substitua a URL abaixo pela URL SSH ou HTTPS do SEU repositório GitHub
    git remote add origin git@github.com:SEU_USUARIO/SEU_REPOSITORIO.git 
    git push -u origin main
    ```
    **Nota:** Se você já executou `git remote add origin` com uma URL incorreta, use `git remote set-url origin git@github.com:SEU_USUARIO/SEU_REPOSITORIO.git` para corrigi-la antes do `push`.
3.  No seu repositório GitHub, vá em "Settings" > "Pages".
4.  Em "Branch", selecione `main` (ou `master`) e a pasta `/ (root)`. Clique em "Save".
5.  Aguarde alguns minutos. O link da sua aplicação aparecerá nesta mesma página.

## Como Usar

*   Abra o link do GitHub Pages.
*   Digite o nome do lugar e uma descrição.
*   Opcionalmente, defina uma data planejada de visita.
*   **Novo:** Marque "Mostrar clima atual" para ver informações meteorológicas do destino.
*   Se já visitaram, marque como visitado e use o medidor visual para avaliar.
*   Clique em "Adicionar Destino".
*   O lugar aparecerá na lista e será salvo no Firebase, acessível para quem tiver o link.

## Funcionalidades

### 🗺️ Gerenciamento de Destinos
- Adicionar destinos com nome, descrição e data planejada
- Marcar destinos como visitados
- Sistema de avaliação visual (0-10) com emojis dinâmicos
- Reviews textuais das experiências

### 🌤️ Informações Meteorológicas
- Clima atual dos destinos (temperatura, descrição, umidade, vento)
- Integração com OpenWeatherMap API
- Exibição de ícones climáticos intuitivos
- Informações salvas junto com cada destino

### 📱 Interface Moderna
- Design responsivo para mobile e desktop
- Medidor visual interativo para avaliações
- Modal elegante para edição de avaliações
- Animações e feedback visual

### 🔧 Configuração de Clima

Para usar a funcionalidade completa de clima:

1. **Obter API Key Gratuita:**
   - Visite [OpenWeatherMap](https://openweathermap.org/api)
   - Crie uma conta gratuita
   - Obtenha sua API key

2. **Configurar na Aplicação:**
   - Clique em "Configurar API Key" na aplicação
   - Cole sua chave de API
   - A configuração fica salva no navegador

3. **Limite Gratuito:**
   - 1.000 chamadas por dia
   - Mais que suficiente para uso pessoal

**Nota:** A aplicação inclui uma chave demo para demonstração, mas é limitada. Para uso completo, configure sua própria chave gratuita.
