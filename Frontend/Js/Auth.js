// Authentication utilities
function getAuthToken() {
    return localStorage.getItem('token');
}

function isAuthenticated() {
    return !!getAuthToken();
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    window.location.reload();
}
