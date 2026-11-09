import { defineComponent, ref } from 'vue';
import { useAttendance } from '../composables/useAttendance';
import { supabase } from '../supabase';

export default defineComponent({
  name: 'GuestForm',
  setup() {
    const { fetchAllData, departments } = useAttendance();

    const guestName = ref('');
    const guestHost = ref('');
    const department = ref('Ministry of Finance');
    const guestPurpose = ref('');

    const handleGuestSubmit = async (e) => {
      e.preventDefault();

      if (!guestName.value || !guestHost.value) {
        alert('Please complete all required guest fields.');
        return;
      }

      const newGuestRecord = {
        id: Date.now().toString(),
        type: 'guest',
        name: guestName.value,
        identifier: `GUEST-${Math.floor(100 + Math.random() * 900)}`,
        host: guestHost.value,
        department: department.value,
        purpose: guestPurpose.value,
        time_in: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        time_out: null,
        status: 'Checked In',
        date: new Date().toISOString().split('T')[0]
      };

      const { error } = await supabase.from('attendance_logs').insert([newGuestRecord]);

      if (error) {
        alert(`Guest Check-in Failed: ${error.message}`);
        return;
      }

      alert('Guest checked in successfully!');
      guestName.value = '';
      guestHost.value = '';
      guestPurpose.value = '';
      await fetchAllData();
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
