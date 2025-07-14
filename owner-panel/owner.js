// Owner Panel JS
const loginForm = document.getElementById('ownerLoginForm');
const loginError = document.getElementById('loginError');
const loginContainer = document.getElementById('loginContainer');
const dashboardContainer = document.getElementById('dashboardContainer');
const ownerNameSpan = document.getElementById('ownerName');
const logoutBtn = document.getElementById('logoutBtn');
const groundsList = document.getElementById('groundsList');

const API_BASE = '/api/auth/owner/login';

function showError(msg) {
  loginError.textContent = msg;
  loginError.style.display = 'block';
}
function hideError() {
  loginError.textContent = '';
  loginError.style.display = 'none';
}

async function fetchOwnerGrounds(token) {
  try {
    const res = await fetch('/api/grounds/owner', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!data.success) {
      groundsList.innerHTML = `<div class='error'>${data.message || 'Failed to fetch grounds.'}</div>`;
      return;
    }
    if (!data.grounds.length) {
      groundsList.innerHTML = '<div>No grounds found for your account.</div>';
      return;
    }
    groundsList.innerHTML = data.grounds.map(({ ground, bookings }) => `
      <div class="ground-block" style="margin-bottom:32px;">
        <h4>${ground.name} <span style="color:#888;font-size:14px;">(${ground.location?.cityName || ''})</span></h4>
        <div><b>Address:</b> ${ground.location?.address || ''}</div>
        <div><b>Rate:</b> ₹${(ground.price?.ranges?.map(r => `${r.start}-${r.end}: ₹${r.perHour}`).join(', ') || 'N/A')}</div>
        <div><b>Bookings:</b></div>
        <table style="width:100%;margin-top:8px;border-collapse:collapse;">
          <thead><tr><th>Date</th><th>Time Slot</th><th>Rate</th><th>Booked By</th><th>Contact</th></tr></thead>
          <tbody>
            ${bookings.length ? bookings.map(b => `
              <tr>
                <td>${b.bookingDate || ''}</td>
                <td>${b.timeSlot || ''}</td>
                <td>₹${getRateForSlot(ground, b.timeSlot)}</td>
                <td>${b.userId?.name || ''}</td>
                <td>${b.userId?.email || ''} <br> ${b.userId?.phone || ''}</td>
              </tr>
            `).join('') : '<tr><td colspan="5">No bookings yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    `).join('');
  } catch (err) {
    groundsList.innerHTML = `<div class='error'>Network error. Please try again.</div>`;
  }
}

function getRateForSlot(ground, timeSlot) {
  if (!ground.price || !ground.price.ranges || !timeSlot) return 'N/A';
  // timeSlot format: "HH:MM-HH:MM"
  const [start, end] = timeSlot.split('-');
  const range = ground.price.ranges.find(r => r.start === start && r.end === end);
  return range ? range.perHour : (ground.price.ranges[0]?.perHour || 'N/A');
}

function showDashboard(owner) {
  loginContainer.classList.add('hidden');
  dashboardContainer.classList.remove('hidden');
  ownerNameSpan.textContent = owner.name;
  const token = localStorage.getItem('ownerToken');
  fetchOwnerGrounds(token);
}

function logout() {
  localStorage.removeItem('ownerToken');
  localStorage.removeItem('ownerInfo');
  dashboardContainer.classList.add('hidden');
  loginContainer.classList.remove('hidden');
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();
  const email = document.getElementById('ownerEmail').value;
  const password = document.getElementById('ownerPassword').value;
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!data.success) {
      showError(data.message || 'Login failed');
      return;
    }
    localStorage.setItem('ownerToken', data.token);
    localStorage.setItem('ownerInfo', JSON.stringify(data.user));
    showDashboard(data.user);
  } catch (err) {
    showError('Network error. Please try again.');
  }
});

logoutBtn.addEventListener('click', logout);

// Auto-login if token exists
window.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('ownerToken');
  const user = localStorage.getItem('ownerInfo');
  if (token && user) {
    showDashboard(JSON.parse(user));
  }
}); 