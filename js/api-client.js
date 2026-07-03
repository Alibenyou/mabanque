// ============================================
// CLIENT API - Communication avec l'API Render
// ============================================

const API_BASE_URL = 'https://api-bancaire-q6v7.onrender.com/api';

// ============================================
// SERVICE AUTHENTIFICATION
// ============================================

const AuthAPI = {
    // Inscription
    async register(userData) {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur lors de l\'inscription');
        }

        return await response.json();
    },

    // Connexion
    async login(email, password) {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur de connexion');
        }

        const data = await response.json();

        // Stocker le token et les infos utilisateur
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        return data;
    },

    // Déconnexion
    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    },

    // Vérifier si l'utilisateur est authentifié
    isAuthenticated() {
        return !!localStorage.getItem('authToken');
    },

    // Récupérer le token
    getToken() {
        return localStorage.getItem('authToken');
    },

    // Récupérer l'utilisateur courant
    getCurrentUser() {
        const userStr = localStorage.getItem('user');
        try {
            return JSON.parse(userStr);
        } catch {
            return null;
        }
    },

    // Vérifier la session (pour les pages protégées)
    checkSession(requiredRole = null) {
        const token = this.getToken();
        const user = this.getCurrentUser();

        if (!token || !user) {
            window.location.href = 'login.html';
            return null;
        }

        if (requiredRole && user.role !== requiredRole) {
            if (user.role === 'admin') {
                window.location.href = 'dashboard-admin.html';
            } else {
                window.location.href = 'dashboard-user.html';
            }
            return null;
        }

        return user;
    }
};

// ============================================
// SERVICE COMPTES
// ============================================

const AccountAPI = {
    // Créer un compte bancaire
    async create(accountData) {
        const token = AuthAPI.getToken();
        const response = await fetch(`${API_BASE_URL}/accounts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(accountData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur création compte bancaire');
        }

        return await response.json();
    },

    // Récupérer tous les comptes (admin)
    async getAll() {
        const token = AuthAPI.getToken();
        const response = await fetch(`${API_BASE_URL}/accounts`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Erreur récupération des comptes');
        }

        return await response.json();
    },

    // Récupérer les comptes de l'utilisateur connecté
    async getMyAccounts() {
        const user = AuthAPI.getCurrentUser();
        if (!user) throw new Error('Utilisateur non authentifié');

        const token = AuthAPI.getToken();
        const response = await fetch(`${API_BASE_URL}/accounts/user/${user.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Erreur récupération de vos comptes');
        }

        return await response.json();
    },

    // Mettre à jour un compte (admin)
    async update(id, updates) {
        const token = AuthAPI.getToken();
        const response = await fetch(`${API_BASE_URL}/accounts/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur mise à jour du compte');
        }

        return await response.json();
    }
};

// ============================================
// SERVICE TRANSACTIONS
// ============================================

const TransactionAPI = {
    // Faire un dépôt
    async deposit(accountId, amount, description) {
        const token = AuthAPI.getToken();
        const response = await fetch(`${API_BASE_URL}/transactions/deposit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                accountId,
                amount,
                description: description || 'Dépôt via application'
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur lors du dépôt');
        }

        return await response.json();
    },

    // Faire un retrait
    async withdraw(accountId, amount, description) {
        const token = AuthAPI.getToken();
        const response = await fetch(`${API_BASE_URL}/transactions/withdraw`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                accountId,
                amount,
                description: description || 'Retrait via application'
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur lors du retrait');
        }

        return await response.json();
    },

    // Obtenir le solde d'un compte
    async getBalance(accountId) {
        const token = AuthAPI.getToken();
        const response = await fetch(`${API_BASE_URL}/transactions/balance/${accountId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Erreur récupération du solde');
        }

        return await response.json();
    },

    // Obtenir l'historique d'un compte
    async getHistory(accountId, limit = 50) {
        const token = AuthAPI.getToken();
        const response = await fetch(`${API_BASE_URL}/transactions/history/${accountId}?limit=${limit}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Erreur récupération de l\'historique');
        }

        return await response.json();
    }
};

const UserAPI = {
    async getAll() {
        const token = AuthAPI.getToken();
        const response = await fetch(`${API_BASE_URL}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur récupération utilisateurs');
        }
        return await response.json();
    }
};
window.UserAPI = UserAPI;

// ============================================
// EXPOSER LES SERVICES GLOBALEMENT
// ============================================

window.API_BASE_URL = API_BASE_URL;
window.AuthAPI = AuthAPI;
window.AccountAPI = AccountAPI;
window.TransactionAPI = TransactionAPI;

console.log('✅ API Client initialisé');
console.log('📚 API URL:', API_BASE_URL);