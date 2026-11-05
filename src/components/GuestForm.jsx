import { defineComponent, ref } from 'vue';
import { useAttendance } from '../composables/useAttendance';

export default defineComponent({
  name: 'GuestForm',
  setup() {
    const { addRecord, departments } = useAttendance();

    const guestName = ref('');
    const guestPhone = ref('');
    const guestHost = ref('');
    const department = ref('Ministry of Finance');
    const guestPurpose = ref('');

    const handleGuestSubmit = (e) => {
      e.preventDefault();
      if (!guestName.value || !guestPhone.value) return;
      addRecord({
        type: 'guest',
        name: guestName.value,
        identifier: guestPhone.value,
        host: guestHost.value,
        department: department.value,
        purpose: guestPurpose.value
      });
      guestName.value = '';
      guestPhone.value = '';
      guestHost.value = '';
      guestPurpose.value = '';
      alert('Guest pass issued successfully!');
    };

    return () => (
      <div class="card shadow-sm mx-auto" style="max-width: 500px;">
        <div class="card-header bg-white pt-3">
          <h3 class="h5 mb-0 font-semibold text-success">Guest Pass Registration</h3>
        </div>
        <div class="card-body p-4">
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
              <label class="form-label fw-semibold">Ministry / Department</label>
              <select v-model={department.value} class="form-select">
                {departments.value.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label class="form-label fw-semibold">Purpose of Visit</label>
              <input v-model={guestPurpose.value} required type="text" class="form-control" placeholder="e.g. Official Consultation" />
            </div>
            <button type="submit" class="btn btn-success w-100 mt-2">Issue Guest Pass</button>
          </form>
        </div>
      </div>
    );
  }
});
