import { defineComponent, ref, computed } from 'vue';
import { useAttendance } from '../composables/useAttendance';

export default defineComponent({
  name: 'UserDirectory',
  setup() {
    const { users, departments, updateUser, toggleUserStatus } = useAttendance();

    const userSearch = ref('');
    const userRoleFilter = ref('all');

    // Edit Modal State
    const editingUser = ref(null);
    const editName = ref('');
    const editUsername = ref('');
    const editDepartment = ref('');
    const editRole = ref('dept_admin');

    const openEditModal = (user) => {
      editingUser.value = user;
      editName.value = user.name || '';
      editUsername.value = user.username || '';
      editDepartment.value = user.department || departments.value[0];
      editRole.value = user.role || (user.isAdmin ? 'dept_admin' : 'staff');
    };

    const handleSaveUser = (e) => {
      e.preventDefault();
      if (!editingUser.value) return;

      updateUser(editingUser.value.id, {
        name: editName.value,
        username: editUsername.value,
        department: editDepartment.value,
        role: editRole.value,
        isAdmin: editRole.value !== 'staff'
      });

      editingUser.value = null;
    };

    const filteredUsers = computed(() => {
      const q = userSearch.value.toLowerCase();
      return users.value.filter(u => {
        const matchesSearch = (u.name || '').toLowerCase().includes(q) || 
                              (u.username || '').toLowerCase().includes(q) ||
                              (u.department || '').toLowerCase().includes(q);
        const matchesRole = userRoleFilter.value === 'all' || 
                           (userRoleFilter.value === 'admin' ? u.isAdmin : !u.isAdmin);
        return matchesSearch && matchesRole;
      });
    });

    return () => (
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <h5 class="h6 mb-0 fw-bold text-dark">Registered Users Directory ({users.value.length})</h5>
          <div class="d-flex gap-2">
            <input
              v-model={userSearch.value}
              type="text"
              class="form-control form-control-sm"
              placeholder="Search user, ID, department..."
            />
            <select v-model={userRoleFilter.value} class="form-select form-select-sm w-auto">
              <option value="all">All Roles</option>
              <option value="staff">Staff Only</option>
              <option value="admin">Admins Only</option>
            </select>
          </div>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th>Account Type</th>
                  <th>Full Name</th>
                  <th>Staff ID / Username</th>
                  <th>Assigned Department</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.value.length === 0 ? (
                  <tr>
                    <td colspan="6" class="text-center py-4 text-muted">No registered accounts found.</td>
                  </tr>
                ) : (
                  filteredUsers.value.map(user => (
                    <tr key={user.id} class={user.active === false ? 'table-secondary text-muted' : ''}>
                      <td>
                        <span class={`badge ${user.isAdmin ? 'bg-dark' : 'bg-primary'}`}>
                          {user.isAdmin ? 'ADMINISTRATOR' : 'STAFF'}
                        </span>
                      </td>
                      <td class="fw-bold">{user.name}</td>
                      <td class="font-monospace">{user.username}</td>
                      <td>{user.department || 'Unassigned'}</td>
                      <td>
                        <span class={`badge ${user.active !== false ? 'bg-success' : 'bg-danger'}`}>
                          {user.active !== false ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td>
                        <div class="btn-group btn-group-sm">
                          <button
                            onClick={() => openEditModal(user)}
                            class="btn btn-outline-primary"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleUserStatus(user.id)}
                            class={`btn ${user.active !== false ? 'btn-outline-danger' : 'btn-outline-success'}`}
                          >
                            {user.active !== false ? 'Deactivate' : 'Reactivate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit User Modal */}
        {editingUser.value && (
          <div class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
            <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content">
                <div class="modal-header bg-dark text-white">
                  <h5 class="modal-title h6">Edit Account Details</h5>
                  <button type="button" class="btn-close btn-close-white" onClick={() => (editingUser.value = null)}></button>
                </div>
                <form onSubmit={handleSaveUser}>
                  <div class="modal-body vstack gap-3 py-4">
                    <div>
                      <label class="form-label fw-semibold">Full Name</label>
                      <input v-model={editName.value} required type="text" class="form-control" />
                    </div>
                    <div>
                      <label class="form-label fw-semibold">Staff ID / Username</label>
                      <input v-model={editUsername.value} required type="text" class="form-control" />
                    </div>
                    <div>
                      <label class="form-label fw-semibold">Role Level</label>
                      <select v-model={editRole.value} class="form-select">
                        <option value="staff">Standard Staff</option>
                        <option value="dept_admin">Department Administrator</option>
                        <option value="super_admin">Super Administrator</option>
                      </select>
                    </div>
                    <div>
                      <label class="form-label fw-semibold">Assigned Department</label>
                      <select v-model={editDepartment.value} class="form-select">
                        {departments.value.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div class="modal-footer">
                    <button type="button" class="btn btn-sm btn-secondary" onClick={() => (editingUser.value = null)}>Cancel</button>
                    <button type="submit" class="btn btn-sm btn-success">Save Changes</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
});