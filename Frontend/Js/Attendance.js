let currentStream = null;
let capturedPhoto = null;

function initStudentDashboard() {
    const captureBtn = document.getElementById('capture-btn');
    const checkinBtn = document.getElementById('checkin-btn');
    
    captureBtn.addEventListener('click', () => {
        if (!currentStream) {
            startCamera();
        } else {
            capturePhoto();
        }
    });

    checkinBtn.addEventListener('click', registerAttendance);
    getCurrentLocation();
}

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        
        const video = document.getElementById('video');
        video.srcObject = stream;
        currentStream = stream;
        
        document.getElementById('camera-preview').classList.remove('hidden');
        document.getElementById('capture-btn').textContent = 'Capturar Foto';
        
    } catch (error) {
        alert('No se pudo acceder a la cámara');
    }
}

function capturePhoto() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    currentStream.getTracks().forEach(track => track.stop());
    currentStream = null;
    
    document.getElementById('camera-preview').classList.add('hidden');
    document.getElementById('capture-btn').textContent = 'Tomar Foto Nuevamente';
    
    capturedPhoto = canvas.toDataURL('image/jpeg').split(',')[1];
    document.getElementById('checkin-btn').disabled = false;
}

function getCurrentLocation() {
    const locationStatus = document.getElementById('location-status');
    
    if (!navigator.geolocation) {
        locationStatus.innerHTML = '<span>❌ Geolocalización no soportada</span>';
        return;
    }

    locationStatus.innerHTML = '<span>📍 Obteniendo ubicación...</span>';

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            locationStatus.innerHTML = `<span>✅ Ubicación: ${lat.toFixed(6)}, ${lng.toFixed(6)}</span>`;
            window.currentLocation = { lat, lng };
        },
        (error) => {
            locationStatus.innerHTML = `<span>❌ Error: ${error.message}</span>`;
        }
    );
}

async function registerAttendance() {
    const checkinBtn = document.getElementById('checkin-btn');
    const token = localStorage.getItem('token');
    
    if (!window.currentLocation) {
        alert('No se pudo obtener la ubicación');
        return;
    }

    checkinBtn.disabled = true;
    checkinBtn.textContent = 'Registrando...';

    try {
        const checkinData = {
            latitude: window.currentLocation.lat,
            longitude: window.currentLocation.lng,
            photo_base64: capturedPhoto
        };

        const response = await fetch(`${API_BASE_URL}/attendance/checkin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(checkinData)
        });

        const data = await response.json();

        if (response.ok) {
            alert('Asistencia registrada');
            capturedPhoto = null;
            document.getElementById('checkin-btn').disabled = true;
        } else {
            alert(`Error: ${data.detail}`);
        }
    } catch (error) {
        alert('Error de conexión');
    } finally {
        checkinBtn.disabled = false;
        checkinBtn.textContent = 'Registrar Asistencia';
    }
  }
