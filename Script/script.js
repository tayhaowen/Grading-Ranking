$(document).ready(function() {
    const tiers = ['A', 'B+', 'B', 'C+', 'C', 'C-'];
    const tierQuotasByRank = {
        Default: {A: 2, 'B+': 5, B: 5, 'C+': 5, C: 5, 'C-': 5}
    };
    let personnel = [];
    let currentRank = 'All Ranks';

    // Hamburger menu functionality
    $('.hamburger-menu').click(function() {
        $('.side-panel').toggleClass('open');
        $('.overlay').toggleClass('active');
    });

    $('.overlay').click(function() {
        $('.side-panel').removeClass('open');
        $('.overlay').removeClass('active');
        // $('#ranking-system').removeClass('panel-open');
    });

    // Close panel when clicking outside
    $(document).click(function(event) {
        if (!$(event.target).closest('.side-panel, .hamburger-menu').length) {
            $('.side-panel').removeClass('open');
            $('#ranking-system').removeClass('panel-open');
        }
    });

    // Prevent panel from closing when clicking inside it
    $('.side-panel').click(function(event) {
        event.stopPropagation();
    });

    $('.tool-header').click(function() {
        $(this).find('.toggle-tool i').toggleClass('bi-chevron-down bi-chevron-up');
        $(this).next('.tool-content').slideToggle(300);
    });

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
        
        // Clear existing tier tiles
        $('.tier-tile').find('.personnel-tile').remove();
        
        personnel.forEach((person, index) => {
          const tile = createPersonnelTile(person);
          if (person.Tier) {
            $(`.tier-tile[data-tier="${person.Tier}"]`).append(tile);
          } else {
            ungradedTiles.append(tile);
          }
        });
        
        initializeDragAndDrop();
        updateTierQuotas();
      }
    
    function createPersonnelTile(person) {
        function getProperty(obj, key) {
            const fuzzyKey = Object.keys(obj).find(k => fuzzyMatch(k, key));
            return obj[fuzzyKey] || 'N/A';
        }
        
        const nric = getProperty(person, 'NRIC');
        const imageUrl = getPersonnelImageUrl(nric);
        
        return $(`
        <div class="personnel-tile" data-index="${personnel.indexOf(person)}">
            <div class="personnel-image">
                <img src="${imageUrl}" alt="${getProperty(person, 'NAME')}" onerror="this.src='default-image.jpg';">
            </div>
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

    function getPersonnelImageUrl(nric) {
        const imageFormats = ['jpg', 'jpeg', 'png'];
        for (const format of imageFormats) {
            return `personnel image/${nric}.${format}`;
        }
        return 'default-image.jpg';
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
        let lastUpdateTime = 0;
        const updateInterval = 16; // ~60fps
        
        $('#main-container').on('mousedown', '.personnel-tile', function(e) {
            // Remove any existing placeholders before starting a new drag
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
            
            const currentTime = Date.now();
            if (currentTime - lastUpdateTime < updateInterval) return;
            
            lastUpdateTime = currentTime;
            
            requestAnimationFrame(() => {
                $(draggedElement).css({
                    left: e.clientX - dragOffsetX,
                    top: e.clientY - dragOffsetY
                });
                
                updatePlaceholderPosition(e.clientX, e.clientY);
            });
        }
        
        function onMouseUp(e) {
            if (!draggedElement) return;
            
            const personIndex = $(draggedElement).data('index');
            const newTier = determineNewTier(e.clientX, e.clientY);
            
            if (newTier === 'Not Graded Yet') {
                delete personnel[personIndex].Tier;
            } else if (newTier) {
                personnel[personIndex].Tier = newTier;
            }
            
            $(draggedElement).css({
                position: '',
                left: '',
                top: '',
                zIndex: '',
                width: originalWidth,
                height: originalHeight
            });
            
            if (placeholder) {
                $(draggedElement).insertAfter(placeholder);
                placeholder.remove();
                placeholder = null;
            }
            
            $(draggedElement).removeClass('dragging');
            draggedElement = null;
            
            $(document).off('.drag');
            
            $('.placeholder').remove();
            
            updateTierQuotas();
            rearrangeTiles();
        }
        
        function updatePlaceholderPosition(x, y) {
            const elemBelow = document.elementFromPoint(x, y);
            const tileBelow = $(elemBelow).closest('.personnel-tile, .tier-tile');
            
            if (tileBelow.length && !tileBelow.is(draggedElement)) {
                if (tileBelow.hasClass('personnel-tile')) {
                    placeholder.insertAfter(tileBelow);
                } else {
                    const rect = tileBelow[0].getBoundingClientRect();
                    const isAfter = y - rect.top > rect.height / 2;
                    
                    if (isAfter) {
                        placeholder.insertAfter(tileBelow);
                    } else {
                        placeholder.insertBefore(tileBelow);
                    }
                }
            }
        }
        
        function determineNewTier(x, y) {
            const elemBelow = document.elementFromPoint(x, y);
            const tileBelow = $(elemBelow).closest('.personnel-tile, .tier-tile, #ungraded-container');
            
            if (tileBelow.hasClass('tier-tile')) {
                return tileBelow.data('tier');
            } else if (tileBelow.is('#ungraded-container')) {
                return 'Not Graded Yet';
            } else if (tileBelow.hasClass('personnel-tile')) {
                const tileTier = personnel[tileBelow.data('index')].Tier;
                return tileTier || 'Not Graded Yet';
            } else {
                const nearestTier = findNearestTier(x, y);
                return nearestTier ? nearestTier.data('tier') : null;
            }
        }
        
        function findNearestTier(x, y) {
            let nearestTier = null;
            let minDistance = Infinity;
            
            $('.tier-tile').each(function() {
                const rect = this.getBoundingClientRect();
                const distance = Math.hypot(x - (rect.left + rect.width / 2), y - (rect.top + rect.height / 2));
                
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestTier = $(this);
                }
            });
            
            return nearestTier;
        }
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
        
        // Make sure the ungraded container always exists
        if (!$('#ungraded-container').length) {
            mainContainer.append(`
                <div id="ungraded-container">
                    <h3>Not Graded Yet</h3>
                    <div id="ungraded-tiles"></div>
                </div>
            `);
        }
    
        const ungradedTiles = $('#ungraded-tiles');
        ungradedTiles.empty();
    
        const unassignedPersonnel = currentRank === 'All Ranks'
            ? personnel.filter(p => !p.Tier)
            : personnel.filter(p => !p.Tier && getProperty(p, 'RANK AS') === currentRank);
    
        if (unassignedPersonnel.length === 0) {
            // Add a message and placeholder div to maintain droppable area
            ungradedTiles.append(`
                <div class="ungraded-placeholder">
                    <p class="drag-drop-message">You can still drag and drop personnel here</p>
                </div>
            `);
        } else {
            unassignedPersonnel.forEach(person => {
                ungradedTiles.append(createPersonnelTile(person));
            });
        }
    
        updateTierQuotas();
        // Remove this line to prevent reinitializing drag and drop unnecessarily
        // initializeDragAndDrop();
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

    async function getSavedFolder() {
        const dirHandle = await window.showDirectoryPicker({
            startIn: 'documents',
            mode: 'readwrite'
        });
        
        try {
            return await dirHandle.getDirectoryHandle('saved', { create: true });
        } catch (err) {
            console.error('Error creating "saved" folder:', err);
            return null;
        }
    }

    function saveProgress() {
        const dataToSave = {
            personnel: personnel,
            currentRank: currentRank
        };
        
        const blob = new Blob([JSON.stringify(dataToSave)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `save_${timestamp}.json`;
        
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        //alert('Progress saved successfully! Please move the downloaded file to the "saved" folder in your project directory.');
    }
    
    function loadProgress() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = readerEvent => {
                try {
                    const content = readerEvent.target.result;
                    const savedData = JSON.parse(content);
                    
                    personnel = savedData.personnel;
                    currentRank = savedData.currentRank;
                    
                    // Update UI
                    displayPersonnel();
                    initializeRankTabs();
                    filterPersonnel();
                    updateTierQuotas();
                    
                    // Set the correct rank tab as active
                    $(`.rank-tab[data-rank="${currentRank}"]`).addClass('active').siblings().removeClass('active');
                    
                    //alert('Progress loaded successfully!');
                } catch (err) {
                    console.error('Error parsing file:', err);
                    alert('Error loading file. Please make sure it\'s a valid JSON file.');
                }
            }
            reader.readAsText(file,'UTF-8');
        }
        
        input.click();
    }

    $('#save-progress').click(saveProgress);
    $('#load-progress').click(loadProgress);
    

    initializeTiers();
    initializeDragAndDrop();
});