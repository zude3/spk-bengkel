/**
 * SPK Bengkel Terbaik - Metode SAW (Simple Additive Weighting)
 * ============================================================
 * Kriteria:
 *   C1 - Harga Servis          : COST    → min / nilai
 *   C2 - Kualitas Pelayanan    : BENEFIT → nilai / max
 *   C3 - Kelengkapan Peralatan : BENEFIT → nilai / max
 *   C4 - Jarak Lokasi          : COST    → min / nilai
 *   C5 - Waktu Pengerjaan      : COST    → min / nilai
 *
 * Bobot default (dari data kelompok 7):
 *   C1=0.2, C2=0.3, C3=0.25, C4=0.1, C5=0.15
 */

// ── Konfigurasi ──────────────────────────────────────────────
const API_URL = 'api/get_bengkel.php';
const LS_KEY  = 'spk_bengkel_weights_v2';

// Bobot default sesuai data (skala 1-10 untuk slider, akan dinormalisasi)
const DEFAULT_WEIGHTS = { c1: 4, c2: 6, c3: 5, c4: 2, c5: 3 };

// Definisi kriteria: label, tipe, ikon
const CRITERIA = {
    c1: { label: 'Harga Servis',           type: 'cost',    icon: '💰' },
    c2: { label: 'Kualitas Pelayanan',     type: 'benefit', icon: '⭐' },
    c3: { label: 'Kelengkapan Peralatan',  type: 'benefit', icon: '🔩' },
    c4: { label: 'Jarak Lokasi',           type: 'cost',    icon: '📍' },
    c5: { label: 'Waktu Pengerjaan',       type: 'cost',    icon: '⏱️' }
};

// Label keterangan berdasarkan ranking
const RANK_LABEL = {
    1: 'Sangat Direkomendasikan',
    2: 'Direkomendasikan',
    3: 'Direkomendasikan',
    4: 'Pertimbangkan',
    5: 'Opsi Terakhir'
};

// ── Fallback data (dipakai jika API tidak tersedia) ───────────
const FALLBACK_DATA = [
    { id:1, kode:'A1', nama:'San Motor PDG',      c1:2, c2:5, c3:4, c4:5, c5:4 },
    { id:2, kode:'A2', nama:'Mahkota Jaya Motor', c1:4, c2:4, c3:3, c4:4, c5:3 },
    { id:3, kode:'A3', nama:'Champion Motor',     c1:2, c2:5, c3:5, c4:5, c5:5 },
    { id:4, kode:'A4', nama:'Hengspeed',          c1:3, c2:4, c3:4, c4:2, c5:2 },
    { id:5, kode:'A5', nama:'Bengkel HaiMotor',   c1:5, c2:3, c3:3, c4:4, c5:3 }
];

// ── State ─────────────────────────────────────────────────────
let bengkelData = [];
let weights     = {};

// ── DOM refs ──────────────────────────────────────────────────
const slidersContainer = document.getElementById('sliders-container');
const totalWeightEl    = document.getElementById('total-weight');
const resetBtn         = document.getElementById('reset-btn');
const loadingEl        = document.getElementById('loading');
const errorEl          = document.getElementById('error-msg');
const resultsEl        = document.getElementById('results-section');
const topPickEl        = document.getElementById('top-pick');
const rankingBody      = document.getElementById('ranking-body');
const dataBody         = document.getElementById('data-body');

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadWeightsFromStorage();
    buildSliders();
    bindEvents();
    fetchBengkel();
});

// ── Local Storage ─────────────────────────────────────────────
function loadWeightsFromStorage() {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
        try { weights = JSON.parse(saved); }
        catch { weights = { ...DEFAULT_WEIGHTS }; }
    } else {
        weights = { ...DEFAULT_WEIGHTS };
    }
}

function saveWeightsToStorage() {
    localStorage.setItem(LS_KEY, JSON.stringify(weights));
}

