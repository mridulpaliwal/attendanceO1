function updateClassMarkers() {
  // Clear old markers
  classMarkers.forEach(m => map.removeLayer(m));
  classMarkers = [];

  const classes = JSON.parse(localStorage.getItem('classes')) || [];
  classes.forEach((cls, index) => {
    const [lat, lon] = cls.location.split(',').map(parseFloat);
    const marker = L.marker([lat, lon]).addTo(map)
      .bindPopup(`<strong>${cls.name}</strong><br>${cls.start} - ${cls.end}`);
    classMarkers.push(marker);

    // Attach click behavior to timetable item
    const listItems = document.querySelectorAll('#class-list li');
    listItems[index].style.cursor = 'pointer';
    listItems[index].onclick = () => {
      map.setView([lat, lon], 18);
      marker.openPopup();
    };
  });
}

const map = L.map('map').setView([28.6139, 77.2090], 16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);
let userMarker;
let classMarkers = [];

navigator.geolocation.watchPosition(
  pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    if (!userMarker) {
      userMarker = L.marker([lat, lon]).addTo(map).bindPopup("You're here").openPopup();
    } else {
      userMarker.setLatLng([lat, lon]);
    }
    map.setView([lat, lon]);
    checkAttendance(lat, lon);
  },
  err => alert("Error getting location: " + err.message),
  { enableHighAccuracy: true }
);

// Form Submission
document.getElementById('class-form').addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('class-name').value;
  const start = document.getElementById('start-time').value;
  const end = document.getElementById('end-time').value;
  const location = document.getElementById('location').value;

  const classes = JSON.parse(localStorage.getItem('classes')) || [];
  classes.push({ name, start, end, location });
  localStorage.setItem('classes', JSON.stringify(classes));
  e.target.reset();
  updateClassList();
});

function updateClassList() {
  const list = document.getElementById('class-list');
  list.innerHTML = '';
  const classes = JSON.parse(localStorage.getItem('classes')) || [];
  classes.forEach((cls, i) => {
    const li = document.createElement('li');
    li.className = 'border p-2 rounded flex justify-between items-center';
    li.innerHTML = `${cls.name} (${cls.start}-${cls.end}) @ ${cls.location} <button class="text-red-500" onclick="deleteClass(${i})">🗑️</button>`;
    list.appendChild(li);
  });
  updateClassMarkers();
}

function deleteClass(i) {
  const classes = JSON.parse(localStorage.getItem('classes')) || [];
  classes.splice(i, 1);
  localStorage.setItem('classes', JSON.stringify(classes));
  updateClassList();
}

function saveAttendanceStatus(name, status) {
  const records = JSON.parse(localStorage.getItem('attendanceHistory')) || [];
  records.push({ date: new Date().toLocaleString(), className: name, status });
  localStorage.setItem('attendanceHistory', JSON.stringify(records));
  updateHistory();
}

function updateHistory() {
  const list = document.getElementById('history-list');
  list.innerHTML = '';
  const history = JSON.parse(localStorage.getItem('attendanceHistory')) || [];
  if (history.length === 0) list.innerHTML = '<li>No records yet</li>';
  history.forEach((r, i) => {
    const li = document.createElement('li');
    li.className = 'border p-2 rounded flex justify-between';
    li.innerHTML = `${r.date} - ${r.className}: ${r.status} <button onclick="deleteHistory(${i})">🗑️</button>`;
    list.appendChild(li);
  });
}

function deleteHistory(i) {
  const h = JSON.parse(localStorage.getItem('attendanceHistory')) || [];
  h.splice(i, 1);
  localStorage.setItem('attendanceHistory', JSON.stringify(h));
  updateHistory();
}

function checkAttendance(lat, lon) {
  const now = new Date();
  const classes = JSON.parse(localStorage.getItem('classes')) || [];
  classes.forEach(cls => {
    const [sh, sm] = cls.start.split(':');
    const [eh, em] = cls.end.split(':');
    const sTime = new Date();
    const eTime = new Date();
    sTime.setHours(sh, sm, 0);
    eTime.setHours(eh, em, 0);

    const [cLat, cLon] = cls.location.split(',').map(parseFloat);
    const distance = getDistance(lat, lon, cLat, cLon);
    const markedKey = `marked-${cls.name}-${cls.start}`;

    if (now >= sTime && now <= eTime && !localStorage.getItem(markedKey)) {
      const status = distance < 100 ? '✅ Present' : '❌ Absent';
      saveAttendanceStatus(cls.name, status);
      localStorage.setItem(markedKey, 'true');
    }
  });
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

updateClassList();
updateHistory();
