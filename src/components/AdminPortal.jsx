import { defineComponent, ref } from 'vue';
import { useAttendance } from '../composables/useAttendance';
import StatsOverview from './StatsOverview';
import AttendanceTable from './AttendanceTable';
import ExportButton from './ExportButton';

export default defineComponent({
  name: 'AdminPortal',
  emits: ['navigate'], // Emit navigation events to App.jsx
  setup(_, { emit }) {
    const { 
      currentUser, 
      loginUser, 
      registerUser, 
      logoutUser, 
      departments, 
      activeCodes,
      addDepartment, 
      removeDepartment,
      selectedDepartmentFilter,
      isSuperAdmin,
      isReceptionist,
      activeDepartmentScope,
      generateVerificationCode
    } = useAttendance();

    const isSignup = ref(false);
    const adminName = ref('');
    const username = ref('');
    const password = ref('');
    const adminDept = ref('Receptionist');
    const role = ref('dept_admin');
    const newDeptName = ref('');
    const latestGeneratedCode = ref(null);

    // Clean Logout Handler
    const handleLogout = () => {
      logoutUser(); // Clears currentUser and localStorage
      if (emit) {
        emit('navigate', 'home'); // Navigates back to the homepage
      }
    };

    const handleAuth = (e) => {
      e.preventDefault();
      if (isSignup.value) {
        registerUser({ 
          name: adminName.value, 
          username: username.value, 
          password: password.value, 
          department: adminDept.value,
          role: role.value,
          isAdmin: true 
        });
      } else {
        loginUser(username.value, password.value, 'admin');
      }
    };

    const handleGenerateCode = () => {
      latestGeneratedCode.value = generateVerificationCode();
    };

    const handleAddDept = (e) => {
      e.preventDefault();
      addDepartment(newDeptName.value);
      newDeptName.value = '';
    };

    return () => (
      <div class="container-fluid max-w-6xl px-2 px-md-3">
        {!currentUser.value || !currentUser.value.isAdmin ? (
          /* Admin Login / Signup */
          <div class="card shadow-sm mx-auto" style="max-width: 480px;">
            <div class="card-header bg-dark text-white pt-3">
              <h3 class="h5 mb-0 font-semibold">{isSignup.value ? 'Register Admin Account' : 'Admin Portal Login'}</h3>
            </div>
            <div class="card-body p-3 p-md-4">
              <form onSubmit={handleAuth} class="vstack gap-3">
                {isSignup.value && (
                  <div>
                    <label class="form-label fw-semibold">Admin Full Name</label>
                    <input v-model={adminName.value} required type="text" class="form-control" placeholder="e.g. Officer Bello" />
                  </div>
                )}
                <div>
                  <label class="form-label fw-semibold">Username / ID</label>
                  <input v-model={username.value} required type="text" class="form-control" placeholder="e.g. receptionist_gate1" />
                </div>
                {isSignup.value && (
                  <div>
                    <label class="form-label fw-semibold">Access Privilege Level</label>
                    <select v-model={role.value} class="form-select">
                      <option value="dept_admin">Department Administrator</option>
                      <option value="super_admin">Super Administrator</option>
                    </select>
                  </div>
                )}
                {isSignup.value && role.value === 'dept_admin' && (
                  <div>
                    <label class="form-label fw-semibold">Assigned Department</label>
                    <select v-model={adminDept.value} class="form-select">
                      {departments.value.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label class="form-label fw-semibold">Password</label>
                  <input v-model={password.value} required type="password" class="form-control" placeholder="••••••••" />
                </div>
                <button type="submit" class="btn btn-dark w-100 mt-2">
                  {isSignup.value ? 'Create Admin Account' : 'Authenticate Admin'}
                </button>
              </form>
              <div class="text-center mt-3">
                <button class="btn btn-link btn-sm text-decoration-none text-muted" onClick={() => (isSignup.value = !isSignup.value)}>
                  {isSignup.value ? 'Already an Admin? Login' : 'Need an Admin Account? Signup'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Logged-In Admin Dashboard */
          <div>
            {/* Header Profile */}
            <div class="card border-0 shadow-sm mb-4">
              <div class="card-body d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                <div>
                  <h4 class="h5 fw-bold mb-1">
                    {currentUser.value.name} 
                    <span class="badge bg-secondary ms-2 text-capitalize">{currentUser.value.department}</span>
                  </h4>
                  <p class="text-muted small mb-0">
                    Scope: <strong>{isSuperAdmin.value || isReceptionist.value ? 'All Secretariat Logs' : currentUser.value.department}</strong>
                  </p>
                </div>
                {/* Fixed Sign Out Button */}
                <button onClick={handleLogout} class="btn btn-outline-danger btn-sm align-self-start align-self-md-center">
                  Sign Out Admin
                </button>
              </div>
            </div>

            {/* Receptionist Code Dispatcher Card */}
            {(isReceptionist.value || isSuperAdmin.value) && (
              <div class="card border-0 shadow-sm mb-4 bg-success-subtle border-start border-success border-4">
                <div class="card-body">
                  <div class="row align-items-center g-3">
                    <div class="col-12 col-md-7">
                      <h5 class="fw-bold text-success mb-1">Reception Desk — Code Dispatcher</h5>
                      <p class="small text-muted mb-0">Generate a single-use 6-digit code for staff members physically arriving at the entrance desk.</p>
                    </div>
                    <div class="col-12 col-md-5 text-md-end">
                      <button onClick={handleGenerateCode} class="btn btn-success btn-lg fw-bold shadow-sm w-100 w-md-auto">
                        + Issue 6-Digit Code
                      </button>
                    </div>
                  </div>

                  {latestGeneratedCode.value && (
                    <div class="mt-3 p-3 bg-white rounded border text-center">
                      <span class="text-muted small d-block uppercase fw-bold">Active Issued Code</span>
                      <span class="display-4 font-monospace fw-bold text-success">{latestGeneratedCode.value}</span>
                      <p class="small text-muted mb-0 mt-1">Provide this code to the arriving staff member to complete their check-in.</p>
                    </div>
                  )}

                  {/* Issued Codes History Stream */}
                  {activeCodes.value.length > 0 && (
                    <div class="mt-3">
                      <p class="small fw-bold text-muted mb-2">Recent Issued Codes Log:</p>
                      <div class="d-flex flex-wrap gap-2">
                        {activeCodes.value.slice(0, 8).map(c => (
                          <span key={c.code} class={`badge ${c.used ? 'bg-secondary' : 'bg-success'} p-2 font-monospace`}>
                            {c.code} ({c.used ? 'Used' : 'Active'})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Department Management Panel - Super Admins */}
            {isSuperAdmin.value && (
              <div class="card border-0 shadow-sm mb-4">
                <div class="card-header bg-white py-3">
                  <h5 class="h6 mb-0 font-semibold">Manage Secretariat Departments</h5>
                </div>
                <div class="card-body">
                  <form onSubmit={handleAddDept} class="row g-2 mb-3">
                    <div class="col-12 col-md-9">
                      <input v-model={newDeptName.value} type="text" class="form-control" placeholder="Enter new department name..." />
                    </div>
                    <div class="col-12 col-md-3">
                      <button type="submit" class="btn btn-success w-100">+ Add Department</button>
                    </div>
                  </form>
                  <div class="d-flex flex-wrap gap-2">
                    {departments.value.map(dept => (
                      <span key={dept} class="badge bg-light text-dark border p-2 d-flex align-items-center gap-2">
                        {dept}
                        <button onClick={() => removeDepartment(dept)} class="btn-close btn-close-sm" style="font-size: 0.65rem;"></button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Header Controls */}
            <div class="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-3">
              <h2 class="h5 fw-bold text-secondary mb-0">
                Live Records {activeDepartmentScope.value && activeDepartmentScope.value !== 'all' ? `(${activeDepartmentScope.value})` : ''}
              </h2>
              <div class="d-flex flex-wrap gap-2">
                {(isSuperAdmin.value || isReceptionist.value) && (
                  <select v-model={selectedDepartmentFilter.value} class="form-select form-select-sm w-auto">
                    <option value="all">All Departments</option>
                    {departments.value.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                )}
                <ExportButton />
              </div>
            </div>

            <StatsOverview />
            <AttendanceTable />
          </div>
        )}
      </div>
    );
  }
});