const API_BASE_URL = 'https://tu-app.koyeb.app';

class PediaAttendanceApp {
    constructor() {
        this.token = localStorage.getItem('token');
        this.userType = localStorage.getItem('userType');
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthentication();
    }

    setupEventListeners() {
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        document.getElementById('admin-logout-btn').addEventListener('click', () => this.logout());
        document.getElementById('refresh-btn').addEventListener('click', () => this.loadAttendanceList());
        document.getElementById('export-btn').addEventListener('click', () => this.exportPDF());
    }

    checkAuthentication() {
        if (this.token && this.userType) {
            this.showDashboard(this.userType);
        } else {
            this.showScreen('login-screen');
        }
    }

    async handleLogin() {
        const phone = document.getElementById('phone').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('login-error');

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ phone, password }),
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.access_token;
                this.userType = data.user_type;
                
                localStorage.setItem('token', this.token);
                localStorage.setItem('userType', this.userType);
                
                this.showDashboard(this.userType);
            } else {
                errorDiv.textContent = data.detail || 'Error de autenticación';
                errorDiv.classList.remove('hidden');
            }
        } catch (error) {
            errorDiv.textContent = 'Error de conexión';
            errorDiv.classList.remove('hidden');
        }
    }

    showDashboard(userType) {
        if (userType === 'student') {
            this.showScreen('student-dashboard');
            initStudentDashboard();
        } else if (userType === 'admin') {
            this.showScreen('admin-dashboard');
            this.loadAttendanceList();
        }
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    logout() {
        this.token = null;
        this.userType = null;
        localStorage.removeItem('token');
        localStorage.removeItem('userType');
        this.showScreen('login-screen');
    }

    async loadAttendanceList() {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/list`, {
                headers: {'Authorization': `Bearer ${this.token}`}
            });

            if (response.ok) {
                const attendances = await response.json();
                this.renderAttendanceList(attendances);
            }
        } catch (error) {
            console.error('Error loading attendance list:', error);
        }
    }

    renderAttendanceList(attendances) {
        const container = document.getElementById('attendance-list');
        
        if (attendances.length === 0) {
            container.innerHTML = '<p>No hay registros de asistencia</p>';
            return;
        }

        container.innerHTML = attendances.map(attendance => `
            <div class="attendance-item">
                <div class="attendance-info">
                    <strong>Usuario:</strong> ${attendance.user_id}
                </div>
                <div class="attendance-info">
                    <strong>Ubicación:</strong> ${attendance.latitude.toFixed(6)}, ${attendance.longitude.toFixed(6)}
                </div>
                <div class="attendance-time">
                    ${new Date(attendance.created_at).toLocaleString()}
                </div>
                ${attendance.photo_url ? `<img src="${attendance.photo_url}" width="100" style="margin-top: 8px;">` : ''}
            </div>
        `).join('');
    }

    async exportPDF() {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/export`, {
                headers: {'Authorization': `Bearer ${this.token}`}
            });

            if (response.ok) {
                const data = await response.json();
                alert(`PDF generado: ${data.count} registros`);
            }
        } catch (error) {
            console.error('Error exporting PDF:', error);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PediaAttendanceApp();
});
