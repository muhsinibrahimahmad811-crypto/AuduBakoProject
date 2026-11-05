import { ref, computed } from 'vue';

const LOGS_KEY = 'audu_bako_attendance_logs';
const USERS_KEY = 'audu_bako_registered_users';
const CURRENT_USER_KEY = 'audu_bako_current_user';
const DEPARTMENTS_KEY = 'audu_bako_departments';
const ACTIVE_CODES_KEY = 'audu_bako_active_codes';

const defaultDepartments = [
  'Receptionist',
  'Ministry of Finance',
  'Ministry of Works',
  'Civil Service Commission',
  'Ministry of Health',
  'Ministry of Education'
];

const defaultLogs = [
  { id: '1', type: 'staff', name: 'Kabiru Adamu', identifier: 'ABS-4821', department: 'Ministry of Finance', timeIn: '08:15 AM', timeOut: null, status: 'Checked In', date: new Date().toISOString().split('T')[0] },
  { id: '2', type: 'guest', name: 'Amina Bello', identifier: '08031234567', host: 'Dir. Human Resources', department: 'Civil Service Commission', purpose: 'Official Consultation', timeIn: '09:30 AM', timeOut: null, status: 'Checked In', date: new Date().toISOString().split('T')[0] }
];

// Helper for safe JSON parsing
const getStored = (key, fallback) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.error(`Error loading key ${key} from storage:`, e);
    return fallback;
  }
};

const logs = ref(getStored(LOGS_KEY, defaultLogs));
const users = ref(getStored(USERS_KEY, []));
const currentUser = ref(getStored(CURRENT_USER_KEY, null));
const departments = ref(getStored(DEPARTMENTS_KEY, defaultDepartments));
const activeCodes = ref(getStored(ACTIVE_CODES_KEY, []));

const saveLogs = () => localStorage.setItem(LOGS_KEY, JSON.stringify(logs.value));
const saveUsers = () => localStorage.setItem(USERS_KEY, JSON.stringify(users.value));
const saveDepartments = () => localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(departments.value));
const saveCodes = () => localStorage.setItem(ACTIVE_CODES_KEY, JSON.stringify(activeCodes.value));

