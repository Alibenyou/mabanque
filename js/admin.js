// ============================================
// ADMIN - Dashboard (Via API)
// ============================================

let currentUser = null;

// ============================================
// INITIALISATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    const user = checkSession('admin');
    if (!user) return;
    
    currentUser = user;
    
    document.getElementById('adminName').textContent = user.firstName || 'Admin';
    
    await loadAdminDashboard();
    await loadAdminAccounts();
    await loadAllTransactions();
    await loadUsers();
    
    setupAdminTabs();
});

// ============================================
// ONGLETS
// ============================================

function setupAdminTabs() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const tab = this.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.getElementById(tab).classList.add('active');
            
            if (tab === 'dashboard') loadAdminDashboard();
            if (tab === 'accounts') loadAdminAccounts();
            if (tab === 'transactions') loadAllTransactions();
            if (tab === 'users') loadUsers();
        });
    });
}

// ============================================
// DASHBOARD STATS
// ============================================

async function loadAdminDashboard() {
    try {
        const data = await AccountAPI.getAll();
        const accounts = data.accounts || [];
        
        let totalBalance = 0;
        let totalTransactions = 0;
        
        for (const account of accounts) {
            totalBalance += account.balance;
            const history = await TransactionAPI.getHistory(account.id, 1000);
            totalTransactions += history.transactions?.length || 0;
        }
        
        document.getElementById('totalAccounts').textContent = accounts.length;
        document.getElementById('totalBalance').textContent = `${formatNumber(totalBalance)} FCFA`;
        document.getElementById('totalTransactions').textContent = totalTransactions;
        document.getElementById('totalUsers').textContent = accounts.length;
        
        await loadRecentTransactions();
        
    } catch (error) {
        console.error('Erreur dashboard:', error);
        showNotification('Erreur chargement dashboard', 'error');
    }
}

