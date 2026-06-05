# README_URUTAN_PENGGUNAAN_CONTEXT_CBDC

Folder ini berisi context CBDC yang dipisah menjadi beberapa file TXT agar mudah dipakai oleh agentic AI coding seperti Codex, Antigravity, Cursor Agent, atau coding assistant lain.

Perubahan versi ini:
- File deskripsi sudah dipisah menjadi dua domain utama: Central Bank dan Wallet.
- Central Bank dipakai untuk membangun core moneter, ledger, supply, settlement, reserve, audit, dan governance.
- Wallet dipakai untuk membangun aplikasi user-facing seperti mobile banking/e-wallet komersial, tanpa mengklaim integrasi dengan BI, BCA, atau bank nyata.

Urutan baca yang disarankan:
1. 01_deskripsi_central_bank_context_cbdc.txt
2. 02_deskripsi_wallet_context_cbdc.txt
3. 03_fungsional_context_cbdc.txt
4. 04_aturan_pengerjaan_context_cbdc.txt
5. 05_aturan_keuangan_ledger_context_cbdc.txt
6. 06_pengembangan_arsitektur_context_cbdc.txt

Cara pakai:
- Masukkan semua file ke project root, misalnya folder /docs/context/.
- Saat menggunakan agent coding, berikan instruksi: "Baca semua file di /docs/context sebelum membuat kode. Mulai dari deskripsi Central Bank, lanjut deskripsi Wallet, lalu implementasikan fungsi sesuai aturan ledger dan arsitektur."
- Gunakan 01_deskripsi_central_bank_context_cbdc.txt sebagai sumber domain utama untuk modul CentralBank Core.
- Gunakan 02_deskripsi_wallet_context_cbdc.txt sebagai sumber domain utama untuk modul Wallet, UX, dan channel transaksi pengguna.
- Gunakan 05_aturan_keuangan_ledger_context_cbdc.txt sebagai sumber utama untuk semua mutasi saldo.
- Gunakan 06_pengembangan_arsitektur_context_cbdc.txt sebagai sumber utama saat membuat API, database schema, security, test case, dan roadmap.

Status:
- Academic/learning prototype.
- Bukan sistem finansial produksi.
- Tidak terhubung dengan BI, BCA, atau bank nyata.
- Dilarang menggunakan logo, merek, endpoint, data nasabah, atau klaim integrasi dengan institusi nyata.

Prinsip CBDC yang harus dipertahankan:
- Two-tier model: CentralBank Core mengelola uang dan settlement; Wallet/Provider mengelola UX dan channel transaksi.
- CentralBank Core adalah single source of truth untuk saldo dan ledger.
- Wallet tidak boleh menciptakan uang.
- Settlement final hanya sah setelah ledger CentralBank Core menulis debit/kredit yang seimbang.
- Default sistem adalah programmable payments, bukan programmable money.
- Fungibility dan singleness of money wajib dijaga: satu unit CBDC selalu sama nilainya dengan satu unit CBDC lain.
