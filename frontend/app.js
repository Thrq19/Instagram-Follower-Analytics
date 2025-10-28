// app.js (HAPUS KODE MUAT GAMBAR HEADER DARI EXPORT PDF)

document.addEventListener('DOMContentLoaded', () => {
    // --- (UI Elements, Halaman, Tombol - Tetap Sama) ---
    const uploadForm = document.getElementById('uploadForm');
    const fileFollowersInput = document.getElementById('fileFollowers');
    const fileFollowingInput = document.getElementById('fileFollowing');
    const btnProcess = document.querySelector('.btn-process');
    const followersFileNameDisplay = document.getElementById('followersFileName');
    const followingFileNameDisplay = document.getElementById('followingFileName');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const uploadPage = document.querySelector('.upload-page');
    const resultsPage = document.querySelector('.results-page');
    const backButton = document.getElementById('backToUpload');
    const themeToggle = document.getElementById('theme-toggle');
    let currentTheme = localStorage.getItem('theme') || 'light';
    const exportPdfButton = document.getElementById('exportPdfButton');
    // const pageHeader = document.querySelector('header'); // Tidak perlu lagi
    const themeToggleWrapper = document.querySelector('.header-toggle');

    let analysisResults = null; // Simpan hasil analisis

    // --- (Logika Tema Awal & Toggle Listener - Tetap Sama) ---
    document.body.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'dark') themeToggle.checked = true;
    themeToggle.addEventListener('change', () => {
        currentTheme = themeToggle.checked ? 'dark' : 'light';
        document.body.setAttribute('data-theme', currentTheme);
        localStorage.setItem('theme', currentTheme);
     });

    // --- (Logika Navigasi Halaman & UI File Upload - Tetap Sama) ---
     const showPage = (pageName) => { /* ... */ uploadPage.style.display = 'none'; resultsPage.style.display = 'none'; if (pageName === 'upload') uploadPage.style.display = 'block'; else if (pageName === 'results') resultsPage.style.display = 'block'; };
    backButton.addEventListener('click', () => { showPage('upload'); });
    const checkFiles = () => { /* ... */ btnProcess.disabled = !(fileFollowersInput.files.length > 0 && fileFollowingInput.files.length > 0); };
    const updateFileNameDisplay = (inputElement, displayElement) => { /* ... */ if (!displayElement) return; if (inputElement.files.length > 0) { displayElement.textContent = `File Terunggah: ${inputElement.files[0].name}`; displayElement.style.color = 'rgb(76, 175, 80)'; } else { displayElement.textContent = 'Belum ada file dipilih'; displayElement.style.color = '#888'; } checkFiles(); };
    fileFollowersInput.addEventListener('change', () => { updateFileNameDisplay(fileFollowersInput, followersFileNameDisplay); });
    fileFollowingInput.addEventListener('change', () => { updateFileNameDisplay(fileFollowingInput, followingFileNameDisplay); });
    checkFiles();

    // --- (Logika Tab - Tetap Sama) ---
    const switchTab = (tabId) => { /* ... */ tabContents.forEach(content => { content.style.display = 'none'; }); tabButtons.forEach(button => { button.classList.remove('active'); }); const activeContent = document.getElementById(tabId); if (activeContent) activeContent.style.display = 'block'; const activeButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`); if (activeButton) activeButton.classList.add('active'); };
    tabButtons.forEach(button => { button.addEventListener('click', (e) => { switchTab(e.currentTarget.dataset.tab); }); });

    // --- (Logika Proses Data Utama - Tetap Sama) ---
    uploadForm.addEventListener('submit', async (e) => { /* ... (kode sama) ... */
        e.preventDefault(); btnProcess.textContent = 'Memproses...'; btnProcess.disabled = true;
        const followersFile = fileFollowersInput.files[0]; const followingFile = fileFollowingInput.files[0];
        if (!followersFile || !followingFile) { alert("Pastikan kedua file (Followers dan Following) sudah dipilih."); btnProcess.textContent = 'Proses Analisis'; checkFiles(); return; }
        try {
            const followersData = await readFile(followersFile); const followingData = await readFile(followingFile);
            const rawFollowersList = extractUsernames(followersData, 'followers'); const rawFollowingList = extractUsernames(followingData, 'following');
            const followersList = [...new Set(rawFollowersList)]; const followingList = [...new Set(rawFollowingList)];
            if (followersList.length === 0 && followingList.length === 0) throw new Error("Gagal total. Kedua daftar (Followers dan Following) kosong.");
            if (followersList.length === 0) throw new Error(`Daftar Followers kosong (${followersList.length}). Cuma terdeteksi ${followingList.length} Following.`);
            if (followingList.length === 0) throw new Error(`Daftar Following kosong (${followingList.length}). Cuma terdeteksi ${followersList.length} Followers.`);
            analysisResults = analyzeFollowers(followersList, followingList); // Simpan hasil
            updateResultsDisplay(analysisResults); showPage('results'); switchTab('tab-mutuals');
        } catch (error) { alert(`Gagal memproses data. (${error.message}). Pastikan Anda mengunggah file JSON yang benar.`); console.error("Processing Error:", error);
        } finally { btnProcess.textContent = 'Proses Analisis'; checkFiles(); }
     });

    // --- 6. EVENT LISTENER EXPORT PDF (Fetch ke Backend - SUDAH BERSIH) ---
    if (exportPdfButton) {
        exportPdfButton.addEventListener('click', async () => {
            if (!analysisResults) {
                alert("Silakan proses data terlebih dahulu sebelum export.");
                return;
            }

            exportPdfButton.textContent = "Generating PDF...";
            exportPdfButton.disabled = true;

            try {
                // Kirim data ke backend
                const response = await fetch('http://localhost:3000/generate-pdf', { // URL backend
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        results: analysisResults, // Kirim hasil analisis
                        theme: currentTheme       // Kirim tema saat ini
                    }),
                });

                if (!response.ok) {
                    // Coba baca pesan error dari server
                    let errorMsg = `Server error: ${response.status} ${response.statusText}`;
                    try {
                        const errorData = await response.json();
                        errorMsg = errorData.message || JSON.stringify(errorData);
                    } catch (e) {
                         try { errorMsg = await response.text(); } catch (textErr) { console.error("Could not read error response body:", textErr) }
                    }
                    throw new Error(errorMsg || `HTTP error! status: ${response.status}`);
                }

                // Jika berhasil, backend kirim file PDF
                const blob = await response.blob();

                // Buat link download sementara
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = 'instagram-analysis-results.pdf';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();

            } catch (error) {
                console.error("Error exporting PDF:", error);
                alert(`Gagal membuat PDF: ${error.message || 'Unknown error'}`);
            } finally {
                exportPdfButton.textContent = "Export to PDF 📄";
                exportPdfButton.disabled = false;
            }
        });
    } else {
        console.warn("Export button not found.");
    }

    // --- 7. FUNGSI PEMBANTU DATA (Tidak Berubah) ---
     const readFile = (file) => { /* ... */ return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = (event) => { try { const data = JSON.parse(event.target.result); resolve(data); } catch (e) { reject(new Error("File bukan format JSON yang valid.")); } }; reader.onerror = (error) => reject(error); reader.readAsText(file); }); };
    const extractUsernames = (data, type) => { /* ... */ const usernames = []; let targetArray = null; if (type === 'following' && data.relationships_following) targetArray = data.relationships_following; else if (type === 'followers' && Array.isArray(data)) targetArray = data; if (Array.isArray(targetArray)) { targetArray.forEach(item => { let username = null; if (type === 'following' && item.title) username = item.title; else if (type === 'followers' && item.string_list_data && item.string_list_data.length > 0) username = item.string_list_data[0].value; if (username && username !== '__deleted__' && !username.startsWith('__deleted__')) { let cleanedUsername = username.trim().replace(/[^\w\d._]/g, ''); if (cleanedUsername) usernames.push(cleanedUsername); } }); } return usernames.map(u => u.toLowerCase()); };
    const analyzeFollowers = (followers, following) => { /* ... */ const followersSet = new Set(followers); const followingSet = new Set(following); const mutuals = [], notFollowingBack = [], notFollowedByYou = []; for (const user of followingSet) { if (followersSet.has(user)) mutuals.push(user); else notFollowingBack.push(user); } for (const user of followersSet) { if (!followingSet.has(user)) notFollowedByYou.push(user); } return { mutuals: mutuals.sort(), notFollowingBack: notFollowingBack.sort(), notFollowedByYou: notFollowedByYou.sort() }; };
    const updateResultsDisplay = (results) => { /* ... (Dengan null checks) ... */
         const mutualsCountElem = document.getElementById('mutualsCount'); const nfbCountElem = document.getElementById('nfbCount'); const nfbyCountElem = document.getElementById('nfbyCount');
         if (mutualsCountElem) mutualsCountElem.textContent = results.mutuals.length; else console.error("Element with ID 'mutualsCount' not found!");
         if (nfbCountElem) nfbCountElem.textContent = results.notFollowingBack.length; else console.error("Element with ID 'nfbCount' not found!");
         if (nfbyCountElem) nfbyCountElem.textContent = results.notFollowedByYou.length; else console.error("Element with ID 'nfbyCount' not found!");
         const tabMutualsCountElem = document.querySelector('.tab-button[data-tab="tab-mutuals"] span'); const tabNfbCountElem = document.querySelector('.tab-button[data-tab="tab-nfb"] span'); const tabNfbyCountElem = document.querySelector('.tab-button[data-tab="tab-nfby"] span');
         if (tabMutualsCountElem) tabMutualsCountElem.textContent = results.mutuals.length; else console.error("Span count for Mutuals tab not found!");
         if (tabNfbCountElem) tabNfbCountElem.textContent = results.notFollowingBack.length; else console.error("Span count for NFB tab not found!");
         if (tabNfbyCountElem) tabNfbyCountElem.textContent = results.notFollowedByYou.length; else console.error("Span count for NFBY tab not found!");
         populateTable('tableMutuals', results.mutuals); populateTable('tableNotFollowingBack', results.notFollowingBack); populateTable('tableNotFollowedByYou', results.notFollowedByYou);
     };
    const populateTable = (tableId, list) => { /* ... (Dengan null check tbody) ... */ const tableBody = document.querySelector(`#${tableId} tbody`); if (!tableBody) { console.error(`Table body not found for ID: ${tableId}`); return; } tableBody.innerHTML = ''; list.forEach((username, index) => { const row = tableBody.insertRow(); const cellNo = row.insertCell(0); const cellUsername = row.insertCell(1); cellNo.textContent = index + 1; cellUsername.innerHTML = `<a href="https://www.instagram.com/${username}" target="_blank">@${username}</a>`; }); };

}); // Akhir DOMContentLoaded