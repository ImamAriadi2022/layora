# Catatan Evaluasi & Rencana Pengembangan Selanjutnya (revisi.md)

Dokumen ini berisi rangkuman fitur yang telah diimplementasikan serta daftar prioritas pengembangan lanjutan (*backlog & enhancement plan*) untuk platform **Layora — AI Design Workspace**.

---

## 1. Rangkuman Implementasi Saat Ini

### A. Eksternal AI Agent Handoff (Antigravity Bridge)
- **Arsitektur File Exchange**:
  - `input_context.json`: Menyimpan konteks spesifikasi proyek, konfigurasi viewport, dan hasil inspeksi kode sumber lokal (`C:\programming\Dashboard-Monitoring-Udara\frontend`).
  - `design_output.json`: File target yang ditulis oleh Antigravity dan dipantau secara *real-time* oleh Layora Local Bridge Server (`http://127.0.0.1:3001`).
- **Alur Inisialisasi Baru**:
  - Setelah setup proyek selesai, alur langsung diarahkan ke **Antigravity Room** (bukan langsung mendesain dari template kosong).
  - Programmer menyalin prompt kontekstual dan menjalankannya langsung di IDE Antigravity.
  - Setiap perubahan yang disimpan Antigravity langsung divalidasi dan dirender otomatis ke kanvas tanpa salin-tempel manual.

### B. Arsitektur Multi-Frame Kesamping (Horizontal Artboard Flow)
- **1 Master Page dengan Banyak Frame Layar Berjejer**:
  - Menampilkan 4 layar aplikasi utama dari codebase referensi secara horizontal (*side-by-side*) dengan `gap: 64px` dan `viewport: 6200 × 2800 px` di atas *dark workbench background*.
  - **Frame 1 — Beranda (`LandingPage.jsx`)**: Navbar lengkap, Hero section (gauge skor 88, status kondisi baik & lancar, 3 pill metrik), Parameter & Tips Kesehatan Udara, Instrumen Sensor & Aktuator (DHT22, Anemometer, Relay), serta alur sistem & standar baku mutu.
  - **Frame 2 — Dashboard Telemetri (`DashboardPage.jsx`)**: Sidebar navigasi ruangan (`lab_td`, `lab_kom`, `h5`, `seminar`), status broker MQTT live, banner status kualitas udara & kipas 1,250 RPM, 3 kartu metrik, filter rentang waktu (3d, 7d, 30d), dan visualisasi tren sensor.
  - **Frame 3 — Admin Data Panel (`AdminPage.jsx`)**: 4 kartu diagnostik sistem, toolbar pencarian & filter ruangan, tabel log CRUD SQLite dengan aksi Edit & Hapus, serta modal input data baru.
  - **Frame 4 — Hub Dokumentasi & IoT (`DocsAllHubPage.jsx`)**: Ruang lingkup 3 parameter & 4 ruangan, peta komunikasi sistem 4 lapisan, dan 4 pilar dokumentasi (*Docs Arch*, *Docs IoT*, *Docs Backend*, *Docs VPS*).

### C. Standardisasi Visual & Ikonografi
- **Zero-Emoji Architecture**: Seluruh karakter emoji teks telah digantikan 100% menggunakan ikon vektor SVG standar (*Lucide / Feather paths*) yang dirender langsung via node `VECTOR` pada kanvas Layora.

---

## 2. Catatan Pengembangan & Hal-Hal yang Perlu Disempurnakan (Next Steps)

### A. Kanvas & Interaksi Multi-Artboard
- [ ] **Infinite Pan & Smooth Zooming**:
  - Optimasi navigasi mouse wheel (`Space + Drag` / middle click pan) untuk kanvas ultra-lebar (> 6000 px) agar perpindahan antar frame layar lebih instan dan mulus.
- [ ] **Seleksi & Pemindahan Posisi Frame Secara Bebas**:
  - Menambahkan kemampuan untuk memilih satu frame utuh di kanvas dan menggeser posisinya secara bebas (*drag-and-drop artboard repositioning*).
- [ ] **Artboard Snapping & Alignment Guides**:
  - Fitur smart magnetic guidelines saat menyusun beberapa frame layar secara horizontal maupun vertikal di kanvas.

### B. Kemampuan Render & Komponen Visual
- [ ] **Grafik Interaktif Dinamis (Charts)**:
  - Mengembangkan komponen node grafik SVG (*interactive line & area chart*) yang mendukung *hover tooltip* untuk menampilkan titik koordinat waktu dan nilai telemetri aktual.
- [ ] **State Komponen & Varian**:
  - Mendukung status komponen bawaan (*Hover*, *Active*, *Focus*, *Disabled*, dan *Loading skeleton*) agar preview prototype lebih interaktif.
- [ ] **Responsive Breakpoint Switcher per Frame**:
  - Menyediakan toggle ukuran per layar untuk melihat representasi Desktop (1440px), Tablet (768px), dan Mobile (375px).

### C. Alur Handoff Antigravity & AI Exchange
- [ ] **Dukungan WebSocket Bi-directional Sync**:
  - Mengintegrasikan komunikasi WebSocket penuh selain polling berbasis filesystem, sehingga perubahan dari IDE Antigravity terkirim secara *push-event* dalam hitungan milidetik.
- [ ] **Incremental Diff Patching (Pembaruan Parsial)**:
  - Memungkinkan Antigravity memperbarui hanya node atau section tertentu (misalnya hanya merevisi tombol atau mengganti satu card) tanpa harus menulis ulang seluruh dokumen schema 6000 baris.
- [ ] **Riwayat Versi Terhubung Git**:
  - Menyimpan setiap perubahan dari prompt Antigravity sebagai snapshot di Version History Layora yang dapat di-*rollback* sewaktu-waktu.

### D. Ekspor & Sinkronisasi Kode Balik
- [ ] **Export to Clean Code (JSX & Tailwind)**:
  - Menghasilkan kembali file komponen React JSX + Tailwind CSS yang bersih dan modular langsung dari elemen-elemen yang telah diedit di kanvas.
- [ ] **Sinkronisasi Figma Dua Arah**:
  - Memperluas fitur *Copy to Figma* agar mendukung ekspor multi-artboard sekaligus ke clipboard Figma.

---

*Catatan ini disusun sebagai panduan kerja tim dan roadmap pembaruan iterasi berikutnya.*
