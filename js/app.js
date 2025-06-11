// Variáveis globais
let touristData = null;
let mainMap = null;
let municipalityMap = null;
let currentMunicipality = null;
let currentPoint = null;

// Carregar dados do arquivo JSON
async function loadTouristData() {
    try {
        const response = await fetch('data/municipios.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        touristData = await response.json();
        console.log('Dados carregados com sucesso:', touristData);
        return touristData;
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        // Fallback para dados simulados se o JSON não carregar
        return getFallbackData();
    }
}

// Dados de fallback (caso o JSON não carregue)
function getFallbackData() {
    return {
        polo_turistico: {
            nome: "Lençóis Maranhenses e Região",
            centro: { lat: -2.6, lng: -43.0 }
        },
        municipios: [
            {
                id: 'barreirinhas',
                nome: 'Barreirinhas',
                coordenadas: { lat: -2.7483, lng: -42.8251 },
                informacoes: {
                    populacao: '62.000 habitantes',
                    area: '3.111 km²',
                    descricao: 'Portal de entrada dos Lençóis Maranhenses'
                },
                pontos_turisticos: [
                    {
                        id: 'lagoa_azul',
                        nome: 'Lagoa Azul',
                        coordenadas: { lat: -2.7400, lng: -42.8200 },
                        tipo: 'natureza',
                        descricao: 'Uma das lagoas mais famosas dos Lençóis Maranhenses',
                        atividades: ['Banho', 'Fotografia', 'Contemplação'],
                        midia: { 
                            fotos: ['https://via.placeholder.com/400x300/4287f5/ffffff?text=Lagoa+Azul'],
                            videos: []
                        }
                    }
                ]
            }
        ]
    };
}

// Inicializar aplicação
async function initApp() {
    try {
        // Mostrar loading
        showLoading(true);
        
        // Carregar dados
        touristData = await loadTouristData();
        
        // Inicializar interface
        updateStats();
        showMainMap();
        
        // Esconder loading
        showLoading(false);
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showError('Erro ao carregar dados. Tente recarregar a página.');
    }
}

// Mostrar/esconder loading
function showLoading(show) {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
        loadingEl.style.display = show ? 'block' : 'none';
    }
}

// Mostrar erro
function showError(message) {
    const errorEl = document.createElement('div');
    errorEl.className = 'alert alert-danger alert-dismissible fade show';
    errorEl.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.insertBefore(errorEl, document.body.firstChild);
}

// Atualizar estatísticas
function updateStats() {
    if (!touristData) return;
    
    const totalMunicipios = touristData.municipios.length;
    const totalPontos = touristData.municipios.reduce((acc, m) => acc + m.pontos_turisticos.length, 0);
    const totalFotos = touristData.municipios.reduce((acc, m) => 
        acc + m.pontos_turisticos.reduce((acc2, p) => acc2 + (p.midia?.fotos?.length || 0), 0), 0);
    
    // Atualizar elementos da página
    const statsElements = {
        'municipios-count': totalMunicipios,
        'pontos-count': totalPontos + '+',
        'fotos-count': totalFotos + '+'
    };
    
    Object.entries(statsElements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });
}

// Inicializar mapa principal
function initMainMap() {
    if (!touristData) return;
    
    const centro = touristData.polo_turistico.centro;
    mainMap = L.map('mainMap').setView([centro.lat, centro.lng], 9);
    
    // Adicionar tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(mainMap);

    // Adicionar marcadores dos municípios
    touristData.municipios.forEach(municipio => {
        const coords = municipio.coordenadas;
        const marker = L.marker([coords.lat, coords.lng])
            .bindPopup(createMunicipalityPopup(municipio))
            .addTo(mainMap);
    });
}

// Criar popup do município
function createMunicipalityPopup(municipio) {
    return `
        <div class="text-center">
            <h5>${municipio.nome}</h5>
            <p class="small">${municipio.informacoes.descricao}</p>
            <div class="mb-2">
                <small><strong>População:</strong> ${municipio.informacoes.populacao}</small><br>
                <small><strong>Área:</strong> ${municipio.informacoes.area}</small>
            </div>
            <button class="btn btn-custom btn-sm" onclick="showMunicipality('${municipio.id}')">
                Explorar <i class="fas fa-arrow-right ms-1"></i>
            </button>
        </div>
    `;
}

