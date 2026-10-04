import { recordingCSV, recordingText } from './recording-export-data.js';
import { runtime } from './runtime.js';
import { validateSessionFile } from './session-file-format.js';

export function downloadRecording(archive, format) {
    const recording = validateSessionFile(archive);
    const now = Date.now();
    const content = format === 'csv' ? recordingCSV(recording) : recordingText(recording, runtime.TIERSCOPE_VERSION, now);
    const blob = new Blob([content], {type: format === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = recording.room + '-' + (format === 'csv' ? 'history-' : 'recording-report-') + new Date(now).toISOString().replace(/[:.]/g, '-') + '.' + format;
    document.body.appendChild(link);
    try { link.click(); } finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); }
}
