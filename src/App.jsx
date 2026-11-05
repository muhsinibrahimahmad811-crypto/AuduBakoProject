import { defineComponent, onMounted, ref } from 'vue';
import HomeView from './components/HomeView';
import StaffPortal from './components/StaffPortal';
import GuestForm from './components/GuestForm';
import AdminPortal from './components/AdminPortal';
import { supabase } from './supabase';

export default defineComponent({
  name: 'App',
  setup() {
    const view = ref('home'); // 'home', 'staff', 'guest', or 'admin'
    const dbStatus = ref('Connecting to Supabase...');

    onMounted(async () => {
      const { data, error } = await supabase.from('departments').select('count');
      if (error) {
        dbStatus.value = `❌ Connection Error: ${error.message}`;
      } else {
        dbStatus.value = '✅ Connected to Supabase Database!';
      }
    });

    return () => (
      <div class="min-vh-100 bg-light font-sans text-dark">
        <div class="alert alert-info text-center m-3 mb-0">{dbStatus.value}</div>

        <header class="bg-success text-white py-3 shadow-sm mb-4">
          <div class="container d-flex justify-content-between align-items-center">
            <div class="cursor-pointer" onClick={() => (view.value = 'home')}>
              <h1 class="h4 mb-0 fw-bold">AUDU BAKO SECRETARIAT</h1>
              <p class="small mb-0 text-warning">Kano State Civil Service Portal</p>
            </div>
            <div class="btn-group">
              <button
                class={`btn btn-sm ${view.value === 'home' ? 'btn-light fw-bold text-success' : 'btn-outline-light'}`}
                onClick={() => (view.value = 'home')}
              >
                Home
              </button>
              <button
                class={`btn btn-sm ${view.value === 'staff' ? 'btn-light fw-bold text-success' : 'btn-outline-light'}`}
                onClick={() => (view.value = 'staff')}
              >
                Staff Portal
              </button>
              <button
                class={`btn btn-sm ${view.value === 'guest' ? 'btn-light fw-bold text-success' : 'btn-outline-light'}`}
                onClick={() => (view.value = 'guest')}
              >
                Guest Entry
              </button>
              <button
                class={`btn btn-sm ${view.value === 'admin' ? 'btn-light fw-bold text-success' : 'btn-outline-light'}`}
                onClick={() => (view.value = 'admin')}
              >
                Admin Desk
              </button>
            </div>
          </div>
        </header>

        <main class="container pb-5">
          {view.value === 'home' && <HomeView onNavigate={(targetView) => (view.value = targetView)} />}
          {view.value === 'staff' && <StaffPortal />}
          {view.value === 'guest' && <GuestForm />}
          {view.value === 'admin' && <AdminPortal onNavigate={(targetView) => (view.value = targetView)} />}
        </main>
      </div>
    );
  }
});