// Mostrar mapa principal
function showMainMap() {
    document.getElementById('mainMapSection').style.display = 'block';
    document.getElementById('municipalitySection').style.display = 'none';
    document.getElementById('breadcrumb').style.display = 'none';
    
    if (!mainMap && touristData) {
        setTimeout(initMainMap, 100);
    } else if (mainMap) {
        mainMap.invalidateSize();
    }
}

// Mostrar município específico
function showMunicipality(municipalityId) {
    if (!touristData) return;
    
    const municipio = touristData.municipios.find(m => m.id === municipalityId);
    if (!municipio) return;

    currentMunicipality = municipio;
    
    // Atualizar interface
    document.getElementById('mainMapSection').style.display = 'none';
    document.getElementById('municipalitySection').style.display = 'block';
    document.getElementById('breadcrumb').style.display = 'block';
    
    // Atualizar breadcrumb
    updateBreadcrumb(municipio.nome);
    
    // Atualizar header e informações
    updateMunicipalityInfo(municipio);
    
    // Inicializar mapa do município
    setTimeout(() => initMunicipalityMap(municipio), 100);
    
    // Criar cards dos pontos turísticos
    createTouristPointCards(municipio.pontos_turisticos);
}

// Atualizar breadcrumb
function updateBreadcrumb(municipioNome) {
    document.getElementById('breadcrumbList').innerHTML = `
        <li class="breadcrumb-item">
            <a href="#" onclick="showMainMap()">Polo Turístico</a>
        </li>
        <li class="breadcrumb-item active">${municipioNome}</li>
    `;
}

// Atualizar informações do município
function updateMunicipalityInfo(municipio) {
    document.getElementById('municipalityName').textContent = municipio.nome;
    document.getElementById('municipalityHeader').className = 'card-header text-white bg-primary';
    
    const info = municipio.informacoes;
    document.getElementById('municipalityInfo').innerHTML = `
        <h6><i class="fas fa-info-circle text-primary me-2"></i>Sobre ${municipio.nome}</h6>
        <p>${info.descricao}</p>
        <hr>
        <div class="row">
            <div class="col-6">
                <strong><i class="fas fa-users text-info me-1"></i>População:</strong><br>
                <small>${info.populacao}</small>
            </div>
            <div class="col-6">
                <strong><i class="fas fa-map text-success me-1"></i>Área:</strong><br>
                <small>${info.area}</small>
            </div>
        </div>
        ${info.economia ? `
            <hr>
            <strong><i class="fas fa-chart-line text-warning me-1"></i>Economia:</strong><br>
            <small>${info.economia}</small>
        ` : ''}
        ${info.melhor_epoca ? `
            <hr>
            <strong><i class="fas fa-calendar text-primary me-1"></i>Melhor Época:</strong><br>
            <small>${info.melhor_epoca}</small>
        ` : ''}
    `;
}

