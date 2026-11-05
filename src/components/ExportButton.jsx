import { defineComponent } from 'vue';
import { useAttendance } from '../composables/useAttendance';

export default defineComponent({
  name: 'ExportButton',
  setup() {
    const { filteredLogs } = useAttendance();

    const exportToCSV = () => {
      if (!filteredLogs.value.length) return alert('No records to export');

      const headers = ['Type', 'Name', 'Identifier/Phone', 'Department', 'Time In', 'Time Out', 'Status', 'Date'];
      const rows = filteredLogs.value.map(item => [
        item.type,
        `"${item.name}"`,
        `"${item.identifier}"`,
        `"${item.department || ''}"`,
        item.timeIn,
        item.timeOut || '',
        item.status,
        item.date
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `audu_bako_attendance_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return () => (
      <button onClick={exportToCSV} class="bg-gray-800 text-white text-sm px-4 py-2 rounded hover:bg-gray-900 flex items-center gap-2">
        📥 Export CSV Report
      </button>
    );
  }
});