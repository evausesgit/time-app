// Application avec Firebase Firestore

// Récupérer Firebase depuis window (sera initialisé après chargement)
let db, auth, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, onSnapshot;

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
        this.userId = data.userId || auth.currentUser?.uid;
        this.position = data.position !== undefined ? data.position : 999999;
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
            refreshRate: this.refreshRate,
            userId: this.userId,
            position: this.position
        };
    }
}

// Classe pour gérer un groupe de périodes
class TimerGroup {
    constructor(data) {
        this.id = data.id || Date.now() + Math.random();
        this.title = data.title;
        this.periods = data.periods || []; // Tableau de {title, startDate, endDate, color}
        this.granularity = data.granularity || 'seconds';
        this.refreshRate = parseInt(data.refreshRate) || 1000;
        this.intervalId = null;
        this.userId = data.userId || auth.currentUser?.uid;
        this.position = data.position !== undefined ? data.position : 999999;
        this.isGroup = true;
    }

    // Couleurs prédéfinies pour les différents points
    static getColors() {
        return [
            '#6c5ce7', // Violet
            '#00b894', // Vert
            '#fdcb6e', // Jaune
            '#e17055', // Orange
            '#74b9ff', // Bleu clair
            '#fd79a8', // Rose
            '#a29bfe', // Violet clair
            '#55efc4'  // Turquoise
        ];
    }

    getProgress(period) {
        const now = new Date();
        const startDate = new Date(period.startDate);
        const endDate = new Date(period.endDate);
        const total = endDate - startDate;
        const elapsed = now - startDate;

        if (now < startDate) {
            return { percentage: 0, status: 'upcoming' };
        } else if (now > endDate) {
            return { percentage: 100, status: 'completed' };
        } else {
            const percentage = (elapsed / total) * 100;
            return { percentage, status: 'active' };
        }
    }

    // Obtenir les dates min et max pour l'affichage global
    getGlobalDates() {
        if (this.periods.length === 0) {
            return { startDate: new Date(), endDate: new Date() };
        }

        const startDates = this.periods.map(p => new Date(p.startDate));
        const endDates = this.periods.map(p => new Date(p.endDate));

        return {
            startDate: new Date(Math.min(...startDates)),
            endDate: new Date(Math.max(...endDates))
        };
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
            periods: this.periods,
            granularity: this.granularity,
            refreshRate: this.refreshRate,
            userId: this.userId,
            position: this.position,
            isGroup: true
        };
    }
}

// Classe pour gérer l'application
class TimeProgressApp {
    constructor() {
        this.timers = [];
        this.editingTimerId = null;
        this.userId = auth.currentUser.uid;
        this.initElements();
        this.loadTimers();
        this.attachEventListeners();
        this.registerServiceWorker();
        this.setDefaultDates();
        this.setupRealtimeListener();
        this.setupDragAndDrop();
    }

