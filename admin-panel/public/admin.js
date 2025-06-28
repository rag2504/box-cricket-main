const API = '/api/admin';
let token = localStorage.getItem('admin_token');

function showSection(section) {
  document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
  document.getElementById(section + '-section').style.display = '';
  document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));
  document.querySelector('.sidebar li[data-section="' + section + '"]').classList.add('active');
}

// --- Login ---
const loginSection = document.getElementById('login-section');
const adminPanel = document.getElementById('admin-panel');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

if (token) {
  loginSection.style.display = 'none';
  adminPanel.style.display = '';
  loadDashboard();
} else {
  loginSection.style.display = '';
  adminPanel.style.display = 'none';
}

loginForm.onsubmit = async (e) => {
  e.preventDefault();
  const email = document.getElementById('admin-email').value;
  const password = document.getElementById('admin-password').value;
  const res = await fetch(API + '/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (data.token) {
    token = data.token;
    localStorage.setItem('admin_token', token);
    loginSection.style.display = 'none';
    adminPanel.style.display = '';
    loadDashboard();
  } else {
    loginError.textContent = data.message || 'Login failed';
  }
};

document.querySelectorAll('.sidebar li[data-section]').forEach(li => {
  li.onclick = () => {
    showSection(li.getAttribute('data-section'));
    if (li.getAttribute('data-section') === 'dashboard') loadDashboard();
    if (li.getAttribute('data-section') === 'users') loadUsers();
    if (li.getAttribute('data-section') === 'grounds') loadGrounds();
    if (li.getAttribute('data-section') === 'locations') loadLocations();
    if (li.getAttribute('data-section') === 'payments') loadPayments();
  };
});
document.getElementById('logout-btn').onclick = () => {
  localStorage.removeItem('admin_token');
  location.reload();
};

// --- Dashboard ---
async function loadDashboard() {
  const res = await fetch(API + '/stats', { headers: { Authorization: 'Bearer ' + token } });
  const stats = await res.json();
  document.getElementById('dashboard-section').innerHTML = `
    <h2>Dashboard</h2>
    <p>Total Users: <b>${stats.users}</b></p>
    <p>Total Grounds: <b>${stats.grounds}</b></p>
    <p>Total Locations: <b>${stats.locations}</b></p>
    <p>Total Payments: <b>${stats.payments}</b></p>
  `;
}

// --- Users ---
async function loadUsers() {
  const res = await fetch(API + '/users', { headers: { Authorization: 'Bearer ' + token } });
  const users = await res.json();
  document.getElementById('users-section').innerHTML = `
    <h2>Users</h2>
    <table><tr><th>Name</th><th>Email</th><th>Role</th></tr>
      ${users.map(u => `<tr><td>${u.name}</td><td>${u.email}</td><td>${u.role}</td></tr>`).join('')}
    </table>
  `;
}

// --- Fetch locations for dropdown ---
let locationsCache = [];
async function fetchLocations() {
  const res = await fetch(API + '/locations', { headers: { Authorization: 'Bearer ' + token } });
  locationsCache = await res.json();
}

// --- Default Indian Cities (copy from cities.ts, short list for demo) ---
const defaultCities = [
  { id: "mumbai", name: "Mumbai", state: "Maharashtra", latitude: 19.076, longitude: 72.8777, popular: true },
  { id: "delhi", name: "Delhi", state: "Delhi", latitude: 28.7041, longitude: 77.1025, popular: true },
  { id: "bangalore", name: "Bangalore", state: "Karnataka", latitude: 12.9716, longitude: 77.5946, popular: true },
  { id: "hyderabad", name: "Hyderabad", state: "Telangana", latitude: 17.385, longitude: 78.4867, popular: true },
  { id: "chennai", name: "Chennai", state: "Tamil Nadu", latitude: 13.0827, longitude: 80.2707, popular: true },
  { id: "kolkata", name: "Kolkata", state: "West Bengal", latitude: 22.5726, longitude: 88.3639, popular: true },
  { id: "pune", name: "Pune", state: "Maharashtra", latitude: 18.5204, longitude: 73.8567, popular: true },
  { id: "ahmedabad", name: "Ahmedabad", state: "Gujarat", latitude: 23.0225, longitude: 72.5714, popular: true },
];

// --- Grounds ---
async function loadGrounds() {
  const res = await fetch(API + '/grounds', { headers: { Authorization: 'Bearer ' + token } });
  const grounds = await res.json();
  document.getElementById('grounds-section').innerHTML = `
    <h2>Grounds <button onclick="showAddGround()">Add</button></h2>
    <div id="add-ground-form" style="display:none;"></div>
    <table><tr><th>Name</th><th>City</th><th>Address</th><th>Price/hr</th><th>Pitch</th><th>Actions</th></tr>
      ${grounds.map(g => `<tr><td>${g.name}</td><td>${g.location.cityName}</td><td>${g.location.address}</td><td>${g.price.perHour}</td><td>${g.features.pitchType}</td><td><button onclick="editGround('${g._id}')">Edit</button> <button onclick="deleteGround('${g._id}')">Delete</button></td></tr>`).join('')}
    </table>
  `;
}

