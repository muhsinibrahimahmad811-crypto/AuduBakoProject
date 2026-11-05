import { defineComponent } from 'vue';
import { useAttendance } from '../composables/useAttendance';

export default defineComponent({
  name: 'HomeView',
  emits: ['navigate'],
  setup(_, { emit }) {
    const { stats } = useAttendance();

    return () => (
      <div>
        {/* Hero Section */}
        <div class="bg-success text-white rounded-3 p-5 mb-5 shadow-sm">
          <div class="row align-items-center">
            <div class="col-lg-8">
              <span class="badge bg-warning text-white fw-bold uppercase px-3 py-2 mb-3">Kano State Civil Service</span>
              <h1 class="display-5 fw-bold mb-3">Audu Bako Secretariat Gate Pass & Attendance</h1>
              <p class="lead mb-4 text-white-50">
                Official digital registry for staff attendance, visitor management, and security access control across all ministries and departments.
              </p>
              <div class="d-flex flex-wrap gap-3">
                <button onClick={() => emit('navigate', 'staff')} class="btn btn-light btn-lg fw-bold text-success shadow-sm">
                  Staff Portal
                </button>
                <button onClick={() => emit('navigate', 'guest')} class="btn btn-outline-light btn-lg font-semibold">
                  Guest Visitor Pass
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Metrics Cards */}
        <div class="row g-4 mb-5">
          <div class="col-md-3">
            <div class="card border-0 shadow-sm text-center p-3">
              <div class="fs-1 fw-bold text-success">{stats.value.total}</div>
              <div class="text-muted small fw-semibold">TOTAL VISITS TODAY</div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card border-0 shadow-sm text-center p-3">
              <div class="fs-1 fw-bold text-primary">{stats.value.staffCount}</div>
              <div class="text-muted small fw-semibold">STAFF ATTENDANCE</div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card border-0 shadow-sm text-center p-3">
              <div class="fs-1 fw-bold text-info">{stats.value.guestCount}</div>
              <div class="text-muted small fw-semibold">GUEST PASSES ISSUED</div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card border-0 shadow-sm text-center p-3">
              <div class="fs-1 fw-bold text-warning">{stats.value.activeOnsite}</div>
              <div class="text-muted small fw-semibold">CURRENTLY ON-SITE</div>
            </div>
          </div>
        </div>

        {/* Portal Entry Options */}
        <div class="row g-4">
          <div class="col-md-4">
            <div class="card h-100 border-0 shadow-sm p-4">
              <div class="card-body vstack justify-content-between">
                <div>
                  <div class="badge bg-success-subtle text-success p-2 mb-3 fs-6">🏛 Staff Module</div>
                  <h3 class="h5 fw-bold">Secretariat Staff</h3>
                  <p class="text-muted small">Sign in to record your daily attendance, view your personal attendance history, and log check-out when leaving.</p>
                </div>
                <button onClick={() => emit('navigate', 'staff')} class="btn btn-outline-success w-100 mt-3">Access Staff Portal</button>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card h-100 border-0 shadow-sm p-4">
              <div class="card-body vstack justify-content-between">
                <div>
                  <div class="badge bg-info-subtle text-info p-2 mb-3 fs-6">🎫 Visitor Kiosk</div>
                  <h3 class="h5 fw-bold">Guest Access Pass</h3>
                  <p class="text-muted small">Visiting an officer or department? Register quickly at the security kiosk to receive an electronic entry clearance pass.</p>
                </div>
                <button onClick={() => emit('navigate', 'guest')} class="btn btn-outline-info w-100 mt-3">Issue Guest Pass</button>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card h-100 border-0 shadow-sm p-4">
              <div class="card-body vstack justify-content-between">
                <div>
                  <div class="badge bg-dark-subtle text-dark p-2 mb-3 fs-6">🔐 Admin Desk</div>
                  <h3 class="h5 fw-bold">Department Admin</h3>
                  <p class="text-muted small">Authorized personnel login to monitor real-time department presence, export daily logs, and manage options.</p>
                </div>
                <button onClick={() => emit('navigate', 'admin')} class="btn btn-outline-dark w-100 mt-3">Admin Portal Login</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
});