
export function downloadDataFile(value, filename) {
    const blob = new Blob([JSON.stringify(value)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = filename;
    document.body.appendChild(link);
    try { link.click(); } finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); }
}

export async function readDataFile(file, maxBytes) {
    if (!file || file.size > maxBytes) throw new Error('File is too large (maximum ' + Math.round(maxBytes / 1024 / 1024) + ' MB).');
    const text = await file.text();
    if (new Blob([text]).size > maxBytes) throw new Error('File is too large.');
    return JSON.parse(text.replace(/^\uFEFF/, ''));
}
