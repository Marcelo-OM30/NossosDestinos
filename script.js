document.addEventListener('DOMContentLoaded', () => {
    // --- Configuração do Firebase ---
    const firebaseConfig = {
      apiKey: "AIzaSyBc4MieHA7WCh066UolRmMqhqNVLHwFu1A",
      authDomain: "date-places-33bdf.firebaseapp.com",
      databaseURL: "https://date-places-33bdf-default-rtdb.firebaseio.com",
      projectId: "date-places-33bdf",
      storageBucket: "date-places-33bdf.firebasestorage.app", 
      messagingSenderId: "438009745908",
      appId: "1:438009745908:web:dfa1cb188eb52cec0029a1",
      measurementId: "G-2FKGVZ6LWR"
    };

    // Verificação da configuração
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.databaseURL) {
        console.error("Configuração do Firebase incompleta ou inválida.");
        showError("A configuração do Firebase está incompleta. Verifique o console para mais detalhes.");
        document.getElementById('addPlaceButton').disabled = true;
        return;
    }
    
    // Inicializar Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    
    const database = firebase.database();
    const auth = firebase.auth();
    const placesRef = database.ref('places');

    // --- Variáveis globais ---
    let currentUser = null;
    let isConnected = false;
    let placesListener = null;
    let retryCount = 0;
    const maxRetries = 3;

    // --- Elementos do DOM ---
    const elements = {
        connectionStatus: document.getElementById('connectionStatus'),
        statusIndicator: document.getElementById('statusIndicator'),
        statusText: document.getElementById('statusText'),
        errorContainer: document.getElementById('errorContainer'),
        errorMessage: document.getElementById('errorMessage'),
        reloadButton: document.getElementById('reloadButton'),
        loadingIndicator: document.getElementById('loadingIndicator'),
        placeName: document.getElementById('placeName'),
        placeDescription: document.getElementById('placeDescription'),
        addPlaceButton: document.getElementById('addPlaceButton'),
        placesList: document.getElementById('placesList'),
        testButton: document.getElementById('testButton')
    };

    // --- Funções auxiliares ---
    function showError(message) {
        console.error('Erro:', message);
        if (elements.errorMessage && elements.errorContainer) {
            elements.errorMessage.textContent = message;
            elements.errorContainer.style.display = 'block';
        }
    }

    function hideError() {
        if (elements.errorContainer) {
            elements.errorContainer.style.display = 'none';
        }
    }

    function setLoading(loading) {
        if (elements.addPlaceButton) {
            elements.addPlaceButton.disabled = loading;
            elements.addPlaceButton.textContent = loading ? 'Salvando...' : 'Adicionar Destino';
        }
    }

    function hideLoading() {
        if (elements.loadingIndicator) {
            elements.loadingIndicator.style.display = 'none';
        }
    }

    function updateConnectionStatus() {
        if (!elements.connectionStatus) return;
        
        const status = elements.connectionStatus;
        const text = elements.statusText;
        
        status.className = 'connection-status';
        
        if (isConnected && currentUser) {
            status.classList.add('connected');
            text.textContent = 'Conectado';
        } else if (isConnected && !currentUser) {
            status.classList.add('checking');
            text.textContent = 'Autenticando...';
        } else {
            status.classList.add('disconnected');
            text.textContent = 'Desconectado';
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatDate(timestamp) {
        if (!timestamp) return 'Data desconhecida';
        return new Date(timestamp).toLocaleDateString('pt-BR');
    }

    // --- Monitoramento de conexão ---
    function monitorConnection() {
        const connectedRef = database.ref('.info/connected');
        
        connectedRef.on('value', (snapshot) => {
            isConnected = snapshot.val() === true;
            updateConnectionStatus();
            
            if (isConnected) {
                console.log('✓ Conectado ao Firebase');
                retryCount = 0;
            } else {
                console.log('✗ Desconectado do Firebase');
            }
        });
    }

    // --- Autenticação ---
    async function authenticate() {
        try {
            console.log('Iniciando autenticação...');
            
            return new Promise((resolve, reject) => {
                // Verificar se o auth está configurado
                auth.onAuthStateChanged(async (user) => {
                    if (user) {
                        currentUser = user;
                        console.log('✓ Usuário autenticado:', user.uid);
                        updateConnectionStatus();
                        resolve(user);
                    } else {
                        try {
                            console.log('Tentando login anônimo...');
                            const result = await auth.signInAnonymously();
                            currentUser = result.user;
                            console.log('✓ Login anônimo realizado:', result.user.uid);
                            updateConnectionStatus();
                            resolve(result.user);
                        } catch (error) {
                            console.error('✗ Erro na autenticação:', error);
                            
                            // Se o erro for de configuração, tentar modo de compatibilidade
                            if (error.code === 'auth/configuration-not-found' || 
                                error.message.includes('CONFIGURATION_NOT_FOUND')) {
                                console.log('⚠️ Authentication não configurado, usando modo compatibilidade');
                                
                                // Simular usuário autenticado para compatibilidade
                                currentUser = { uid: 'anonymous-user-' + Date.now() };
                                updateConnectionStatus();
                                resolve(currentUser);
                            } else {
                                showError('Erro de autenticação. Verifique se o Firebase Authentication está habilitado.');
                                reject(error);
                            }
                        }
                    }
                });
            });
        } catch (error) {
            console.error('Erro fatal na autenticação:', error);
            showError('Falha na autenticação');
            throw error;
        }
    }

    // --- Carregar lugares ---
    async function loadPlaces() {
        try {
            console.log('Carregando lugares...');
            
            if (!currentUser) {
                await authenticate();
            }

            // Remover listener anterior se existir
            if (placesListener) {
                placesRef.off('value', placesListener);
            }

            placesListener = placesRef.on('value', 
                (snapshot) => {
                    try {
                        const data = snapshot.val();
                        const places = data ? Object.keys(data).map(key => ({
                            id: key,
                            ...data[key]
                        })) : [];
                        
                        console.log('✓ Lugares carregados:', places.length);
                        displayPlaces(places);
                        hideLoading();
                        hideError();
                    } catch (error) {
                        console.error('Erro ao processar dados:', error);
                        showError('Erro ao processar dados dos lugares');
                    }
                },
                (error) => {
                    console.error('✗ Erro ao carregar lugares:', error);
                    
                    if (error.code === 'PERMISSION_DENIED') {
                        showError('Erro de permissão. Verifique as configurações do Firebase.');
                    } else if (retryCount < maxRetries) {
                        retryCount++;
                        console.log(`Tentativa ${retryCount}/${maxRetries} em 3 segundos...`);
                        setTimeout(() => loadPlaces(), 3000);
                    } else {
                        showError('Não foi possível carregar os dados após várias tentativas.');
                    }
                    
                    hideLoading();
                }
            );

        } catch (error) {
            console.error('Erro fatal ao carregar lugares:', error);
            showError('Erro ao conectar com o banco de dados');
            hideLoading();
        }
    }

    // --- Adicionar lugar ---
    async function addPlace() {
        const name = elements.placeName.value.trim();
        const description = elements.placeDescription.value.trim();

        if (!name) {
            alert('Por favor, digite o nome do destino!');
            elements.placeName.focus();
            return;
        }

        try {
            setLoading(true);
            
            if (!currentUser) {
                await authenticate();
            }

            if (!isConnected) {
                throw new Error('Sem conexão com o Firebase');
            }

            const placeData = {
                name: name,
                description: description || '',
                createdAt: firebase.database.ServerValue.TIMESTAMP
            };

            console.log('Adicionando lugar:', placeData);
            
            await placesRef.push(placeData);
            
            console.log('✓ Lugar adicionado com sucesso');
            
            // Limpar formulário
            elements.placeName.value = '';
            elements.placeDescription.value = '';
            elements.placeName.focus();
            
            hideError();

        } catch (error) {
            console.error('✗ Erro ao adicionar lugar:', error);
            
            if (error.code === 'PERMISSION_DENIED') {
                showError('Erro de permissão. Verifique as configurações do Firebase.');
            } else if (error.message.includes('network') || error.message.includes('conexão')) {
                showError('Erro de conexão. Verifique sua internet.');
            } else {
                showError('Erro ao salvar: ' + error.message);
            }
        } finally {
            setLoading(false);
        }
    }

    // --- Remover lugar ---
    async function removePlace(placeId) {
        if (!confirm('Tem certeza que deseja remover este destino?')) {
            return;
        }

        try {
            await placesRef.child(placeId).remove();
            console.log('✓ Lugar removido:', placeId);
        } catch (error) {
            console.error('✗ Erro ao remover lugar:', error);
            showError('Erro ao remover: ' + error.message);
        }
    }

    // --- Exibir lugares ---
    function displayPlaces(places) {
        if (!elements.placesList) return;
        
        elements.placesList.innerHTML = '';

        if (places.length === 0) {
            elements.placesList.innerHTML = '<li class="empty-message">Nenhum destino adicionado ainda. Que tal começar? 😊</li>';
            return;
        }

        // Ordenar por data de criação (mais recente primeiro)
        places.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        places.forEach((place) => {
            const li = document.createElement('li');
            li.className = 'place-item';

            li.innerHTML = `
                <div class="place-content">
                    <h3>${escapeHtml(place.name)}</h3>
                    ${place.description ? `<p>${escapeHtml(place.description)}</p>` : ''}
                    <small>Adicionado ${formatDate(place.createdAt)}</small>
                </div>
                <button class="remove-btn" onclick="window.removePlaceById('${place.id}')">
                    🗑️ Remover
                </button>
            `;

            elements.placesList.appendChild(li);
        });
    }

    // --- Event Listeners ---
    if (elements.addPlaceButton) {
        elements.addPlaceButton.addEventListener('click', addPlace);
    }

    if (elements.testButton) {
        elements.testButton.addEventListener('click', () => {
            console.clear();
            console.log('Botão de teste clicado! Executando diagnósticos...');
            window.runDiagnostics();
        });
    } else {
        console.warn('Botão de teste não encontrado!');
    }

    // Enter nos inputs
    if (elements.placeName) {
        elements.placeName.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addPlace();
        });
    }
    
    if (elements.placeDescription) {
        elements.placeDescription.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addPlace();
        });
    }

    // --- Expor funções globalmente ---
    window.removePlaceById = removePlace;
    
    // Função de diagnóstico melhorada
    window.runDiagnostics = async () => {
        console.log('=== DIAGNÓSTICO DA APLICAÇÃO ===');
        console.log('1. Status de conexão:', isConnected ? '✅ OK' : '❌ FALHA');
        console.log('2. Usuário autenticado:', currentUser ? '✅ OK' : '❌ FALHA');
        console.log('3. Configuração Firebase:', firebaseConfig.databaseURL ? '✅ OK' : '❌ FALHA');
        
        // Testar conexão com database
        try {
            const connectedRef = database.ref('.info/connected');
            const snapshot = await connectedRef.once('value');
            console.log('4. Conexão Database:', snapshot.val() ? '✅ OK' : '❌ FALHA');
        } catch (error) {
            console.log('4. Conexão Database: ❌ FALHA -', error.message);
        }
        
        // Testar leitura
        try {
            const placesSnapshot = await placesRef.once('value');
            const data = placesSnapshot.val();
            const count = data ? Object.keys(data).length : 0;
            console.log(`5. Teste de leitura: ✅ OK - Encontrados ${count} itens`);
        } catch (error) {
            console.log('5. Teste de leitura: ❌ FALHA -', error.message);
        }
        
        // Testar escrita
        if (currentUser && isConnected) {
            try {
                const testRef = database.ref('test').push();
                await testRef.set({ test: true, timestamp: Date.now() });
                await testRef.remove();
                console.log('6. Teste de escrita: ✅ OK');
            } catch (error) {
                console.log('6. Teste de escrita: ❌ FALHA -', error.message);
            }
        } else {
            console.log('6. Teste de escrita: ⏭️ PULADO (sem auth/conexão)');
        }
        
        console.log('=== DIAGNÓSTICO CONCLUÍDO ===');
        console.log('💡 Dica: Se tudo estiver OK, sua aplicação está funcionando perfeitamente!');
    };

    // Função para testar diretamente
    window.testApp = () => {
        console.clear();
        console.log('🔧 Testando aplicação...');
        window.runDiagnostics();
    };

    // --- Inicialização ---
    console.log('=== INICIANDO DATE PLACES APP ===');
    monitorConnection();
    authenticate().then(() => {
        loadPlaces();
    }).catch(error => {
        console.error('Erro na inicialização:', error);
        showError('Falha na inicialização da aplicação');
    });

    // Cleanup ao sair da página
    window.addEventListener('beforeunload', () => {
        if (placesListener) {
            placesRef.off('value', placesListener);
        }
    });
});
