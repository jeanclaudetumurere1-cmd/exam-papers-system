// Authentication handling
const Auth = {
    async login(username, password) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            return { success: true };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: error.message };
        }
    },

    async logout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
            
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/admin/login.html';
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = '/admin/login.html';
        }
    },

    async verifyToken() {
        try {
            const response = await fetch('/api/auth/verify', {
                credentials: 'include',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            
            const data = await response.json();
            return data.valid === true;
        } catch (error) {
            console.error('Token verification error:', error);
            return false;
        }
    },

    checkAuth() {
        // Skip check on login page
        if (window.location.pathname.includes('login.html')) {
            return;
        }

        // Verify token and redirect if invalid
        this.verifyToken().then(valid => {
            if (!valid) {
                window.location.href = '/admin/login.html';
            }
        }).catch(() => {
            window.location.href = '/admin/login.html';
        });
    }
};

// Initialize auth check on protected pages
document.addEventListener('DOMContentLoaded', () => {
    if (!window.location.pathname.includes('/public/') && 
        !window.location.pathname.includes('login.html')) {
        Auth.checkAuth();
    }
});

// Make Auth available globally
window.Auth = Auth;