document.addEventListener('DOMContentLoaded', () => {
    // --- Configuração do Firebase ---
    // Cole aqui o objeto firebaseConfig fornecido pelo Firebase
    const firebaseConfig = {
      apiKey: "AIzaSyBc4MieHA7WCh066UolRmMqhqNVLHwFu1A", // MANTENHA AS ASPAS
      authDomain: "date-places-33bdf.firebaseapp.com",
      // Adicione a databaseURL aqui:
      databaseURL: "https://date-places-33bdf-default-rtdb.firebaseio.com",
      projectId: "date-places-33bdf",
      storageBucket: "date-places-33bdf.firebasestorage.app", 
      messagingSenderId: "438009745908",
      appId: "1:438009745908:web:dfa1cb188eb52cec0029a1",
      measurementId: "G-2FKGVZ6LWR"
    };

    // Inicializa o Firebase
    // Verifica se a configuração do Firebase parece válida antes de inicializar
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "SUA_API_KEY" || !firebaseConfig.projectId || !firebaseConfig.databaseURL) {
        console.error("Configuração do Firebase incompleta ou inválida. Verifique o objeto firebaseConfig em script.js.");
        alert("A configuração do Firebase está incompleta. A aplicação não poderá salvar ou carregar dados. Verifique o console para mais detalhes.");
        // Desabilita a funcionalidade principal se a configuração estiver incorreta
        const addPlaceButton = document.getElementById('addPlaceButton');
        if (addPlaceButton) {
            addPlaceButton.disabled = true;
            addPlaceButton.textContent = 'Firebase não configurado';
        }
        return; // Interrompe a execução se a config não for válida
    }
    
    // Verifica se o Firebase já foi inicializado para evitar erros (útil em alguns cenários de recarregamento)
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    
    const database = firebase.database(); // Usando Realtime Database
    const placesRef = database.ref('places');

    // --- Elementos do DOM ---
    const placeNameInput = document.getElementById('placeName');
    const placeDescriptionInput = document.getElementById('placeDescription');
    const addPlaceButton = document.getElementById('addPlaceButton');
    const placesList = document.getElementById('placesList');

    // --- Funções ---
    const addPlace = () => {
        const name = placeNameInput.value.trim();
        const description = placeDescriptionInput.value.trim();

        if (name === "") {
            alert("Por favor, insira o nome do lugar.");
            return;
        }

        const newPlace = {
            name: name,
            description: description,
            createdAt: new Date().toISOString() // Para ordenar ou referência
        };

        // Salva no Firebase
        placesRef.push(newPlace)
            .then(() => {
                placeNameInput.value = '';
                placeDescriptionInput.value = '';
                // A lista será atualizada automaticamente pelo listener 'child_added'
            })
            .catch(error => {
                console.error("Erro ao adicionar lugar: ", error);
                alert("Ocorreu um erro ao adicionar o lugar. Tente novamente.");
            });
    };

    const renderPlace = (placeId, placeData) => {
        const listItem = document.createElement('li');
        listItem.setAttribute('data-id', placeId);

        const placeNameSpan = document.createElement('span');
        placeNameSpan.textContent = placeData.name;

        const placeDescriptionSpan = document.createElement('span');
        placeDescriptionSpan.textContent = placeData.description ? ` (${placeData.description})` : '';
        placeDescriptionSpan.className = 'description';
        
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Remover';
        deleteButton.className = 'delete-button';
        deleteButton.onclick = () => {
            if (confirm(`Tem certeza que quer remover "${placeData.name}"?`)) {
                placesRef.child(placeId).remove()
                    .catch(error => console.error("Erro ao remover:", error));
            }
        };

        listItem.appendChild(placeNameSpan);
        listItem.appendChild(placeDescriptionSpan);
        listItem.appendChild(deleteButton);
        placesList.appendChild(listItem);
    };

    // --- Event Listeners ---
    addPlaceButton.addEventListener('click', addPlace);

    // Listener para quando um novo lugar é adicionado ao Firebase
    placesRef.on('child_added', (snapshot) => {
        renderPlace(snapshot.key, snapshot.val());
    });

    // Listener para quando um lugar é removido do Firebase
    placesRef.on('child_removed', (snapshot) => {
        const listItemToRemove = placesList.querySelector(`li[data-id="${snapshot.key}"]`);
        if (listItemToRemove) {
            placesList.removeChild(listItemToRemove);
        }
    });

    // Listener para quando um lugar é alterado (opcional, se você for implementar edição)
    // placesRef.on('child_changed', (snapshot) => {
    //     // Lógica para atualizar o item na lista
    // });

});
