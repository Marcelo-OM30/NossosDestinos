// Log inicial para verificar se o script está carregando
console.log('🚀 Script carregado: Iniciando aplicação Date Places...');

// Capturar erros globais
window.addEventListener('error', (event) => {
    console.error('❌ Erro global capturado:', event.message, event.filename, event.lineno);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Rejeição não tratada:', event.reason);
});

document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM carregado, iniciando configuração...');
    
    // --- Configuração do Firebase ---
    console.log('🔧 Configurando Firebase...');
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

    console.log('✅ Configuração Firebase carregada:', firebaseConfig.projectId);

    // Verificação da configuração
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.databaseURL) {
        console.error("Configuração do Firebase incompleta ou inválida.");
        showError("A configuração do Firebase está incompleta. Verifique o console para mais detalhes.");
        document.getElementById('addPlaceButton').disabled = true;
        return;
    }
    
    // Inicializar Firebase
    console.log('🔥 Inicializando Firebase...');
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log('✅ Firebase inicializado com sucesso');
    } else {
        console.log('✅ Firebase já estava inicializado');
    }
    
    console.log('🔗 Criando referências do Firebase...');
    const database = firebase.database();
    const auth = firebase.auth();
    const placesRef = database.ref('places');
    console.log('✅ Referências criadas com sucesso');

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
        placeLink: document.getElementById('placeLink'),
        plannedDate: document.getElementById('plannedDate'),
        placeVisited: document.getElementById('placeVisited'),
        visitedFields: document.getElementById('visitedFields'),
        placeReview: document.getElementById('placeReview'),
        placeRating: document.getElementById('placeRating'),
        ratingValue: document.getElementById('ratingValue'),
        ratingEmoji: document.getElementById('ratingEmoji'),
        ratingFill: document.getElementById('ratingFill'),
        addPlaceButton: document.getElementById('addPlaceButton'),
        placesList: document.getElementById('placesList'),
        testButton: document.getElementById('testButton'),
        // Elementos do modal
        ratingModal: document.getElementById('ratingModal'),
        modalPlaceName: document.getElementById('modalPlaceName'),
        modalReview: document.getElementById('modalReview'),
        modalRating: document.getElementById('modalRating'),
        modalRatingValue: document.getElementById('modalRatingValue'),
        modalRatingEmoji: document.getElementById('modalRatingEmoji'),
        modalRatingFill: document.getElementById('modalRatingFill'),
        modalRatingMeter: document.getElementById('modalRatingMeter'),
    };

    // Variável para armazenar o ID do lugar sendo avaliado no modal
    let currentRatingPlaceId = null;

    // Debug dos elementos principais
    console.log('Elementos do medidor:');
    console.log('ratingFill:', elements.ratingFill);
    console.log('ratingValue:', elements.ratingValue);
    console.log('ratingEmoji:', elements.ratingEmoji);

    // --- Funções auxiliares ---
    function showError(message) {
        console.error('❌ Erro:', message);
        
        // Tentar mostrar na interface se os elementos existirem
        const errorMessage = document.getElementById('errorMessage');
        const errorContainer = document.getElementById('errorContainer');
        
        if (errorMessage && errorContainer) {
            errorMessage.textContent = message;
            errorContainer.style.display = 'block';
        } else {
            // Se não conseguir mostrar na interface, pelo menos alertar
            console.warn('Elementos de erro não encontrados, usando alert');
            alert('Erro: ' + message);
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

    function getRatingEmoji(rating) {
        if (rating === 0) return '😭';
        if (rating <= 2) return '😞';
        if (rating <= 4) return '😐';
        if (rating <= 6) return '😊';
        if (rating <= 8) return '😍';
        return '🤩';
    }

    function generateStars(rating) {
        const fullStars = Math.floor(rating / 2);
        const hasHalfStar = rating % 2 === 1;
        let stars = '';
        
        // Para rating 0, mostrar apenas estrelas vazias
        if (rating === 0) {
            for (let i = 0; i < 5; i++) {
                stars += '<span class="star empty">☆</span>';
            }
            return stars;
        }
        
        for (let i = 0; i < fullStars; i++) {
            stars += '<span class="star">⭐</span>';
        }
        if (hasHalfStar) {
            stars += '<span class="star">⭐</span>';
        }
        for (let i = fullStars + (hasHalfStar ? 1 : 0); i < 5; i++) {
            stars += '<span class="star empty">☆</span>';
        }
        
        return stars;
    }

    function updateRatingDisplay(rating) {
        if (elements.ratingValue) {
            elements.ratingValue.textContent = rating;
        }
        if (elements.ratingEmoji) {
            elements.ratingEmoji.textContent = getRatingEmoji(parseInt(rating));
        }
        if (elements.ratingFill) {
            const percentage = (rating / 10) * 100;
            elements.ratingFill.style.width = percentage + '%';
        }
    }

    function formatDateBR(dateString) {
        if (!dateString) return null;
        
        // Se já está no formato brasileiro (DD/MM/AAAA)
        if (dateString.includes('/')) {
            return dateString;
        }
        
        // Se está no formato ISO (AAAA-MM-DD), converter para DD/MM/AAAA
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('pt-BR');
    }

    function parseBRDate(brDateString) {
        if (!brDateString || !brDateString.includes('/')) return null;
        
        const parts = brDateString.split('/');
        if (parts.length !== 3) return null;
        
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        
        // Validar se é uma data válida
        if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) {
            return null;
        }
        
        // Retornar no formato ISO para comparações
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }

    function isValidBRDate(dateString) {
        if (!dateString) return true; // Data vazia é válida
        
        const regex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
        if (!regex.test(dateString)) return false;
        
        return parseBRDate(dateString) !== null;
    }

    function isValidURL(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    function getDateStatus(plannedDateBR) {
        if (!plannedDateBR) return null;
        
        const plannedISO = parseBRDate(plannedDateBR);
        if (!plannedISO) return null;
        
        const today = new Date();
        const planned = new Date(plannedISO + 'T00:00:00');
        const diffTime = planned - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
            return { type: 'overdue', text: `Atrasado ${Math.abs(diffDays)} dia${Math.abs(diffDays) > 1 ? 's' : ''}`, emoji: '⏰' };
        } else if (diffDays === 0) {
            return { type: 'today', text: 'Hoje!', emoji: '🎉' };
        } else if (diffDays === 1) {
            return { type: 'tomorrow', text: 'Amanhã!', emoji: '📅' };
        } else if (diffDays <= 7) {
            return { type: 'this-week', text: `Em ${diffDays} dias`, emoji: '📅' };
        } else if (diffDays <= 30) {
            return { type: 'this-month', text: `Em ${diffDays} dias`, emoji: '📆' };
        } else {
            return { type: 'upcoming', text: `Em ${diffDays} dias`, emoji: '🗓️' };
        }
    }

    // --- Monitoramento de conexão ---
    function monitorConnection() {
        const connectedRef = database.ref('.info/connected');
        
        console.log('Monitorando conexão com o Firebase...');
        connectedRef.on('value', (snapshot) => {
            isConnected = snapshot.val() === true;
            console.log('Status de conexão:', isConnected ? 'Conectado' : 'Desconectado');
            updateConnectionStatus();
            
            if (isConnected) {
                console.log('✓ Conectado ao Firebase');
                retryCount = 0;
            } else {
                console.warn('✗ Desconectado do Firebase');
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
        const link = elements.placeLink.value.trim();
        const plannedDateBR = elements.plannedDate.value.trim();

        if (!name) {
            alert('Por favor, digite o nome do destino!');
            elements.placeName.focus();
            return;
        }

        // Validar formato da data se foi preenchida
        if (plannedDateBR && !isValidBRDate(plannedDateBR)) {
            alert('Por favor, digite a data no formato DD/MM/AAAA (ex: 25/12/2025)');
            elements.plannedDate.focus();
            return;
        }

        // Validar formato do link se foi preenchido
        if (link && !isValidURL(link)) {
            alert('Por favor, digite um link válido (deve começar com http:// ou https://)');
            elements.placeLink.focus();
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
                link: link || '',
                plannedDate: plannedDateBR || null,
                visited: false, // Sempre false para lugares novos
                review: '',
                rating: null,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                visitedAt: null
            };

            console.log('Adicionando lugar:', placeData);
            
            await placesRef.push(placeData);
            
            console.log('✓ Lugar adicionado com sucesso');
            
            // Limpar formulário
            elements.placeName.value = '';
            elements.placeDescription.value = '';
            elements.placeLink.value = '';
            elements.plannedDate.value = '';
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

    // --- Atualizar lugar (marcar como visitado) ---
    async function updatePlace(placeId, updates) {
        try {
            await placesRef.child(placeId).update(updates);
            console.log('✓ Lugar atualizado:', placeId);
        } catch (error) {
            console.error('✗ Erro ao atualizar lugar:', error);
            showError('Erro ao atualizar: ' + error.message);
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

        // Separar visitados e não visitados
        const notVisited = places.filter(place => !place.visited);
        const visited = places.filter(place => place.visited);

        // Ordenar não visitados por data planejada (mais próxima primeiro), depois por data de criação
        notVisited.sort((a, b) => {
            if (a.plannedDate && b.plannedDate) {
                const dateA = parseBRDate(a.plannedDate);
                const dateB = parseBRDate(b.plannedDate);
                if (dateA && dateB) {
                    return new Date(dateA) - new Date(dateB);
                }
            } else if (a.plannedDate && parseBRDate(a.plannedDate)) {
                return -1; // a vem primeiro (tem data válida)
            } else if (b.plannedDate && parseBRDate(b.plannedDate)) {
                return 1; // b vem primeiro (tem data válida)
            }
            return (b.createdAt || 0) - (a.createdAt || 0); // mais recente primeiro
        });

        // Ordenar visitados por data de visita (mais recente primeiro)
        visited.sort((a, b) => (b.visitedAt || b.createdAt || 0) - (a.visitedAt || a.createdAt || 0));

        // Exibir primeiro os não visitados, depois os visitados
        [...notVisited, ...visited].forEach((place) => {
            const li = document.createElement('li');
            li.className = `place-item ${place.visited ? 'visited' : ''}`;

            let content = `
                <div class="place-content">
                    <h3>
                        ${escapeHtml(place.name)}
                        ${place.visited ? '<span class="visited-badge">✓ Visitado</span>' : ''}
                    </h3>
                    ${place.description ? `<p>${escapeHtml(place.description)}</p>` : ''}
                    ${place.link ? `<p class="place-link">🔗 <a href="${escapeHtml(place.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(place.link)}</a></p>` : ''}
            `;            // Mostrar informações de data para não visitados
            if (!place.visited && place.plannedDate) {
                const dateStatus = getDateStatus(place.plannedDate);
                if (dateStatus) {
                    content += `
                        <div class="planned-date">
                            <span class="date-indicator ${dateStatus.type}">
                                ${dateStatus.emoji} ${dateStatus.text} (${place.plannedDate})
                            </span>
                        </div>
                    `;
                } else {
                    // Se tem data mas não é válida, mostrar como está
                    content += `
                        <div class="planned-date">
                            <span class="date-indicator">
                                📅 Planejado para ${place.plannedDate}
                            </span>
                        </div>
                    `;
                }
            }

            if (place.visited) {
                if (place.review) {
                    content += `<div class="place-review">"${escapeHtml(place.review)}"</div>`;
                }
                if (place.rating) {
                    content += `
                        <div class="place-rating">
                            <div class="rating-stars">${generateStars(place.rating)}</div>
                            <span><strong>${place.rating}/10</strong> ${getRatingEmoji(place.rating)}</span>
                        </div>
                    `;
                }
                content += `<small>Visitado ${formatDate(place.visitedAt || place.createdAt)}</small>`;
            } else {
                if (place.plannedDate) {
                    content += `<small>Criado ${formatDate(place.createdAt)} • Planejado para ${place.plannedDate}</small>`;
                } else {
                    content += `<small>Adicionado ${formatDate(place.createdAt)}</small>`;
                }
            }

            content += '</div>';

            // Botões de ação
            if (place.visited) {
                content += `
                    <div class="place-actions">
                        <button class="edit-toggle" onclick="window.editPlace('${place.id}')">
                            ✏️ Editar
                        </button>
                        <button class="unvisit-toggle" onclick="window.unmarkAsVisited('${place.id}')">
                            ↩️ Desmarcar visitado
                        </button>
                    </div>
                `;
            } else {
                content += `
                    <div class="place-actions">
                        <button class="edit-toggle" onclick="window.markAsVisited('${place.id}')">
                            ✓ Marcar como visitado
                        </button>
                        <button class="edit-toggle" onclick="window.editPlannedDate('${place.id}', '${place.plannedDate || ''}')" style="background-color: #6c757d;">
                            📅 Previsão da visita
                        </button>
                    </div>
                `;
            }

            li.innerHTML = content;
            elements.placesList.appendChild(li);
        });
    }

    // --- Funções do Modal de Avaliação ---
    function openRatingModal(placeId, placeName, currentReview = '', currentRating = 5) {
        currentRatingPlaceId = placeId;
        
        if (elements.modalPlaceName) {
            elements.modalPlaceName.textContent = placeName;
        }
        
        if (elements.modalReview) {
            elements.modalReview.value = currentReview;
        }
        
        if (elements.modalRating) {
            elements.modalRating.value = currentRating;
        }
        
        // Atualizar display do medidor modal
        updateModalRatingDisplay(currentRating);
        
        // Mostrar modal
        if (elements.ratingModal) {
            elements.ratingModal.style.display = 'flex';
        }
        
        // Inicializar eventos do medidor modal
        initializeModalRatingMeter();
    }

    function closeRatingModal() {
        if (elements.ratingModal) {
            elements.ratingModal.style.display = 'none';
        }
        currentRatingPlaceId = null;
    }

    function updateModalRatingDisplay(rating) {
        if (elements.modalRatingValue) {
            elements.modalRatingValue.textContent = rating;
        }
        if (elements.modalRatingEmoji) {
            elements.modalRatingEmoji.textContent = getRatingEmoji(parseInt(rating));
        }
        if (elements.modalRatingFill) {
            const percentage = (rating / 10) * 100;
            elements.modalRatingFill.style.width = percentage + '%';
        }
    }

    function initializeModalRatingMeter() {
        const meter = elements.modalRatingMeter;
        const scale = meter ? meter.querySelector('.rating-scale') : null;
        
        if (!meter || !scale) {
            console.warn('Medidor modal não encontrado');
            return;
        }

        let isDragging = false;

        function updateRatingFromPosition(clientX) {
            const rect = scale.getBoundingClientRect();
            const x = clientX - rect.left;
            const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
            const rating = Math.round((percentage / 100) * 10);
            
            if (elements.modalRating) {
                elements.modalRating.value = rating;
            }
            updateModalRatingDisplay(rating);
        }

        // Mouse events
        scale.addEventListener('mousedown', (e) => {
            isDragging = true;
            updateRatingFromPosition(e.clientX);
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                updateRatingFromPosition(e.clientX);
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // Touch events para mobile
        scale.addEventListener('touchstart', (e) => {
            isDragging = true;
            const touch = e.touches[0];
            updateRatingFromPosition(touch.clientX);
            e.preventDefault();
        });

        document.addEventListener('touchmove', (e) => {
            if (isDragging) {
                const touch = e.touches[0];
                updateRatingFromPosition(touch.clientX);
                e.preventDefault();
            }
        });

        document.addEventListener('touchend', () => {
            isDragging = false;
        });
    }

    async function saveRating() {
        if (!currentRatingPlaceId) return;
        
        const review = elements.modalReview ? elements.modalReview.value : '';
        const rating = elements.modalRating ? parseInt(elements.modalRating.value) : 5;
        
        const updates = {
            visited: true,
            review: review || '',
            rating: rating,
            visitedAt: firebase.database.ServerValue.TIMESTAMP
        };
        
        try {
            await updatePlace(currentRatingPlaceId, updates);
            closeRatingModal();
        } catch (error) {
            console.error('Erro ao salvar avaliação:', error);
            showError('Erro ao salvar avaliação: ' + error.message);
        }
    }

    // Expor funções globalmente para uso nos botões
    window.openRatingModal = openRatingModal;
    window.closeRatingModal = closeRatingModal;
    window.saveRating = saveRating;

    // Expor funções globalmente para uso nos botões
    window.updatePlace = updatePlace;
    
    window.markAsVisited = async (placeId) => {
        // Buscar dados do lugar para exibir o nome no modal
        try {
            const snapshot = await placesRef.child(placeId).once('value');
            const place = snapshot.val();
            
            if (!place) {
                showError('Lugar não encontrado');
                return;
            }
            
            // Abrir modal de avaliação
            openRatingModal(placeId, place.name, '', 5);
        } catch (error) {
            console.error('Erro ao buscar dados do lugar:', error);
            showError('Erro ao carregar dados do lugar');
        }
    };

    window.unmarkAsVisited = async (placeId) => {
        if (confirm('Tem certeza que deseja desmarcar este lugar como visitado?\nIsso removerá a avaliação e comentários.')) {
            const updates = {
                visited: false,
                review: null,
                rating: null,
                visitedAt: null
            };
            await updatePlace(placeId, updates);
        }
    };

    window.editPlace = async (placeId) => {
        // Buscar dados atuais do lugar
        try {
            const snapshot = await placesRef.child(placeId).once('value');
            const place = snapshot.val();
            
            if (!place) {
                showError('Lugar não encontrado');
                return;
            }

            // Abrir modal de avaliação com dados atuais
            openRatingModal(placeId, place.name, place.review || '', place.rating || 5);
        } catch (error) {
            console.error('Erro ao editar lugar:', error);
            showError('Erro ao carregar dados para edição');
        }
    };

    window.editPlannedDate = async (placeId, currentDate) => {
        // Armazenar o ID do lugar que está sendo editado
        window.currentEditingPlaceId = placeId;
        
        // Preencher o campo com a data atual
        const modalDateField = document.getElementById('modalPlannedDate');
        if (modalDateField) {
            modalDateField.value = currentDate || '';
        }
        
        // Mostrar o modal
        const modal = document.getElementById('editDateModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    };
    
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
    console.log('🚀 Iniciando aplicação...');
    
    // Testar se Firebase está disponível
    if (typeof firebase === 'undefined') {
        console.error('❌ Firebase não está carregado!');
        showError('Firebase não foi carregado. Verifique a conexão com a internet e recarregue a página.');
        return;
    }
    
    console.log('✅ Firebase está disponível');
    
    // Iniciar monitoramento e autenticação
    try {
        monitorConnection();
        authenticate().then(() => {
            console.log('🎉 Autenticação concluída, carregando dados...');
            loadPlaces();
        }).catch(error => {
            console.error('❌ Erro na autenticação:', error);
            showError('Erro ao autenticar. Verifique as configurações do Firebase.');
        });
    } catch (error) {
        console.error('❌ Erro fatal na inicialização:', error);
        showError('Erro fatal na inicialização: ' + error.message);
    }

    // Cleanup ao sair da página
    window.addEventListener('beforeunload', () => {
        if (placesListener) {
            placesRef.off('value', placesListener);
        }
    });

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

    // Inicializar medidor do formulário principal
    initializeMainRatingMeter();

    // Event listener para fechar modal ao clicar fora
    if (elements.ratingModal) {
        elements.ratingModal.addEventListener('click', (e) => {
            if (e.target === elements.ratingModal) {
                closeRatingModal();
            }
        });
    }

    // Event listener para fechar modal de data ao clicar fora
    const editDateModal = document.getElementById('editDateModal');
    if (editDateModal) {
        editDateModal.addEventListener('click', (e) => {
            if (e.target === editDateModal) {
                closeEditDateModal();
            }
        });
    }

    // Formatação automática da data BR no campo de data do formulário principal
    if (elements.plannedDate) {
        elements.plannedDate.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, ''); // Remove não-dígitos
            
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2);
            }
            if (value.length >= 5) {
                value = value.substring(0, 5) + '/' + value.substring(5, 9);
            }
            
            e.target.value = value;
            
            // Validação visual
            if (value.length === 10) {
                if (isValidBRDate(value)) {
                    e.target.classList.remove('invalid');
                    e.target.classList.add('valid');
                } else {
                    e.target.classList.remove('valid');
                    e.target.classList.add('invalid');
                }
            } else {
                e.target.classList.remove('valid', 'invalid');
            }
        });
    }

    // Formatação automática da data BR no campo de data do modal
    const modalPlannedDate = document.getElementById('modalPlannedDate');
    if (modalPlannedDate) {
        modalPlannedDate.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, ''); // Remove não-dígitos
            
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2);
            }
            if (value.length >= 5) {
                value = value.substring(0, 5) + '/' + value.substring(5, 9);
            }
            
            e.target.value = value;
            
            // Validação visual
            if (value.length === 10) {
                if (isValidBRDate(value)) {
                    e.target.classList.remove('invalid');
                    e.target.classList.add('valid');
                } else {
                    e.target.classList.remove('valid');
                    e.target.classList.add('invalid');
                }
            } else {
                e.target.classList.remove('valid', 'invalid');
            }
        });
    }

    // Função para inicializar o medidor do formulário principal
    function initializeMainRatingMeter() {
        const meter = document.querySelector('.rating-meter');
        const scale = meter ? meter.querySelector('.rating-scale') : null;
        
        if (!meter || !scale) {
            console.warn('Medidor principal não encontrado');
            return;
        }

        let isDragging = false;

        function updateRatingFromPosition(clientX) {
            const rect = scale.getBoundingClientRect();
            const x = clientX - rect.left;
            const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
            const rating = Math.round((percentage / 100) * 10);
            
            if (elements.placeRating) {
                elements.placeRating.value = rating;
            }
            updateRatingDisplay(rating);
        }

        // Mouse events
        scale.addEventListener('mousedown', (e) => {
            isDragging = true;
            updateRatingFromPosition(e.clientX);
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                updateRatingFromPosition(e.clientX);
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // Touch events para mobile
        scale.addEventListener('touchstart', (e) => {
            isDragging = true;
            const touch = e.touches[0];
            updateRatingFromPosition(touch.clientX);
            e.preventDefault();
        });

        document.addEventListener('touchmove', (e) => {
            if (isDragging) {
                const touch = e.touches[0];
                updateRatingFromPosition(touch.clientX);
                e.preventDefault();
            }
        });

        document.addEventListener('touchend', () => {
            isDragging = false;
        });
    }

    // Função para fechar o modal de edição de previsão de visita
    function closeEditDateModal() {
        const modal = document.getElementById('editDateModal');
        if (modal) {
            modal.style.display = 'none';
        }
        window.currentEditingPlaceId = null;
    }

    // Função para salvar a nova previsão de visita
    async function savePlannedDate() {
        const newDate = document.getElementById('modalPlannedDate').value.trim();
        const placeId = window.currentEditingPlaceId;
        
        if (!placeId) {
            alert('Erro: ID do lugar não encontrado.');
            return;
        }
        
        // Validar formato da data se foi preenchida
        if (newDate && !isValidBRDate(newDate)) {
            alert('Por favor, digite a data no formato DD/MM/AAAA (ex: 25/12/2025)');
            return;
        }
        
        try {
            const updates = {
                plannedDate: newDate || null
            };
            await updatePlace(placeId, updates);
            console.log('✓ Previsão de visita atualizada:', newDate || 'removida');
            closeEditDateModal();
        } catch (error) {
            console.error('Erro ao atualizar previsão de visita:', error);
            showError('Erro ao atualizar previsão de visita: ' + error.message);
        }
    }

    // Expor funções globalmente
    window.closeEditDateModal = closeEditDateModal;
    window.savePlannedDate = savePlannedDate;
});
