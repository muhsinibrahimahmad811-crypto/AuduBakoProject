import { defineComponent, ref } from 'vue';
import { useAttendance } from '../composables/useAttendance';

export default defineComponent({
  name: 'KioskForm',
  setup() {
    const { addRecord } = useAttendance();
    const activeTab = ref('staff');

    const staffName = ref('');
    const staffId = ref('');
    const department = ref('Ministry of Works');

    const guestName = ref('');
    const guestPhone = ref('');
    const guestHost = ref('');
    const guestPurpose = ref('');

    const handleStaffSubmit = (e) => {
      e.preventDefault();
      if (!staffName.value || !staffId.value) return;
      addRecord({ type: 'staff', name: staffName.value, identifier: staffId.value, department: department.value });
      staffName.value = '';
      staffId.value = '';
      alert('Staff check-in logged successfully!');
    };

    const handleGuestSubmit = (e) => {
      e.preventDefault();
      if (!guestName.value || !guestPhone.value) return;
      addRecord({ type: 'guest', name: guestName.value, identifier: guestPhone.value, host: guestHost.value, department: department.value, purpose: guestPurpose.value });
      guestName.value = '';
      guestPhone.value = '';
      guestHost.value = '';
      guestPurpose.value = '';
      alert('Guest pass issued successfully!');
    };

    return () => (
      <div class="card shadow-sm mx-auto" style="max-width: 550px;">
        <div class="card-header bg-white pt-3 pb-0">
          <ul class="nav nav-tabs card-header-tabs">
            <li class="nav-item">
              <button 
                class={`nav-link ${activeTab.value === 'staff' ? 'active fw-bold' : 'text-success'}`}
                onClick={() => (activeTab.value = 'staff')}
              >
                Staff Check-In
              </button>
            </li>
            <li class="nav-item">
              <button 
                class={`nav-link ${activeTab.value === 'guest' ? 'active fw-bold' : 'text-success'}`}
                onClick={() => (activeTab.value = 'guest')}
              >
                Guest Pass
              </button>
            </li>
          </ul>
        </div>
        <div class="card-body p-4">
          {activeTab.value === 'staff' ? (
            <form onSubmit={handleStaffSubmit} class="vstack gap-3">
              <div>
                <label class="form-label fw-semibold">Full Name</label>
                <input v-model={staffName.value} required type="text" class="form-control" placeholder="e.g. Ibrahim Musa" />
              </div>
              <div>
                <label class="form-label fw-semibold">Staff ID Number</label>
                <input v-model={staffId.value} required type="text" class="form-control" placeholder="e.g. ABS-9012" />
              </div>
              <div>
                <label class="form-label fw-semibold">Ministry / Department</label>
                <select v-model={department.value} class="form-select">
                  <option>Ministry of Works</option>
                  <option>Ministry of Finance</option>
                  <option>Civil Service Commission</option>
                  <option>Ministry of Health</option>
                  <option>Receptionist</option>
                </select>
              </div>
              <button type="submit" class="btn btn-success w-100 mt-2">Log Staff Attendance</button>
            </form>
          ) : (
            <form onSubmit={handleGuestSubmit} class="vstack gap-3">
              <div>
                <label class="form-label fw-semibold">Visitor Full Name</label>
                <input v-model={guestName.value} required type="text" class="form-control" placeholder="e.g. Fatima Ali" />
              </div>
              <div>
                <label class="form-label fw-semibold">Phone Number</label>
                <input v-model={guestPhone.value} required type="tel" class="form-control" placeholder="e.g. 08012345678" />
              </div>
              <div>
                <label class="form-label fw-semibold">Host Officer / Dept</label>
                <input v-model={guestHost.value} required type="text" class="form-control" placeholder="e.g. Director of Finance" />
              </div>
              <div>
                <label class="form-label fw-semibold">Purpose of Visit</label>
                <input v-model={guestPurpose.value} required type="text" class="form-control" placeholder="e.g. Official Meeting" />
              </div>
              <button type="submit" class="btn btn-success w-100 mt-2">Issue Visitor Pass</button>
            </form>
          )}
        </div>
      </div>
    );
  }
});