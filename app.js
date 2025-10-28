// app.js (FINAL - Fetch ke /api/generate-pdf)

document.addEventListener('DOMContentLoaded', () => {
    // --- (UI Elements) ---
    const uploadForm = document.getElementById('uploadForm');
    const fileFollowersInput = document.getElementById('fileFollowers');
    const fileFollowingInput = document.getElementById('fileFollowing');
    const btnProcess = document.querySelector('.btn-process');
    const followersFileNameDisplay = document.getElementById('followersFileName');
    const followingFileNameDisplay = document.getElementById('followingFileName');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    // --- (Halaman & Tombol Navigasi) ---
    const uploadPage = document.querySelector('.upload-page');
    const resultsPage = document.querySelector('.results-page');
    const instructionPage = document.querySelector('.instruction-page'); // Halaman Instruksi
    const backButton = document.getElementById('backToUpload'); // Back dari Hasil
    const showInstructionsBtn = document.getElementById('showInstructionsBtn'); // Tombol ke Instruksi
    const backToUploadFromInstructionsBtn = document.getElementById('backToUploadFromInstructions'); // Back dari Instruksi

    // --- (Elemen Tema & Export) ---
    const themeToggle = document.getElementById('theme-toggle');
    let currentTheme = localStorage.getItem('theme') || 'light';
    const exportPdfButton = document.getElementById('exportPdfButton');

    let analysisResults = null; // Simpan hasil analisis

    // --- 1. LOGIKA TEMA & UI ---
    document.body.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'dark') themeToggle.checked = true;
    themeToggle.addEventListener('change', () => {
        currentTheme = themeToggle.checked ? 'dark' : 'light';
        document.body.setAttribute('data-theme', currentTheme);
        localStorage.setItem('theme', currentTheme);
     });

    // --- 2. LOGIKA NAVIGASI HALAMAN & UI FILE UPLOAD ---
    const showPage = (pageName) => {
        uploadPage.style.display = 'none';
        resultsPage.style.display = 'none';
        instructionPage.style.display = 'none'; // Sembunyikan halaman instruksi

        if (pageName === 'upload') {
            uploadPage.style.display = 'block';
        } else if (pageName === 'results') {
            resultsPage.style.display = 'block';
        } else if (pageName === 'instructions') { // Tampilkan halaman instruksi
            instructionPage.style.display = 'block';
        }
    };
    
    // Listeners Tombol Navigasi
    if(backButton) backButton.addEventListener('click', () => { showPage('upload'); });
    if(showInstructionsBtn) showInstructionsBtn.addEventListener('click', () => { showPage('instructions'); });
    if(backToUploadFromInstructionsBtn) backToUploadFromInstructionsBtn.addEventListener('click', () => { showPage('upload'); });


    const checkFiles = () => { btnProcess.disabled = !(fileFollowersInput.files.length > 0 && fileFollowingInput.files.length > 0); };
    const updateFileNameDisplay = (inputElement, displayElement) => {
        if (!displayElement) return;
        if (inputElement.files.length > 0) {
            displayElement.textContent = `File Terunggah: ${inputElement.files[0].name}`;
            displayElement.style.color = 'rgb(76, 175, 80)';
        } else {
            displayElement.textContent = 'Belum ada file dipilih';
            displayElement.style.color = '#888';
        }
        checkFiles();
     };
    fileFollowersInput.addEventListener('change', () => { updateFileNameDisplay(fileFollowersInput, followersFileNameDisplay); });
    fileFollowingInput.addEventListener('change', () => { updateFileNameDisplay(fileFollowingInput, followingFileNameDisplay); });
    checkFiles();

    // --- 3. LOGIKA TAB ---
    const switchTab = (tabId) => {
        tabContents.forEach(content => { content.style.display = 'none'; });
        tabButtons.forEach(button => { button.classList.remove('active'); });
        const activeContent = document.getElementById(tabId);
        if (activeContent) activeContent.style.display = 'block';
        const activeButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
        if (activeButton) activeButton.classList.add('active');
    };
    tabButtons.forEach(button => { button.addEventListener('click', (e) => { switchTab(e.currentTarget.dataset.tab); }); });


    // --- 4. LOGIKA PROSES DATA UTAMA ---
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault(); btnProcess.textContent = 'Memproses...'; btnProcess.disabled = true;
        const followersFile = fileFollowersInput.files[0]; const followingFile = fileFollowingInput.files[0];
        if (!followersFile || !followingFile) { alert("Pastikan kedua file (Followers dan Following) sudah dipilih."); btnProcess.textContent = 'Proses Analisis'; checkFiles(); return; }
        try {
            const followersData = await readFile(followersFile); const followingData = await readFile(followingFile);
            const rawFollowersList = extractUsernames(followersData, 'followers'); const rawFollowingList = extractUsernames(followingData, 'following');
            const followersList = [...new Set(rawFollowersList)]; const followingList = [...new Set(rawFollowingList)];
            if (followersList.length === 0 || followingList.length === 0) throw new Error("Gagal total. Daftar followers atau following kosong.");
            analysisResults = analyzeFollowers(followersList, followingList);
            updateResultsDisplay(analysisResults); showPage('results'); switchTab('tab-mutuals');
        } catch (error) { alert(`Gagal memproses data. (${error.message}). Pastikan Anda mengunggah file JSON yang benar.`); console.error("Processing Error:", error);
        } finally { btnProcess.textContent = 'Proses Analisis'; checkFiles(); }
     });

    // --- 5. EVENT LISTENER EXPORT PDF (Fetch ke Backend) ---
    if (exportPdfButton) {
        exportPdfButton.addEventListener('click', async () => {
            if (!analysisResults) { alert("Silakan proses data terlebih dahulu."); return; }

            exportPdfButton.textContent = "Generating PDF...";
            exportPdfButton.disabled = true;

            // Tentukan URL Backend
            // Saat tes lokal (via Live Server), gunakan URL lengkap
            // Saat di Vercel, gunakan path relatif
            const isLocal = window.location.hostname.includes('127.0.0.1') || window.location.hostname.includes('localhost');
            const backendUrl = isLocal ? 'http://localhost:3000/api/generate-pdf' : '/api/generate-pdf';
            
            console.log(`Sending export request to: ${backendUrl}`);

            try {
                const response = await fetch(backendUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ results: analysisResults, theme: currentTheme }),
                });

                if (!response.ok) {
                    let errorMsg = `Server error: ${response.status} ${response.statusText}`;
                    try {
                        const errorData = await response.json();
                        errorMsg = errorData.message || JSON.stringify(errorData);
                    } catch (e) { errorMsg = await response.text(); }
                    throw new Error(errorMsg || `HTTP error! status: ${response.status}`);
                }

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a'); a.style.display = 'none'; a.href = url;
                a.download = 'instagram-analysis-results.pdf'; document.body.appendChild(a); a.click();
                window.URL.revokeObjectURL(url); a.remove();

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

    // --- 6. FUNGSI PEMBANTU DATA ---
     const readFile = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try { const data = JSON.parse(event.target.result); resolve(data); }
                catch (e) { reject(new Error("File bukan format JSON yang valid.")); }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
     };
    const extractUsernames = (data, type) => {
        const usernames = []; let targetArray = null;
        if (type === 'following' && data.relationships_following) targetArray = data.relationships_following;
        else if (type === 'followers' && Array.isArray(data)) targetArray = data;
        if (Array.isArray(targetArray)) {
             targetArray.forEach(item => {
                let username = null;
                if (type === 'following' && item.title) username = item.title;
                else if (type === 'followers' && item.string_list_data && item.string_list_data.length > 0) username = item.string_list_data[0].value;
                if (username && username !== '__deleted__' && !username.startsWith('__deleted__')) {
                    let cleanedUsername = username.trim().replace(/[^\w\d._]/g, '');
                    if (cleanedUsername) usernames.push(cleanedUsername);
                }
            });
        }
        return usernames.map(u => u.toLowerCase());
     };
    const analyzeFollowers = (followers, following) => {
        const followersSet = new Set(followers); const followingSet = new Set(following);
        const mutuals = [], notFollowingBack = [], notFollowedByYou = [];
        for (const user of followingSet) { if (followersSet.has(user)) mutuals.push(user); else notFollowingBack.push(user); }
        for (const user of followersSet) { if (!followingSet.has(user)) notFollowedByYou.push(user); }
        return { mutuals: mutuals.sort(), notFollowingBack: notFollowingBack.sort(), notFollowedByYou: notFollowedByYou.sort() };
     };
    const updateResultsDisplay = (results) => {
         const mutualsCountElem = document.getElementById('mutualsCount');
         const nfbCountElem = document.getElementById('nfbCount');
         const nfbyCountElem = document.getElementById('nfbyCount');
         if (mutualsCountElem) mutualsCountElem.textContent = results.mutuals.length; else console.error("ID 'mutualsCount' not found!");
         if (nfbCountElem) nfbCountElem.textContent = results.notFollowingBack.length; else console.error("ID 'nfbCount' not found!");
         if (nfbyCountElem) nfbyCountElem.textContent = results.notFollowedByYou.length; else console.error("ID 'nfbyCount' not found!");
         // Gunakan selector yang benar untuk span di dalam tombol
         const tabMutualsCountElem = document.querySelector('.tab-button[data-tab="tab-mutuals"] span');
         const tabNfbCountElem = document.querySelector('.tab-button[data-tab="tab-nfb"] span');
         const tabNfbyCountElem = document.querySelector('.tab-button[data-tab="tab-nfby"] span');
         if (tabMutualsCountElem) tabMutualsCountElem.textContent = results.mutuals.length; else console.error("Span count for Mutuals tab not found!");
         if (tabNfbCountElem) tabNfbCountElem.textContent = results.notFollowingBack.length; else console.error("Span count for NFB tab not found!");
         if (tabNfbyCountElem) tabNfbyCountElem.textContent = results.notFollowedByYou.length; else console.error("Span count for NFBY tab not found!");
         populateTable('tableMutuals', results.mutuals);
         populateTable('tableNotFollowingBack', results.notFollowingBack);
         populateTable('tableNotFollowedByYou', results.notFollowedByYou);
     };
    const populateTable = (tableId, list) => {
        const tableBody = document.querySelector(`#${tableId} tbody`);
        if (!tableBody) { console.error(`Table body not found for ID: ${tableId}`); return; }
        tableBody.innerHTML = '';
        list.forEach((username, index) => {
            const row = tableBody.insertRow();
            const cellNo = row.insertCell(0);
            const cellUsername = row.insertCell(1);
            cellNo.textContent = index + 1;
            cellUsername.innerHTML = `<a href="https://www.instagram.com/${username}" target="_blank">@${username}</a>`;
        });
     };

}); // Akhir DOMContentLoaded