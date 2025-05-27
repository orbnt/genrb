# MikroTik Script Generator PRO

Aplikasi web **generator script konfigurasi MikroTik** otomatis, dari dasar sampai advance, siap pakai dan powerful.  
Bisa digunakan untuk konfigurasi routerboard baru, RT/RW Net, sekolah, kantor, UMKM, atau pribadi.  
**Tidak perlu install apapun!**  
Cukup isi form, klik generate, dan salin script ke terminal MikroTik Anda.

---

## ✨ **Fitur Unggulan**
- Pilihan konfigurasi minimal (recommended) dan advanced (custom/manual).
- Dukungan **multi-WAN** (failover, load-balance, recursive).
- Konfigurasi LAN & DHCP otomatis.
- **Setup Wireless/WiFi** dan Hotspot (bisa multi-interface).
- Firewall & NAT **proteksi tingkat lanjut** (anti brute force, DoS, remote access, dsb).
- **Bandwidth Management** (Simple Queue, Queue Tree, Prioritas Traffic Game, Sosmed, YouTube, Marketplace, dst).
- **Parental Control** & Adblock (blokir situs dewasa, iklan, dsb).
- **Monitoring & Backup otomatis** (traffic monitor, traffic-flow, auto backup .backup).
- Siap fitur **notifikasi Telegram** (opsional, tinggal isi token & chat id).

---

## 🚀 **Cara Penggunaan**
1. **Buka** file `index.html` di browser (PC atau HP).
2. Isi semua field sesuai kebutuhan jaringan Anda (port WAN/LAN, WiFi, Hotspot, dll).
3. Klik **Generate Script**.
4. Salin hasil script ke clipboard **atau** download file `.rsc`.
5. **Paste script** ke terminal MikroTik Anda (Winbox, WebFig, Telnet, SSH, dst).

---

## 📁 **Struktur Folder/File**

/project-folder
│
├── index.html # Tampilan web form & output script
├── main.js # Seluruh logic generator script Mikrotik (multi tahap)
├── style.css # (Opsional, custom styling tambahan)
└── README.md # Dokumentasi aplikasi


> Sudah include Bootstrap CDN untuk tampilan responsif.  
> **Tidak perlu backend/server.**

---

## ⚡️ **Fitur Tambahan/Advanced (Opsional)**
- **Notifikasi Telegram**:  
  Isi Token & Chat ID, router auto kirim notifikasi ke Telegram setiap boot/restart.
- **Auto Backup**:  
  File backup otomatis tersimpan tiap hari.
- **Monitoring Traffic**:  
  Sudah siap untuk The Dude, ntop, Grafana, SNMP (aktifkan jika perlu).
- **Import/export template config** _(fitur opsional, bisa dikembangkan sendiri)_.

---

## ❓ **FAQ & Catatan**

- **Apakah aplikasi ini bisa untuk semua seri MikroTik?**  
  Bisa! Script otomatis menyesuaikan tipe (dengan/atau tanpa WiFi/wlan).
- **Apakah bisa diakses dari HP?**  
  Ya, tampilan sudah responsif, bisa digunakan dari browser HP maupun PC.
- **Apakah aman untuk pemula?**  
  Sangat aman, script output sudah best-practice dan minim risiko.
- **Apa yang perlu diperhatikan sebelum apply script?**  
  - Selalu backup konfigurasi lama sebelum menjalankan script baru!
  - Pastikan port interface yang diisi sesuai fisik router Anda.
  - Untuk parental control, isikan MAC address anak sesuai device aslinya.
- **Bisa di-custom lebih lanjut?**  
  Sangat bisa. Tinggal edit `main.js` untuk fitur, limit, port, blokir situs, dsb.

---

## 💡 **Kontribusi dan Lisensi**
Boleh di-clone, modifikasi, dan sebarkan ulang.  
Jika ingin berkontribusi, silakan pull request untuk perbaikan atau fitur baru.  
**Lisensi: MIT** _(bebas digunakan untuk kebutuhan komersial atau non-komersial)_

---

## 📬 **Kontak & Diskusi**
Punya ide fitur lain? Temui bug/error?  
Silakan buka issue di repo ini atau hubungi developer.

---

**Selamat menggunakan dan semoga bermanfaat untuk jaringan Anda!**

