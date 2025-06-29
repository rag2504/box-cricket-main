// Admin Panel JavaScript
let token = localStorage.getItem('adminToken');
let currentSection = 'grounds';

// Check if already logged in
if (token) {
    showMainContent();
}

// Login Form
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

        const data = await response.json();
  if (data.token) {
    token = data.token;
            localStorage.setItem('adminToken', token);
            showMainContent();
  } else {
            alert('Login failed');
        }
    } catch (error) {
        alert('Login error: ' + error.message);
    }
});

function showMainContent() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('userSection').style.display = 'block';
    document.getElementById('mainContent').style.display = 'block';
    document.getElementById('userEmail').textContent = 'admin@boxcric.com';
    
    loadGrounds();
    loadLocations();
    populateCityDropdown();
}

function logout() {
    localStorage.removeItem('adminToken');
    location.reload();
}

// Navigation
function showSection(section) {
    currentSection = section;
    
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Show/hide sections
    document.getElementById('groundsSection').style.display = section === 'grounds' ? 'block' : 'none';
    document.getElementById('locationsSection').style.display = section === 'locations' ? 'block' : 'none';
}

// Grounds Management
function showAddGroundForm() {
    document.getElementById('addGroundForm').style.display = 'block';
    document.getElementById('groundsList').style.display = 'none';
}

function hideAddGroundForm() {
    document.getElementById('addGroundForm').style.display = 'none';
    document.getElementById('groundsList').style.display = 'block';
    document.getElementById('groundForm').reset();
}

// Ground Form Submission
document.getElementById('groundForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Collect form data
    const formData = {
        name: document.getElementById('groundName').value,
        description: document.getElementById('groundDescription').value,
    location: {
            cityId: document.getElementById('groundCity').value,
            address: document.getElementById('groundAddress').value,
            pincode: document.getElementById('groundPincode').value
    },
    price: {
            perHour: Number(document.getElementById('groundPrice').value),
            currency: "INR",
            discount: Number(document.getElementById('groundDiscount').value) || 0
        },
        images: [],
        amenities: [],
    features: {
            pitchType: document.getElementById('groundPitchType').value,
            capacity: Number(document.getElementById('groundCapacity').value),
            lighting: document.getElementById('groundLighting').checked,
            parking: document.getElementById('groundParking').checked,
            changeRoom: document.getElementById('groundChangeRoom').checked,
            washroom: document.getElementById('groundWashroom').checked,
            cafeteria: document.getElementById('groundCafeteria').checked,
            equipment: document.getElementById('groundEquipment').checked
        },
        owner: {
            name: document.getElementById('ownerName').value,
            email: document.getElementById('ownerEmail').value,
            contact: document.getElementById('ownerContact').value,
            verified: true
        },
        policies: {
            cancellation: document.getElementById('cancellationPolicy').value || "Free cancellation up to 24 hours before booking",
            advanceBooking: Number(document.getElementById('advanceBooking').value) || 30,
            rules: document.getElementById('groundRules').value.split('\n').filter(rule => rule.trim())
        }
    };

    // Collect images
    const image1 = document.getElementById('groundImage1').value;
    const image2 = document.getElementById('groundImage2').value;
    const image3 = document.getElementById('groundImage3').value;
    
    if (image1) {
        formData.images.push({ url: image1, alt: formData.name, isPrimary: true });
    }
    if (image2) {
        formData.images.push({ url: image2, alt: formData.name + " - View 2", isPrimary: false });
    }
    if (image3) {
        formData.images.push({ url: image3, alt: formData.name + " - View 3", isPrimary: false });
    }

    // Collect amenities
    document.querySelectorAll('input[type="checkbox"][value]').forEach(checkbox => {
        if (checkbox.checked) {
            formData.amenities.push(checkbox.value);
        }
    });

    try {
        const response = await fetch('/api/admin/grounds', {
    method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        if (response.ok) {
            alert('Ground added successfully!');
            hideAddGroundForm();
    loadGrounds();
  } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        alert('Error adding ground: ' + error.message);
    }
});

async function loadGrounds() {
    try {
        const response = await fetch('/api/admin/grounds', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const grounds = await response.json();
        
        const tbody = document.getElementById('groundsTableBody');
        tbody.innerHTML = '';
        
        grounds.forEach(ground => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${ground.name}</td>
                <td>${ground.location?.cityName || 'N/A'}</td>
                <td>₹${ground.price?.perHour || 0}</td>
                <td><span class="status ${ground.status}">${ground.status}</span></td>
                <td>
                    <button onclick="editGround('${ground._id}')" class="btn-small">Edit</button>
                    <button onclick="deleteGround('${ground._id}')" class="btn-small btn-danger">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading grounds:', error);
    }
}

async function deleteGround(id) {
    if (!confirm('Are you sure you want to delete this ground?')) return;
    
    try {
        const response = await fetch(`/api/admin/grounds/${id}`, {
    method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
  });
        
        if (response.ok) {
            alert('Ground deleted successfully!');
  loadGrounds();
        } else {
            alert('Error deleting ground');
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Locations Management
function showAddLocationForm() {
    document.getElementById('addLocationForm').style.display = 'block';
    document.getElementById('locationsList').style.display = 'none';
}

function hideAddLocationForm() {
    document.getElementById('addLocationForm').style.display = 'none';
    document.getElementById('locationsList').style.display = 'block';
    document.getElementById('locationForm').reset();
}

// Location Form Submission
document.getElementById('locationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        id: document.getElementById('locationId').value,
        name: document.getElementById('locationName').value,
        state: document.getElementById('locationState').value,
        latitude: Number(document.getElementById('locationLat').value),
        longitude: Number(document.getElementById('locationLng').value),
        popular: document.getElementById('locationPopular').checked
    };

    try {
        const response = await fetch('/api/admin/locations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        if (response.ok) {
            alert('Location added successfully!');
            hideAddLocationForm();
            loadLocations();
            populateCityDropdown();
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        alert('Error adding location: ' + error.message);
    }
});

async function loadLocations() {
    try {
        const response = await fetch('/api/admin/locations', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const locations = await response.json();
        
        const tbody = document.getElementById('locationsTableBody');
        tbody.innerHTML = '';
        
        locations.forEach(location => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${location.id}</td>
                <td>${location.name}</td>
                <td>${location.state}</td>
                <td>${location.popular ? 'Yes' : 'No'}</td>
                <td>
                    <button onclick="editLocation('${location.id}')" class="btn-small">Edit</button>
                    <button onclick="deleteLocation('${location.id}')" class="btn-small btn-danger">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading locations:', error);
    }
}

async function deleteLocation(id) {
    if (!confirm('Are you sure you want to delete this location?')) return;
    
    try {
        const response = await fetch(`/api/admin/locations/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            alert('Location deleted successfully!');
    loadLocations();
            populateCityDropdown();
  } else {
            alert('Error deleting location');
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function populateCityDropdown() {
    try {
        const response = await fetch('/api/admin/locations', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const locations = await response.json();
        
        const select = document.getElementById('groundCity');
        select.innerHTML = '<option value="">Select City</option>';
        
        locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location.id;
            option.textContent = `${location.name}, ${location.state}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading cities:', error);
    }
} 