async function loadRecentTransactions() {
    const container = document.getElementById('recentTransactions');
    
    try {
        const data = await AccountAPI.getAll();
        const accounts = data.accounts || [];
        let allTransactions = [];
        
        for (const account of accounts) {
            const history = await TransactionAPI.getHistory(account.id, 5);
            for (const t of history.transactions || []) {
                allTransactions.push({
                    ...t,
                    accountName: `${account.firstName} ${account.lastName}`,
                    accountNumber: account.accountNumber
                });
            }
        }
        
        allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (allTransactions.length === 0) {
            container.innerHTML = '<div class="empty-state">Aucune transaction</div>';
            return;
        }
        
        container.innerHTML = allTransactions.slice(0, 10).map(t => `
            <div class="history-item ${t.type === 'DEPOSIT' ? 'deposit' : 'withdrawal'}">
                <div>
                    <strong>${t.type === 'DEPOSIT' ? '📥 Dépôt' : '📤 Retrait'}</strong>
                    <div style="font-size:0.85rem;color:var(--gray);">
                        ${t.accountName} - ${t.accountNumber}
                    </div>
                    <div style="font-size:0.8rem;color:var(--gray);">${formatDate(t.date)}</div>
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
// COMPTES (ADMIN)
// ============================================

async function loadAdminAccounts() {
    const container = document.getElementById('adminAccountsList');
    container.innerHTML = '<div class="loading">Chargement...</div>';
    
    try {
        const data = await AccountAPI.getAll();
        const accounts = data.accounts || [];
        
        if (accounts.length === 0) {
            container.innerHTML = '<div class="empty-state">Aucun compte</div>';
            return;
        }
        
        container.innerHTML = accounts.map(account => `
            <div class="account-card">
                <div class="account-name">${account.firstName} ${account.lastName}</div>
                <div class="account-number">${account.accountNumber}</div>
                <div class="account-balance">${formatNumber(account.balance)} FCFA</div>
                <div class="account-type">${account.type === 'courant' ? '💳 Courant' : '🏦 Épargne'}</div>
                <div class="account-email"><i class="fas fa-envelope"></i> ${account.email}</div>
                <div class="account-status">
                    <span class="status-badge ${account.status === 'active' ? 'active' : 'inactive'}">
                        ${account.status === 'active' ? '✅ Actif' : '❌ Désactivé'}
                    </span>
                </div>
                <div class="account-actions">
                    <button onclick="toggleAccountStatus('${account.id}', '${account.status}')" 
                            style="background:${account.status === 'active' ? '#dc3545' : '#28a745'};color:white;">
                        ${account.status === 'active' ? '🔒 Désactiver' : '🔓 Activer'}
                    </button>
                    <button onclick="viewAccountHistory('${account.id}')" 
                            style="background:#667eea;color:white;">
                        <i class="fas fa-clock"></i> Historique
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        container.innerHTML = '<div class="empty-state" style="color:var(--danger);">Erreur de chargement</div>';
        showNotification('Erreur chargement comptes', 'error');
    }
}

async function toggleAccountStatus(accountId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'closed' : 'active';
    
    if (!confirm(`Confirmer ${newStatus === 'active' ? 'l\'activation' : 'la désactivation'} du compte ?`)) {
        return;
    }
    
    try {
        await AccountAPI.update(accountId, { status: newStatus });
        showNotification(`✅ Compte ${newStatus === 'active' ? 'activé' : 'désactivé'} !`, 'success');
        loadAdminAccounts();
        loadAdminDashboard();
    } catch (error) {
        showNotification('❌ Erreur lors de la modification', 'error');
    }
}

// ============================================
// TRANSACTIONS (ADMIN)
// ============================================

async function loadAllTransactions() {
    const container = document.getElementById('allTransactionsList');
    container.innerHTML = '<div class="loading">Chargement...</div>';
    
    try {
        const data = await AccountAPI.getAll();
        const accounts = data.accounts || [];
        let allTransactions = [];
        
        for (const account of accounts) {
            const history = await TransactionAPI.getHistory(account.id, 100);
            for (const t of history.transactions || []) {
                allTransactions.push({
                    ...t,
                    accountName: `${account.firstName} ${account.lastName}`,
                    accountNumber: account.accountNumber
                });
            }
        }
        
        allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (allTransactions.length === 0) {
            container.innerHTML = '<div class="empty-state">Aucune transaction</div>';
            return;
        }
        
        container.innerHTML = allTransactions.map(t => `
            <div class="history-item ${t.type === 'DEPOSIT' ? 'deposit' : 'withdrawal'}">
                <div>
                    <strong>${t.type === 'DEPOSIT' ? '📥 Dépôt' : '📤 Retrait'}</strong>
                    <div style="font-size:0.85rem;color:var(--gray);">
                        ${t.accountName} - ${t.accountNumber}
                    </div>
                    ${t.description ? `<div style="font-size:0.85rem;">${t.description}</div>` : ''}
                    <div style="font-size:0.75rem;color:var(--gray);">${formatDate(t.date)}</div>
                    <div style="font-size:0.8rem;color:var(--gray);">Solde: ${formatNumber(t.newBalance)} FCFA</div>
                </div>
                <div class="h-amount ${t.type === 'DEPOSIT' ? 'deposit' : 'withdrawal'}">
                    ${t.type === 'DEPOSIT' ? '+' : '-'} ${formatNumber(t.amount)} FCFA
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        container.innerHTML = '<div class="empty-state" style="color:var(--danger);">Erreur de chargement</div>';
    }
}

// ============================================
// UTILISATEURS (Optionnel - via API)
// ============================================

async function loadUsers() {
    const container = document.getElementById('usersList');
    container.innerHTML = '<div class="loading">Chargement des utilisateurs...</div>';

    try {
        const data = await UserAPI.getAll();
        const users = data.users || [];

        if (users.length === 0) {
            container.innerHTML = '<div class="empty-state">Aucun utilisateur</div>';
            return;
        }

        container.innerHTML = users.map(user => `
            <div class="user-card">
                <div class="user-info">
                    <div class="user-avatar">
                        <i class="fas fa-user-circle fa-3x" style="color:#667eea;"></i>
                    </div>
                    <div class="user-details">
                        <div class="user-name">${user.firstName} ${user.lastName}</div>
                        <div class="user-email">${user.email}</div>
                        <div class="user-phone">📱 ${user.phone || 'Non renseigné'}</div>
                        <div class="user-status confirmed">✅ ${user.accounts.length} compte(s)</div>
                    </div>
                </div>
                <div class="user-actions">
                    <button onclick="showUserAccounts('${user.id}')" style="background:#667eea;color:white;">
                        <i class="fas fa-wallet"></i> Voir comptes
                    </button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('❌ Erreur chargement utilisateurs:', error);
        container.innerHTML = '<div class="empty-state" style="color:var(--danger);">Erreur de chargement</div>';
        showNotification('Erreur chargement utilisateurs', 'error');
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

function viewAccountHistory(accountId) {
    document.querySelector('[data-tab="transactions"]').click();
    showNotification('Affichage de l\'historique du compte', 'info');
}