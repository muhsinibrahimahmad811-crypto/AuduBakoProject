import { defineComponent, onMounted, onUnmounted, ref } from 'vue';
import { useAttendance } from '../composables/useAttendance';
import { supabase } from '../supabase';

export default defineComponent({
  name: 'StaffPortal',
  setup() {
    const { 
      currentUser, 
      loginUser, 
      registerStaff,
      enrollStaffRecoveryEmail,
      resendStaffRecoveryEmail,
      markStaffEmailVerified,
      requestStaffPasswordReset,
      updateStaffPassword,
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
    const isForgotPassword = ref(false);
    const isPasswordRecovery = ref(
      new URLSearchParams(window.location.search).get('flow') === 'recovery'
    );
    const name = ref('');
    const staffId = ref('');
    const email = ref('');
    const department = ref(departments.value[1] || 'Ministry of Finance');
    const password = ref('');
    const showPassword = ref(false);
    const recoveryEmail = ref('');
    const recoveryPassword = ref('');
    const newPassword = ref('');
    const confirmNewPassword = ref('');
    const isProcessing = ref(false);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') isPasswordRecovery.value = true;
      if (
        (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') &&
        session?.user.id &&
        session.user.email_confirmed_at
      ) {
        setTimeout(() => {
          markStaffEmailVerified(session.user.id).catch((error) => {
            console.error('Failed to finish staff email verification:', error);
          });
        }, 0);
      }
    });

    onMounted(() => {
      if (new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery') {
        isPasswordRecovery.value = true;
      }
    });

    onUnmounted(() => subscription.unsubscribe());

    // Modal state for 6-digit code
    const showCodeModal = ref(false);
    const inputCode = ref('');

    const handleAuth = async (e) => {
      e.preventDefault();
      isProcessing.value = true;
      try {
        if (isSignup.value) {
          const registered = await registerStaff({
            name: name.value,
            username: staffId.value,
            email: email.value,
            department: department.value,
            password: password.value
          });
          if (registered) isSignup.value = false;
        } else {
          await loginUser(staffId.value, password.value, 'staff');
        }
      } catch (error) {
        alert(`Could not complete the request: ${error.message}`);
      } finally {
        isProcessing.value = false;
      }
    };

    const handlePasswordResetRequest = async (e) => {
      e.preventDefault();
      isProcessing.value = true;
      try {
        const sent = await requestStaffPasswordReset(recoveryEmail.value);
        if (sent) {
          alert('If an account uses that email, password reset instructions have been sent.');
          isForgotPassword.value = false;
          recoveryEmail.value = '';
        }
      } catch (error) {
        alert(`Could not send the password reset email: ${error.message}`);
      } finally {
        isProcessing.value = false;
      }
    };

    const handlePasswordReset = async (e) => {
      e.preventDefault();
      if (newPassword.value !== confirmNewPassword.value) {
        alert('The passwords do not match.');
        return;
      }
      if (newPassword.value.length < 8) {
        alert('Use a password with at least 8 characters.');
        return;
      }

      isProcessing.value = true;
      try {
        const updated = await updateStaffPassword(newPassword.value);
        if (updated) {
          isPasswordRecovery.value = false;
          newPassword.value = '';
          confirmNewPassword.value = '';
          window.history.replaceState(null, '', `${window.location.pathname}?view=staff`);
          alert('Password updated. Sign in with your new password.');
        }
      } catch (error) {
        alert(`Could not update your password: ${error.message}`);
      } finally {
        isProcessing.value = false;
      }
    };

    const handleRecoveryEnrollment = async (e) => {
      e.preventDefault();
      isProcessing.value = true;
      try {
        const enrolled = await enrollStaffRecoveryEmail(recoveryEmail.value, recoveryPassword.value);
        if (enrolled) {
          recoveryEmail.value = '';
          recoveryPassword.value = '';
        }
      } catch (error) {
        alert(`Could not set up email recovery: ${error.message}`);
      } finally {
        isProcessing.value = false;
      }
    };

    const handleResendVerificationEmail = async () => {
      isProcessing.value = true;
      try {
        await resendStaffRecoveryEmail();
      } catch (error) {
        alert(`Could not resend the verification email: ${error.message}`);
      } finally {
        isProcessing.value = false;
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
        {isPasswordRecovery.value ? (
          <div class="card shadow-sm mx-auto" style="max-width: 450px;">
            <div class="card-header bg-white pt-3">
              <h3 class="h5 mb-0 font-semibold">Reset Your Password</h3>
            </div>
            <div class="card-body p-3 p-md-4">
              <form onSubmit={handlePasswordReset} class="vstack gap-3">
                <div>
                  <label class="form-label fw-semibold">New Password</label>
                  <input
                    v-model={newPassword.value}
                    required
                    minlength="8"
                    type={showPassword.value ? 'text' : 'password'}
                    class="form-control"
                    autocomplete="new-password"
                  />
                </div>
                <div>
                  <label class="form-label fw-semibold">Confirm New Password</label>
                  <input
                    v-model={confirmNewPassword.value}
                    required
                    minlength="8"
                    type={showPassword.value ? 'text' : 'password'}
                    class="form-control"
                    autocomplete="new-password"
                  />
                </div>
                <button
                  type="button"
                  class="btn btn-link btn-sm align-self-start p-0 text-decoration-none"
                  onClick={() => (showPassword.value = !showPassword.value)}
                  aria-pressed={showPassword.value}
                >
                  {showPassword.value ? 'Hide passwords' : 'Show passwords'}
                </button>
                <button type="submit" class="btn btn-success w-100" disabled={isProcessing.value}>
                  {isProcessing.value ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>
        ) : !currentUser.value || currentUser.value.isAdmin ? (
          /* Auth Screen */
          <div class="card shadow-sm mx-auto" style="max-width: 450px;">
            <div class="card-header bg-white pt-3">
              <h3 class="h5 mb-0 font-semibold">
                {isForgotPassword.value ? 'Forgot Password' : isSignup.value ? 'Staff Registration' : 'Staff Login'}
              </h3>
            </div>
            <div class="card-body p-3 p-md-4">
              {isForgotPassword.value ? (
                <form onSubmit={handlePasswordResetRequest} class="vstack gap-3">
                  <div>
                    <label class="form-label fw-semibold">Email Address</label>
                    <input
                      v-model={recoveryEmail.value}
                      required
                      type="email"
                      class="form-control"
                      autocomplete="email"
                    />
                  </div>
                  <button type="submit" class="btn btn-success w-100" disabled={isProcessing.value}>
                    {isProcessing.value ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>
              ) : (
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
                    <>
                      <div>
                        <label class="form-label fw-semibold">Email Address</label>
                        <input v-model={email.value} required type="email" class="form-control" autocomplete="email" />
                      </div>
                      <div>
                        <label class="form-label fw-semibold">Ministry / Department</label>
                        <select v-model={department.value} class="form-select">
                          {departments.value.filter(d => d !== 'Receptionist').map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                  <div>
                    <label class="form-label fw-semibold">Password</label>
                    <div class="input-group">
                      <input
                        v-model={password.value}
                        required
                        minlength={isSignup.value ? 8 : undefined}
                        type={showPassword.value ? 'text' : 'password'}
                        class="form-control"
                        placeholder="••••••••"
                        autocomplete={isSignup.value ? 'new-password' : 'current-password'}
                      />
                      <button
                        type="button"
                        class="btn btn-outline-secondary"
                        onClick={() => (showPassword.value = !showPassword.value)}
                        aria-label={showPassword.value ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword.value}
                      >
                        <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                          {showPassword.value ? (
                            <>
                              <path d="M3 3l18 18" />
                              <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                              <path d="M9.9 5.2A10.8 10.8 0 0112 5c5 0 9 5 9 7a9.7 9.7 0 01-3 4.1" />
                              <path d="M6.2 6.2C3.9 7.6 2 10 2 12c0 2 4 7 10 7a10.5 10.5 0 004.1-.8" />
                            </>
                          ) : (
                            <>
                              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
                              <circle cx="12" cy="12" r="3" />
                            </>
                          )}
                        </svg>
                      </button>
                    </div>
                  </div>
                  <button type="submit" class="btn btn-success w-100 mt-2" disabled={isProcessing.value}>
                    {isProcessing.value ? 'Please wait...' : isSignup.value ? 'Create Account' : 'Sign In'}
                  </button>
                </form>
              )}
              <div class="text-center mt-3">
                {isForgotPassword.value ? (
                  <button class="btn btn-link btn-sm text-decoration-none" onClick={() => (isForgotPassword.value = false)}>
                    Back to Sign In
                  </button>
                ) : (
                  <>
                    {!isSignup.value && (
                      <button
                        class="btn btn-link btn-sm text-decoration-none d-block mx-auto"
                        onClick={() => (isForgotPassword.value = true)}
                      >
                        Forgot password?
                      </button>
                    )}
                    <button class="btn btn-link btn-sm text-decoration-none" onClick={() => (isSignup.value = !isSignup.value)}>
                      {isSignup.value ? 'Already registered? Sign In' : "Don't have an account? Sign Up"}
                    </button>
                  </>
                )}
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

            {!currentUser.value.auth_user_id ? (
              <div class="card border-0 shadow-sm mb-4 border-start border-warning border-4">
                <div class="card-body">
                  <h5 class="h6 fw-bold">Set Up Password Recovery</h5>
                  <p class="small text-muted">
                    Add and verify your email so you can reset your password if you lose access.
                  </p>
                  <form onSubmit={handleRecoveryEnrollment} class="row g-2">
                    <div class="col-12 col-md-5">
                      <input
                        v-model={recoveryEmail.value}
                        required
                        type="email"
                        class="form-control"
                        placeholder="Email address"
                        autocomplete="email"
                      />
                    </div>
                    <div class="col-12 col-md-5">
                      <input
                        v-model={recoveryPassword.value}
                        required
                        type={showPassword.value ? 'text' : 'password'}
                        class="form-control"
                        placeholder="Confirm your current password"
                        autocomplete="current-password"
                      />
                    </div>
                    <div class="col-12 col-md-2">
                      <button type="submit" class="btn btn-success w-100" disabled={isProcessing.value}>
                        {isProcessing.value ? 'Saving...' : 'Set Up'}
                      </button>
                    </div>
                  </form>
                  <button
                    type="button"
                    class="btn btn-link btn-sm p-0 mt-2 text-decoration-none"
                    onClick={() => (showPassword.value = !showPassword.value)}
                    aria-pressed={showPassword.value}
                  >
                    {showPassword.value ? 'Hide password' : 'Show password'}
                  </button>
                </div>
              </div>
            ) : !currentUser.value.email_verified ? (
              <div class="card border-0 shadow-sm mb-4 border-start border-warning border-4">
                <div class="card-body">
                  <h5 class="h6 fw-bold">Verify Your Recovery Email</h5>
                  <p class="small text-muted mb-2">
                    Check {currentUser.value.email} for the verification link. Verify it before relying on password recovery.
                  </p>
                  <button
                    type="button"
                    class="btn btn-outline-success btn-sm"
                    onClick={handleResendVerificationEmail}
                    disabled={isProcessing.value}
                  >
                    {isProcessing.value ? 'Sending...' : 'Resend Verification Email'}
                  </button>
                </div>
              </div>
            ) : null}

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