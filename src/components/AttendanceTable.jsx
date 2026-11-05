import { defineComponent, ref, computed } from 'vue';
import { useAttendance } from '../composables/useAttendance';

export default defineComponent({
  name: 'AttendanceTable',
  setup() {
    const { 
      filteredLogs, 
      searchQuery, 
      filterType, 
      selectedRecordForCheckout, 
      checkOutStaffRecord 
    } = useAttendance();

    const statusFilter = ref('all'); // 'all' or 'checked_in'

    const displayedLogs = computed(() => {
      return filteredLogs.value.filter(item => {
        if (statusFilter.value === 'checked_in') {
          return item.status === 'Checked In';
        }
        return true;
      });
    });

    return () => (
      <div class="card border-0 shadow-sm">
        <div class="card-body">
          {/* Controls & Quick Filter Tabs */}
          <div class="row g-3 mb-3 justify-content-between align-items-center">
            <div class="col-12 col-md-5">
              <input
                v-model={searchQuery.value}
                type="text"
                placeholder="Search by name or ID/Phone..."
                class="form-control"
              />
            </div>
            <div class="col-12 col-md-7 d-flex flex-wrap gap-2 justify-content-md-end">
              <div class="btn-group btn-group-sm">
                <button
                  class={`btn ${statusFilter.value === 'all' ? 'btn-success' : 'btn-outline-success'}`}
                  onClick={() => (statusFilter.value = 'all')}
                >
                  All Logs
                </button>
                <button
                  class={`btn ${statusFilter.value === 'checked_in' ? 'btn-success' : 'btn-outline-success'}`}
                  onClick={() => (statusFilter.value = 'checked_in')}
                >
                  🟢 Currently Checked-In ({filteredLogs.value.filter(l => l.status === 'Checked In').length})
                </button>
              </div>

              <select v-model={filterType.value} class="form-select form-select-sm w-auto">
                <option value="all">All Visitor Types</option>
                <option value="staff">Staff Only</option>
                <option value="guest">Guests Only</option>
              </select>
            </div>
          </div>

          {/* Attendance Log Table */}
          <div class="table-responsive">
            <table class="table table-hover align-middle">
              <thead class="table-light">
                <tr>
                  <th>Type</th>
                  <th>Name</th>
                  <th>ID / Contact</th>
                  <th>Department / Host</th>
                  <th>Time In</th>
                  <th>Time Out</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedLogs.value.length === 0 ? (
                  <tr>
                    <td colspan="8" class="text-center py-4 text-muted">No attendance records found matching your selection.</td>
                  </tr>
                ) : (
                  displayedLogs.value.map(item => (
                    <tr key={item.id}>
                      <td>
                        <span class={`badge ${item.type === 'staff' ? 'bg-success' : 'bg-info'}`}>
                          {item.type.toUpperCase()}
                        </span>
                      </td>
                      <td class="fw-semibold">{item.name}</td>
                      <td>{item.identifier}</td>
                      <td>{item.type === 'guest' ? `${item.host} (${item.department || 'N/A'})` : item.department}</td>
                      <td>{item.timeIn}</td>
                      <td>{item.timeOut || <span class="text-muted">—</span>}</td>
                      <td>
                        <span class={`badge ${item.status === 'Checked In' ? 'bg-success' : 'bg-secondary'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        {item.status === 'Checked In' && (
                          <button
                            onClick={() => checkOutStaffRecord(item.identifier)}
                            class="btn btn-sm btn-outline-danger"
                          >
                            Check Out
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
});