function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('Input Data Ta\'awun')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const SHEET_DATA_NAME = "Data";
const SHEET_MASTER_NAME = "master";
const FOLDER_NAME = "Lampiran Taawun"; 

// --- 1. DATA DROPDOWN ---
function getDropdownData() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheetMaster = ss.getSheetByName(SHEET_MASTER_NAME);
  const lastRow = sheetMaster.getLastRow();
  if (lastRow < 2) return { names: [], typesIn: [], typesOut: [] };
  
  const data = sheetMaster.getRange(2, 4, lastRow - 1, 4).getValues(); 
  const names = [...new Set(data.map(r => r[0]).filter(String))]; 
  const typesIn = [...new Set(data.map(r => r[2]).filter(String))]; 
  const typesOut = [...new Set(data.map(r => r[3]).filter(String))]; 
  
  return { names, typesIn, typesOut };
}

// --- 2. FORMAT TANGGAL ---
function formatDateIndo(dateInput) {
  if (!dateInput) return "";
  if (dateInput instanceof Date) {
    const d = dateInput;
    const day = ('0' + d.getDate()).slice(-2);
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  if (typeof dateInput === 'string' && dateInput.includes('-')) {
    const parts = dateInput.split("-");
    return parts[2] + "/" + parts[1] + "/" + parts[0];
  }
  return dateInput;
}

// --- 3. PROSES SIMPAN DATA (LOCK SERVICE) ---
function processForm(formData) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); 
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheetData = ss.getSheetByName(SHEET_DATA_NAME);
    
    // Validasi Saldo
    const lastRowReal = sheetData.getLastRow();
    let currentBalance = 0;
    if (lastRowReal > 1) {
      const rangeValues = sheetData.getRange(2, 6, lastRowReal - 1, 2).getValues();
      let totalMasuk = 0;
      let totalKeluar = 0;
      for (let i = 0; i < rangeValues.length; i++) {
        totalMasuk += Number(rangeValues[i][0]) || 0; 
        totalKeluar += Number(rangeValues[i][1]) || 0; 
      }
      currentBalance = totalMasuk - totalKeluar;
    }

    if (formData.inOut === "OUT") {
      const requestNominal = Number(formData.nominal);
      if (requestNominal > currentBalance) {
        const saldoFormatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(currentBalance);
        return { success: false, message: "⛔ GAGAL: Saldo tidak mencukupi!\nSaldo saat ini: " + saldoFormatted };
      }
    }

    // Upload File
    let fileUrl = "";
    if (formData.fileData && formData.fileName) {
      const folder = getOrCreateFolder(FOLDER_NAME);
      const data = Utilities.base64Decode(formData.fileData);
      const blob = Utilities.newBlob(data, formData.mimeType, formData.fileName);
      const file = folder.createFile(blob);
      fileUrl = file.getUrl();
    }
    
    let debit = (formData.inOut === "IN") ? formData.nominal : "";
    let credit = (formData.inOut === "OUT") ? formData.nominal : "";
    
    const nextRow = sheetData.getLastRow() + 1;
    const newRow = [
      formatDateIndo(formData.periode),      
      formatDateIndo(formData.tglTransaksi), 
      formData.inOut,                        
      formData.jenis,                        
      formData.nama,                         
      debit,                                 
      credit,                                
      formData.deskripsi,                    
      fileUrl                                
    ];
    
    sheetData.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);
    SpreadsheetApp.flush();
    return { success: true, message: "✅ Data berhasil disimpan!" };
    
  } catch (e) {
    return { success: false, message: "Error System: " + e.toString() };
  } finally {
    lock.releaseLock(); 
  }
}

// --- 4. DATA DASHBOARD ---
function getDashboardData() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheetData = ss.getSheetByName(SHEET_DATA_NAME);
    const lastRow = sheetData.getLastRow();
    
    let response = {
      totalIn: 0, totalOut: 0, balance: 0, piutang: 0,
      utilization: { pinjaman: 0, kesehatan: 0 },
      history: [], rincianPiutang: []
    };
    
    if (lastRow < 2) return response; 
    
    const range = sheetData.getRange(2, 1, lastRow - 1, 8).getValues();
    let totalPinjamanKeluar = 0;
    let totalPinjamanKembali = 0;
    let saldoMember = {}; 

    range.forEach(row => {
      const arus = row[2];
      const jenis = row[3];
      const nama = row[4];
      const debit = Number(row[5]) || 0;
      const credit = Number(row[6]) || 0;
      
      response.totalIn += debit;
      response.totalOut += credit;
      
      // Logic Piutang
      if (jenis === 'Pinjaman 0%' && arus === 'OUT') {
        totalPinjamanKeluar += credit;
        if (!saldoMember[nama]) saldoMember[nama] = 0;
        saldoMember[nama] += credit;
      }
      if (jenis === 'Pengembalian Dana' && arus === 'IN') {
        totalPinjamanKembali += debit;
        if (!saldoMember[nama]) saldoMember[nama] = 0;
        saldoMember[nama] -= debit;
      }

      // Logic Pie Chart
      if (arus === 'OUT') {
        if (jenis === 'Pinjaman 0%') response.utilization.pinjaman += credit;
        else if (jenis === 'Kesehatan') response.utilization.kesehatan += credit;
      }
    });
    
    response.balance = response.totalIn - response.totalOut;
    response.piutang = totalPinjamanKeluar - totalPinjamanKembali;
    
    response.rincianPiutang = Object.keys(saldoMember).map(key => {
      return { nama: key, sisa: saldoMember[key] };
    }).filter(item => item.sisa > 0);
    response.rincianPiutang.sort((a, b) => b.sisa - a.sisa);

    const recentTx = range.slice().reverse().slice(0, 5);
    response.history = recentTx.map(row => {
      return {
        tgl: formatDateIndo(row[1]), 
        jenis: row[3] || "-",
        nama: row[4] || "Tanpa Nama",
        inOut: row[2],
        nominal: row[2] === 'IN' ? (Number(row[5]) || 0) : (Number(row[6]) || 0)
      };
    });
    
    return response;
  } catch (e) {
    return { error: true, message: e.toString() };
  }
}

