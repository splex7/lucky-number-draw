class DrawSystem {
    constructor() {
        this.rounds = [];
        this.prizes = [];
        this.prizeImages = [];
        this.currentRound = 1;
        this.usedNumbers = new Set(); // revealed winners
        this.reservedNumbers = new Set(); // all allocated numbers (revealed or not)
        this.currentRoundNumbers = [];
        this.roundResults = [];
        this.isAnimating = false;
        this.numberPool = [];
        this.maxLimit = 2000;
        this.flipSpeedStep = 3; // 1..5, default 3

        // Create and preload audio objects for flip sounds
        this.flipSoundA = new Audio('flip-a.mp3');
        this.flipSoundA.preload = "auto";
        this.flipSoundA.load();
        this.flipSoundB = new Audio('flip-b.mp3');
        this.flipSoundB.preload = "auto";
        this.flipSoundB.load();
        this.flipSoundA.addEventListener('ended', () => { this.flipSoundA.currentTime = 0; });
        this.flipSoundB.addEventListener('ended', () => { this.flipSoundB.currentTime = 0; });
        // 사운드 옵션 불러오기
        this.selectedFlipSound = localStorage.getItem('flipSoundOption') || 'a';

        // Set up Firebase configuration (placeholder - will be configured later)
        this.firebaseConfig = null;
        this.remotePageRef = null;
        this.remoteCommandsRef = null;
        this.remoteCommandsListener = null;

        this.initializeElements();
        this.setupEventListeners();
        this.loadHistory();

        // Initialize Firebase for remote control
        this.initializeFirebase();
    }


    initializeElements() {
        // Screen elements
        this.startScreen = document.getElementById('startScreen');
        this.gameScreen = document.getElementById('gameScreen');
        this.resultsScreen = document.getElementById('resultsScreen');

        // Settings elements
        this.settingsModal = document.getElementById('settingsModal');
        this.settingsButton = document.getElementById('settingsButton');
        this.saveSettingsButton = document.getElementById('saveSettings');
        this.closeSettingsButton = document.getElementById('closeSettings');
        this.titleInput = document.getElementById('titleInput');
        this.titleElement = document.querySelector('h1');

        // Input elements
        this.presetInput = document.getElementById('presetRounds');
        this.cardCountInput = document.getElementById('cardCount');
        this.numberRangesInput = document.getElementById('numberRanges');

        // Buttons
        this.startGameButton = document.getElementById('startGameButton');
        this.exitButton = document.getElementById('exitButton');
        this.nextRoundButton = document.getElementById('nextRoundButton');
        this.copyResultsButton = document.getElementById('copyResults');
        this.newGameButton = document.getElementById('newGame');
        this.loadExampleButton = document.getElementById('loadExampleButton');

        // Display elements
        this.currentRoundDisplay = document.getElementById('currentRound');
        this.cardsRemainingDisplay = document.getElementById('cardsRemaining');
        this.resultsContent = document.getElementById('resultsContent');
        this.cardContainer = document.querySelector('.card-container');

        // Lightbox elements
        this.cardAdjustLightbox = document.getElementById('cardAdjustLightbox');
        this.adjustCardCountInput = document.getElementById('adjustCardCount');
        this.confirmAdjustButton = document.getElementById('confirmAdjust');
        this.cancelAdjustButton = document.getElementById('cancelAdjust');

        // History elements
        this.historyScreen = document.getElementById('historyScreen');
        this.historyList = document.getElementById('historyList');
        this.backToStartButton = document.getElementById('backToStart');
        this.historyButton = document.getElementById('historyButton');
        this.clearHistoryButton = document.getElementById('clearHistory');

        // History content lightbox elements
        this.historyContentLightbox = document.getElementById('historyContentLightbox');
        this.historyContentTitle = document.getElementById('historyContentTitle');
        this.historyContentText = document.getElementById('historyContentText');
        this.closeHistoryContentButton = document.getElementById('closeHistoryContent');

        // End game confirm lightbox
        this.endGameConfirmLightbox = document.getElementById('endGameConfirmLightbox');
        this.confirmEndGameButton = document.getElementById('confirmEndGame');
        this.cancelEndGameButton = document.getElementById('cancelEndGame');

        // Shortcuts lightbox
        this.shortcutsButton = document.getElementById('shortcutsHelp');
        this.shortcutsLightbox = document.getElementById('shortcutsLightbox');
        this.closeShortcutsButton = document.getElementById('closeShortcuts');
        
        // Connection status element
        this.connectionStatusElement = document.getElementById('connectionStatus');
    }

    setupEventListeners() {
        this.startGameButton.addEventListener('click', () => this.startGame());
        this.exitButton.addEventListener('click', () => this.showEndGameConfirm());
        this.nextRoundButton.addEventListener('click', () => this.showNextRound());
        this.copyResultsButton.addEventListener('click', () => this.copyResults());
        this.newGameButton.addEventListener('click', () => this.resetGame());

        // Settings event listeners
        this.settingsButton.addEventListener('click', () => this.showSettings());
        this.saveSettingsButton.addEventListener('click', () => this.saveSettings());
        this.closeSettingsButton.addEventListener('click', () => this.hideSettings());

        // Lightbox event listeners
        this.confirmAdjustButton.addEventListener('click', () => this.confirmCardAdjustment());
        this.cancelAdjustButton.addEventListener('click', () => this.hideLightbox());

        // Card container click event for starting card flips
        this.cardContainer.addEventListener('click', (e) => {
            const card = e.target.closest('.card');
            if (card && !this.isAnimating && !card.classList.contains('flipped')) {
                this.startCardFlips();
            }
        });

        // History event listeners
        this.backToStartButton.addEventListener('click', () => this.switchScreen('startScreen'));
        this.historyButton.addEventListener('click', () => {
            this.loadHistory();
            this.switchScreen('historyScreen');
        });
        this.closeHistoryContentButton.addEventListener('click', () => this.hideHistoryContent());
        if (this.clearHistoryButton) {
            this.clearHistoryButton.addEventListener('click', () => this.clearAllHistory());
        }

        // End game confirm events
        if (this.confirmEndGameButton) {
            this.confirmEndGameButton.addEventListener('click', () => {
                this.hideEndGameConfirm();
                this.endGame();
            });
        }
        if (this.cancelEndGameButton) {
            this.cancelEndGameButton.addEventListener('click', () => this.hideEndGameConfirm());
        }

        // Shortcuts events
        if (this.shortcutsButton) {
            this.shortcutsButton.addEventListener('click', () => {
                if (this.shortcutsLightbox) this.shortcutsLightbox.classList.remove('hidden');
            });
        }
        if (this.closeShortcutsButton) {
            this.closeShortcutsButton.addEventListener('click', () => {
                if (this.shortcutsLightbox) this.shortcutsLightbox.classList.add('hidden');
            });
        }

        // Load example CSV button
        if (this.loadExampleButton) {
            this.loadExampleButton.addEventListener('click', async () => {
                try {
                    const ts = Date.now();
                    const candidates = [
                        `ex01.csv?v=${ts}`,
                        `./ex01.csv?v=${ts}`,
                        `/ex01.csv?v=${ts}`
                    ];
                    let loaded = null;
                    for (const url of candidates) {
                        try {
                            const resp = await fetch(url, { cache: 'no-store' });
                            if (resp.ok) { loaded = await resp.text(); break; }
                        } catch { }
                    }
                    if (!loaded) throw new Error('Failed to load ex01.csv');
                    const normalized = loaded.replace(/\r\n?/g, '\n').trim();
                    this.presetInput.value = normalized;
                    // Fire input event so any listeners see the change
                    this.presetInput.dispatchEvent(new Event('input', { bubbles: true }));
                } catch (e) {
                    alert('Could not load example CSV (ex01.csv). Please ensure the file exists next to index.html.');
                }
            });
        }

        // Remote button event
        const remoteButton = document.getElementById('remoteButton');
        if (remoteButton) {
            remoteButton.addEventListener('click', () => {
                this.openRemotePage();
            });
        }

        // 사운드 옵션 라디오 및 미리듣기 버튼 이벤트
        document.getElementById('flipSoundA').addEventListener('change', () => {
            this.selectedFlipSound = 'a';
            localStorage.setItem('flipSoundOption', 'a');
        });
        document.getElementById('flipSoundB').addEventListener('change', () => {
            this.selectedFlipSound = 'b';
            localStorage.setItem('flipSoundOption', 'b');
        });
        document.getElementById('flipSoundNone').addEventListener('change', () => {
            this.selectedFlipSound = 'none';
            localStorage.setItem('flipSoundOption', 'none');
        });
        document.getElementById('previewSoundA').addEventListener('click', () => {
            this.flipSoundA.pause();
            this.flipSoundA.currentTime = 0;
            this.flipSoundA.play();
        });
        document.getElementById('previewSoundB').addEventListener('click', () => {
            this.flipSoundB.pause();
            this.flipSoundB.currentTime = 0;
            this.flipSoundB.play();
        });

        // Keyboard: ArrowUp to increase flip speed, ArrowDown to decrease
        document.addEventListener('keydown', (e) => {
            const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
            // If lightbox is open and Enter is pressed, confirm adjustment (skip)
            if (e.key === 'Enter' && this.cardAdjustLightbox && !this.cardAdjustLightbox.classList.contains('hidden')) {
                e.preventDefault();
                this.confirmCardAdjustment();
                return;
            }
            if (tag === 'input' || tag === 'textarea' || tag === 'button') return;
            if (e.key === 'ArrowUp') {
                this.flipSpeedStep = Math.min(5, this.flipSpeedStep + 1);
                this.updateCardsRemaining();
            } else if (e.key === 'ArrowDown') {
                this.flipSpeedStep = Math.max(1, this.flipSpeedStep - 1);
                this.updateCardsRemaining();
            } else if (e.key === 'Enter') {
                // Do not start flips if the adjust lightbox is open
                if (this.cardAdjustLightbox && !this.cardAdjustLightbox.classList.contains('hidden')) return;
                // Do not start flips if Next Round is already enabled (all cards revealed)
                if (this.nextRoundButton && this.nextRoundButton.disabled === false) return;
                this.startCardFlips();
            } else if (e.key === 'ArrowRight') {
                // Proceed to next round with Right Arrow when available
                if (this.cardAdjustLightbox && !this.cardAdjustLightbox.classList.contains('hidden')) return;
                if (this.nextRoundButton && this.nextRoundButton.disabled === false && !this.isAnimating) {
                    e.preventDefault();
                    this.showNextRound();
                }
            }
        });
    }

    switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }

    // Parse range input like "1-442, 501-872, 900, 905-910" into a sorted unique array
    parseNumberRanges(input) {
        const parts = input.split(',').map(p => p.trim()).filter(Boolean);
        const nums = new Set();
        for (const part of parts) {
            if (/^\d+$/.test(part)) {
                const n = parseInt(part, 10);
                if (n >= 1 && n <= this.maxLimit) nums.add(n);
                continue;
            }
            const m = part.match(/^(\d+)\s*-\s*(\d+)$/);
            if (m) {
                let a = parseInt(m[1], 10);
                let b = parseInt(m[2], 10);
                if (a > b) [a, b] = [b, a];
                a = Math.max(1, a);
                b = Math.min(this.maxLimit, b);
                for (let x = a; x <= b; x++) nums.add(x);
            }
        }
        return Array.from(nums).sort((a, b) => a - b);
    }

    // Build pool from input, return true if valid, else alert and return false
    buildPoolFromInput() {
        const raw = (this.numberRangesInput?.value || '').trim();
        const pool = this.parseNumberRanges(raw);
        if (pool.length === 0) {
            alert('Please enter a valid draw range, e.g., 1-500 or 1-442, 501-872');
            return false;
        }
        if (pool.length > this.maxLimit) {
            alert(`The total count of numbers in the range cannot exceed ${this.maxLimit}.`);
            return false;
        }
        this.numberPool = pool;
        return true;
    }

    generateUniqueNumbers(count) {
        const available = this.numberPool.filter(n => !this.reservedNumbers.has(n));
        if (count > available.length) return [];
        const result = [];
        // Sample without replacement from available
        for (let i = 0; i < count; i++) {
            const idx = Math.floor(Math.random() * available.length);
            const chosen = available[idx];
            result.push(chosen);
            // remove chosen from available
            available[idx] = available[available.length - 1];
            available.pop();
            // reserve immediately to prevent reuse across rounds
            this.reservedNumbers.add(chosen);
        }
        return result;
    }

    createCards(count) {
        this.cardContainer.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const card = document.createElement('div');
            card.className = 'card';
            card.dataset.index = i;
            card.innerHTML = `
                <div class="card-inner">
                    <div class="card-front">?</div>
                    <div class="card-back"></div>
                </div>
            `;
            this.cardContainer.appendChild(card);
        }
        this.updateCardsRemaining();
    }

    updateCardsRemaining() {
        const total = this.numberPool.length || 0;
        const winners = this.usedNumbers.size || 0;
        const speedPercent = Math.max(1, Math.min(5, this.flipSpeedStep)) * 20;
        this.cardsRemainingDisplay.textContent = `🏆 ${winners} / ${total} ( ⚡${speedPercent}%)`;
    }

    getFlipTimings() {
        // Steps: 1 slowest ... 5 fastest
        const map = {
            1: { delay: 800, duration: 700 },
            2: { delay: 650, duration: 650 },
            3: { delay: 500, duration: 600 },
            4: { delay: 350, duration: 500 },
            5: { delay: 200, duration: 450 }
        };
        return map[this.flipSpeedStep] || map[3];
    }

    // Function to play flip sound with reset and pause fix
    playFlipSound() {
        if (this.selectedFlipSound === 'a') {
            this.flipSoundA.pause();
            this.flipSoundA.currentTime = 0;
            this.flipSoundA.play();
        } else if (this.selectedFlipSound === 'b') {
            this.flipSoundB.pause();
            this.flipSoundB.currentTime = 0;
            this.flipSoundB.play();
        } // 
    }

    async flipCard(index) {
        const card = document.querySelector(`[data-index="${index}"]`);
        card.classList.add('flipped');
        card.classList.add('reveal');

        const backside = card.querySelector('.card-back');
        backside.textContent = this.currentRoundNumbers[index];

        // Play flip sound using the improved method
        this.playFlipSound();

        const timings = this.getFlipTimings();
        await anime({
            targets: card,
            scale: [1, 1.1, 1],
            duration: timings.duration,
            easing: 'easeOutElastic(1, .8)'
        }).finished;
        // Mark revealed number as used and update status
        const revealed = this.currentRoundNumbers[index];
        if (!this.usedNumbers.has(revealed)) {
            this.usedNumbers.add(revealed);
        }
        this.updateCardsRemaining();
    }

    async revealCards() {
        this.isAnimating = true;
        for (let i = 0; i < this.currentRoundNumbers.length; i++) {
            await this.flipCard(i);
            const { delay } = this.getFlipTimings();
            await new Promise(resolve => setTimeout(resolve, delay));

            // 
            if (i === this.currentRoundNumbers.length - 1) {
                this.triggerConfetti();
            }
        }
        this.isAnimating = false;
        this.nextRoundButton.disabled = false;
    }

    triggerConfetti() {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        function randomInRange(min, max) {
            return Math.random() * (max - min) + min;
        }

        const interval = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);

            // 
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
            });

            // 
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
            });
        }, 250);
    }

    startGame() {
        if (!this.buildPoolFromInput()) return;

        const presetValues = this.presetInput.value.trim();
        if (!presetValues) {
            alert('Please enter the product name and draw count.');
            return;
        }

        const lines = presetValues.split('\n').map(line => line.trim()).filter(line => line);
        if (lines.length === 0) {
            alert('Please enter the correct format.');
            return;
        }

        this.rounds = [];

        for (const rawLine of lines) {
            const line = rawLine.trim();
            const parts = line.split(',').map(s => s.trim()).filter(Boolean);
            if (parts.length < 2) {
                alert('Each line must contain at least a prize and a count.');
                return;
            }
            // Find last numeric token as count
            let countIndex = -1;
            for (let i = parts.length - 1; i >= 0; i--) {
                if (/^\d+$/.test(parts[i])) { countIndex = i; break; }
            }
            if (countIndex === -1) {
                alert('Each line must end with a numeric draw count.');
                return;
            }
            const numberCount = parseInt(parts[countIndex], 10);
            const prize = parts.slice(0, countIndex).join(', ').trim();

            if (!prize || isNaN(numberCount) || numberCount <= 0 || numberCount > this.numberPool.length) {
                alert('Please enter the correct format (Product Name, Draw Count).');
                return;
            }

            this.rounds.push(numberCount);
            this.prizes.push(prize);
        }

        const firstRoundCount = this.rounds[0];

        // Ensure card count doesn't exceed available pool
        if (firstRoundCount > this.numberPool.length) {
            alert(`The draw count cannot exceed the available numbers (${this.numberPool.length}).`);
            return;
        }

        this.currentRoundNumbers = this.generateUniqueNumbers(firstRoundCount);
        if (this.currentRoundNumbers.length !== firstRoundCount) {
            alert('Failed to generate unique numbers for the first round. Please check the range and counts.');
            return;
        }
        this.createCards(firstRoundCount);
        this.updateCardsRemaining();
        this.roundResults.push({
            round: this.currentRound,
            prize: this.prizes[0],
            numbers: [...this.currentRoundNumbers]
        });

        this.switchScreen('gameScreen');
        this.currentRoundDisplay.textContent = `${this.currentRound}`;
        document.getElementById('currentPrizeDisplay').textContent = this.prizes[0];
        this.nextRoundButton.disabled = true;
        // Show adjust lightbox for the first item
        this.showLightbox();
    }

    showNextRound() {
        if (this.isAnimating) return;

        if (this.currentRound >= this.rounds.length) {
            alert('All rounds are complete!');
            this.endGame();
            return;
        }

        this.currentRound++;
        const nextRoundCount = this.rounds[this.currentRound - 1];
        const currentPrize = this.prizes[this.currentRound - 1];

        // Check if we have enough numbers left
        const remainingPossibleNumbers = this.numberPool.length - this.reservedNumbers.size;
        if (nextRoundCount > remainingPossibleNumbers) {
            alert(`Not enough numbers remaining. Only ${remainingPossibleNumbers} numbers are available.`);
            return;
        }

        this.currentRoundNumbers = this.generateUniqueNumbers(nextRoundCount);
        this.createCards(nextRoundCount);
        this.updateCardsRemaining();
        this.roundResults.push({
            round: this.currentRound,
            prize: currentPrize,
            numbers: [...this.currentRoundNumbers]
        });

        this.currentRoundDisplay.textContent = `${this.currentRound}`;
        document.getElementById('currentPrizeDisplay').textContent = currentPrize;
        this.nextRoundButton.disabled = true;
        this.showLightbox();
    }

    showLightbox() {
        this.cardAdjustLightbox.classList.remove('hidden');
        this.adjustCardCountInput.value = this.currentRoundNumbers.length;
        // Set current prize name
        const currentPrize = this.prizes[this.currentRound - 1];
        const prizeTitleEl = document.getElementById('currentPrizeName');
        const lightboxContent = this.cardAdjustLightbox.querySelector('.lightbox-content');
        prizeTitleEl.textContent = currentPrize;
        // Dynamically constrain max selectable cards to remaining pool size
        const remainingPossibleNumbers = this.numberPool.length - this.reservedNumbers.size + this.currentRoundNumbers.length;
        this.adjustCardCountInput.setAttribute('max', String(Math.min(this.maxLimit, remainingPossibleNumbers)));
    }

    hideLightbox() {
        this.cardAdjustLightbox.classList.add('hidden');
    }

    confirmCardAdjustment() {
        const newCount = parseInt(this.adjustCardCountInput.value);
        if (isNaN(newCount) || newCount < 1 || newCount > this.numberPool.length) {
            alert(`Please enter a valid number between 1 and ${this.numberPool.length}`);
            return;
        }

        const remainingPossibleNumbers = this.numberPool.length - this.reservedNumbers.size + this.currentRoundNumbers.length;
        if (newCount > remainingPossibleNumbers) {
            alert(`Not enough unique numbers remaining. Only ${remainingPossibleNumbers} numbers available.`);
            return;
        }

        // Unreserve current round numbers before regenerating (only those not already revealed)
        this.currentRoundNumbers.forEach(num => {
            if (!this.usedNumbers.has(num)) this.reservedNumbers.delete(num);
        });

        // Generate new numbers for the round
        this.currentRoundNumbers = this.generateUniqueNumbers(newCount);
        this.createCards(newCount);
        this.updateCardsRemaining();

        // Update the last round result
        this.roundResults[this.roundResults.length - 1].numbers = [...this.currentRoundNumbers];

        this.hideLightbox();
    }

    startCardFlips() {
        if (!this.isAnimating) {
            this.revealCards();
        }
    }

    endGame() {
        let resultsText = 'Draw Result:\n\n';
        let deliveryList = 'Delivery List:\n\n';

        // First show round results
        this.roundResults.forEach(result => {
            const sortedNumbers = [...result.numbers].sort((a, b) => a - b);
            resultsText += `Round ${result.round} - ${result.prize}:\n`;
            resultsText += sortedNumbers.join(', ') + '\n\n';
        });

        // Create a single sorted list of all numbers with their prizes
        const allNumbers = [];
        this.roundResults.forEach(result => {
            result.numbers.forEach(num => {
                allNumbers.push({ number: num, prize: result.prize });
            });
        });

        // Sort by number
        allNumbers.sort((a, b) => a.number - b.number);

        // Create delivery list
        allNumbers.forEach(item => {
            deliveryList += `${item.number} - ${item.prize}\n`;
        });

        // Combine both lists
        const finalResults = resultsText + '\n' + deliveryList;
        this.resultsContent.textContent = finalResults;
        this.saveToHistory();
        this.switchScreen('resultsScreen');
    }

    copyResults() {
        navigator.clipboard.writeText(this.resultsContent.textContent)
            .then(() => {
                this.copyResultsButton.textContent = 'Copied!';
                setTimeout(() => {
                    this.copyResultsButton.textContent = 'Copy Results';
                }, 2000);
            });
    }

    resetGame() {
        this.rounds = [];
        this.currentRound = 1;
        this.usedNumbers.clear();
        this.reservedNumbers.clear();
        this.currentRoundNumbers = [];
        this.roundResults = [];
        this.prizeImages = [];

        // Set default preset values
        const defaultPreset = `Amazon Kindle Paperwhite,6
Sony WH-1000XM5 Wireless Headphones,5
Apple Watch Series 9,4
PlayStation 5 Digital Edition,2
Apple iPad Pro 12.9-inch,1`;

        this.presetInput.value = defaultPreset;
        if (this.numberRangesInput) this.numberRangesInput.value = '1-500';
        this.numberPool = [];
        this.titleInput.value = 'Lucky Number Draw';
        this.titleElement.textContent = 'Lucky Number Draw';
        this.switchScreen('startScreen');
    }

    showSettings() {
        this.settingsModal.classList.remove('hidden');
        // 사운드 옵션 라디오 상태 동기화
        const opt = this.selectedFlipSound;
        document.getElementById('flipSoundA').checked = (opt === 'a');
        document.getElementById('flipSoundB').checked = (opt === 'b');
        document.getElementById('flipSoundNone').checked = (opt === 'none');
        // Update range label with current maxLimit
        const rangeInput = document.getElementById('numberRanges');
        if (rangeInput && rangeInput.parentElement) {
            const labelEl = rangeInput.parentElement.querySelector('label');
            if (labelEl) {
                labelEl.textContent = `Draw Range (e.g., 1-442, 501-872) — Max total ${this.maxLimit} numbers`;
            }
        }
    }

    hideSettings() {
        this.settingsModal.classList.add('hidden');
    }

    saveSettings() {
        // Try to build pool to validate input; keep previous if invalid
        if (!this.buildPoolFromInput()) {
            return;
        }

        // Update title
        const newTitle = this.titleInput.value.trim() || 'Lucky Number Draw';
        this.titleElement.textContent = newTitle;

        // 사운드 옵션 저장
        if (document.getElementById('flipSoundA').checked) {
            this.selectedFlipSound = 'a';
        } else if (document.getElementById('flipSoundB').checked) {
            this.selectedFlipSound = 'b';
        } else {
            this.selectedFlipSound = 'none';
        }
        localStorage.setItem('flipSoundOption', this.selectedFlipSound);
        this.hideSettings();
    }

    generateGameId() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `Game#${year}${month}${day}${hours}${minutes}`;
    }

    saveToHistory() {
        const gameId = this.generateGameId();
        const gameData = {
            id: gameId,
            date: new Date().toLocaleString(),
            results: this.roundResults,
            title: document.querySelector('h1').textContent
        };

        let history = JSON.parse(localStorage.getItem('drawHistory') || '[]');
        history.unshift(gameData);
        localStorage.setItem('drawHistory', JSON.stringify(history));
    }

    loadHistory() {
        const history = JSON.parse(localStorage.getItem('drawHistory') || '[]');
        this.historyList.innerHTML = '';

        history.forEach(game => {
            const item = document.createElement('div');
            item.className = 'history-item';

            const content = document.createElement('div');
            content.className = 'history-content';
            content.textContent = `${game.title}\n${game.date}`;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '🗑️';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                this.deleteHistoryItem(game.id);
            };

            item.appendChild(content);
            item.appendChild(deleteBtn);

            item.onclick = () => this.showHistoryContent(game);
            this.historyList.appendChild(item);
        });
    }

    deleteHistoryItem(gameId) {
        if (confirm('Are you sure you want to delete this history item?')) {
            let history = JSON.parse(localStorage.getItem('drawHistory') || '[]');
            history = history.filter(game => game.id !== gameId);
            localStorage.setItem('drawHistory', JSON.stringify(history));
            this.loadHistory();
        }
    }

    showHistoryContent(game) {
        let content = '';
        game.results.forEach(result => {
            content += `Round ${result.round} - ${result.prize}:\n`;
            content += result.numbers.sort((a, b) => a - b).join(', ') + '\n\n';
        });

        const allNumbers = [];
        game.results.forEach(result => {
            result.numbers.forEach(num => {
                allNumbers.push({ number: num, prize: result.prize });
            });
        });

        allNumbers.sort((a, b) => a.number - b.number);

        content += '\nDelivery List:\n\n';
        allNumbers.forEach(item => {
            content += `${item.number} - ${item.prize}\n`;
        });

        this.historyContentTitle.textContent = game.title;
        this.historyContentText.textContent = content;
        this.historyContentLightbox.classList.remove('hidden');
    }

    hideHistoryContent() {
        this.historyContentLightbox.classList.add('hidden');
    }

    showEndGameConfirm() {
        this.endGameConfirmLightbox.classList.remove('hidden');
    }

    hideEndGameConfirm() {
        this.endGameConfirmLightbox.classList.add('hidden');
    }

    clearAllHistory() {
        if (!confirm('Delete ALL history items? This cannot be undone.')) return;
        localStorage.removeItem('drawHistory');
        this.loadHistory();
        alert('All history cleared.');
    }

    openRemotePage() {
        // Open remote controller page in a new window/tab
        window.open('remote.html', '_blank', 'width=400,height=600');
    }

    // Initialize Firebase for remote control
    initializeFirebase() {
        // Check if Firebase SDK is loaded
        if (typeof firebase === 'undefined') {
            console.warn('Firebase SDK not loaded. Remote control will not work.');
            return;
        }
        
        // Load Firebase config from external file if available
        // Users need to create firebaseConfig.js with their own values
        try {
            // Use window.firebaseConfig if available (loaded from external file)
            // or check if it's defined as a global variable
            if (typeof firebaseConfig !== 'undefined') {
                this.firebaseConfig = firebaseConfig; // Use global variable
            } else if (window.firebaseConfig) {
                this.firebaseConfig = window.firebaseConfig;
            } else {
                // Fallback config - users should create firebaseConfig.js with their own values
                this.firebaseConfig = {
                    // These are placeholder values - users need to update with their own Firebase config
                    apiKey: "YOUR_API_KEY",
                    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
                    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com/",
                    projectId: "YOUR_PROJECT_ID",
                    storageBucket: "YOUR_PROJECT_ID.appspot.com",
                    messagingSenderId: "YOUR_SENDER_ID",
                    appId: "YOUR_APP_ID"
                };
                console.warn('Firebase config not found. Please create firebaseConfig.js with your own values.');
            }
            
            // Initialize Firebase app
            if (!firebase.apps.length) {
                firebase.initializeApp(this.firebaseConfig);
            }
            
            // Get database reference
            const db = firebase.database();
            this.remoteCommandsRef = db.ref('remoteCommands');
            
            // Listen for connection status
            const connectedRef = db.ref('.info/connected');
            connectedRef.on('value', (snap) => {
                if (snap.val() === true) {
                    if (this.connectionStatusElement) {
                        this.connectionStatusElement.textContent = 'Connected';
                        this.connectionStatusElement.className = 'connection-status connected';
                    }
                    console.log('Firebase connected');
                } else {
                    if (this.connectionStatusElement) {
                        this.connectionStatusElement.textContent = 'Disconnected';
                        this.connectionStatusElement.className = 'connection-status';
                    }
                    console.log('Firebase disconnected');
                }
            });
            
            // Listen for commands from remote controller
            this.remoteCommandsRef.on('child_added', (snapshot) => {
                const commandData = snapshot.val();
                this.handleRemoteCommand(commandData.command);
                
                // Remove the command after processing to avoid duplicate processing
                snapshot.ref.remove();
            });
            
            console.log('Firebase initialized for remote control');
        } catch (error) {
            console.error('Error initializing Firebase:', error);
            console.warn('Remote control functionality will be disabled.');
            
            // Update connection status to show error if needed
            if (this.connectionStatusElement) {
                this.connectionStatusElement.textContent = 'Firebase Error';
                this.connectionStatusElement.className = 'connection-status';
            }
        }
    }

    // Handle commands from remote controller
    handleRemoteCommand(command) {
        console.log('Received remote command:', command);

        switch (command) {
            case 'startFlip':
                // Trigger Enter key press to start card flips
                if (!this.isAnimating) {
                    // Check if we're in the game screen and cards can be flipped
                    if (this.gameScreen && this.gameScreen.classList.contains('active')) {
                        // Do not start flips if the adjust lightbox is open
                        if (this.cardAdjustLightbox && !this.cardAdjustLightbox.classList.contains('hidden')) return;
                        // Do not start flips if Next Round is already enabled (all cards revealed)
                        if (this.nextRoundButton && this.nextRoundButton.disabled === false) return;

                        this.startCardFlips();
                    }
                }
                break;
            case 'nextRound':
                // Trigger next round
                if (this.nextRoundButton && this.nextRoundButton.disabled === false && !this.isAnimating) {
                    this.showNextRound();
                }
                break;
            case 'speedUp':
                // Increase flip speed
                this.flipSpeedStep = Math.min(5, this.flipSpeedStep + 1);
                this.updateCardsRemaining();
                break;
            case 'speedDown':
                // Decrease flip speed
                this.flipSpeedStep = Math.max(1, this.flipSpeedStep - 1);
                this.updateCardsRemaining();
                break;
            default:
                console.warn('Unknown remote command:', command);
        }
    }
}

// Initialize the system when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.drawSystem = new DrawSystem();
});