    initElements() {
        this.addButton = document.getElementById('addButton');
        this.modal = document.getElementById('modal');
        this.timerForm = document.getElementById('timerForm');
        this.cancelButton = document.getElementById('cancelButton');
        this.timersGrid = document.getElementById('timersGrid');

        // Timer individual inputs
        this.titleInput = document.getElementById('title');
        this.startDateTimeInput = document.getElementById('startDateTime');
        this.endDateTimeInput = document.getElementById('endDateTime');
        this.granularityInput = document.getElementById('granularity');
        this.refreshRateInput = document.getElementById('refreshRate');

        // Group inputs
        this.groupTitleInput = document.getElementById('groupTitle');
        this.groupGranularityInput = document.getElementById('groupGranularity');
        this.groupRefreshRateInput = document.getElementById('groupRefreshRate');
        this.addPeriodBtn = document.getElementById('addPeriodBtn');
        this.periodsList = document.getElementById('periodsList');

        // Form sections
        this.timerFormFields = document.getElementById('timerFormFields');
        this.groupFormFields = document.getElementById('groupFormFields');
        this.typeSelector = document.getElementById('typeSelector');

        // Current mode
        this.currentMode = 'timer'; // 'timer' or 'group'
        this.periodPickers = []; // Store flatpickr instances for periods

        // Initialiser Flatpickr pour les date pickers
        flatpickr.localize(flatpickr.l10ns.fr);

        this.startPicker = flatpickr(this.startDateTimeInput, {
            enableTime: true,
            dateFormat: "d/m/Y H:i",
            time_24hr: true,
            locale: "fr",
            defaultDate: new Date(),
            allowInput: true,
            clickOpens: true,
            minuteIncrement: 1,
            disableMobile: false,
            onChange: (selectedDates, dateStr, instance) => {
                // S'assurer que la valeur est bien définie
                instance.input.value = dateStr;
            }
        });

        this.endPicker = flatpickr(this.endDateTimeInput, {
            enableTime: true,
            dateFormat: "d/m/Y H:i",
            time_24hr: true,
            locale: "fr",
            defaultDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            allowInput: true,
            clickOpens: true,
            minuteIncrement: 1,
            disableMobile: false,
            onChange: (selectedDates, dateStr, instance) => {
                // S'assurer que la valeur est bien définie
                instance.input.value = dateStr;
            }
        });
    }