window.showAddGround = async function() {
  await fetchLocations();
  const cityOptions = locationsCache.map(city => `<option value="${city.id}">${city.name}, ${city.state}</option>`).join('');
  document.getElementById('add-ground-form').style.display = '';
  document.getElementById('add-ground-form').innerHTML = `
    <form id="ground-form">
      <input type="text" id="ground-name" placeholder="Name" required><br>
      <textarea id="ground-description" placeholder="Description" required></textarea><br>
      <select id="ground-city" required><option value="">Select City</option>${cityOptions}</select><br>
      <input type="text" id="ground-address" placeholder="Address" required><br>
      <input type="text" id="ground-pincode" placeholder="Pincode" required><br>
      <input type="number" id="ground-price" placeholder="Price per hour" required><br>
      <select id="ground-pitch" required>
        <option value="">Pitch Type</option>
        <option>Artificial Turf</option>
        <option>Synthetic</option>
        <option>Matting</option>
        <option>Concrete</option>
      </select><br>
      <input type="number" id="ground-capacity" placeholder="Capacity" required><br>
      <label><input type="checkbox" id="ground-lighting"> Lighting</label>
      <label><input type="checkbox" id="ground-parking"> Parking</label>
      <label><input type="checkbox" id="ground-changeroom"> Change Room</label>
      <label><input type="checkbox" id="ground-washroom"> Washroom</label>
      <label><input type="checkbox" id="ground-cafeteria"> Cafeteria</label>
      <label><input type="checkbox" id="ground-equipment"> Equipment</label><br>
      <button type="submit">Add Ground</button>
      <button type="button" onclick="hideAddGround()">Cancel</button>
      <div id="ground-error" style="color:red;"></div>
    </form>
  `;
  document.getElementById('ground-form').onsubmit = addGround;
};

window.hideAddGround = function() {
  document.getElementById('add-ground-form').style.display = 'none';
};

async function addGround(e) {
  e.preventDefault();
  const name = document.getElementById('ground-name').value.trim();
  const description = document.getElementById('ground-description').value.trim();
  const cityId = document.getElementById('ground-city').value;
  const address = document.getElementById('ground-address').value.trim();
  const pincode = document.getElementById('ground-pincode').value.trim();
  const price = Number(document.getElementById('ground-price').value);
  const pitchType = document.getElementById('ground-pitch').value;
  const capacity = Number(document.getElementById('ground-capacity').value);
  const lighting = document.getElementById('ground-lighting').checked;
  const parking = document.getElementById('ground-parking').checked;
  const changeRoom = document.getElementById('ground-changeroom').checked;
  const washroom = document.getElementById('ground-washroom').checked;
  const cafeteria = document.getElementById('ground-cafeteria').checked;
  const equipment = document.getElementById('ground-equipment').checked;

  // Validate
  if (!name || !description || !cityId || !address || !pincode || !price || !pitchType || !capacity) {
    document.getElementById('ground-error').textContent = 'All fields are required!';
    return;
  }
  const city = locationsCache.find(c => c.id === cityId);
  if (!city) {
    document.getElementById('ground-error').textContent = 'Invalid city selected!';
    return;
  }

  const body = {
    name,
    description,
    location: {
      address,
      cityId: city.id,
      cityName: city.name,
      state: city.state,
      latitude: city.latitude,
      longitude: city.longitude,
      pincode,
    },
    price: {
      perHour: price,
      currency: 'INR',
      discount: 0,
    },
    features: {
      pitchType,
      capacity,
      lighting,
      parking,
      changeRoom,
      washroom,
      cafeteria,
      equipment,
    },
    status: 'active',
    isVerified: true,
    totalBookings: 0,
  };

  const res = await fetch(API + '/grounds', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify(body)
  });
  if (res.ok) {
    loadGrounds();
    hideAddGround();
  } else {
    const data = await res.json();
    document.getElementById('ground-error').textContent = data.message || 'Failed to add ground';
  }
}

window.editGround = async function(id) {
  const res = await fetch(API + '/grounds', { headers: { Authorization: 'Bearer ' + token } });
  const grounds = await res.json();
  const g = grounds.find(x => x._id === id);
  document.getElementById('add-ground-form').style.display = '';
  document.getElementById('add-ground-form').innerHTML = `
    <form onsubmit="updateGround(event, '${id}')">
      <input type="text" id="ground-name" value="${g.name}" required>
      <input type="text" id="ground-location" value="${g.location}" required>
      <input type="text" id="ground-details" value="${g.details}">
      <button type="submit">Update</button>
      <button type="button" onclick="hideAddGround()">Cancel</button>
    </form>
  `;
};
window.updateGround = async function(e, id) {
  e.preventDefault();
  const name = document.getElementById('ground-name').value;
  const location = document.getElementById('ground-location').value;
  const details = document.getElementById('ground-details').value;
  await fetch(API + '/grounds/' + id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ name, location, details })
  });
  loadGrounds();
  hideAddGround();
};
window.deleteGround = async function(id) {
  await fetch(API + '/grounds/' + id, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + token }
  });
  loadGrounds();
};

