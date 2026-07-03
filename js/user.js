// ============================================
// USER - DASHBOARD UTILISATEUR
// ============================================

let currentUser = null;
let currentUserEmail = '';

// ============================================
// INITIALISATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    const user = checkSession();
    if (!user) return;
    
    currentUser = user;
    currentUserEmail = user.email;
    
    // Afficher le nom
    const firstName = user.firstName || 'Client';
    document.getElementById('userName').textContent = firstName;
    
    // Profil
    document.getElementById('profileName').textContent = `${firstName} ${user.lastName || ''}`;
    document.getElementById('profileEmail').textContent = user.email;
    document.getElementById('profilePhone').textContent = user.phone || 'Non renseigné';
    document.getElementById('profileDate').textContent = new Date().toLocaleDateString('fr-FR');
    
    // Charger les données
    await loadMyAccounts();
    await loadMyRecentTransactions();
    await loadUserAccountsForSelects();
    
    // Configurer les onglets
    setupUserTabs();
});

// ============================================
// ONGLETS
// ============================================

function setupUserTabs() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const tab = this.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.getElementById(tab).classList.add('active');
            
            if (tab === 'dashboard') {
                loadMyAccounts();
                loadMyRecentTransactions();
            }
            if (tab === 'transactions') {
                loadUserAccountsForSelects();
            }
            if (tab === 'history') {
                loadUserAccountsForSelects();
            }
        });
    });
}

// ============================================
// MES COMPTES BANCAIRES
// ============================================

