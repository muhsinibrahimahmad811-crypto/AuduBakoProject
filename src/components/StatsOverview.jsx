import { defineComponent } from 'vue';
import { useAttendance } from '../composables/useAttendance';

export default defineComponent({
  name: 'StatsOverview',
  setup() {
    const { stats } = useAttendance();

    return () => (
      <div class="row g-2 g-md-3 mb-4">
        <div class="col-6 col-lg-3">
          <div class="card border-0 shadow-sm border-start border-primary border-4 h-100">
            <div class="card-body p-3">
              <span class="text-muted text-uppercase fs-7 fw-bold d-block">Total Visits</span>
              <h3 class="fw-bold mb-0 mt-1">{stats.value.total}</h3>
            </div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="card border-0 shadow-sm border-start border-success border-4 h-100">
            <div class="card-body p-3">
              <span class="text-muted text-uppercase fs-7 fw-bold d-block">Staff Logged</span>
              <h3 class="fw-bold mb-0 mt-1">{stats.value.staffCount}</h3>
            </div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="card border-0 shadow-sm border-start border-info border-4 h-100">
            <div class="card-body p-3">
              <span class="text-muted text-uppercase fs-7 fw-bold d-block">Guest Passes</span>
              <h3 class="fw-bold mb-0 mt-1">{stats.value.guestCount}</h3>
            </div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="card border-0 shadow-sm border-start border-warning border-4 h-100">
            <div class="card-body p-3">
              <span class="text-muted text-uppercase fs-7 fw-bold d-block">On-Site Now</span>
              <h3 class="fw-bold mb-0 mt-1">{stats.value.activeOnsite}</h3>
            </div>
          </div>
        </div>
      </div>
    );
  }
});