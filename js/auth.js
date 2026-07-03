// ============================================
// AUTHENTIFICATION - GESTION COMPLÈTE
// ============================================

// ============================================
// CHANGEMENT D'ONGLET
// ============================================

function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase().includes(tab));
    });
    
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.toggle('active', form.id === (tab === 'login' ? 'loginForm' : 'registerForm'));
    });
    
    document.getElementById('loginError').textContent = '';
    document.getElementById('registerError').textContent = '';
}

// ============================================
// CONNEXION
// ============================================

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    
    errorEl.textContent = '';
    
    try {
        const data = await AuthAPI.login(email, password);
        
        // Rediriger selon le rôle
        if (data.user.role === 'admin') {
            window.location.href = 'dashboard-admin.html';
        } else {
            window.location.href = 'dashboard-user.html';
        }
        
    } catch (error) {
        errorEl.textContent = '❌ ' + error.message;
        console.error('Erreur login:', error);
    }
}

// ============================================
// INSCRIPTION
// ============================================

async function handleRegister(event) {
    event.preventDefault();
    
    const firstName = document.getElementById('regFirstName').value;
    const lastName = document.getElementById('regLastName').value;
    const phone = document.getElementById('regPhone').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const errorEl = document.getElementById('registerError');
    
    errorEl.textContent = '';
    
    // Vérification mot de passe
    if (password !== confirmPassword) {
        errorEl.textContent = '❌ Les mots de passe ne correspondent pas';
        return;
    }
    
    if (password.length < 6) {
        errorEl.textContent = '❌ Le mot de passe doit contenir au moins 6 caractères';
        return;
    }
    
    try {
        await AuthAPI.register({
            firstName,
            lastName,
            phone,
            email,
            password
        });
        
        errorEl.textContent = '✅ Compte créé avec succès ! Vous pouvez vous connecter.';
        errorEl.style.color = '#28a745';
        
        // Basculer vers le formulaire de connexion après 2 secondes
        setTimeout(() => {
            switchAuthTab('login');
            document.getElementById('loginEmail').value = email;
            errorEl.style.color = '#dc3545';
        }, 2000);
        
    } catch (error) {
        errorEl.textContent = '❌ ' + error.message;
        console.error('Erreur inscription:', error);
    }
}

// ============================================
// DÉCONNEXION (utilisée dans les dashboards)
// ============================================

function logout() {
    AuthAPI.logout();
}

// ============================================
// VÉRIFICATION SESSION (pour les pages protégées)
// ============================================

function checkSession(requiredRole = null) {
    return AuthAPI.checkSession(requiredRole);
}

// ============================================
// UTILITAIRES
// ============================================

function getAuthToken() {
    return AuthAPI.getToken();
}

function getCurrentUser() {
    return AuthAPI.getCurrentUser();
}