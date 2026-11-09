import { ref, computed, onMounted } from 'vue';
import { supabase } from '../supabase';

const CURRENT_USER_KEY = 'audu_bako_current_user';

// Shared Reactive State
const logs = ref([]);
const users = ref([]);
const departments = ref([]);
const activeCodes = ref([]);
const loading = ref(false);

// Hydrate current user safely from localStorage session
const getStoredUser = () => {
  try {
    const item = localStorage.getItem(CURRENT_USER_KEY);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    console.error('Failed to restore current user:', e);
    return null;
  }
};

const currentUser = ref(getStoredUser());

export function useAttendance() {
  const searchQuery = ref('');
  const filterType = ref('all');
  const selectedDepartmentFilter = ref('all');
  const todayStr = new Date().toISOString().split('T')[0];

  // Helper: Persist current user session locally
  const setCurrentUser = (user) => {
    currentUser.value = user;
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  };

  // --- 1. DATA FETCHING (Supabase) ---
  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('*')
      .order('id', { ascending: false });
    if (!error && data) logs.value = data;
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('users').select('*');
    if (!error && data) users.value = data;
  };

  const fetchDepartments = async () => {
    const { data, error } = await supabase.from('departments').select('*');
    if (!error && data) {
      departments.value = data.map((d) => d.name);
    }
  };

  const fetchActiveCodes = async () => {
    const { data, error } = await supabase
      .from('active_codes')
      .select('*')
      .order('id', { ascending: false });
    if (!error && data) activeCodes.value = data;
  };

  const fetchAllData = async () => {
    loading.value = true;
    await Promise.all([
      fetchLogs(),
      fetchUsers(),
      fetchDepartments(),
      fetchActiveCodes()
    ]);
    loading.value = false;
  };

  // Auto-fetch data on component mount
  onMounted(() => {
    fetchAllData();
  });

  // --- 2. AUTHENTICATION & USER MANAGEMENT ---
  const registerUser = async (userData) => {
    // Check if username already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', userData.username)
      .single();

    if (existing) {
      alert('An account with this Staff ID / Username already exists.');
      return false;
    }

    const newUser = {
      id: Date.now().toString(),
      name: userData.name,
      username: userData.username,
      password: userData.password,
      department: userData.department,
      role: userData.role || 'staff',
      is_admin: userData.isAdmin || false,
      active: true
    };

    const { error } = await supabase.from('users').insert([newUser]);

    if (error) {
      alert(`Registration failed: ${error.message}`);
      return false;
    }

    // Map DB snake_case back to frontend camelCase for session state
    const sessionUser = {
      ...newUser,
      isAdmin: newUser.is_admin
    };

    users.value.push(sessionUser);
    setCurrentUser(sessionUser);
    return true;
  };

  const registerStaff = async (userData) => {
    const { data: existingUser, error: lookupError } = await supabase
      .from('users')
      .select('id')
      .eq('username', userData.username)
      .maybeSingle();

    if (lookupError) {
      alert(`Could not check Staff ID: ${lookupError.message}`);
      return false;
    }
    if (existingUser) {
      alert('An account with this Staff ID / Username already exists.');
      return false;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/?view=staff`,
        data: { username: userData.username }
      }
    });

    if (authError || !authData.user || authData.user.identities?.length === 0) {
      alert(`Registration failed: ${authError?.message || 'Could not create the account.'}`);
      return false;
    }

    const newUser = {
      id: Date.now().toString(),
      auth_user_id: authData.user.id,
      email: userData.email,
      email_verified: Boolean(authData.user.email_confirmed_at),
      name: userData.name,
      username: userData.username,
      password: null,
      department: userData.department,
      role: 'staff',
      is_admin: false,
      active: true
    };

    const { error: profileError } = await supabase.from('users').insert([newUser]);
    if (profileError) {
      alert(`Account was created, but the staff profile could not be saved: ${profileError.message}`);
      return false;
    }

    if (authData.session) {
      setCurrentUser({ ...newUser, isAdmin: false });
    } else {
      alert('Registration successful. Check your email to verify the account before signing in.');
    }
    return true;
  };

  const enrollStaffRecoveryEmail = async (email, password) => {
    if (!currentUser.value || currentUser.value.isAdmin) return false;

    const { data: legacyUser, error: validationError } = await supabase
      .from('users')
      .select('id, auth_user_id')
      .eq('id', currentUser.value.id)
      .eq('password', password)
      .maybeSingle();

    if (validationError || !legacyUser || legacyUser.auth_user_id) {
      alert(`Could not verify the current account: ${validationError?.message || 'Re-enter the current password and try again.'}`);
      return false;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/?view=staff`,
        data: { username: currentUser.value.username }
      }
    });

    if (authError || !authData.user || authData.user.identities?.length === 0) {
      alert(`Could not set up email recovery: ${authError?.message || 'That email may already be in use.'}`);
      return false;
    }

    const updates = {
      email,
      auth_user_id: authData.user.id,
      email_verified: Boolean(authData.user.email_confirmed_at),
      ...(authData.user.email_confirmed_at ? { password: null } : {})
    };
    const { error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', currentUser.value.id);

    if (updateError) {
      alert(`Email account created, but staff profile update failed: ${updateError.message}`);
      return false;
    }

    setCurrentUser({ ...currentUser.value, ...updates });
    if (!authData.session) {
      alert('Check your email and verify the address to enable password recovery.');
    } else {
      alert('Email recovery is ready for your account.');
    }
    return true;
  };

  const resendStaffRecoveryEmail = async () => {
    const email = currentUser.value?.email;
    if (!email || currentUser.value.email_verified) return false;

    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) {
      alert(`Could not resend the verification email: ${error.message}`);
      return false;
    }
    alert('A new verification email has been sent.');
    return true;
  };

  const markStaffEmailVerified = async (authUserId) => {
    const { error } = await supabase
      .from('users')
      .update({ email_verified: true, password: null })
      .eq('auth_user_id', authUserId);
    if (error) {
      console.error('Failed to update verified staff email:', error);
      alert(`Email verified, but the staff profile could not be updated: ${error.message}`);
      return false;
    }

    if (currentUser.value?.auth_user_id === authUserId) {
      setCurrentUser({ ...currentUser.value, email_verified: true, password: null });
    }
    return true;
  };

  const requestStaffPasswordReset = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/?view=staff&flow=recovery`
    });
    if (error) {
      alert(`Could not send the password reset email: ${error.message}`);
      return false;
    }
    return true;
  };

  const updateStaffPassword = async (password) => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      alert('Your password reset session has expired. Request a new reset email.');
      return false;
    }

    const { error: passwordError } = await supabase.auth.updateUser({ password });
    if (passwordError) {
      alert(`Could not update password: ${passwordError.message}`);
      return false;
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .update({ password: null })
      .eq('auth_user_id', authData.user.id)
      .select('id')
      .maybeSingle();
    if (profileError || !profile) {
      alert(`Password changed, but the linked staff profile could not be updated: ${profileError?.message || 'No profile was found.'}`);
      return false;
    }

    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      alert(`Password changed, but sign-out failed: ${signOutError.message}`);
      return false;
    }
    setCurrentUser(null);
    return true;
  };

  const loginUser = async (username, password, requiredRole = 'staff') => {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      alert(`Could not load account: ${error.message}`);
      return false;
    }
    if (!user) {
      alert('Invalid Staff ID/Username or Password.');
      return false;
    }

    if (user.active === false) {
      alert('Account Deactivated: Please contact your Secretariat Administrator.');
      return false;
    }

    if (requiredRole === 'admin' && !user.is_admin) {
      alert('Access Denied: Admin privileges required.');
      return false;
    }

    let authenticatedUser = user;
    if (user.auth_user_id && user.email) {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password
      });

      if (!authError && authData.user?.id && authData.user.id !== user.auth_user_id) {
        alert('This email is not linked to the requested staff account.');
        return false;
      }

      if (!authError && authData.user?.id === user.auth_user_id) {
        if (user.password !== null || !user.email_verified) {
          const { error: cleanupError } = await supabase
            .from('users')
            .update({ password: null, email_verified: true })
            .eq('id', user.id);
          if (cleanupError) {
            alert(`Signed in, but the legacy password could not be cleared: ${cleanupError.message}`);
          } else {
            authenticatedUser = { ...user, password: null, email_verified: true };
          }
        }
      } else if (
        authError?.code === 'email_not_confirmed' &&
        !user.email_verified &&
        user.password === password
      ) {
        authenticatedUser = user;
        alert('Verify the recovery email sent to your inbox before using email sign-in.');
      } else if (authError?.code === 'email_not_confirmed') {
        alert('Verify your email address before signing in.');
        return false;
      } else {
        alert('Invalid Staff ID/Username or Password.');
        return false;
      }
    } else if (user.password !== password) {
      alert('Invalid Staff ID/Username or Password.');
      return false;
    }

    const sessionUser = {
      ...authenticatedUser,
      isAdmin: authenticatedUser.is_admin
    };

    setCurrentUser(sessionUser);
    return true;
  };

  const completeBiometricLogin = (user, requiredRole = 'admin') => {
    if (!user || user.active === false) {
      alert('Account Deactivated: Please contact your Secretariat Administrator.');
      return false;
    }

    if (requiredRole === 'admin' && !user.is_admin) {
      alert('Access Denied: Admin privileges required.');
      return false;
    }

    setCurrentUser({
      ...user,
      isAdmin: user.is_admin
    });
    return true;
  };

  const logoutUser = () => {
    setCurrentUser(null);
  };

  const updateUser = async (userId, updatedFields) => {
    const dbPayload = {
      name: updatedFields.name,
      username: updatedFields.username,
      department: updatedFields.department,
      role: updatedFields.role,
      is_admin: updatedFields.isAdmin
    };

    const { error } = await supabase.from('users').update(dbPayload).eq('id', userId);

    if (error) {
      alert(`Update failed: ${error.message}`);
      return;
    }

    await fetchUsers();
    alert('User account updated successfully!');
  };

  const toggleUserStatus = async (userId) => {
    const target = users.value.find((u) => u.id === userId);
    if (!target) return;

    if (target.role === 'super_admin') {
      alert('Super Admin accounts cannot be deactivated.');
      return;
    }

    const newStatus = target.active === false;
    const { error } = await supabase
      .from('users')
      .update({ active: newStatus })
      .eq('id', userId);

    if (!error) {
      target.active = newStatus;
    }
  };

  // --- 3. RECEPTIONIST CODE DISPATCHER ---
  const generateVerificationCode = async () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const newCodeObj = {
      code,
      generated_by: currentUser.value?.name || 'Reception Desk',
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      used: false
    };

    const { data, error } = await supabase
      .from('active_codes')
      .insert([newCodeObj])
      .select()
      .single();

    if (!error && data) {
      activeCodes.value.unshift(data);
      return code;
    }
    return null;
  };

  const validateCode = async (inputCode) => {
    if (!inputCode) return false;

    // Check Supabase for an unused matching code
    const { data, error } = await supabase
      .from('active_codes')
      .select('*')
      .eq('code', inputCode.trim())
      .eq('used', false)
      .limit(1)
      .maybeSingle();

    if (error || !data) return false;

    // Mark code as used
    await supabase.from('active_codes').update({ used: true }).eq('id', data.id);
    await fetchActiveCodes();
    return true;
  };

  // --- 4. ATTENDANCE ACTIONS ---
  const addStaffCheckInWithCode = async (verificationCode) => {
    if (!currentUser.value) return false;

    const isValid = await validateCode(verificationCode);
    if (!isValid) {
      alert('Invalid or already used 6-digit verification code. Please request a new code from the Receptionist.');
      return false;
    }

    const newEntry = {
      id: Date.now().toString(),
      type: 'staff',
      name: currentUser.value.name || 'Staff Member',
      identifier: currentUser.value.username || 'ABS-0000',
      department: currentUser.value.department || 'General',
      time_in: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      time_out: null,
      status: 'Checked In',
      date: todayStr
    };

    const { error } = await supabase.from('attendance_logs').insert([newEntry]);

    if (error) {
      alert(`Check-in failed: ${error.message}`);
      return false;
    }

    await fetchLogs();
    alert('Verification successful! You are now checked in.');
    return true;
  };

  const checkOutStaffRecord = async (identifierParam = null) => {
    const targetIdentifier = identifierParam || currentUser.value?.username;
    if (!targetIdentifier) return;

    const activeRecord = logs.value.find(
      (l) => l.identifier === targetIdentifier && l.status === 'Checked In' && l.date === todayStr
    );

    if (!activeRecord) return;

    const timeOutStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const { error } = await supabase
      .from('attendance_logs')
      .update({ time_out: timeOutStr, status: 'Checked Out' })
      .eq('id', activeRecord.id);

    if (!error) {
      await fetchLogs();
    }
  };

  const addDepartment = async (deptName) => {
    if (!deptName.trim()) return;
    const { error } = await supabase.from('departments').insert([{ name: deptName.trim() }]);
    if (!error) await fetchDepartments();
  };

  const removeDepartment = async (deptName) => {
    const { error } = await supabase.from('departments').delete().eq('name', deptName);
    if (!error) await fetchDepartments();
  };

  // --- 5. SAFE COMPUTED PROPERTIES ---
  const isSuperAdmin = computed(() => currentUser.value?.role === 'super_admin');
  const isReceptionist = computed(() => currentUser.value?.department === 'Receptionist');

  const activeDepartmentScope = computed(() => {
    if (!currentUser.value || !currentUser.value.isAdmin) return null;
    if (isSuperAdmin.value || isReceptionist.value) return selectedDepartmentFilter.value;
    return currentUser.value.department || 'all';
  });

  const hasCheckedInToday = computed(() => {
    if (!currentUser.value || currentUser.value.isAdmin) return false;
    return logs.value.some(
      (l) => l.identifier === currentUser.value.username && l.date === todayStr
    );
  });

  const activeStaffSession = computed(() => {
    if (!currentUser.value || currentUser.value.isAdmin) return null;
    return logs.value.find(
      (l) => l.identifier === currentUser.value.username && l.status === 'Checked In' && l.date === todayStr
    );
  });

  const isTodaySessionCompleted = computed(() => {
    if (!currentUser.value || currentUser.value.isAdmin) return false;
    return logs.value.some(
      (l) => l.identifier === currentUser.value.username && l.status === 'Checked Out' && l.date === todayStr
    );
  });

  const staffHistory = computed(() => {
    if (!currentUser.value || currentUser.value.isAdmin) return [];
    return logs.value.filter((l) => l.identifier === currentUser.value.username);
  });

  const filteredLogs = computed(() => {
    const query = (searchQuery.value || '').toLowerCase();
    return logs.value.map(item => ({
      ...item,
      timeIn: item.time_in,
      timeOut: item.time_out
    })).filter((item) => {
      const matchesType = filterType.value === 'all' || item.type === filterType.value;
      const matchesSearch =
        (item.name || '').toLowerCase().includes(query) ||
        (item.identifier || '').toLowerCase().includes(query);
      const matchesDept =
        !activeDepartmentScope.value ||
        activeDepartmentScope.value === 'all' ||
        item.department === activeDepartmentScope.value;

      return matchesType && matchesSearch && matchesDept;
    });
  });

  const stats = computed(() => {
    const scopedLogs = logs.value.filter((item) => {
      if (!activeDepartmentScope.value || activeDepartmentScope.value === 'all') return true;
      return item.department === activeDepartmentScope.value;
    });

    return {
      total: scopedLogs.length,
      staffCount: scopedLogs.filter((l) => l.type === 'staff').length,
      guestCount: scopedLogs.filter((l) => l.type === 'guest').length,
      activeOnsite: scopedLogs.filter((l) => l.status === 'Checked In').length
    };
  });

  return {
    logs,
    users,
    currentUser,
    departments,
    activeCodes,
    loading,
    searchQuery,
    filterType,
    selectedDepartmentFilter,
    filteredLogs,
    stats,
    hasCheckedInToday,
    activeStaffSession,
    isTodaySessionCompleted,
    staffHistory,
    isSuperAdmin,
    isReceptionist,
    activeDepartmentScope,
    fetchAllData,
    registerUser,
    registerStaff,
    enrollStaffRecoveryEmail,
    resendStaffRecoveryEmail,
    markStaffEmailVerified,
    requestStaffPasswordReset,
    updateStaffPassword,
    loginUser,
    completeBiometricLogin,
    logoutUser,
    updateUser,
    toggleUserStatus,
    addDepartment,
    removeDepartment,
    generateVerificationCode,
    addStaffCheckInWithCode,
    checkOutStaffRecord
  };
}