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
        
        this.initializeElements();
        this.setupEventListeners();
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

    async flipCard(index) {
        const card = document.querySelector(`[data-index="${index}"]`);
        card.classList.add('flipped');
        card.classList.add('reveal');
        
        const backside = card.querySelector('.card-back');
        backside.textContent = this.currentRoundNumbers[index];

        // Play flip sound
        const flipSound = new Audio('flipcard.mp3');
        flipSound.play();
        
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
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        this.isAnimating = false;
        this.nextRoundButton.style.display = 'block';
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
        this.currentRoundDisplay.textContent = `${this.currentRound} - ${this.prizes[0]}`;
        this.nextRoundButton.style.display = 'none';
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
        
        this.currentRoundDisplay.textContent = `${this.currentRound} - ${currentPrize}`;
        this.nextRoundButton.style.display = 'none';
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
        const defaultPreset = `iPad,3
Wireless Headphones,5
Smartwatch,4
Gaming Console,2
E-Book Reader,6`;
        
        this.presetInput.value = defaultPreset;
        this.maxNumberInput.value = '500';
        this.maxNumber = 1000;
        this.titleInput.value = 'Lucky Number Draw';
        this.titleElement.textContent = 'Lucky Number Draw';
        this.switchScreen('startScreen');
    }

    showSettings() {
        this.settingsModal.classList.remove('hidden');
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
        
        this.hideSettings();
    }
}

// Initialize the system when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.drawSystem = new DrawSystem();
});

