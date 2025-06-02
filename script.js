class DrawSystem {
    constructor() {
        this.rounds = [];
        this.prizes = [];
        this.currentRound = 1;
        this.usedNumbers = new Set();
        this.currentRoundNumbers = [];
        this.roundResults = [];
        this.isAnimating = false;
        this.maxNumber = 1000;
        
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
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadHistory();
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
        this.maxNumberInput = document.getElementById('maxNumber');
        
        // Buttons
        this.startGameButton = document.getElementById('startGameButton');
        this.exitButton = document.getElementById('exitButton');
        this.nextRoundButton = document.getElementById('nextRoundButton');
        this.copyResultsButton = document.getElementById('copyResults');
        this.newGameButton = document.getElementById('newGame');
        
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
        
        // History content lightbox elements
        this.historyContentLightbox = document.getElementById('historyContentLightbox');
        this.historyContentTitle = document.getElementById('historyContentTitle');
        this.historyContentText = document.getElementById('historyContentText');
        this.closeHistoryContentButton = document.getElementById('closeHistoryContent');
    }

    setupEventListeners() {
        this.startGameButton.addEventListener('click', () => this.startGame());
        this.exitButton.addEventListener('click', () => this.endGame());
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
    }

    switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }

    generateUniqueNumbers(count) {
        const numbers = new Set();
        while (numbers.size < count) {
            const num = Math.floor(Math.random() * this.maxNumber) + 1;
            if (!this.usedNumbers.has(num)) {
                numbers.add(num);
            }
        }
        const result = Array.from(numbers);
        result.forEach(num => this.usedNumbers.add(num));
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
        this.updateCardsRemaining(count);
    }

    updateCardsRemaining(count) {
        this.cardsRemainingDisplay.textContent = `Remaining Cards: ${count}`;
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
        } // 무음이면 아무것도 하지 않음
    }

    async flipCard(index) {
        const card = document.querySelector(`[data-index="${index}"]`);
        card.classList.add('flipped');
        card.classList.add('reveal');
        
        const backside = card.querySelector('.card-back');
        backside.textContent = this.currentRoundNumbers[index];

        // Play flip sound using the improved method
        this.playFlipSound();
        
        await anime({
            targets: card,
            scale: [1, 1.1, 1],
            duration: 600,
            easing: 'easeOutElastic(1, .8)'
        }).finished;

        // Update remaining cards count
        const remainingCards = this.currentRoundNumbers.length - (index + 1);
        this.updateCardsRemaining(remainingCards);
    }

    async revealCards() {
        this.isAnimating = true;
        for (let i = 0; i < this.currentRoundNumbers.length; i++) {
            await this.flipCard(i);
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 마지막 카드인 경우 confetti 효과 실행
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

        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            
            // 왼쪽에서 발사
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
            });
            
            // 오른쪽에서 발사
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
            });
        }, 250);
    }

    startGame() {
        this.maxNumber = parseInt(this.maxNumberInput.value) || 1000;
        this.maxNumber = Math.min(Math.max(this.maxNumber, 1), 1000);
        
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

        this.prizes = [];
        this.rounds = [];
        
        for (const line of lines) {
            const [prize, count] = line.split(',').map(item => item.trim());
            const numberCount = parseInt(count);
            
            if (!prize || isNaN(numberCount) || numberCount <= 0 || numberCount > this.maxNumber) {
                alert('Please enter the correct format (Product Name, Draw Count).');
                return;
            }
            
            this.prizes.push(prize);
            this.rounds.push(numberCount);
        }
        
        const firstRoundCount = this.rounds[0];
        
        // Ensure card count doesn't exceed max number
        if (firstRoundCount > this.maxNumber) {
            alert(`The draw count cannot exceed the maximum number (${this.maxNumber}).`);
            return;
        }
        
        this.currentRoundNumbers = this.generateUniqueNumbers(firstRoundCount);
        this.createCards(firstRoundCount);
        this.roundResults.push({
            round: this.currentRound,
            prize: this.prizes[0],
            numbers: [...this.currentRoundNumbers]
        });
        
        this.switchScreen('gameScreen');
        this.currentRoundDisplay.textContent = `${this.currentRound}`;
        document.getElementById('currentPrizeDisplay').textContent = this.prizes[0];
        this.nextRoundButton.disabled = true;
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
        const remainingPossibleNumbers = this.maxNumber - this.usedNumbers.size;
        if (nextRoundCount > remainingPossibleNumbers) {
            alert(`Not enough numbers remaining. Only ${remainingPossibleNumbers} numbers are available.`);
            return;
        }
        
        this.currentRoundNumbers = this.generateUniqueNumbers(nextRoundCount);
        this.createCards(nextRoundCount);
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
        document.getElementById('currentPrizeName').textContent = currentPrize;
    }

    hideLightbox() {
        this.cardAdjustLightbox.classList.add('hidden');
    }

    confirmCardAdjustment() {
        const newCount = parseInt(this.adjustCardCountInput.value);
        if (isNaN(newCount) || newCount < 1 || newCount > this.maxNumber) {
            alert(`Please enter a valid number between 1 and ${this.maxNumber}`);
            return;
        }

        const remainingPossibleNumbers = this.maxNumber - this.usedNumbers.size + this.currentRoundNumbers.length;
        if (newCount > remainingPossibleNumbers) {
            alert(`Not enough unique numbers remaining. Only ${remainingPossibleNumbers} numbers available.`);
            return;
        }

        // Remove current round numbers from usedNumbers set
        this.currentRoundNumbers.forEach(num => this.usedNumbers.delete(num));
        
        // Generate new numbers for the round
        this.currentRoundNumbers = this.generateUniqueNumbers(newCount);
        this.createCards(newCount);
        
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
        this.currentRoundNumbers = [];
        this.roundResults = [];
        
        // Set default preset values
        const defaultPreset = `Amazon Kindle Paperwhite,6
Sony WH-1000XM5 Wireless Headphones,5
Apple Watch Series 9,4
PlayStation 5 Digital Edition,2
Apple iPad Pro 12.9-inch,1`;
        
        this.presetInput.value = defaultPreset;
        this.maxNumberInput.value = '500';
        this.maxNumber = 1000;
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
    }

    hideSettings() {
        this.settingsModal.classList.add('hidden');
    }

    saveSettings() {
        const maxNumber = parseInt(this.maxNumberInput.value) || 1000;
        this.maxNumber = Math.min(Math.max(maxNumber, 1), 1000);
        
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
}

// Initialize the system when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.drawSystem = new DrawSystem();
});

