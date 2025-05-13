document.addEventListener('DOMContentLoaded', () => {
    // ... (all other const declarations from previous script.js)
    const betForm = document.getElementById('betForm');
    const betIdInput = document.getElementById('betId');
    const submitButton = document.getElementById('submitButton');
    const cancelEditButton = document.getElementById('cancelEditButton');
    const betNotesTextarea = document.getElementById('notes');

    const generalNotesTextarea = document.getElementById('generalNotesTextarea');
    const saveGeneralNotesButton = document.getElementById('saveGeneralNotesButton');

    const betsTableBody = document.getElementById('betsTableBody');

    const cumulativeProfitLossHeaderEl = document.getElementById('cumulativeProfitLossHeader');
    const bankrollHeaderEl = document.getElementById('bankrollHeader');

    const filterDateStartInput = document.getElementById('filterDateStart');
    const filterDateEndInput = document.getElementById('filterDateEnd');
    const filterResultSelect = document.getElementById('filterResult');
    const filterTypeEventInput = document.getElementById('filterTypeEvent');
    const applyFiltersButton = document.getElementById('applyFiltersButton');
    const resetFiltersButton = document.getElementById('resetFiltersButton');

    const toggleAnalyticsButton = document.getElementById('toggleAnalyticsButton');
    const analyticsContent = document.getElementById('analyticsContent');
    const totalBetsEl = document.getElementById('totalBets');
    const totalWageredEl = document.getElementById('totalWagered');
    const winLossRatioEl = document.getElementById('winLossRatio');
    const hitRateEl = document.getElementById('hitRate');
    const avgReturnPerBetEl = document.getElementById('avgReturnPerBet');
    const mostSuccessfulTypeEl = document.getElementById('mostSuccessfulType');
    const mostSuccessfulEventEl = document.getElementById('mostSuccessfulEvent');

    const exportDataButton = document.getElementById('exportDataButton');
    const importDataButton = document.getElementById('importDataButton');
    const importFileInput = document.getElementById('importFileInput');

    const noteModalEl = document.getElementById('noteModalElement');
    const fullNoteTextEl = document.getElementById('fullNoteTextElement');
    const modalCloseButton = document.getElementById('modalCloseButton');

    let bets = [];
    let displayedBets = [];
    let cumulativeProfitLossChart = null;
    let resultsPieChart = null;

    const BETS_STORAGE_KEY = 'betTrackerBetsV5'; // Incremented for safety
    const GENERAL_NOTES_KEY = 'betTrackerGeneralNotesV3';


    // --- Modal Control ---
    function openNoteModal(noteText) {
        if (noteModalEl && fullNoteTextEl) {
            fullNoteTextEl.textContent = noteText;
            noteModalEl.classList.add('show');
        }
    }

    function closeNoteModal() {
        if (noteModalEl) {
            noteModalEl.classList.remove('show');
        }
    }

    // --- Utility Functions ---
    const generateId = () => `bet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const formatCurrency = (amount) => {
        const val = parseFloat(amount);
        if (isNaN(val)) return '$0.00';
        const color = val > 0 ? 'var(--success-color)' : (val < 0 ? 'var(--danger-color)' : 'var(--neutral-color)');
        return `<span style="color: ${color}; font-weight: bold;">$${val.toFixed(2)}</span>`;
    };
    
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    };

    // --- Odds & Profit Calculation ---
    function convertToDecimalOdds(oddsInput) {
        const oddsStr = String(oddsInput).trim();
        if (oddsStr.startsWith('+')) {
            const americanOdds = parseFloat(oddsStr.substring(1));
            if (isNaN(americanOdds) || americanOdds < 100) return null;
            return (americanOdds / 100) + 1;
        } else if (oddsStr.startsWith('-')) {
            const americanOdds = parseFloat(oddsStr.substring(1));
            if (isNaN(americanOdds) || americanOdds < 100) return null;
            return (100 / americanOdds) + 1;
        } else {
            const decimal = parseFloat(oddsStr);
            return isNaN(decimal) || decimal <= 1 ? null : decimal;
        }
    }

    function calculateProfitLoss(wager, decimalOdds, result) {
        wager = parseFloat(wager);
        if (isNaN(wager) || isNaN(decimalOdds)) return 0;
        if (result === 'Win') {
            return (decimalOdds * wager) - wager;
        } else if (result === 'Loss') {
            return -wager;
        }
        return 0; 
    }

    // --- Data Storage (localStorage) ---
    function loadBets() {
        const storedBets = localStorage.getItem(BETS_STORAGE_KEY);
        try {
            const parsed = storedBets ? JSON.parse(storedBets) : [];
            bets = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error("Error parsing bets from localStorage:", e);
            bets = [];
        }
        bets.sort((a, b) => new Date(b.date) - new Date(a.date));
        displayedBets = [...bets];
    }

    function saveBets() {
        bets.sort((a, b) => new Date(b.date) - new Date(a.date));
        localStorage.setItem(BETS_STORAGE_KEY, JSON.stringify(bets));
    }

    function loadGeneralNotes() {
        if (generalNotesTextarea) {
            generalNotesTextarea.value = localStorage.getItem(GENERAL_NOTES_KEY) || '';
        }
    }

    function saveGeneralNotes() {
        if (generalNotesTextarea) {
            localStorage.setItem(GENERAL_NOTES_KEY, generalNotesTextarea.value);
            alert('General notes saved!');
        }
    }

    // --- Rendering ---
    function renderBetsTable() {
        betsTableBody.innerHTML = '';
        if (displayedBets.length === 0) {
            betsTableBody.innerHTML = `<tr><td colspan="10" style="text-align:center;">No bets to display.</td></tr>`;
            return;
        }

        displayedBets.forEach(bet => {
            const row = betsTableBody.insertRow();
            row.insertCell().textContent = formatDate(bet.date);
            row.insertCell().textContent = bet.game;
            row.insertCell().textContent = bet.type;
            row.insertCell().textContent = bet.event === "None" ? '-' : bet.event;
            row.insertCell().innerHTML = formatCurrency(bet.wager);
            row.insertCell().textContent = bet.oddsInput; 

            const resultCell = row.insertCell();
            resultCell.textContent = bet.result;
            if (bet.result) resultCell.className = bet.result.toLowerCase();

            row.insertCell().innerHTML = formatCurrency(bet.profit_loss);
            
            const notesCell = row.insertCell();
            if (bet.notes && bet.notes.trim() !== '') {
                const MAX_DISPLAY_LENGTH = 20; 
                const noteText = bet.notes;
                if (noteText.length > MAX_DISPLAY_LENGTH) {
                    const truncatedNote = noteText.substring(0, MAX_DISPLAY_LENGTH - 3) + '...';
                    // ** REVERTED: Direct onclick attachment **
                    notesCell.innerHTML = `${truncatedNote} <span class="view-note-link">(View)</span>`;
                    const viewLink = notesCell.querySelector('.view-note-link');
                    if (viewLink) {
                        viewLink.onclick = (e) => {
                             e.stopPropagation();
                             openNoteModal(noteText);
                        };
                    }
                    notesCell.title = "Click (View) to see full note";
                } else {
                    notesCell.textContent = noteText;
                }
            } else {
                notesCell.textContent = '-';
            }

            const actionsCell = row.insertCell();
            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.classList.add('edit-btn');
            editButton.onclick = () => populateFormForEdit(bet.id);
            actionsCell.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.classList.add('delete-btn');
            deleteButton.onclick = () => deleteBet(bet.id);
            actionsCell.appendChild(deleteButton);
        });
    }

    // --- Form Handling ---
    betForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = betIdInput.value;

        const wager = parseFloat(document.getElementById('wager').value);
        const oddsInput = document.getElementById('odds').value;
        const result = document.getElementById('result').value;
        
        if (!document.getElementById('date').value) { alert('Date is required.'); return; }
        if (!document.getElementById('type').value) { alert('Bet Type is required.'); return; }
        if (!result) { alert('Result is required.'); return; }

        const decimalOdds = convertToDecimalOdds(oddsInput);
        if (decimalOdds === null) {
            alert('Invalid odds format. Use decimal (e.g., 1.91) or American (e.g., -110, +150 > 100).');
            return;
        }

        const profit_loss = calculateProfitLoss(wager, decimalOdds, result);

        const betData = {
            date: document.getElementById('date').value,
            game: document.getElementById('game').value,
            type: document.getElementById('type').value,
            event: document.getElementById('event').value,
            wager: wager,
            oddsInput: oddsInput,
            decimalOdds: decimalOdds,
            result: result,
            profit_loss: profit_loss,
            notes: betNotesTextarea.value,
        };

        if (id) { 
            const index = bets.findIndex(b => b.id === id);
            if (index > -1) {
                bets[index] = { ...bets[index], ...betData }; 
            }
        } else { 
            betData.id = generateId();
            bets.push(betData);
        }
        
        saveBets();
        applyFilters(); 
        updateAllAnalytics();
        resetForm();
    });

    function populateFormForEdit(id) {
        const bet = bets.find(b => b.id === id);
        if (!bet) return;

        betIdInput.value = bet.id;
        document.getElementById('date').value = bet.date;
        document.getElementById('game').value = bet.game;
        document.getElementById('type').value = bet.type;
        document.getElementById('event').value = bet.event;
        document.getElementById('wager').value = bet.wager;
        document.getElementById('odds').value = bet.oddsInput;
        document.getElementById('result').value = bet.result;
        betNotesTextarea.value = bet.notes || '';

        submitButton.textContent = 'Update Bet';
        cancelEditButton.style.display = 'inline-block';
        betForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function resetForm() {
        betForm.reset(); 
        betIdInput.value = '';
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
        document.getElementById('type').selectedIndex = 0; 
        document.getElementById('event').selectedIndex = 0;
        document.getElementById('result').selectedIndex = 0;
        betNotesTextarea.value = ''; 
        submitButton.textContent = 'Add Bet';
        cancelEditButton.style.display = 'none';
    }

    // --- Event Listeners ---
    if (cancelEditButton) cancelEditButton.addEventListener('click', resetForm);
    if (saveGeneralNotesButton) saveGeneralNotesButton.addEventListener('click', saveGeneralNotes);

    // --- Delete Bet ---
    function deleteBet(id) {
        if (confirm('Are you sure you want to delete this bet?')) {
            bets = bets.filter(b => b.id !== id);
            saveBets();
            applyFilters();
            updateAllAnalytics();
            if (betIdInput.value === id) resetForm();
        }
    }
    
    // --- Filtering ---
    function applyFilters() {
        const dateStart = filterDateStartInput.value;
        const dateEnd = filterDateEndInput.value;
        const resultFilter = filterResultSelect.value;
        const searchTerm = filterTypeEventInput.value.toLowerCase().trim();

        displayedBets = bets.filter(bet => {
            const betDate = bet.date; 
            const matchDateStart = !dateStart || betDate >= dateStart;
            const matchDateEnd = !dateEnd || betDate <= dateEnd;
            const matchResult = !resultFilter || bet.result === resultFilter;
            
            const matchSearchTerm = !searchTerm || 
                                   bet.game.toLowerCase().includes(searchTerm) ||
                                   bet.type.toLowerCase().includes(searchTerm) ||
                                   (bet.event && bet.event !== "None" && bet.event.toLowerCase().includes(searchTerm));
            return matchDateStart && matchDateEnd && matchResult && matchSearchTerm;
        });
        renderBetsTable();
    }
    if (applyFiltersButton) applyFiltersButton.addEventListener('click', applyFilters);
    if (resetFiltersButton) resetFiltersButton.addEventListener('click', () => {
        filterDateStartInput.value = '';
        filterDateEndInput.value = '';
        filterResultSelect.value = '';
        filterTypeEventInput.value = '';
        displayedBets = [...bets]; 
        renderBetsTable();
    });

    // --- Analytics ---
    if (toggleAnalyticsButton) {
        toggleAnalyticsButton.addEventListener('click', () => {
            const isHidden = analyticsContent.style.display === 'none';
            analyticsContent.style.display = isHidden ? 'block' : 'none';
            toggleAnalyticsButton.textContent = isHidden ? 'Hide Analytics' : 'Show Analytics';
            if (isHidden) { 
                // ** REVERTED: Keep the simple timeout for chart rendering **
                setTimeout(() => {
                    updateAllAnalytics(); 
                }, 50); 
            }
        });
    }

    // ** REVERTED: updateAllAnalytics no longer takes forceRefresh **
    function updateAllAnalytics() {
        updateSummaryStats(); 
        if (analyticsContent.style.display !== 'none') { 
             renderCumulativeProfitLossChart();
             renderResultsPieChart();
        }
    }
    
    function updateSummaryStats() {
        const cumulativeProfit = bets.reduce((sum, bet) => sum + (bet.profit_loss || 0), 0);
        
        if(cumulativeProfitLossHeaderEl) cumulativeProfitLossHeaderEl.innerHTML = formatCurrency(cumulativeProfit);
        if(bankrollHeaderEl) bankrollHeaderEl.innerHTML = formatCurrency(cumulativeProfit); 

        if(totalBetsEl) totalBetsEl.textContent = bets.length;
        const totalWageredVal = bets.reduce((sum, bet) => sum + parseFloat(bet.wager || 0), 0);
        if(totalWageredEl) totalWageredEl.innerHTML = formatCurrency(totalWageredVal);

        const resolvedBets = bets.filter(b => b.result === 'Win' || b.result === 'Loss');
        const wins = resolvedBets.filter(bet => bet.result === 'Win').length;
        const losses = resolvedBets.filter(bet => bet.result === 'Loss').length;
        
        if (resolvedBets.length > 0) {
            if(winLossRatioEl) winLossRatioEl.textContent = `${wins}W - ${losses}L`;
            if(hitRateEl) hitRateEl.textContent = `${((wins / resolvedBets.length) * 100).toFixed(1)}%`;
        } else {
            if(winLossRatioEl) winLossRatioEl.textContent = 'N/A';
            if(hitRateEl) hitRateEl.textContent = 'N/A';
        }

        const nonPendingPushBets = bets.filter(b => b.result !== 'Pending' && b.result !== 'Push');
        if (nonPendingPushBets.length > 0) {
            const avgReturn = nonPendingPushBets.reduce((sum, bet) => sum + (bet.profit_loss || 0), 0) / nonPendingPushBets.length;
            if(avgReturnPerBetEl) avgReturnPerBetEl.innerHTML = formatCurrency(avgReturn);
        } else {
            if(avgReturnPerBetEl) avgReturnPerBetEl.innerHTML = formatCurrency(0);
        }

        const profitByType = nonPendingPushBets.reduce((acc, bet) => {
            acc[bet.type] = (acc[bet.type] || 0) + (bet.profit_loss || 0);
            return acc;
        }, {});
        const sortedTypes = Object.entries(profitByType).sort((a, b) => b[1] - a[1]);
        if(mostSuccessfulTypeEl) mostSuccessfulTypeEl.innerHTML = sortedTypes.length > 0 && sortedTypes[0][1] > 0 ? `${sortedTypes[0][0]} (${formatCurrency(sortedTypes[0][1])})` : 'N/A';
        
        const profitByEvent = nonPendingPushBets.filter(b => b.event && b.event !== 'None').reduce((acc, bet) => {
            acc[bet.event] = (acc[bet.event] || 0) + (bet.profit_loss || 0);
            return acc;
        }, {});
        const sortedEvents = Object.entries(profitByEvent).sort((a, b) => b[1] - a[1]);
        if(mostSuccessfulEventEl) mostSuccessfulEventEl.innerHTML = sortedEvents.length > 0 && sortedEvents[0][1] > 0 ? `${sortedEvents[0][0]} (${formatCurrency(sortedEvents[0][1])})` : 'N/A';
    }

    // ** REVERTED: renderChart helper is simplified - always destroy and recreate **
    // function renderChart(chartInstance, canvasId, type, data, options) {
    //     const canvas = document.getElementById(canvasId);
    //     if (!canvas) {
    //         console.error(`Canvas with ID ${canvasId} not found.`);
    //         return null;
    //     }
    //     const ctx = canvas.getContext('2d');
    //     if (!ctx) {
    //          console.error(`Could not get 2D context for canvas ${canvasId}.`);
    //         return null;
    //     }

    //     if (chartInstance) {
    //         chartInstance.destroy();
    //     }
    //     return new Chart(ctx, { type, data, options });
    // }
    
    // ** REVERTED: render*Chart functions no longer take forceRefresh **
    // function renderCumulativeProfitLossChart() {
    //     const chartBets = [...bets]
    //         .filter(b => b.result !== 'Pending') 
    //         .sort((a, b) => new Date(a.date) - new Date(b.date)); 

    //     let currentProfit = 0;
    //     const dataPoints = chartBets.map(bet => {
    //         currentProfit += (bet.profit_loss || 0); 
    //         return currentProfit;
    //     });
    //     const labels = chartBets.map(bet => `${formatDate(bet.date)} (${bet.game.substring(0,10)}...)`);

    //     const data = { 
    //         labels: labels,
    //         datasets: [{
    //             label: 'Cumulative Profit/Loss',
    //             data: dataPoints,
    //             borderColor: 'var(--primary-color)',
    //             backgroundColor: 'rgba(52, 152, 219, 0.1)',
    //             tension: 0.1, fill: true, pointBackgroundColor: 'var(--primary-color)',
    //             pointBorderColor: 'var(--text-color)', pointHoverBackgroundColor: 'var(--text-color)',
    //             pointHoverBorderColor: 'var(--primary-color)'
    //         }]
    //     };
    //     const options = { 
    //         responsive: true, maintainAspectRatio: false,
    //         scales: {
    //             y: { ticks: { color: 'var(--text-color)', callback: value => '$' + value.toFixed(2) }, grid: { color: 'var(--border-color)' } },
    //             x: { ticks: { color: 'var(--text-color)', autoSkip: true, maxTicksLimit: 15 }, grid: { display: false } }
    //         },
    //         plugins: {
    //             legend: { labels: { color: 'var(--text-color)' } },
    //             tooltip: {
    //                 callbacks: {
    //                     title: (tooltipItems) => chartBets[tooltipItems[0].dataIndex] ? `${formatDate(chartBets[tooltipItems[0].dataIndex].date)} - ${chartBets[tooltipItems[0].dataIndex].game}` : tooltipItems[0].label
    //                 }
    //             }
    //         }
    //      };
    //     cumulativeProfitLossChart = renderChart(cumulativeProfitLossChart, 'cumulativeProfitLossChart', 'line', data, options);
    // }

    // function renderResultsPieChart() {
    //     const resultsCount = bets.reduce((acc, bet) => {
    //         acc[bet.result] = (acc[bet.result] || 0) + 1;
    //         return acc;
    //     }, {});

    //     const backgroundColors = { 'Win': 'var(--success-color)', 'Loss': 'var(--danger-color)', 'Push': 'var(--neutral-color)', 'Pending': 'var(--warning-color)' };
    //     const chartLabels = Object.keys(resultsCount);
    //     const chartDataValues = Object.values(resultsCount);

    //     const canvas = document.getElementById('resultsPieChart');
    //     if (!canvas) return; 
    //     const ctx = canvas.getContext('2d');

    //     if (chartLabels.length === 0) { 
    //         if (resultsPieChart) resultsPieChart.destroy();
    //         resultsPieChart = null; 
    //         if(ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); 
    //         return;
    //     }

    //     const data = { 
    //         labels: chartLabels,
    //         datasets: [{
    //             label: 'Bet Results', data: chartDataValues,
    //             backgroundColor: chartLabels.map(key => backgroundColors[key] || '#cccccc'),
    //             borderColor: 'var(--surface-color)', hoverOffset: 4
    //         }]
    //     };
    //     const options = { 
    //         responsive: true, maintainAspectRatio: false,
    //         plugins: {
    //             legend: { position: 'top', labels: { color: 'var(--text-color)' } },
    //             tooltip: {
    //                 callbacks: {
    //                     label: (context) => {
    //                         let label = context.label || '';
    //                         if (label) label += ': ';
    //                         if (context.parsed !== null) label += context.parsed;
    //                         const total = context.dataset.data.reduce((a, b) => a + b, 0);
    //                         const percentage = total > 0 ? (context.parsed / total * 100).toFixed(1) + '%' : '0%';
    //                         label += ` (${percentage})`;
    //                         return label;
    //                     }
    //                 }
    //             }
    //         }
    //     };
    //     resultsPieChart = renderChart(resultsPieChart, 'resultsPieChart', 'pie', data, options);
    // }

    // --- Import/Export ---
    function exportLocalData() {
        const betsString = localStorage.getItem(BETS_STORAGE_KEY) || '[]';
        const generalNotesString = localStorage.getItem(GENERAL_NOTES_KEY) || '';
        let betsArrayForCheck = [];
        try {
            betsArrayForCheck = JSON.parse(betsString);
            if (!Array.isArray(betsArrayForCheck)) betsArrayForCheck = [];
        } catch (e) {
            console.warn("Could not parse bets from localStorage for export check, treating as empty.");
        }
        if (betsArrayForCheck.length === 0 && generalNotesString === '') {
            alert("No data to export.");
            return;
        }
        const dataToExport = {
            bets: betsString, 
            generalNotes: generalNotesString
        };
        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "bet-tracker-backup.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    function importLocalData(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const importedJsonString = e.target.result;
                const importedData = JSON.parse(importedJsonString);
                if (typeof importedData !== 'object' || importedData === null) {
                    throw new Error("Imported data is not a valid object.");
                }
                if (importedData.hasOwnProperty('bets') && typeof importedData.bets === 'string') {
                    JSON.parse(importedData.bets); 
                    localStorage.setItem(BETS_STORAGE_KEY, importedData.bets);
                } else {
                    console.warn("Imported data missing 'bets' key or not a string. Storing empty bets array string.");
                    localStorage.setItem(BETS_STORAGE_KEY, '[]');
                }
                if (importedData.hasOwnProperty('generalNotes') && typeof importedData.generalNotes === 'string') {
                    localStorage.setItem(GENERAL_NOTES_KEY, importedData.generalNotes);
                } else {
                    console.warn("Imported data missing 'generalNotes' key or not a string. Storing empty notes.");
                    localStorage.setItem(GENERAL_NOTES_KEY, '');
                }
                alert("✅ Data imported successfully! The page will now reload.");
                location.reload();
            } catch (err) {
                alert(`❌ Failed to import: ${err.message}. Ensure it's a valid backup file.`);
                console.error("Import error:", err);
            }
        };
        reader.readAsText(file);
        if (event.target) event.target.value = null; 
    }
    

    if (exportDataButton) exportDataButton.addEventListener('click', exportLocalData);
    if (importDataButton) importDataButton.addEventListener('click', () => importFileInput.click());
    if (importFileInput) importFileInput.addEventListener('change', importLocalData);

    // Modal close listeners
    if (modalCloseButton) modalCloseButton.addEventListener('click', closeNoteModal);
    if (noteModalEl) noteModalEl.addEventListener('click', (event) => {
        if (event.target === noteModalEl) { 
            closeNoteModal();
        }
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && noteModalEl && noteModalEl.classList.contains('show')) {
            closeNoteModal();
        }
    });

    // --- Initialization ---
    function init() {
        loadBets();
        loadGeneralNotes();
        renderBetsTable();
        updateAllAnalytics(); 
        resetForm(); 
    }

    init(); 
});