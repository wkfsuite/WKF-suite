// Common Layout Functions for WKF Suite
// Ensures UI consistency across all pages

function createCommonHeader(pageTitle = 'WKF Suite', showBackButton = true) {
    return `
        <div class="header">
            <div class="logo">
                <img src="assets/icons/system/favicon.svg" alt="Logo" onerror="this.src='logo.png'">
                <span>${pageTitle}</span>
                <span id="licenseStatus" class="license-badge free">FREE</span>
            </div>
            <div class="header-actions">
                ${showBackButton ? '<button onclick="goBack()" class="btn secondary">← Indietro</button>' : ''}
                <span id="usernameDisplay"></span> (<span id="ruoloDisplay" class="role-badge"></span>)
                <button id="logoutBtn" class="btn logout">🚪 Logout</button>
            </div>
        </div>
    `;
}

function createCommonNavigation(currentPage = '') {
    const navigation = {
        'dashboard': '🏠 Dashboard',
        'admin': '⚙️ Amministrazione',
        'analytics': '📊 Analytics',
        'report': '📋 Report',
        'permesso': '📝 Permessi'
    };

    let navHtml = '<nav class="common-nav"><div class="nav-links">';

    Object.entries(navigation).forEach(([page, label]) => {
        const active = currentPage === page ? ' active' : '';
        navHtml += `<a href="${page}.html" class="nav-link${active}">${label}</a>`;
    });

    navHtml += '</div></nav>';
    return navHtml;
}

function initializeCommonLayout(pageTitle, currentPage = '', showBackButton = true) {
    // Add common styles if not present
    if (!document.querySelector('#common-styles')) {
        const link = document.createElement('link');
        link.id = 'common-styles';
        link.rel = 'stylesheet';
        link.href = 'styles.css';
        document.head.appendChild(link);

        // Add common layout styles
        const commonStyles = document.createElement('style');
        commonStyles.innerHTML = `
            .common-nav {
                background: var(--card);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 12px;
                margin-bottom: 20px;
                padding: 10px;
            }

            .nav-links {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }

            .nav-link {
                padding: 8px 16px;
                background: rgba(255,255,255,0.05);
                color: var(--text);
                text-decoration: none;
                border-radius: 8px;
                border: 1px solid rgba(255,255,255,0.1);
                transition: all 0.2s ease;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .nav-link:hover {
                background: rgba(79, 124, 255, 0.1);
                border-color: var(--accent);
            }

            .nav-link.active {
                background: var(--accent);
                color: #111;
                font-weight: 600;
            }

            .header-actions {
                display: flex;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
            }

            @media (max-width: 768px) {
                .header {
                    flex-direction: column;
                    align-items: stretch;
                    gap: 15px;
                }

                .logo {
                    justify-content: center;
                }

                .header-actions {
                    justify-content: center;
                    flex-direction: column;
                    gap: 8px;
                }

                .nav-links {
                    justify-content: center;
                    flex-direction: column;
                }

                .nav-link {
                    justify-content: center;
                }
            }
        `;
        document.head.appendChild(commonStyles);
    }

    // Initialize license status
    checkLicenseStatus();

    // Initialize company logo in header
    loadCompanyLogoInHeader();

    // Add common event listeners
    document.addEventListener('DOMContentLoaded', function() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }

        loadUserInfo();
    });
}

function goBack() {
    if (document.referrer && document.referrer.includes(window.location.origin)) {
        window.history.back();
    } else {
        window.location.href = 'dashboard.html';
    }
}

function logout() {
    fetch('/api/auth/logout', { method: 'POST' })
        .then(() => {
            sessionStorage.clear();
            localStorage.clear();
            window.location.href = 'index.html';
        })
        .catch(error => {
            console.error('Logout error:', error);
            // Force logout anyway
            sessionStorage.clear();
            localStorage.clear();
            window.location.href = 'index.html';
        });
}

function loadUserInfo() {
    fetch('/api/auth/status')
        .then(response => response.json())
        .then(data => {
            if (data.authenticated) {
                const usernameSpan = document.getElementById('usernameDisplay');
                const ruoloSpan = document.getElementById('ruoloDisplay');

                if (usernameSpan) usernameSpan.textContent = data.username || 'User';
                if (ruoloSpan) {
                    ruoloSpan.textContent = data.ruolo || 'User';
                    ruoloSpan.className = `role-badge ${data.ruolo || 'user'}`;
                }
            }
        })
        .catch(error => {
            console.error('Error loading user info:', error);
        });
}

function checkLicenseStatus() {
    fetch('/api/license/status')
        .then(response => response.json())
        .then(data => {
            const licenseStatus = document.getElementById('licenseStatus');
            if (licenseStatus) {
                licenseStatus.textContent = data.isPro ? 'PRO' : 'FREE';
                licenseStatus.className = data.isPro ? 'license-badge pro' : 'license-badge free';
            }
        })
        .catch(error => {
            console.error('Error checking license:', error);
        });
}

function loadCompanyLogoInHeader() {
    fetch('/api/company-settings')
        .then(response => response.json())
        .then(settings => {
            if (settings && settings.logo_path) {
                const logoImg = document.querySelector('.logo img');
                if (logoImg) {
                    logoImg.src = settings.logo_path;
                    logoImg.alt = settings.company_name || 'Logo Aziendale';
                }

                // Aggiorna anche il titolo se disponibile
                if (settings.company_name) {
                    const logoSpan = document.querySelector('.logo span');
                    if (logoSpan && !logoSpan.id) { // Assicurati che non sia il license badge
                        logoSpan.textContent = settings.company_name;
                    }
                }
            }
        })
        .catch(error => {
            console.log('Logo aziendale non disponibile:', error);
        });
}

// Auto-initialize on script load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const title = document.title || 'WKF Suite';
        const currentPage = window.location.pathname.replace('.html', '').replace('/', '') || 'dashboard';
        initializeCommonLayout(title, currentPage);
    });
} else {
    const title = document.title || 'WKF Suite';
    const currentPage = window.location.pathname.replace('.html', '').replace('/', '') || 'dashboard';
    initializeCommonLayout(title, currentPage);
}