// Inicializar mapa do município
function initMunicipalityMap(municipio) {
    if (municipalityMap) {
        municipalityMap.remove();
    }
    
    const coords = municipio.coordenadas;
    municipalityMap = L.map('municipalityMap').setView([coords.lat, coords.lng], 12);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(municipalityMap);

    // Adicionar marcadores dos pontos turísticos
    municipio.pontos_turisticos.forEach(ponto => {
        const coords = ponto.coordenadas;
        const iconClass = getIconClass(ponto.tipo);
        const iconColor = getIconColor(ponto.tipo);
        
        const customIcon = L.divIcon({
            html: `<div style="background: ${iconColor}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px;"><i class="${iconClass}"></i></div>`,
            className: 'custom-marker',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        
        const marker = L.marker([coords.lat, coords.lng], { icon: customIcon })
            .bindPopup(createTouristPointPopup(ponto))
            .addTo(municipalityMap);
    });
}

// Criar popup do ponto turístico
function createTouristPointPopup(ponto) {
    return `
        <div class="text-center">
            <h6>${ponto.nome}</h6>
            <p class="small">${ponto.descricao}</p>
            <button class="btn btn-custom btn-sm" onclick="showTouristPointModal('${ponto.id}')">
                Ver Detalhes <i class="fas fa-eye ms-1"></i>
            </button>
        </div>
    `;
}

// Criar cards dos pontos turísticos
function createTouristPointCards(pontosTuristicos) {
    const container = document.getElementById('touristPointsContainer');
    container.innerHTML = '';
    
    pontosTuristicos.forEach(ponto => {
        const iconClass = getIconClass(ponto.tipo);
        const cardClass = getCardClass(ponto.tipo);
        
        const card = document.createElement('div');
        card.className = 'col-md-6 col-lg-4';
        card.innerHTML = `
            <div class="card tourist-point-card ${cardClass}" onclick="showTouristPointModal('${ponto.id}')">
                <div class="card-body">
                    <div class="icon-badge ${ponto.tipo}-icon">
                        <i class="${iconClass}"></i>
                    </div>
                    <h5 class="card-title">${ponto.nome}</h5>
                    <p class="card-text">${ponto.descricao}</p>
                    <div class="d-flex flex-wrap gap-1 mb-3">
                        ${ponto.atividades.map(atividade => 
                            `<span class="badge bg-secondary">${atividade}</span>`
                        ).join('')}
                    </div>
                    <button class="btn btn-custom btn-sm">
                        <i class="fas fa-eye me-1"></i>Ver Detalhes
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Mostrar modal do ponto turístico
function showTouristPointModal(pontoId) {
    if (!currentMunicipality) return;
    
    const ponto = currentMunicipality.pontos_turisticos.find(p => p.id === pontoId);
    if (!ponto) return;
    
    currentPoint = ponto;
    
    document.getElementById('modalTitle').innerHTML = `
        <i class="${getIconClass(ponto.tipo)} me-2"></i>${ponto.nome}
    `;
    
    const modalContent = createModalContent(ponto);
    document.getElementById('modalBody').innerHTML = modalContent;
    
    new bootstrap.Modal(document.getElementById('touristPointModal')).show();
}

// Criar conteúdo do modal
function createModalContent(ponto) {
    const fotos = ponto.midia?.fotos || [];
    const videos = ponto.midia?.videos || [];
    const infraestrutura = ponto.infraestrutura || {};
    const dadosCampo = ponto.dados_campo || {};
    
    return `
        <div class="row">
            <div class="col-md-6">
                ${fotos.length > 0 ? `
                    <div class="mb-3">
                        ${fotos.map(foto => `
                            <img src="${foto}" class="modal-img img-fluid mb-2" alt="${ponto.nome}" 
                                 onerror="this.src='https://via.placeholder.com/400x300/cccccc/ffffff?text=Foto+Indisponível'"
                                 style="border-radius: 8px;">
                        `).join('')}
                    </div>
                ` : ''}
                
                ${videos.length > 0 ? `
                    <div class="mb-3">
                        <h6><i class="fas fa-video text-danger me-2"></i>Vídeos</h6>
                        ${videos.map(video => `
                            <video controls class="w-100 mb-2" style="border-radius: 8px;">
                                <source src="${video}" type="video/mp4">
                                Seu navegador não suporta vídeos.
                            </video>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="col-md-6">
                <h6><i class="fas fa-info-circle text-primary me-2"></i>Descrição</h6>
                <p>${ponto.descricao}</p>
                
                <h6><i class="fas fa-list text-success me-2"></i>Atividades</h6>
                <ul class="list-unstyled">
                    ${ponto.atividades.map(atividade => 
                        `<li><i class="fas fa-check text-success me-2"></i>${atividade}</li>`
                    ).join('')}
                </ul>
                
                ${Object.keys(infraestrutura).length > 0 ? `
                    <h6><i class="fas fa-road text-info me-2"></i>Infraestrutura</h6>
                    <ul class="list-unstyled">
                        ${infraestrutura.acesso ? `<li><strong>Acesso:</strong> ${infraestrutura.acesso}</li>` : ''}
                        ${infraestrutura.dificuldade ? `<li><strong>Dificuldade:</strong> ${infraestrutura.dificuldade}</li>` : ''}
                        ${infraestrutura.tempo_visita ? `<li><strong>Tempo de visita:</strong> ${infraestrutura.tempo_visita}</li>` : ''}
                        ${infraestrutura.melhor_horario ? `<li><strong>Melhor horário:</strong> ${infraestrutura.melhor_horario}</li>` : ''}
                    </ul>
                ` : ''}
                
                <h6><i class="fas fa-map-marker-alt text-danger me-2"></i>Localização</h6>
                <p>Latitude: ${ponto.coordenadas.lat}<br>Longitude: ${ponto.coordenadas.lng}</p>
                
                ${Object.keys(dadosCampo).length > 0 ? `
                    <h6><i class="fas fa-clipboard-list text-warning me-2"></i>Dados Coletados</h6>
                    <div class="small">
                        ${Object.entries(dadosCampo).map(([key, value]) => 
                            `<strong>${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> ${value}<br>`
                        ).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Compartilhar ponto
function sharePoint() {
    if (!currentPoint || !currentMunicipality) return;
    
    const coords = currentPoint.coordenadas;
    const message = `🏛️ Conheça ${currentPoint.nome} em ${currentMunicipality.nome}, Maranhão!\n\n${currentPoint.descricao}\n\n🗺️ Localização: ${coords.lat}, ${coords.lng}\n\n#TurismoMaranhao`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

// Funções auxiliares para ícones e cores
function getIconClass(tipo) {
    const icons = {
        'natureza': 'fas fa-tree',
        'praia': 'fas fa-umbrella-beach',
        'historico': 'fas fa-monument',
        'cultural': 'fas fa-theater-masks',
        'religioso': 'fas fa-place-of-worship',
        'aventura': 'fas fa-mountain'
    };
    return icons[tipo] || 'fas fa-map-pin';
}

function getIconColor(tipo) {
    const colors = {
        'natureza': '#28a745',
        'praia': '#17a2b8',
        'historico': '#ff6b35',
        'cultural': '#0066cc',
        'religioso': '#6f42c1',
        'aventura': '#fd7e14'
    };
    return colors[tipo] || '#6c757d';
}

function getCardClass(tipo) {
    const classes = {
        'natureza': 'border-success',
        'praia': 'border-info',
        'historico': 'border-warning',
        'cultural': 'border-primary',
        'religioso': 'border-purple',
        'aventura': 'border-orange'
    };
    return classes[tipo] || 'border-secondary';
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', initApp);
// Sistema de filtros
function initFilters() {
    const filterContainer = document.getElementById('filtersContainer');
    if (!filterContainer) return;
    
    const tipos = ['todos', 'natureza', 'praia', 'historico', 'cultural', 'religioso', 'aventura'];
    
    filterContainer.innerHTML = `
        <div class="card border-0 shadow-lg mb-4">
            <div class="card-header bg-gradient-primary text-white">
                <h5 class="mb-0"><i class="fas fa-filter me-2"></i>Filtros</h5>
            </div>
            <div class="card-body">
                <div class="row g-2">
                    ${tipos.map(tipo => `
                        <div class="col-6 col-md-4 col-lg-3">
                            <button class="btn btn-outline-primary w-100 filter-btn ${tipo === 'todos' ? 'active' : ''}" 
                                    data-filter="${tipo}" onclick="applyFilter('${tipo}')">
                                <i class="${getFilterIcon(tipo)} me-1"></i>
                                ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                            </button>
                        </div>
                    `).join('')}
                </div>
                
                <hr>
                
                <div class="row">
                    <div class="col-md-6">
                        <label class="form-label">Buscar por nome:</label>
                        <input type="text" class="form-control" id="searchInput" 
                               placeholder="Digite o nome do local..." onkeyup="searchPoints()">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Ordenar por:</label>
                        <select class="form-select" id="sortSelect" onchange="sortPoints()">
                            <option value="nome">Nome (A-Z)</option>
                            <option value="tipo">Tipo</option>
                            <option value="municipio">Município</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getFilterIcon(tipo) {
    const icons = {
        'todos': 'fas fa-globe',
        'natureza': 'fas fa-tree',
        'praia': 'fas fa-umbrella-beach',
        'historico': 'fas fa-monument',
        'cultural': 'fas fa-theater-masks',
        'religioso': 'fas fa-place-of-worship',
        'aventura': 'fas fa-mountain'
    };
    return icons[tipo] || 'fas fa-map-pin';
}

let currentFilter = 'todos';
let allPoints = [];

function initAllPoints() {
    allPoints = [];
    if (!touristData) return;
    
    touristData.municipios.forEach(municipio => {
        municipio.pontos_turisticos.forEach(ponto => {
            allPoints.push({
                ...ponto,
                municipio_nome: municipio.nome,
                municipio_id: municipio.id
            });
        });
    });
}

function applyFilter(tipo) {
    currentFilter = tipo;
    
    // Atualizar botões ativos
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === tipo) {
            btn.classList.add('active');
        }
    });
    
    updatePointsDisplay();
}

function searchPoints() {
    updatePointsDisplay();
}

function sortPoints() {
    updatePointsDisplay();
}

function updatePointsDisplay() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const sortBy = document.getElementById('sortSelect')?.value || 'nome';
    
    let filteredPoints = allPoints.filter(ponto => {
        const matchesFilter = currentFilter === 'todos' || ponto.tipo === currentFilter;
        const matchesSearch = ponto.nome.toLowerCase().includes(searchTerm) || 
                            ponto.descricao.toLowerCase().includes(searchTerm) ||
                            ponto.municipio_nome.toLowerCase().includes(searchTerm);
        return matchesFilter && matchesSearch;
    });
    
    // Ordenar pontos
    filteredPoints.sort((a, b) => {
        switch(sortBy) {
            case 'tipo':
                return a.tipo.localeCompare(b.tipo);
            case 'municipio':
                return a.municipio_nome.localeCompare(b.municipio_nome);
            default:
                return a.nome.localeCompare(b.nome);
        }
    });
    
    displayFilteredPoints(filteredPoints);
}

function displayFilteredPoints(points) {
    const container = document.getElementById('allPointsContainer');
    if (!container) return;
    
    if (points.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info text-center">
                    <i class="fas fa-search fa-3x mb-3"></i>
                    <h5>Nenhum ponto encontrado</h5>
                    <p>Tente ajustar os filtros ou termo de busca.</p>
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = points.map(ponto => `
        <div class="col-md-6 col-lg-4 col-xl-3">
            <div class="card tourist-point-card ${getCardClass(ponto.tipo)}" 
                 onclick="showMunicipalityAndPoint('${ponto.municipio_id}', '${ponto.id}')">
                <div class="card-body">
                    <div class="icon-badge ${ponto.tipo}-icon">
                        <i class="${getIconClass(ponto.tipo)}"></i>
                    </div>
                    <h6 class="card-title">${ponto.nome}</h6>
                    <p class="card-text small">${ponto.descricao}</p>
                    <div class="mb-2">
                        <small class="text-muted">
                            <i class="fas fa-map-marker-alt me-1"></i>${ponto.municipio_nome}
                        </small>
                    </div>
                    <div class="d-flex flex-wrap gap-1 mb-2">
                        ${ponto.atividades.slice(0, 3).map(atividade => 
                            `<span class="badge bg-secondary small">${atividade}</span>`
                        ).join('')}
                        ${ponto.atividades.length > 3 ? '<span class="badge bg-light text-dark small">+mais</span>' : ''}
                    </div>
                    <button class="btn btn-custom btn-sm">
                        <i class="fas fa-eye me-1"></i>Ver Detalhes
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function showMunicipalityAndPoint(municipioId, pontoId) {
    showMunicipality(municipioId);
    setTimeout(() => {
        showTouristPointModal(pontoId);
    }, 500);
}

// Adicionar página de todos os pontos
function showAllPointsPage() {
    document.getElementById('mainMapSection').style.display = 'none';
    document.getElementById('municipalitySection').style.display = 'none';
    document.getElementById('allPointsSection').style.display = 'block';
    document.getElementById('breadcrumb').style.display = 'block';
    
    // Atualizar breadcrumb
    document.getElementById('breadcrumbList').innerHTML = `
        <li class="breadcrumb-item">
            <a href="#" onclick="showMainMap()">Polo Turístico</a>
        </li>
        <li class="breadcrumb-item active">Todos os Pontos</li>
    `;
    
    initAllPoints();
    initFilters();
    updatePointsDisplay();
}

// Adicionar estatísticas em tempo real
function updateLiveStats() {
    if (!allPoints.length) return;
    
    const stats = {
        total: allPoints.length,
        natureza: allPoints.filter(p => p.tipo === 'natureza').length,
        historico: allPoints.filter(p => p.tipo === 'historico').length,
        cultural: allPoints.filter(p => p.tipo === 'cultural').length,
        praia: allPoints.filter(p => p.tipo === 'praia').length
    };
    
    const statsContainer = document.getElementById('liveStats');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="row text-center">
                <div class="col">
                    <div class="stat-item">
                        <h3 class="text-primary">${stats.total}</h3>
                        <small>Total</small>
                    </div>
                </div>
                <div class="col">
                    <div class="stat-item">
                        <h3 class="text-success">${stats.natureza}</h3>
                        <small>Natureza</small>
                    </div>
                </div>
                <div class="col">
                    <div class="stat-item">
                        <h3 class="text-warning">${stats.historico}</h3>
                        <small>Histórico</small>
                    </div>
                </div>
                <div class="col">
                    <div class="stat-item">
                        <h3 class="text-info">${stats.cultural}</h3>
                        <small>Cultural</small>
                    </div>
                </div>
            </div>
        `;
    }
}