// ── Build Sliders Dynamically ─────────────────────────────────
function buildSliders() {
    slidersContainer.innerHTML = Object.entries(CRITERIA).map(([key, cr]) => `
        <div class="slider-group">
            <div class="slider-label">
                <span>${cr.icon} ${cr.label}
                    <span class="badge ${cr.type}">${cr.type === 'cost' ? 'Cost' : 'Benefit'}</span>
                </span>
                <span class="slider-value" id="val-${key}">-</span>
            </div>
            <input type="range" id="w-${key}" min="1" max="10"
                   value="${weights[key] || 5}" class="slider" data-key="${key}" />
        </div>
    `).join('');
}

function bindEvents() {
    slidersContainer.addEventListener('input', e => {
        if (e.target.classList.contains('slider')) {
            const key = e.target.dataset.key;
            weights[key] = parseInt(e.target.value);
            updateWeightDisplay();
            saveWeightsToStorage();
            if (bengkelData.length > 0) renderResults();
        }
    });
    resetBtn.addEventListener('click', () => {
        weights = { ...DEFAULT_WEIGHTS };
        Object.keys(CRITERIA).forEach(key => {
            document.getElementById('w-' + key).value = weights[key];
        });
        updateWeightDisplay();
        saveWeightsToStorage();
        if (bengkelData.length > 0) renderResults();
    });
}

// ── Normalisasi Bobot ─────────────────────────────────────────
function getNormalizedWeights() {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    const norm  = {};
    Object.keys(weights).forEach(k => norm[k] = weights[k] / total);
    return norm;
}

function updateWeightDisplay() {
    const norm = getNormalizedWeights();
    Object.keys(CRITERIA).forEach(key => {
        const el = document.getElementById('val-' + key);
        if (el) el.textContent = Math.round(norm[key] * 100) + '%';
    });
    totalWeightEl.textContent = '100%';
}

// ── Fetch Data ────────────────────────────────────────────────
function fetchBengkel() {
    showLoading(true);
    hideError();

    fetch(API_URL)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
            return res.json();
        })
        .then(data => {
            if (!Array.isArray(data) || data.length === 0)
                throw new Error('Data kosong atau format tidak valid.');
            bengkelData = data;
            finishLoad();
        })
        .catch(err => {
            console.warn('API tidak tersedia, menggunakan data lokal:', err.message);
            bengkelData = FALLBACK_DATA;
            finishLoad();
        });
}

function finishLoad() {
    showLoading(false);
    updateWeightDisplay();
    renderDataTable();
    renderResults();
    resultsEl.classList.remove('hidden');
}

// ── SAW Calculation ───────────────────────────────────────────
/**
 * Langkah SAW:
 * 1. Cari max (benefit) dan min (cost) tiap kriteria
 * 2. Normalisasi matriks:
 *    - Benefit: r = nilai / max
 *    - Cost:    r = min / nilai
 * 3. Skor akhir: V = Σ (bobot_j × r_ij)
 * 4. Urutkan descending
 */
function calculateSAW(data) {
    const keys = Object.keys(CRITERIA);

    // Step 1: hitung max dan min tiap kriteria
    const stats = {};
    keys.forEach(k => {
        const vals = data.map(b => b[k]);
        stats[k] = { max: Math.max(...vals), min: Math.min(...vals) };
    });

    const norm = getNormalizedWeights();

    // Step 2 & 3: normalisasi + hitung skor
    const results = data.map(b => {
        const r = {}; // nilai normalisasi per kriteria
        const s = {}; // skor terbobot per kriteria
        let totalScore = 0;

        keys.forEach(k => {
            if (CRITERIA[k].type === 'benefit') {
                r[k] = b[k] / stats[k].max;
            } else {
                r[k] = stats[k].min / b[k];
            }
            s[k] = norm[k] * r[k];
            totalScore += s[k];
        });

        return { ...b, r, s, totalScore };
    });

    // Step 4: urutkan descending
    results.sort((a, b) => b.totalScore - a.totalScore);
    return results;
}

