import { defineComponent, ref } from 'vue';
import { useAttendance } from '../composables/useAttendance';

export default defineComponent({
  name: 'StaffPortal',
  setup() {
    const { 
      currentUser, 
      loginUser, 
      registerUser, 
      logoutUser, 
      departments,
      hasCheckedInToday,
      activeStaffSession,
      isTodaySessionCompleted,
      addStaffCheckInWithCode,
      checkOutStaffRecord,
      staffHistory 
    } = useAttendance();

    const isSignup = ref(false);
    const name = ref('');
    const staffId = ref('');
    const department = ref(departments.value[1] || 'Ministry of Finance');
    const password = ref('');

    // Modal state for 6-digit code
    const showCodeModal = ref(false);
    const inputCode = ref('');

    const handleAuth = (e) => {
      e.preventDefault();
      if (isSignup.value) {
        registerUser({ name: name.value, username: staffId.value, department: department.value, password: password.value, isAdmin: false });
      } else {
        loginUser(staffId.value, password.value, 'staff');
      }
    };

    const submitCodeCheckIn = (e) => {
      e.preventDefault();
      const success = addStaffCheckInWithCode(inputCode.value);
      if (success) {
        showCodeModal.value = false;
        inputCode.value = '';
      }
    };

    return () => (
      <div class="container-fluid max-w-4xl px-2 px-md-3">
        {!currentUser.value || currentUser.value.isAdmin ? (
          /* Auth Screen */
          <div class="card shadow-sm mx-auto" style="max-width: 450px;">
            <div class="card-header bg-white pt-3">
              <h3 class="h5 mb-0 font-semibold">{isSignup.value ? 'Staff Registration' : 'Staff Login'}</h3>
            </div>
            <div class="card-body p-3 p-md-4">
              <form onSubmit={handleAuth} class="vstack gap-3">
                {isSignup.value && (
                  <div>
                    <label class="form-label fw-semibold">Full Name</label>
                    <input v-model={name.value} required type="text" class="form-control" placeholder="e.g. Aliyu Usman" />
                  </div>
                )}
                <div>
                  <label class="form-label fw-semibold">Staff ID Number</label>
                  <input v-model={staffId.value} required type="text" class="form-control" placeholder="e.g. ABS-1029" />
                </div>
                {isSignup.value && (
                  <div>
                    <label class="form-label fw-semibold">Ministry / Department</label>
                    <select v-model={department.value} class="form-select">
                      {departments.value.filter(d => d !== 'Receptionist').map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label class="form-label fw-semibold">Password</label>
                  <input v-model={password.value} required type="password" class="form-control" placeholder="••••••••" />
                </div>
                <button type="submit" class="btn btn-success w-100 mt-2">
                  {isSignup.value ? 'Create Account' : 'Sign In'}
                </button>
              </form>
              <div class="text-center mt-3">
                <button class="btn btn-link btn-sm text-decoration-none" onClick={() => (isSignup.value = !isSignup.value)}>
                  {isSignup.value ? 'Already registered? Sign In' : "Don't have an account? Sign Up"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Staff Dashboard */
          <div>
            <div class="card border-0 shadow-sm mb-4">
              <div class="card-body d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3">
                <div>
                  <h4 class="h5 fw-bold mb-1">Welcome, {currentUser.value.name}</h4>
                  <p class="text-muted small mb-0">ID: <strong>{currentUser.value.username}</strong> | Dept: <strong>{currentUser.value.department}</strong></p>
                </div>
                <button onClick={logoutUser} class="btn btn-outline-danger btn-sm align-self-start align-self-sm-center">Log Out</button>
              </div>
            </div>

            {/* Status & Check-In Action */}
            <div class="card border-0 shadow-sm mb-4 text-center py-4">
              <div class="card-body">
                <h5 class="fw-bold mb-3">Today's Attendance Panel</h5>
                
                {activeStaffSession.value && (
                  <div>
                    <div class="badge bg-success fs-6 mb-3 px-3 py-2">Checked In Today At {activeStaffSession.value.timeIn}</div>
                    <div>
                      <button onClick={checkOutStaffRecord} class="btn btn-danger px-4">Log Check-Out Now</button>
                    </div>
                  </div>
                )}

                {isTodaySessionCompleted.value && (
                  <div>
                    <div class="badge bg-secondary fs-6 mb-2 px-3 py-2">Attendance Completed For Today</div>
                    <p class="text-muted small mb-0">You have already checked in and out for today.</p>
                  </div>
                )}

                {!hasCheckedInToday.value && (
                  <div>
                    <div class="badge bg-warning text-dark fs-6 mb-3 px-3 py-2">Not Checked In Today</div>
                    <div>
                      <button onClick={() => (showCodeModal.value = true)} class="btn btn-success px-4">
                        Log Daily Check-In
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* History Table */}
            <div class="card border-0 shadow-sm">
              <div class="card-header bg-white py-3">
                <h5 class="h6 mb-0 font-semibold">My Attendance History</h5>
              </div>
              <div class="card-body p-0">
                <div class="table-responsive">
                  <table class="table table-hover align-middle mb-0">
                    <thead class="table-light">
                      <tr>
                        <th>Date</th>
                        <th>Time In</th>
                        <th>Time Out</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffHistory.value.length === 0 ? (
                        <tr><td colspan="4" class="text-center py-4 text-muted">No attendance logs recorded yet.</td></tr>
                      ) : (
                        staffHistory.value.map(item => (
                          <tr key={item.id}>
                            <td>{item.date}</td>
                            <td>{item.timeIn}</td>
                            <td>{item.timeOut || <span class="text-muted">—</span>}</td>
                            <td>
                              <span class={`badge ${item.status === 'Checked In' ? 'bg-success' : 'bg-secondary'}`}>
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 6-Digit Code Verification Modal */}
            {showCodeModal.value && (
              <div class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
                <div class="modal-dialog modal-dialog-centered">
                  <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                      <h5 class="modal-title h6">Reception Verification Required</h5>
                      <button type="button" class="btn-close btn-close-white" onClick={() => (showCodeModal.value = false)}></button>
                    </div>
                    <form onSubmit={submitCodeCheckIn}>
                      <div class="modal-body py-4">
                        <p class="small text-muted mb-3">
                          Please obtain a <strong>6-digit pass code</strong> from the Receptionist at the entrance desk to verify your physical presence.
                        </p>
                        <div>
                          <label class="form-label fw-bold">Enter 6-Digit Code</label>
                          <input
                            v-model={inputCode.value}
                            required
                            maxlength="6"
                            pattern="[0-9]{6}"
                            type="text"
                            class="form-control form-control-lg text-center tracking-widest fw-bold"
                            placeholder="123456"
                          />
                        </div>
                      </div>
                      <div class="modal-footer">
                        <button type="button" class="btn btn-secondary btn-sm" onClick={() => (showCodeModal.value = false)}>Cancel</button>
                        <button type="submit" class="btn btn-success btn-sm">Confirm Check-In</button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
});