async function loadMyAccounts() {
    const container = document.getElementById('myAccounts');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Chargement...</div>';
    
    try {
        const data = await AccountAPI.getMyAccounts();
        const accounts = data.accounts || [];
        
        if (accounts.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column:1/-1;">
                    <i class="fas fa-wallet fa-3x"></i>
                    <p>Vous n'avez pas encore de compte bancaire</p>
                    <p style="font-size:0.9rem;color:#adb5bd;">
                        <a href="#" onclick="switchTab('transactions')" style="color:#667eea;">
                            Créez votre compte bancaire ici
                        </a>
                    </p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = accounts.map(account => `
            <div class="account-card" style="border-left-color:${account.status === 'active' ? 'var(--success)' : 'var(--danger)'};">
                <div class="account-name">${account.first_name} ${account.last_name}</div>
                <div class="account-number">${account.account_number}</div>
                <div class="account-balance">${formatNumber(account.balance)} FCFA</div>
                <div class="account-type">${account.type === 'courant' ? '💳 Courant' : '🏦 Épargne'}</div>
                <div class="account-status">
                    <span class="status-badge ${account.status === 'active' ? 'active' : 'inactive'}">
                        ${account.status === 'active' ? '✅ Actif' : '❌ Désactivé'}
                    </span>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;color:var(--danger);">
                <i class="fas fa-exclamation-circle fa-3x"></i>
                <p>Erreur de chargement</p>
                <p style="font-size:0.9rem;">${error.message}</p>
            </div>
        `;
        showNotification('Erreur chargement des comptes', 'error');
    }
}

// ============================================
// DERNIÈRES TRANSACTIONS
// ============================================

async function loadMyRecentTransactions() {
    const container = document.getElementById('myRecentTransactions');
    
    try {
        const data = await AccountAPI.getMyAccounts();
        const accounts = data.accounts || [];
        let allTransactions = [];
        
        for (const account of accounts) {
            const history = await TransactionAPI.getHistory(account.id, 5);
            for (const t of history.transactions || []) {
                allTransactions.push({
                    ...t,
                    accountName: `${account.firstName} ${account.lastName}`
                });
            }
        }
        
        allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (allTransactions.length === 0) {
            container.innerHTML = '<div class="empty-state">Aucune transaction récente</div>';
            return;
        }
        
        container.innerHTML = allTransactions.slice(0, 5).map(t => `
            <div class="history-item ${t.type === 'DEPOSIT' ? 'deposit' : 'withdrawal'}">
                <div class="h-left">
                    <span class="h-type">${t.type === 'DEPOSIT' ? '📥 Dépôt' : '📤 Retrait'}</span>
                    <span class="h-desc">${t.description || ''}</span>
                    <span class="h-date">${formatDate(t.date)}</span>
                </div>
                <div class="h-amount ${t.type === 'DEPOSIT' ? 'deposit' : 'withdrawal'}">
                    ${t.type === 'DEPOSIT' ? '+' : '-'} ${formatNumber(t.amount)} FCFA
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        container.innerHTML = '<div class="empty-state">Erreur de chargement</div>';
    }
}

// ============================================
// SÉLECTION DES COMPTES POUR OPÉRATIONS
// ============================================

async function loadUserAccountsForSelects() {
    const selects = ['userAccountSelect', 'userHistoryAccount'];
    
    for (const id of selects) {
        const select = document.getElementById(id);
        if (!select) continue;
        
        select.innerHTML = '<option value="">-- Choisir un compte --</option>';
        
        try {
            const data = await AccountAPI.getMyAccounts();
            const accounts = data.accounts || [];
            
            accounts.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = `${account.account_number} - ${formatNumber(account.balance)} FCFA`;
                select.appendChild(option);
            });
            
        } catch (error) {
            console.error('Erreur chargement comptes pour select:', error);
        }
    }
}

// ============================================
// SOLDE UTILISATEUR
// ============================================

async function updateUserBalance() {
    const accountId = document.getElementById('userAccountSelect').value;
    const display = document.getElementById('userBalanceDisplay');
    const amountEl = document.getElementById('userBalanceAmount');
    
    if (!accountId) {
        display.style.display = 'none';
        return;
    }
    
    try {
        const data = await TransactionAPI.getBalance(accountId);
        amountEl.textContent = `${formatNumber(data.balance)} FCFA`;
        display.style.display = 'block';
    } catch (error) {
        display.style.display = 'none';
        showNotification('Erreur chargement solde', 'error');
    }
}

// ============================================
// DÉPÔT
// ============================================

async function handleUserDeposit() {
    const accountId = document.getElementById('userAccountSelect').value;
    const amount = parseFloat(document.getElementById('userDepositAmount').value);
    const description = document.getElementById('userDepositDesc').value || 'Dépôt';
    
    if (!accountId) {
        showNotification('Veuillez sélectionner un compte', 'error');
        return;
    }
    
    if (!amount || amount <= 0) {
        showNotification('Montant invalide', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const result = await TransactionAPI.deposit(accountId, amount, description);
        
        showNotification(`✅ Dépôt de ${formatNumber(amount)} FCFA effectué !`, 'success');
        document.getElementById('userDepositAmount').value = '';
        document.getElementById('userDepositDesc').value = '';
        
        await updateUserBalance();
        await loadMyAccounts();
        await loadMyRecentTransactions();
        
    } catch (error) {
        showNotification(error.message || 'Erreur lors du dépôt', 'error');
    } finally {
        showLoading(false);
    }
}

// ============================================
// RETRAIT
// ============================================

async function handleUserWithdraw() {
    const accountId = document.getElementById('userAccountSelect').value;
    const amount = parseFloat(document.getElementById('userWithdrawAmount').value);
    const description = document.getElementById('userWithdrawDesc').value || 'Retrait';
    
    if (!accountId) {
        showNotification('Veuillez sélectionner un compte', 'error');
        return;
    }
    
    if (!amount || amount <= 0) {
        showNotification('Montant invalide', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const result = await TransactionAPI.withdraw(accountId, amount, description);
        
        showNotification(`✅ Retrait de ${formatNumber(amount)} FCFA effectué !`, 'success');
        document.getElementById('userWithdrawAmount').value = '';
        document.getElementById('userWithdrawDesc').value = '';
        
        await updateUserBalance();
        await loadMyAccounts();
        await loadMyRecentTransactions();
        
    } catch (error) {
        showNotification(error.message || 'Erreur lors du retrait', 'error');
    } finally {
        showLoading(false);
    }
}

// ============================================
// HISTORIQUE UTILISATEUR
// ============================================

async function loadUserHistory() {
    const accountId = document.getElementById('userHistoryAccount').value;
    const container = document.getElementById('userHistoryList');
    
    if (!accountId) {
        container.innerHTML = '<div class="empty-state">Sélectionnez un compte</div>';
        return;
    }
    
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Chargement...</div>';
    
    try {
        const data = await TransactionAPI.getHistory(accountId, 50);
        const transactions = data.transactions || [];
        
        if (transactions.length === 0) {
            container.innerHTML = '<div class="empty-state">Aucune transaction sur ce compte</div>';
            return;
        }
        
        const balance = await TransactionAPI.getBalance(accountId);
        
        container.innerHTML = `
            <div style="margin-bottom:12px;color:var(--gray);font-size:0.9rem;">
                <strong>${transactions.length}</strong> transactions
                Solde: <strong style="color:var(--success);">${formatNumber(balance.balance)} FCFA</strong>
            </div>
            ${transactions.map(t => `
                <div class="history-item ${t.type === 'DEPOSIT' ? 'deposit' : 'withdrawal'}">
                    <div class="h-left">
                        <span class="h-type">${t.type === 'DEPOSIT' ? '📥 Dépôt' : '📤 Retrait'}</span>
                        <span class="h-desc">${t.description || ''}</span>
                        <span class="h-date">${formatDate(t.date)}</span>
                        <span style="font-size:0.8rem;color:var(--gray);">Solde: ${formatNumber(t.newBalance)} FCFA</span>
                    </div>
                    <div class="h-amount ${t.type === 'DEPOSIT' ? 'deposit' : 'withdrawal'}">
                        ${t.type === 'DEPOSIT' ? '+' : '-'} ${formatNumber(t.amount)} FCFA
                    </div>
                </div>
            `).join('')}
        `;
        
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state" style="color:var(--danger);">
                <i class="fas fa-exclamation-circle fa-3x"></i>
                <p>Erreur de chargement</p>
            </div>
        `;
        showNotification('Erreur chargement historique', 'error');
    }
}

// ============================================
// UTILITAIRES
// ============================================

function formatNumber(num) {
    if (num === undefined || num === null) return '0';
    return Number(num).toLocaleString('fr-FR');
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    clearTimeout(notification._timeout);
    notification._timeout = setTimeout(() => {
        notification.style.display = 'none';
    }, 4000);
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'flex' : 'none';
}

function switchTab(tab) {
    document.querySelector(`[data-tab="${tab}"]`)?.click();
}