// --- 5. GET SALDO HEADER ---
function getCurrentBalance() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheetData = ss.getSheetByName(SHEET_DATA_NAME);
  const lastRow = sheetData.getLastRow();
  if (lastRow < 2) return 0;
  const data = sheetData.getRange(2, 6, lastRow - 1, 2).getValues();
  let totalMasuk = 0;
  let totalKeluar = 0;
  for (let i = 0; i < data.length; i++) {
    totalMasuk += Number(data[i][0]) || 0;
    totalKeluar += Number(data[i][1]) || 0;
  }
  return totalMasuk - totalKeluar;
}

// --- 6. Helper: Get Folder ---
function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
}

// --- 7. (BARU) FITUR LAPORAN BULANAN (SEDEKAH RUTIN) ---
function getSedekahReport(targetMonth, targetYear) {
  // targetMonth: 1 (Jan) sampai 12 (Des)
  // targetYear: 2025, dst
  
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  // A. Ambil Data Master Anggota (Siapa yang wajib bayar)
  const sheetMaster = ss.getSheetByName(SHEET_MASTER_NAME);
  const lastRowMaster = sheetMaster.getLastRow();
  let allMembers = [];
  if (lastRowMaster >= 2) {
    // Ambil kolom D (Nama) dari Master
    const rawMembers = sheetMaster.getRange(2, 4, lastRowMaster - 1, 1).getValues();
    // Filter nama unik & tidak kosong
    allMembers = [...new Set(rawMembers.map(r => r[0]).filter(String))];
  }

  // B. Ambil Data Transaksi
  const sheetData = ss.getSheetByName(SHEET_DATA_NAME);
  const lastRowData = sheetData.getLastRow();
  let paidMembers = {}; // Menyimpan { "Budi": 50000 }

  if (lastRowData >= 2) {
    // Ambil Kolom A(Periode), C(InOut), D(Jenis), E(Nama), F(Debit)
    // Range A(1) sampai F(6)
    const transactions = sheetData.getRange(2, 1, lastRowData - 1, 6).getValues();

    transactions.forEach(row => {
      const periodeObj = row[0]; // Kolom A: Periode Ta'awwun (Date Object)
      const inOut = row[2];      // Kolom C
      const jenis = row[3];      // Kolom D
      const nama = row[4];       // Kolom E
      const nominal = row[5];    // Kolom F (Debit/Masuk)

      // Cek Validitas Tanggal
      if (periodeObj instanceof Date) {
        const tMonth = periodeObj.getMonth() + 1; // JS Month 0-11
        const tYear = periodeObj.getFullYear();

        // LOGIKA FILTER:
        // 1. Jenis = "Sedekah Rutin"
        // 2. Arus = "IN"
        // 3. Periode Bulan & Tahun COCOK dengan input User
        if (jenis === 'Sedekah Rutin' && inOut === 'IN' && tMonth == targetMonth && tYear == targetYear) {
          
          if (!paidMembers[nama]) paidMembers[nama] = 0;
          paidMembers[nama] += Number(nominal);
        }
      }
    });
  }

  // C. Bandingkan Master vs Transaksi
  let report = {
    paid: [],   // Sudah Bayar
    unpaid: []  // Belum Bayar
  };

  allMembers.forEach(member => {
    if (paidMembers[member]) {
      // Jika ada di daftar bayar
      report.paid.push({ nama: member, nominal: paidMembers[member] });
    } else {
      // Jika tidak ada
      report.unpaid.push({ nama: member });
    }
  });

  // Urutkan (Opsional)
  report.paid.sort((a, b) => a.nama.localeCompare(b.nama));
  report.unpaid.sort((a, b) => a.nama.localeCompare(b.nama));

  return report;
}