// --- Locations ---
async function loadLocations() {
  const res = await fetch(API + '/locations', { headers: { Authorization: 'Bearer ' + token } });
  const locations = await res.json();
  let html = `<h2>Locations <button onclick="showAddLocation()">Add</button> <button onclick="importCities()">Import Default Cities</button></h2>`;
  html += `<div id="add-location-form" style="display:none;"></div>`;
  if (locations.length === 0) {
    html += `<div style="color:red;">No cities found. Please add or import cities to enable ground creation.</div>`;
  }
  html += `<table><tr><th>Name</th><th>State</th><th>Actions</th></tr>
    ${locations.map(l => `<tr><td>${l.name}</td><td>${l.state}</td><td><button onclick="editLocation('${l.id}')">Edit</button> <button onclick="deleteLocation('${l.id}')">Delete</button></td></tr>`).join('')}
  </table>`;
  document.getElementById('locations-section').innerHTML = html;
}

window.importCities = async function() {
  for (const city of defaultCities) {
    await fetch(API + '/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(city)
    });
  }
  loadLocations();
  alert('Default cities imported!');
};

window.showAddLocation = function() {
  document.getElementById('add-location-form').style.display = '';
  document.getElementById('add-location-form').innerHTML = `
    <form id="location-form">
      <input type="text" id="location-id" placeholder="City ID (e.g. mumbai)" required><br>
      <input type="text" id="location-name" placeholder="Name" required><br>
      <input type="text" id="location-state" placeholder="State" required><br>
      <input type="number" id="location-lat" placeholder="Latitude" required step="any"><br>
      <input type="number" id="location-lng" placeholder="Longitude" required step="any"><br>
      <label><input type="checkbox" id="location-popular"> Popular</label><br>
      <button type="submit">Add Location</button>
      <button type="button" onclick="hideAddLocation()">Cancel</button>
      <div id="location-error" style="color:red;"></div>
    </form>
  `;
  document.getElementById('location-form').onsubmit = addLocation;
};

window.hideAddLocation = function() {
  document.getElementById('add-location-form').style.display = 'none';
};

async function addLocation(e) {
  e.preventDefault();
  const id = document.getElementById('location-id').value.trim();
  const name = document.getElementById('location-name').value.trim();
  const state = document.getElementById('location-state').value.trim();
  const latitude = Number(document.getElementById('location-lat').value);
  const longitude = Number(document.getElementById('location-lng').value);
  const popular = document.getElementById('location-popular').checked;
  if (!id || !name || !state || !latitude || !longitude) {
    document.getElementById('location-error').textContent = 'All fields are required!';
    return;
  }
  const res = await fetch(API + '/locations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ id, name, state, latitude, longitude, popular })
  });
  if (res.ok) {
    loadLocations();
    hideAddLocation();
  } else {
    const data = await res.json();
    document.getElementById('location-error').textContent = data.message || 'Failed to add location';
  }
}

window.editLocation = async function(id) {
  const res = await fetch(API + '/locations', { headers: { Authorization: 'Bearer ' + token } });
  const locations = await res.json();
  const l = locations.find(x => x._id === id);
  document.getElementById('add-location-form').style.display = '';
  document.getElementById('add-location-form').innerHTML = `
    <form onsubmit="updateLocation(event, '${id}')">
      <input type="text" id="location-name" value="${l.name}" required>
      <input type="text" id="location-state" value="${l.state}" required>
      <button type="submit">Update</button>
      <button type="button" onclick="hideAddLocation()">Cancel</button>
    </form>
  `;
};
window.updateLocation = async function(e, id) {
  e.preventDefault();
  const name = document.getElementById('location-name').value;
  const state = document.getElementById('location-state').value;
  await fetch(API + '/locations/' + id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ name, state })
  });
  loadLocations();
  hideAddLocation();
};
window.deleteLocation = async function(id) {
  await fetch(API + '/locations/' + id, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + token }
  });
  loadLocations();
};

// --- Payments ---
async function loadPayments() {
  const res = await fetch(API + '/payments', { headers: { Authorization: 'Bearer ' + token } });
  const payments = await res.json();
  document.getElementById('payments-section').innerHTML = `
    <h2>Payments</h2>
    <table><tr><th>User ID</th><th>Amount</th><th>Status</th><th>Date</th></tr>
      ${payments.map(p => `<tr><td>${p.userId}</td><td>${p.amount}</td><td>${p.status}</td><td>${new Date(p.createdAt).toLocaleString()}</td></tr>`).join('')}
    </table>
  `;
} 