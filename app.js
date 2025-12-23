// Classe pour gérer un timer individuel
class Timer {
    constructor(data) {
        this.id = data.id || Date.now() + Math.random();
        this.title = data.title;
        this.startDate = new Date(data.startDate);
        this.endDate = new Date(data.endDate);
        this.granularity = data.granularity || 'seconds';
        this.refreshRate = parseInt(data.refreshRate) || 1000;
        this.intervalId = null;
    }

    getProgress() {
        const now = new Date();
        const total = this.endDate - this.startDate;
        const elapsed = now - this.startDate;

        if (now < this.startDate) {
            return { percentage: 0, status: 'upcoming' };
        } else if (now > this.endDate) {
            return { percentage: 100, status: 'completed' };
        } else {
            const percentage = (elapsed / total) * 100;
            return { percentage, status: 'active' };
        }
    }

    getTimeRemaining() {
        const now = new Date();
        const diff = this.endDate - now;

        if (diff <= 0) {
            return { value: 0, unit: '', display: 'Terminé' };
        }

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        switch (this.granularity) {
            case 'seconds':
                return { value: seconds, unit: 's', display: `${seconds} secondes` };
            case 'minutes':
                return { value: minutes, unit: 'min', display: `${minutes} minutes` };
            case 'hours':
                return { value: hours, unit: 'h', display: `${hours} heures` };
            case 'days':
                return { value: days, unit: 'j', display: `${days} jours` };
            default:
                return { value: seconds, unit: 's', display: `${seconds} secondes` };
        }
    }

    getTimeElapsed() {
        const now = new Date();
        const diff = now - this.startDate;

        if (diff <= 0) {
            return { value: 0, unit: '', display: 'Pas encore commencé' };
        }

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        switch (this.granularity) {
            case 'seconds':
                return { value: seconds, unit: 's', display: `${seconds}s` };
            case 'minutes':
                return { value: minutes, unit: 'min', display: `${minutes}min` };
            case 'hours':
                return { value: hours, unit: 'h', display: `${hours}h` };
            case 'days':
                return { value: days, unit: 'j', display: `${days}j` };
            default:
                return { value: seconds, unit: 's', display: `${seconds}s` };
        }
    }

    formatDate(date) {
        return new Intl.DateTimeFormat('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    toJSON() {
        return {
            id: this.id,
            title: this.title,
            startDate: this.startDate.toISOString(),
            endDate: this.endDate.toISOString(),
            granularity: this.granularity,
            refreshRate: this.refreshRate
        };
    }
}

// Classe pour gérer l'application
class TimeProgressApp {
    constructor() {
        this.timers = [];
        this.editingTimerId = null;
        this.initElements();
        this.loadTimers();
        this.attachEventListeners();
        this.registerServiceWorker();
        this.setDefaultDates();
    }

    initElements() {
        this.addButton = document.getElementById('addButton');
        this.modal = document.getElementById('modal');
        this.timerForm = document.getElementById('timerForm');
        this.cancelButton = document.getElementById('cancelButton');
        this.timersGrid = document.getElementById('timersGrid');

        this.titleInput = document.getElementById('title');
        this.startDateInput = document.getElementById('startDate');
        this.startTimeInput = document.getElementById('startTime');
        this.endDateInput = document.getElementById('endDate');
        this.endTimeInput = document.getElementById('endTime');
        this.granularityInput = document.getElementById('granularity');
        this.refreshRateInput = document.getElementById('refreshRate');
    }

    setDefaultDates() {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        this.startDateInput.valueAsDate = now;
        this.startTimeInput.value = now.toTimeString().slice(0, 5);

        this.endDateInput.valueAsDate = tomorrow;
        this.endTimeInput.value = now.toTimeString().slice(0, 5);
    }