export function useAttendance() {
  const searchQuery = ref('');
  const filterType = ref('all');
  const selectedDepartmentFilter = ref('all');
  const todayStr = new Date().toISOString().split('T')[0];

  // Safe Role Computation (Prevents freeze on refresh)
  const isSuperAdmin = computed(() => currentUser.value?.role === 'super_admin');
  const isReceptionist = computed(() => currentUser.value?.department === 'Receptionist');

  const activeDepartmentScope = computed(() => {
    if (!currentUser.value || !currentUser.value.isAdmin) return null;
    if (isSuperAdmin.value || isReceptionist.value) return selectedDepartmentFilter.value;
    return currentUser.value.department || 'all';
  });

  const generateVerificationCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const newCodeObj = {
      code,
      generatedBy: currentUser.value?.name || 'Reception Desk',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      used: false
    };
    activeCodes.value.unshift(newCodeObj);
    saveCodes();
    return code;
  };

  const validateCode = (inputCode) => {
    if (!inputCode) return false;
    const target = activeCodes.value.find(c => c.code === inputCode.trim() && !c.used);
    if (!target) return false;
    target.used = true;
    saveCodes();
    return true;
  };

  const addStaffCheckInWithCode = (verificationCode) => {
    if (!currentUser.value) return false;

    if (!validateCode(verificationCode)) {
      alert('Invalid or already used 6-digit verification code. Please request a new code from the Receptionist.');
      return false;
    }

    const newEntry = {
      id: Date.now().toString(),
      type: 'staff',
      name: currentUser.value.name || 'Staff Member',
      identifier: currentUser.value.username || 'ABS-0000',
      department: currentUser.value.department || 'General',
      timeIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timeOut: null,
      status: 'Checked In',
      date: todayStr
    };
    logs.value.unshift(newEntry);
    saveLogs();
    alert('Verification successful! You are now checked in.');
    return true;
  };

  const logoutUser = () => {
    currentUser.value = null;
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  const registerUser = (userData) => {
    const existing = users.value.find(u => u.username === userData.username);
    if (existing) {
      alert('Account with this Staff ID / Username already exists.');
      return false;
    }
    const newUser = { id: Date.now().toString(), ...userData };
    users.value.push(newUser);
    saveUsers();
    currentUser.value = newUser;
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
    return true;
  };

  const updateUser = (userId, updatedFields) => {
    const userIndex = users.value.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      users.value[userIndex] = {
        ...users.value[userIndex],
        ...updatedFields
      };
      saveUsers();
      alert('User account updated successfully!');
    }
  };

  const toggleUserStatus = (userId) => {
    const target = users.value.find(u => u.id === userId);
    if (target) {
      if (target.role === 'super_admin') {
        alert('Super Admin accounts cannot be deactivated.');
        return;
      }
      target.active = target.active === false ? true : false;
      saveUsers();
    }
  };

  const loginUser = (username, password, requiredRole = 'staff') => {
    const user = users.value.find(u => u.username === username && u.password === password);
    if (!user) {
      alert('Invalid Staff ID/Username or Password.');
      return false;
    }

    if (user.active === false) {
      alert('Account Deactivated: Please contact your Secretariat Administrator.');
      return false;
    }

    if (requiredRole === 'admin' && !user.isAdmin) {
      alert('Access Denied: Admin privileges required.');
      return false;
    }
    currentUser.value = user;
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return true;
  };

  const hasCheckedInToday = computed(() => {
    if (!currentUser.value || currentUser.value.isAdmin) return false;
    return logs.value.some(l => l.identifier === currentUser.value.username && l.date === todayStr);
  });

  const activeStaffSession = computed(() => {
    if (!currentUser.value || currentUser.value.isAdmin) return null;
    return logs.value.find(l => l.identifier === currentUser.value.username && l.status === 'Checked In' && l.date === todayStr);
  });

  const isTodaySessionCompleted = computed(() => {
    if (!currentUser.value || currentUser.value.isAdmin) return false;
    return logs.value.some(l => l.identifier === currentUser.value.username && l.status === 'Checked Out' && l.date === todayStr);
  });

  const checkOutStaffRecord = () => {
    if (!activeStaffSession.value) return;
    activeStaffSession.value.timeOut = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    activeStaffSession.value.status = 'Checked Out';
    saveLogs();
  };

  const staffHistory = computed(() => {
    if (!currentUser.value || currentUser.value.isAdmin) return [];
    return logs.value.filter(l => l.identifier === currentUser.value.username);
  });

  const filteredLogs = computed(() => {
    const query = (searchQuery.value || '').toLowerCase();
    return logs.value.filter(item => {
      const matchesType = filterType.value === 'all' || item.type === filterType.value;
      const matchesSearch = (item.name || '').toLowerCase().includes(query) ||
                            (item.identifier || '').toLowerCase().includes(query);
      const matchesDept = !activeDepartmentScope.value || 
                          activeDepartmentScope.value === 'all' || 
                          item.department === activeDepartmentScope.value;

      return matchesType && matchesSearch && matchesDept;
    });
  });

  const stats = computed(() => {
    const scopedLogs = logs.value.filter(item => {
      if (!activeDepartmentScope.value || activeDepartmentScope.value === 'all') return true;
      return item.department === activeDepartmentScope.value;
    });

    return {
      total: scopedLogs.length,
      staffCount: scopedLogs.filter(l => l.type === 'staff').length,
      guestCount: scopedLogs.filter(l => l.type === 'guest').length,
      activeOnsite: scopedLogs.filter(l => l.status === 'Checked In').length
    };
  });

  return {
    logs,
    users,
    currentUser,
    departments,
    activeCodes,
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
    registerUser,
    loginUser,
    logoutUser,
    generateVerificationCode,
    addStaffCheckInWithCode,
    checkOutStaffRecord,
    updateUser,
    toggleUserStatus
  };
}