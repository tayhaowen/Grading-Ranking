$(document).ready(function() {
    const tiers = ['A', 'B+', 'B', 'C+', 'C', 'C-'];
    const tierQuotas = {A: 2, 'B+': 5, B: 5, 'C+': 5, C: 5, 'C-': 5};
    let personnel = [];

    function initializeTiers() {
        const mainContainer = $('#main-container');
        tiers.forEach(tier => {
            mainContainer.append(`
                <div class="tier-tile" data-tier="${tier}">
                    <h3>${tier}</h3>
                    <p>(<span class="quota">0</span>/${tierQuotas[tier]})</p>
                </div>
            `);
        });
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
                initializeRankToggles();
            };
            reader.readAsArrayBuffer(file);
        }
    });

    
    function displayPersonnel() {
        const mainContainer = $('#main-container');
        personnel.forEach((person, index) => {
            mainContainer.append(createPersonnelTile(person));
        });
        initializeDragAndDrop();
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

    function initializeRankToggles() {
        const ranks = [...new Set(personnel.map(p => getProperty(p, 'RANK AS')))];
        const toggles = $('#rank-toggles');
        toggles.empty();
        ranks.forEach(rank => {
            toggles.append(`<button class="rank-toggle" data-rank="${rank}">${rank}</button>`);
        });
    
        $('.rank-toggle').click(function() {
            $(this).toggleClass('active');
            filterPersonnel();
        });
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
        const activeRanks = $('.rank-toggle.active').map(function() {
            return $(this).data('rank');
        }).get();
    
        $('.personnel-tile').each(function() {
            const index = $(this).data('index');
            $(this).toggle(activeRanks.length === 0 || activeRanks.includes(getProperty(personnel[index], 'RANK AS')));
        });
    }

    function initializeDragAndDrop() {
        let draggedElement = null;
        let dragOffsetX, dragOffsetY;
        let originalWidth, originalHeight; // Store original dimensions
        let placeholder = null;
    
        $('#main-container').on('mousedown', '.personnel-tile', function(e) {
            $('.placeholder').remove(); // Remove any existing placeholders
    
            draggedElement = this;
            const rect = draggedElement.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
    
            // Store original dimensions
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
    
            if (tierTile.length) {
                const tier = tierTile.data('tier');
                const personIndex = $(draggedElement).data('index');
                personnel[personIndex].Tier = tier;
                updateTierQuotas();
                rearrangeTiles();
            } else {
                $(draggedElement).css({
                    position: '',
                    left: '',
                    top: '',
                    zIndex: ''
                });
                $(draggedElement).insertAfter(placeholder);
            }
    
            // Reset dimensions to original
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
        }
    
        $('.tier-tile').droppable({
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
        tiers.forEach(tier => {
            const count = personnel.filter(p => p.Tier === tier).length;
            $(`.tier-tile[data-tier="${tier}"] .quota`).text(count);
            $(`.tier-tile[data-tier="${tier}"]`).toggleClass('exceeded', count > tierQuotas[tier]);
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

        tiers.forEach(tier => {
            const tierTile = createTierTile(tier);
            addTile(tierTile);

            const tierPersonnel = personnel.filter(p => p.Tier === tier);
            tierPersonnel.forEach(person => {
                const personTile = createPersonnelTile(person)[0];
                addTile(personTile);
            });
        });

        const unassignedPersonnel = personnel.filter(p => !p.Tier);
        unassignedPersonnel.forEach(person => {
            const personTile = createPersonnelTile(person)[0];
            addTile(personTile);
        });

        mainContainer.empty().append(fragment);

        updateTierQuotas();
        filterPersonnel();
    }

    function createTierTile(tier) {
        const tierTile = document.createElement('div');
        tierTile.className = 'tier-tile';
        tierTile.dataset.tier = tier;
        tierTile.innerHTML = `
            <h3>${tier}</h3>
            <p>(<span class="quota">0</span>/${tierQuotas[tier]})</p>
        `;
        return tierTile;
    }

    

    initializeTiers();
    initializeDragAndDrop();
});