    attachEventListeners() {
        this.addButton.addEventListener('click', () => this.openModal());
        this.cancelButton.addEventListener('click', () => this.closeModal());
        this.timerForm.addEventListener('submit', (e) => this.handleSubmit(e));

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });
    }

    openModal() {
        this.editingTimerId = null;
        document.querySelector('.modal-content h2').textContent = 'Nouvelle période de temps';
        this.modal.classList.add('active');
    }

    closeModal() {
        this.modal.classList.remove('active');
        this.timerForm.reset();
        this.setDefaultDates();
        this.editingTimerId = null;
    }

    handleSubmit(e) {
        e.preventDefault();

        const startDateTime = `${this.startDateInput.value}T${this.startTimeInput.value}`;
        const endDateTime = `${this.endDateInput.value}T${this.endTimeInput.value}`;

        const timerData = {
            title: this.titleInput.value,
            startDate: startDateTime,
            endDate: endDateTime,
            granularity: this.granularityInput.value,
            refreshRate: this.refreshRateInput.value
        };

        if (this.editingTimerId) {
            // Mode édition
            const timerIndex = this.timers.findIndex(t => t.id === this.editingTimerId);
            if (timerIndex !== -1) {
                // Arrêter l'ancien timer
                const oldTimer = this.timers[timerIndex];
                if (oldTimer.intervalId) {
                    clearInterval(oldTimer.intervalId);
                }

                // Conserver l'ID original
                timerData.id = this.editingTimerId;
                const updatedTimer = new Timer(timerData);
                this.timers[timerIndex] = updatedTimer;

                // Supprimer l'ancienne carte et créer la nouvelle
                const oldCard = document.querySelector(`[data-timer-id="${this.editingTimerId}"]`);
                if (oldCard) {
                    oldCard.remove();
                }

                this.saveTimers();
                this.renderTimer(updatedTimer);
            }
        } else {
            // Mode ajout
            const timer = new Timer(timerData);
            this.timers.push(timer);
            this.saveTimers();
            this.renderTimer(timer);
        }

        this.closeModal();
    }

    renderTimer(timer) {
        const card = document.createElement('div');
        card.className = 'timer-card';
        card.dataset.timerId = timer.id;

        const progress = timer.getProgress();
        const timeRemaining = timer.getTimeRemaining();
        const circumference = 2 * Math.PI * 90;
        const offset = circumference - (progress.percentage / 100) * circumference;

        // Calculer la position du point sur le cercle
        const angle = (progress.percentage / 100) * 2 * Math.PI - Math.PI / 2;
        const pointX = 100 + 90 * Math.cos(angle);
        const pointY = 100 + 90 * Math.sin(angle);

        card.innerHTML = `
            <div class="timer-header">
                <h3 class="timer-title">${timer.title}</h3>
                <div class="timer-actions">
                    <button class="edit-button" data-timer-id="${timer.id}" title="Modifier">✎</button>
                    <button class="delete-button" data-timer-id="${timer.id}" title="Supprimer">×</button>
                </div>
            </div>

            <div class="timer-circle-container">
                <svg class="timer-circle" viewBox="0 0 200 200">
                    <defs>
                        <linearGradient id="gradient-${timer.id}" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#6c5ce7;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#a29bfe;stop-opacity:1" />
                        </linearGradient>
                    </defs>
                    <circle class="circle-bg" cx="100" cy="100" r="90"/>
                    <circle
                        class="circle-progress"
                        cx="100"
                        cy="100"
                        r="90"
                        stroke="url(#gradient-${timer.id})"
                        stroke-dasharray="${circumference}"
                        stroke-dashoffset="${offset}"
                    />
                    <circle
                        class="circle-dot"
                        cx="${pointX}"
                        cy="${pointY}"
                        r="8"
                        fill="#ffffff"
                        filter="url(#shadow-${timer.id})"
                    />
                    <defs>
                        <filter id="shadow-${timer.id}" x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#6c5ce7" flood-opacity="0.8"/>
                        </filter>
                    </defs>
                    <text class="circle-text" x="100" y="95">${Math.round(progress.percentage)}%</text>
                    <text class="circle-subtext" x="100" y="115">${timeRemaining.display}</text>
                </svg>
            </div>

            <div class="timer-info">
                <div class="timer-dates">
                    ${timer.formatDate(timer.startDate)} → ${timer.formatDate(timer.endDate)}
                </div>
                <span class="timer-status ${progress.status}">
                    ${progress.status === 'active' ? 'En cours' :
                      progress.status === 'completed' ? 'Terminé' : 'À venir'}
                </span>
            </div>
        `;

        this.timersGrid.appendChild(card);

        const editButton = card.querySelector('.edit-button');
        const deleteButton = card.querySelector('.delete-button');

        editButton.addEventListener('click', () => this.editTimer(timer.id));
        deleteButton.addEventListener('click', () => this.deleteTimer(timer.id));

        this.startTimerUpdate(timer);
        this.checkEmptyState();
    }

    startTimerUpdate(timer) {
        timer.intervalId = setInterval(() => {
            this.updateTimerDisplay(timer);
        }, timer.refreshRate);
    }

    updateTimerDisplay(timer) {
        const card = document.querySelector(`[data-timer-id="${timer.id}"]`);
        if (!card) {
            clearInterval(timer.intervalId);
            return;
        }

        const progress = timer.getProgress();
        const timeRemaining = timer.getTimeRemaining();
        const circumference = 2 * Math.PI * 90;
        const offset = circumference - (progress.percentage / 100) * circumference;

        // Calculer la position du point sur le cercle
        const angle = (progress.percentage / 100) * 2 * Math.PI - Math.PI / 2;
        const pointX = 100 + 90 * Math.cos(angle);
        const pointY = 100 + 90 * Math.sin(angle);

        const circleProgress = card.querySelector('.circle-progress');
        const circleDot = card.querySelector('.circle-dot');
        const circleText = card.querySelector('.circle-text');
        const circleSubtext = card.querySelector('.circle-subtext');
        const statusElement = card.querySelector('.timer-status');

        circleProgress.style.strokeDashoffset = offset;
        circleDot.setAttribute('cx', pointX);
        circleDot.setAttribute('cy', pointY);
        circleText.textContent = `${Math.round(progress.percentage)}%`;
        circleSubtext.textContent = timeRemaining.display;

        statusElement.className = `timer-status ${progress.status}`;
        statusElement.textContent = progress.status === 'active' ? 'En cours' :
                                    progress.status === 'completed' ? 'Terminé' : 'À venir';
    }

    editTimer(timerId) {
        const timer = this.timers.find(t => t.id === timerId);
        if (!timer) return;

        this.editingTimerId = timerId;

        // Pré-remplir le formulaire
        this.titleInput.value = timer.title;

        const startDate = new Date(timer.startDate);
        const endDate = new Date(timer.endDate);

        this.startDateInput.valueAsDate = startDate;
        this.startTimeInput.value = startDate.toTimeString().slice(0, 5);

        this.endDateInput.valueAsDate = endDate;
        this.endTimeInput.value = endDate.toTimeString().slice(0, 5);

        this.granularityInput.value = timer.granularity;
        this.refreshRateInput.value = timer.refreshRate;

        // Changer le titre du modal
        document.querySelector('.modal-content h2').textContent = 'Modifier la période';

        // Ouvrir le modal
        this.modal.classList.add('active');
    }

    deleteTimer(timerId) {
        const timer = this.timers.find(t => t.id === timerId);
        if (timer && timer.intervalId) {
            clearInterval(timer.intervalId);
        }

        this.timers = this.timers.filter(t => t.id !== timerId);
        this.saveTimers();

        const card = document.querySelector(`[data-timer-id="${timerId}"]`);
        if (card) {
            card.style.opacity = '0';
            card.style.transform = 'scale(0.8)';
            setTimeout(() => {
                card.remove();
                this.checkEmptyState();
            }, 300);
        }
    }

    checkEmptyState() {
        if (this.timers.length === 0 && this.timersGrid.children.length === 0) {
            this.timersGrid.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <h3>Aucune période de temps</h3>
                    <p>Cliquez sur le bouton + pour ajouter votre première période</p>
                </div>
            `;
        }
    }

    saveTimers() {
        const timersData = this.timers.map(timer => timer.toJSON());
        localStorage.setItem('timers', JSON.stringify(timersData));
    }

    loadTimers() {
        const savedTimers = localStorage.getItem('timers');
        if (savedTimers) {
            const timersData = JSON.parse(savedTimers);
            timersData.forEach(data => {
                const timer = new Timer(data);
                this.timers.push(timer);
                this.renderTimer(timer);
            });
        }
        this.checkEmptyState();
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('Service Worker enregistré:', registration);
                })
                .catch(error => {
                    console.log('Erreur Service Worker:', error);
                });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TimeProgressApp();
});