    setDefaultDates() {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        this.startPicker.setDate(now);
        this.endPicker.setDate(tomorrow);
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

        // Type selector
        this.typeSelector.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.typeSelector.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentMode = btn.dataset.type;
                this.toggleFormMode();
            });
        });

        // Add period button
        this.addPeriodBtn.addEventListener('click', () => this.addPeriodField());
    }

    toggleFormMode() {
        if (this.currentMode === 'timer') {
            this.timerFormFields.style.display = 'block';
            this.groupFormFields.style.display = 'none';
            // Enable required for timer fields
            this.titleInput.setAttribute('required', '');
            // Disable required for group fields
            this.groupTitleInput.removeAttribute('required');
        } else {
            this.timerFormFields.style.display = 'none';
            this.groupFormFields.style.display = 'block';
            // Disable required for timer fields
            this.titleInput.removeAttribute('required');
            // Enable required for group fields
            this.groupTitleInput.setAttribute('required', '');
            // Add initial periods if empty
            if (this.periodsList.children.length === 0) {
                this.addPeriodField();
                this.addPeriodField();
            }
        }
    }

    addPeriodField() {
        const periodIndex = this.periodsList.children.length;
        const colors = TimerGroup.getColors();
        const color = colors[periodIndex % colors.length];

        const periodItem = document.createElement('div');
        periodItem.className = 'period-item';
        periodItem.dataset.periodIndex = periodIndex;

        periodItem.innerHTML = `
            <div class="period-item-header">
                <div class="period-number">
                    <div class="period-color-indicator" style="background-color: ${color}"></div>
                    <span>Période ${periodIndex + 1}</span>
                </div>
                <button type="button" class="btn-remove-period">×</button>
            </div>
            <div class="form-group">
                <label>Titre</label>
                <input type="text" class="period-title" placeholder="Ex: Phase 1">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Date de début</label>
                    <input type="text" class="period-start" placeholder="Sélectionnez">
                </div>
                <div class="form-group">
                    <label>Date de fin</label>
                    <input type="text" class="period-end" placeholder="Sélectionnez">
                </div>
            </div>
        `;

        this.periodsList.appendChild(periodItem);

        // Initialize flatpickr for this period
        const startInput = periodItem.querySelector('.period-start');
        const endInput = periodItem.querySelector('.period-end');

        const startPicker = flatpickr(startInput, {
            enableTime: true,
            dateFormat: "d/m/Y H:i",
            time_24hr: true,
            locale: "fr",
            defaultDate: new Date(),
            allowInput: true,
            minuteIncrement: 1,
            disableMobile: false
        });

        const endPicker = flatpickr(endInput, {
            enableTime: true,
            dateFormat: "d/m/Y H:i",
            time_24hr: true,
            locale: "fr",
            defaultDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            allowInput: true,
            minuteIncrement: 1,
            disableMobile: false
        });

        this.periodPickers.push({ start: startPicker, end: endPicker, color });

        // Remove period button
        const removeBtn = periodItem.querySelector('.btn-remove-period');
        removeBtn.addEventListener('click', () => {
            const index = parseInt(periodItem.dataset.periodIndex);
            periodItem.remove();
            this.periodPickers.splice(index, 1);
            this.updatePeriodNumbers();
        });
    }

    updatePeriodNumbers() {
        const periodItems = this.periodsList.querySelectorAll('.period-item');
        periodItems.forEach((item, index) => {
            item.dataset.periodIndex = index;
            item.querySelector('.period-number span').textContent = `Période ${index + 1}`;
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

        // Clean up period fields
        this.periodsList.innerHTML = '';
        this.periodPickers.forEach(picker => {
            if (picker.start) picker.start.destroy();
            if (picker.end) picker.end.destroy();
        });
        this.periodPickers = [];

        // Reset to timer mode
        this.currentMode = 'timer';
        this.typeSelector.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        this.typeSelector.querySelector('[data-type="timer"]').classList.add('active');
        this.toggleFormMode();
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (this.currentMode === 'timer') {
            await this.handleTimerSubmit();
        } else {
            await this.handleGroupSubmit();
        }

        this.closeModal();
    }

    async handleTimerSubmit() {
        const startDate = this.startPicker.selectedDates[0];
        const endDate = this.endPicker.selectedDates[0];

        if (!startDate || !endDate) {
            alert('Veuillez sélectionner les dates de début et de fin');
            return;
        }

        const timerData = {
            title: this.titleInput.value,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            granularity: this.granularityInput.value,
            refreshRate: this.refreshRateInput.value,
            userId: this.userId,
            isGroup: false
        };

        if (this.editingTimerId) {
            await updateDoc(doc(db, 'timers', this.editingTimerId), timerData);
        } else {
            const maxPosition = this.timers.length > 0
                ? Math.max(...this.timers.map(t => t.position))
                : -1;
            timerData.position = maxPosition + 1;
            await addDoc(collection(db, 'timers'), timerData);
        }
    }

    async handleGroupSubmit() {
        console.log('handleGroupSubmit called');
        console.log('Periods list length:', this.periodsList.children.length);

        if (this.periodsList.children.length < 2) {
            alert('Veuillez ajouter au moins 2 périodes pour créer un groupe');
            return;
        }

        if (!this.groupTitleInput.value.trim()) {
            alert('Veuillez entrer un titre pour le groupe');
            return;
        }

        const periods = [];
        const periodItems = this.periodsList.querySelectorAll('.period-item');

        for (let i = 0; i < periodItems.length; i++) {
            const item = periodItems[i];
            const title = item.querySelector('.period-title').value;

            console.log(`Period ${i}:`, this.periodPickers[i]);

            if (!this.periodPickers[i]) {
                alert(`Erreur: picker manquant pour la période ${i + 1}`);
                return;
            }

            const startDate = this.periodPickers[i].start.selectedDates[0];
            const endDate = this.periodPickers[i].end.selectedDates[0];
            const color = this.periodPickers[i].color;

            if (!title.trim()) {
                alert(`Veuillez entrer un titre pour la période ${i + 1}`);
                return;
            }

            if (!startDate || !endDate) {
                alert(`Veuillez sélectionner les dates pour la période ${i + 1}`);
                return;
            }

            periods.push({
                title,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                color
            });
        }

        const groupData = {
            title: this.groupTitleInput.value,
            periods,
            granularity: this.groupGranularityInput.value,
            refreshRate: this.groupRefreshRateInput.value,
            userId: this.userId,
            isGroup: true
        };

        console.log('Group data:', groupData);

        try {
            if (this.editingTimerId) {
                await updateDoc(doc(db, 'timers', this.editingTimerId), groupData);
            } else {
                const maxPosition = this.timers.length > 0
                    ? Math.max(...this.timers.map(t => t.position))
                    : -1;
                groupData.position = maxPosition + 1;
                await addDoc(collection(db, 'timers'), groupData);
            }
            console.log('Group saved successfully');
        } catch (error) {
            console.error('Error saving group:', error);
            alert('Erreur lors de la sauvegarde: ' + error.message);
        }
    }

    renderTimer(timer) {
        if (timer.isGroup) {
            return this.renderGroup(timer);
        }

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
                            <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#6c5ce7" flood-opacity="0.8"/>
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

    renderGroup(group) {
        const card = document.createElement('div');
        card.className = 'timer-card group-card';
        card.dataset.timerId = group.id;

        const globalDates = group.getGlobalDates();

        // Build SVG with multiple dots
        let dotsHTML = '';
        let legendHTML = '';

        group.periods.forEach((period, index) => {
            const progress = group.getProgress(period);
            const angle = (progress.percentage / 100) * 2 * Math.PI - Math.PI / 2;
            const pointX = 100 + 90 * Math.cos(angle);
            const pointY = 100 + 90 * Math.sin(angle);

            dotsHTML += `
                <circle
                    class="circle-dot ${progress.status === 'active' ? 'pulse' : ''}"
                    cx="${pointX}"
                    cy="${pointY}"
                    r="6"
                    fill="${period.color}"
                    filter="url(#shadow-${group.id}-${index})"
                />
                <defs>
                    <filter id="shadow-${group.id}-${index}" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="${period.color}" flood-opacity="0.8"/>
                    </filter>
                </defs>
            `;

            legendHTML += `
                <div class="legend-item">
                    <div class="legend-color" style="background-color: ${period.color}"></div>
                    <div class="legend-text">${period.title}</div>
                </div>
            `;
        });

        // Determine overall status
        const statuses = group.periods.map(p => group.getProgress(p).status);
        const hasActive = statuses.includes('active');
        const allCompleted = statuses.every(s => s === 'completed');
        const overallStatus = hasActive ? 'active' : (allCompleted ? 'completed' : 'upcoming');

        card.innerHTML = `
            <div class="timer-header">
                <h3 class="timer-title">${group.title}</h3>
                <div class="timer-actions">
                    <button class="edit-button" data-timer-id="${group.id}" title="Modifier">✎</button>
                    <button class="delete-button" data-timer-id="${group.id}" title="Supprimer">×</button>
                </div>
            </div>

            <div class="timer-circle-container">
                <svg class="timer-circle" viewBox="0 0 200 200">
                    <circle class="circle-bg" cx="100" cy="100" r="90"/>
                    ${dotsHTML}
                    <text class="circle-text" x="100" y="95">${group.periods.length}</text>
                    <text class="circle-subtext" x="100" y="115">périodes</text>
                </svg>
            </div>

            <div class="timer-info">
                <div class="period-legend">
                    ${legendHTML}
                </div>
                <div class="timer-dates">
                    ${group.formatDate(globalDates.startDate)} → ${group.formatDate(globalDates.endDate)}
                </div>
                <span class="timer-status ${overallStatus}">
                    ${overallStatus === 'active' ? 'En cours' :
                      overallStatus === 'completed' ? 'Terminé' : 'À venir'}
                </span>
            </div>
        `;

        this.timersGrid.appendChild(card);

        const editButton = card.querySelector('.edit-button');
        const deleteButton = card.querySelector('.delete-button');

        editButton.addEventListener('click', () => this.editTimer(group.id));
        deleteButton.addEventListener('click', () => this.deleteTimer(group.id));

        this.startGroupUpdate(group);
        this.checkEmptyState();
    }

    startGroupUpdate(group) {
        group.intervalId = setInterval(() => {
            this.updateGroupDisplay(group);
        }, group.refreshRate);
    }

    updateGroupDisplay(group) {
        const card = document.querySelector(`[data-timer-id="${group.id}"]`);
        if (!card) {
            clearInterval(group.intervalId);
            return;
        }

        const svg = card.querySelector('.timer-circle');
        const dots = svg.querySelectorAll('.circle-dot');

        group.periods.forEach((period, index) => {
            const progress = group.getProgress(period);
            const angle = (progress.percentage / 100) * 2 * Math.PI - Math.PI / 2;
            const pointX = 100 + 90 * Math.cos(angle);
            const pointY = 100 + 90 * Math.sin(angle);

            const dot = dots[index];
            if (dot) {
                dot.setAttribute('cx', pointX);
                dot.setAttribute('cy', pointY);

                // Update pulse class based on status
                if (progress.status === 'active') {
                    dot.classList.add('pulse');
                } else {
                    dot.classList.remove('pulse');
                }
            }
        });

        // Update overall status
        const statuses = group.periods.map(p => group.getProgress(p).status);
        const hasActive = statuses.includes('active');
        const allCompleted = statuses.every(s => s === 'completed');
        const overallStatus = hasActive ? 'active' : (allCompleted ? 'completed' : 'upcoming');

        const statusElement = card.querySelector('.timer-status');
        statusElement.className = `timer-status ${overallStatus}`;
        statusElement.textContent = overallStatus === 'active' ? 'En cours' :
                                    overallStatus === 'completed' ? 'Terminé' : 'À venir';
    }

    editTimer(timerId) {
        const item = this.timers.find(t => t.id === timerId);
        if (!item) return;

        this.editingTimerId = timerId;

        if (item.isGroup) {
            // Mode groupe
            this.currentMode = 'group';
            this.typeSelector.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            this.typeSelector.querySelector('[data-type="group"]').classList.add('active');
            this.toggleFormMode();

            // Pré-remplir le formulaire du groupe
            this.groupTitleInput.value = item.title;
            this.groupGranularityInput.value = item.granularity;
            this.groupRefreshRateInput.value = item.refreshRate;

            // Nettoyer les périodes existantes
            this.periodsList.innerHTML = '';
            this.periodPickers.forEach(picker => {
                if (picker.start) picker.start.destroy();
                if (picker.end) picker.end.destroy();
            });
            this.periodPickers = [];

            // Ajouter les périodes du groupe
            item.periods.forEach((period, index) => {
                this.addPeriodField();

                const periodItem = this.periodsList.children[index];
                const titleInput = periodItem.querySelector('.period-title');
                titleInput.value = period.title;

                // Mettre à jour la couleur
                const colorIndicator = periodItem.querySelector('.period-color-indicator');
                colorIndicator.style.backgroundColor = period.color;
                this.periodPickers[index].color = period.color;

                // Définir les dates
                this.periodPickers[index].start.setDate(new Date(period.startDate));
                this.periodPickers[index].end.setDate(new Date(period.endDate));
            });

            document.querySelector('.modal-content h2').textContent = 'Modifier le groupe';
        } else {
            // Mode timer individuel
            this.currentMode = 'timer';
            this.typeSelector.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            this.typeSelector.querySelector('[data-type="timer"]').classList.add('active');
            this.toggleFormMode();

            // Pré-remplir le formulaire du timer
            this.titleInput.value = item.title;

            const startDate = new Date(item.startDate);
            const endDate = new Date(item.endDate);

            this.startPicker.setDate(startDate);
            this.endPicker.setDate(endDate);

            this.granularityInput.value = item.granularity;
            this.refreshRateInput.value = item.refreshRate;

            document.querySelector('.modal-content h2').textContent = 'Modifier la période';
        }

        // Ouvrir le modal
        this.modal.classList.add('active');
    }

    async deleteTimer(timerId) {
        // Supprimer de Firestore
        await deleteDoc(doc(db, 'timers', timerId));

        // L'écouteur en temps réel mettra à jour l'UI automatiquement
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

    // Chargement initial depuis Firestore
    async loadTimers() {
        const q = query(collection(db, 'timers'), where('userId', '==', this.userId));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            data.id = docSnapshot.id;
            const item = data.isGroup ? new TimerGroup(data) : new Timer(data);
            this.timers.push(item);
        });

        // Trier par position avant de rendre
        this.timers.sort((a, b) => a.position - b.position);

        // Rendre les timers dans l'ordre
        this.timers.forEach(timer => this.renderTimer(timer));

        this.checkEmptyState();
    }

    // Écouter les changements en temps réel
    setupRealtimeListener() {
        const q = query(collection(db, 'timers'), where('userId', '==', this.userId));

        onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const data = change.doc.data();
                data.id = change.doc.id;

                if (change.type === 'added') {
                    // Vérifier si le timer n'existe pas déjà (premier chargement)
                    if (!this.timers.find(t => t.id === data.id)) {
                        const item = data.isGroup ? new TimerGroup(data) : new Timer(data);
                        this.timers.push(item);
                        this.renderTimer(item);
                    }
                }

                if (change.type === 'modified') {
                    // Mettre à jour le timer
                    const index = this.timers.findIndex(t => t.id === data.id);
                    if (index !== -1) {
                        const oldItem = this.timers[index];
                        if (oldItem.intervalId) {
                            clearInterval(oldItem.intervalId);
                        }
                        const card = document.querySelector(`[data-timer-id="${data.id}"]`);
                        if (card) card.remove();

                        const item = data.isGroup ? new TimerGroup(data) : new Timer(data);
                        this.timers[index] = item;
                        this.renderTimer(item);
                    }
                }

                if (change.type === 'removed') {
                    // Supprimer le timer
                    const index = this.timers.findIndex(t => t.id === data.id);
                    if (index !== -1) {
                        const item = this.timers[index];
                        if (item.intervalId) {
                            clearInterval(item.intervalId);
                        }
                        this.timers.splice(index, 1);

                        const card = document.querySelector(`[data-timer-id="${data.id}"]`);
                        if (card) {
                            card.style.opacity = '0';
                            card.style.transform = 'scale(0.8)';
                            setTimeout(() => {
                                card.remove();
                                this.checkEmptyState();
                            }, 300);
                        }
                    }
                }
            });
        });
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

    setupDragAndDrop() {
        // Initialiser SortableJS sur la grille de timers
        const sortable = Sortable.create(this.timersGrid, {
            animation: 150,
            handle: '.timer-card',
            ghostClass: 'sortable-ghost',
            onEnd: async (evt) => {
                // Récupérer le nouvel ordre
                const cards = this.timersGrid.querySelectorAll('.timer-card');
                const updates = [];

                cards.forEach((card, index) => {
                    const timerId = card.dataset.timerId;
                    const timer = this.timers.find(t => t.id === timerId);
                    if (timer) {
                        timer.position = index;
                        // Mettre à jour dans Firestore
                        updates.push(updateDoc(doc(db, 'timers', timerId), { position: index }));
                    }
                });

                // Sauvegarder toutes les positions en parallèle
                await Promise.all(updates);
                console.log('Positions sauvegardées');
            }
        });
    }
}

// Initialiser l'application après le chargement de toutes les classes
console.log('Initialisation de TimeProgressApp...');

// Récupérer Firebase depuis window
db = window.firebaseDb;
auth = window.firebaseAuth;

if (window.firestoreModules) {
    ({ collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, onSnapshot } = window.firestoreModules);

    if (auth && auth.currentUser) {
        new TimeProgressApp();
    } else {
        console.log('En attente de l\'authentification...');
        setTimeout(() => {
            if (auth && auth.currentUser) {
                new TimeProgressApp();
            }
        }, 500);
    }
} else {
    console.error('Firestore modules not loaded');
}