// ── Render ────────────────────────────────────────────────────
function renderResults() {
    const ranked = calculateSAW(bengkelData);
    renderTopPick(ranked[0]);
    renderRankingTable(ranked);
}

function renderTopPick(best) {
    const details = Object.entries(CRITERIA).map(([k, cr]) =>
        `<span class="top-pick-detail">${cr.icon} ${cr.label}: ${best[k]}</span>`
    ).join('');

    topPickEl.innerHTML = `
        <div class="top-pick-icon">🏆</div>
        <div>
            <div class="top-pick-label">Rekomendasi Terbaik</div>
            <div class="top-pick-name">${escHtml(best.nama)}
                <span class="top-pick-kode">(${best.kode})</span>
            </div>
            <div class="top-pick-score">Nilai Preferensi (V): ${best.totalScore.toFixed(4)}</div>
            <div class="top-pick-details">${details}</div>
        </div>
    `;
}

function renderRankingTable(ranked) {
    const maxScore = ranked[0].totalScore;
    const keys = Object.keys(CRITERIA);

    // Update thead dynamically
    const thead = document.querySelector('#ranking-table thead tr');
    thead.innerHTML = `
        <th>Rank</th>
        <th>Kode</th>
        <th>Nama Bengkel</th>
        ${keys.map(k => `<th title="${CRITERIA[k].label}">r(${k.toUpperCase()})</th>`).join('')}
        <th>Nilai V</th>
        <th>Keterangan</th>
    `;

    rankingBody.innerHTML = ranked.map((b, i) => {
        const rank = i + 1;
        const isTop = rank === 1;
        const pct = ((b.totalScore / maxScore) * 100).toFixed(1);
        const keterangan = RANK_LABEL[rank] || '-';

        const rCells = keys.map(k =>
            `<td class="sub-score">${b.r[k].toFixed(4)}</td>`
        ).join('');

        return `
        <tr class="${isTop ? 'rank-1' : ''}">
            <td>${rankBadge(rank)}</td>
            <td><strong>${escHtml(b.kode)}</strong></td>
            <td>${escHtml(b.nama)}</td>
            ${rCells}
            <td class="score-bar-cell">
                <div class="score-bar-wrap">
                    <div class="score-bar">
                        <div class="score-bar-fill ${isTop ? 'top' : ''}"
                             style="width:${pct}%"></div>
                    </div>
                    <span class="score-text ${isTop ? 'top' : ''}">${b.totalScore.toFixed(4)}</span>
                </div>
            </td>
            <td><span class="keterangan rank-${rank}">${keterangan}</span></td>
        </tr>`;
    }).join('');
}

function renderDataTable() {
    const keys = Object.keys(CRITERIA);

    // Update thead
    const thead = document.querySelector('#data-table thead tr');
    thead.innerHTML = `
        <th>Kode</th>
        <th>Nama Bengkel</th>
        ${keys.map(k =>
            `<th title="${CRITERIA[k].label}">${k.toUpperCase()}<br>
             <small class="badge ${CRITERIA[k].type}" style="margin:0">${CRITERIA[k].type}</small></th>`
        ).join('')}
    `;

    dataBody.innerHTML = bengkelData.map(b => `
        <tr>
            <td><strong>${escHtml(b.kode)}</strong></td>
            <td>${escHtml(b.nama)}</td>
            ${keys.map(k => `<td>${b[k]}</td>`).join('')}
        </tr>
    `).join('');
}

// ── UI Helpers ────────────────────────────────────────────────
function showLoading(show) { loadingEl.classList.toggle('hidden', !show); }
function showError(msg)    { errorEl.textContent = '⚠️ ' + msg; errorEl.classList.remove('hidden'); }
function hideError()       { errorEl.classList.add('hidden'); }

function rankBadge(rank) {
    const map = { 1: ['gold','🥇'], 2: ['silver','🥈'], 3: ['bronze','🥉'] };
    const [cls, icon] = map[rank] || ['normal', rank];
    return `<span class="rank-badge ${cls}">${icon}</span>`;
}

function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}
