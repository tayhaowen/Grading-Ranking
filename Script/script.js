$(document).ready(function() {
    const tiers = ['A', 'B+', 'B', 'C+', 'C', 'C-'];
    const tierQuotasByRank = {
        Default: {A: 2, 'B+': 5, B: 5, 'C+': 5, C: 5, 'C-': 5}
    };
    let personnel = [];
    let currentRank = 'All Ranks';

    function initializeTiers() {
        const mainContainer = $('#main-container');
        tiers.forEach(tier => {
            mainContainer.append(`
                <div class="tier-tile" data-tier="${tier}">
                    <h3>${tier}</h3>
                    <p>(<span class="quota">0</span>/<span class="total-quota">0</span>)</p>
                </div>
            `);
        });
        mainContainer.append(`
            <div id="ungraded-container">
                <h3>Not Graded Yet</h3>
                <div id="ungraded-tiles"></div>
            </div>
        `);
    }

    $('#upload-btn').click(function() {
        $('#excel-upload').click();
    });

    $('#excel-upload').change(function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                personnel = XLSX.utils.sheet_to_json(sheet);
                displayPersonnel();
                initializeRankTabs();
            };
            reader.readAsArrayBuffer(file);
        }
    });

    function displayPersonnel() {
        const ungradedTiles = $('#ungraded-tiles');
        ungradedTiles.empty();
        personnel.forEach((person, index) => {
            ungradedTiles.append(createPersonnelTile(person));
        });
        initializeDragAndDrop();
        updateTierQuotas();
    }
    
    function createPersonnelTile(person) {
        function getProperty(obj, key) {
            const fuzzyKey = Object.keys(obj).find(k => fuzzyMatch(k, key));
            return obj[fuzzyKey] || 'N/A';
        }
    
        return $(`
        <div class="personnel-tile" data-index="${personnel.indexOf(person)}">
        <h4>${getProperty(person, 'RANK')} ${getProperty(person, 'NAME')}</h4>
        <div class="info-grid">
        <div class="info-item"><strong>Sub-unit:</strong> ${getProperty(person, 'SUBUNIT')}</div>
        <div class="info-item"><strong>Vocation:</strong> ${getProperty(person, 'VOC')}</div>
        <div class="info-item"><strong>Years in Rank:</strong> ${getProperty(person, 'YIR')}</div>
        <div class="info-item"><strong>Promo Count:</strong> ${getProperty(person, 'PROMO COUNT')}</div>
        <div class="info-item"><strong>IPPT:</strong> ${getProperty(person, 'IPPT AWARD')}</div>
        <div class="info-item"><strong>BMI:</strong> ${getProperty(person, 'BMI')}</div>
        <div class="info-item"><strong>Marksman:</strong> ${getProperty(person, 'Marksman')}</div>
        <div class="info-item"><strong>Offence:</strong> ${getProperty(person, 'Offence')}</div>
        </div>
        <div class="performance-indicators">
        <div class="indicator">
        <div class="indicator-value">${getProperty(person, 'PRG 23')}</div>
        <div>PRG23</div>
        </div>
        <div class="indicator">
        <div class="indicator-value">${getProperty(person, 'CEP 23')}</div>
        <div>CEP23</div>
        </div>
        <div class="indicator">
        <div class="indicator-value">${getProperty(person, 'PRG 24')}</div>
        <div>PRG24</div>
        </div>
        <div class="indicator">
        <div class="indicator-value">${getProperty(person, 'CEP 24')}</div>
        <div>CEP24</div>
        </div>
        </div>
        </div>
        `);
    }

    function initializeRankTabs() {
        const ranks = ['All Ranks', ...new Set(personnel.map(p => getProperty(p, 'RANK AS')))];
        const toggles = $('#rank-tabs');
        toggles.empty();
        
        ranks.forEach(rank => {
            const count = rank === 'All Ranks' ? personnel.length : personnel.filter(p => getProperty(p, 'RANK AS') === rank).length;
            toggles.append(`<button class="rank-tab" data-rank="${rank}">${rank} (${count})</button>`);
        });
        
        $('.rank-tab').click(function() {
            $('.rank-tab').removeClass('active');
            $(this).addClass('active');
            currentRank = $(this).data('rank');
            filterPersonnel();
            updateTierQuotas();
        });
        
        // Activate "All Ranks" tab by default
        $('.rank-tab[data-rank="All Ranks"]').addClass('active');
    }

    function fuzzyMatch(str, pattern) {
        const regex = new RegExp(pattern.split('').join('.*'), 'i');
        return regex.test(str);
    }
    
    function getProperty(obj, key) {
        const fuzzyKey = Object.keys(obj).find(k => fuzzyMatch(k, key));
        return obj[fuzzyKey] || 'N/A';
    }

    function filterPersonnel() {
        currentRank = $('.rank-tab.active').data('rank');
        rearrangeTiles();
    }

    function initializeDragAndDrop() {
        let draggedElement = null;
        let dragOffsetX, dragOffsetY;
        let originalWidth, originalHeight;
        let placeholder = null;
        
        $('#main-container').on('mousedown', '.personnel-tile', function(e) {
            $('.placeholder').remove();
            
            draggedElement = this;
            const rect = draggedElement.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            
            originalWidth = $(draggedElement).outerWidth();
            originalHeight = $(draggedElement).outerHeight();
            
            placeholder = $('<div>')
                .addClass('placeholder')
                .css({
                    width: originalWidth,
                    height: originalHeight
                });
            $(draggedElement).after(placeholder);
            
            $(draggedElement).addClass('dragging').css({
                position: 'fixed',
                zIndex: 1000,
                left: rect.left,
                top: rect.top,
                width: originalWidth,
                height: originalHeight
            });
            
            $(document).on('mousemove.drag', onMouseMove);
            $(document).on('mouseup.drag', onMouseUp);
            e.preventDefault();
        });
        
        function onMouseMove(e) {
            if (!draggedElement) return;
            
            requestAnimationFrame(() => {
                $(draggedElement).css({
                    left: e.clientX - dragOffsetX,
                    top: e.clientY - dragOffsetY
                });
            });
        }
        
        function onMouseUp(e) {
            if (!draggedElement) return;
            
            const droppedOn = document.elementFromPoint(e.clientX, e.clientY);
            const tierTile = $(droppedOn).closest('.tier-tile');
            const ungradedContainer = $(droppedOn).closest('#ungraded-container');
            
            const personIndex = $(draggedElement).data('index');
            
            if (tierTile.length) {
                const tier = tierTile.data('tier');
                personnel[personIndex].Tier = tier;
            } else if (ungradedContainer.length) {
                delete personnel[personIndex].Tier;
            } else {
                $(draggedElement).css({
                    position: '',
                    left: '',
                    top: '',
                    zIndex: ''
                });
                $(draggedElement).insertAfter(placeholder);
            }
            
            $(draggedElement).css({
                width: originalWidth,
                height: originalHeight
            });
            
            if (placeholder) {
                placeholder.remove();
                placeholder = null;
            }
            
            $(draggedElement).removeClass('dragging');
            draggedElement = null;
            
            $(document).off('.drag');
            
            updateTierQuotas();
            rearrangeTiles();
        }
        
        $('.tier-tile, #ungraded-container').droppable({
            accept: '.personnel-tile',
            over: function(event, ui) {
                $(this).addClass('tier-hover');
            },
            out: function(event, ui) {
                $(this).removeClass('tier-hover');
            },
            drop: function(event, ui) {
                $(this).removeClass('tier-hover');
            }
        });
    }

    function updateTierQuotas() {
        const quotas = tierQuotasByRank['Default'];
        const filteredPersonnel = currentRank === 'All Ranks' ? personnel : personnel.filter(p => getProperty(p, 'RANK AS') === currentRank);
        
        tiers.forEach(tier => {
            const count = filteredPersonnel.filter(p => p.Tier === tier).length;
            const tierQuota = quotas[tier];
            $(`.tier-tile[data-tier="${tier}"] .quota`).text(count);
            $(`.tier-tile[data-tier="${tier}"] .total-quota`).text(tierQuota);
            $(`.tier-tile[data-tier="${tier}"]`).toggleClass('exceeded', count > tierQuota);
        });
    }

    function rearrangeTiles() {
        const mainContainer = $('#main-container');
        const fragment = document.createDocumentFragment();
        let currentRow;
        let tileCount = 0;
        
        function addTile(tile) {
            if (tileCount % 4 === 0) {
                currentRow = document.createElement('div');
                currentRow.className = 'tier-row';
                fragment.appendChild(currentRow);
            }
            currentRow.appendChild(tile);
            tileCount++;
        }
        
        // Create and add tier tiles
        tiers.forEach(tier => {
            const tierTile = createTierTile(tier);
            addTile(tierTile);
            
            const tierPersonnel = currentRank === 'All Ranks' 
                ? personnel.filter(p => p.Tier === tier)
                : personnel.filter(p => p.Tier === tier && getProperty(p, 'RANK AS') === currentRank);
            
            tierPersonnel.forEach(person => {
                const personTile = createPersonnelTile(person)[0];
                addTile(personTile);
            });
        });
        
        // Clear main container except for the ungraded container
        mainContainer.children().not('#ungraded-container').remove();
        
        // Append the new tier structure
        mainContainer.prepend(fragment);
        
        // Update ungraded tiles
        const unassignedPersonnel = currentRank === 'All Ranks'
            ? personnel.filter(p => !p.Tier)
            : personnel.filter(p => !p.Tier && getProperty(p, 'RANK AS') === currentRank);
        const ungradedTiles = $('#ungraded-tiles');
        ungradedTiles.empty();
        unassignedPersonnel.forEach(person => {
            ungradedTiles.append(createPersonnelTile(person));
        });
        
        updateTierQuotas();
    }

    function createTierTile(tier) {
        const tierTile = document.createElement('div');
        tierTile.className = 'tier-tile';
        tierTile.dataset.tier = tier;
        tierTile.innerHTML = `
            <h3>${tier}</h3>
            <p>(<span class="quota">0</span>/<span class="total-quota">0</span>)</p>
        `;
        return tierTile;
    }
    

    initializeTiers();
    initializeDragAndDrop();
});