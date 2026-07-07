# Setup Google Sheets Sync

1. Buat Google Sheets baru.
2. Buka menu `Extensions` > `Apps Script`.
3. Hapus isi file default, lalu tempel isi file `apps-script/Code.gs`.
4. Klik `Save`.
5. Klik `Deploy` > `New deployment`.
6. Pilih type `Web app`.
7. Isi:
   - Execute as: `Me`
   - Who has access: `Anyone`
8. Klik `Deploy`, lalu salin URL yang berakhir dengan `/exec`.
9. Buka `app.js`, tempel URL tersebut ke:

```js
const defaultScriptUrl = "PASTE_URL_EXEC_DI_SINI";
```

10. Upload ulang `index.html`, `styles.css`, `app.js`, dan folder `apps-script` ke GitHub.

Setelah itu website akan otomatis mengambil data dari Google Sheets saat dibuka. Tombol `Simpan ke Sheet` dapat dipakai untuk mengunggah data lokal yang sudah pernah diisi sebelumnya.
