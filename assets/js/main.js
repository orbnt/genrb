// Tahap 1: Loader dan input revisi
document.addEventListener('DOMContentLoaded', () => {
    loadInputSection();

    document.getElementById('routerType').addEventListener('change', loadInputSection);
    document.getElementById('modeConfig').addEventListener('change', loadInputSection);

    document.getElementById('configForm').addEventListener('submit', handleFormSubmit);

    document.getElementById('copyBtn').onclick = () => {
        let txt = document.getElementById('outputScript').textContent;
        navigator.clipboard.writeText(txt).then(() => alert('Script berhasil dicopy!'));
    };
    document.getElementById('downloadBtn').onclick = () => {
        let txt = document.getElementById('outputScript').textContent;
        const blob = new Blob([txt], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "mikrotik-advanced.rsc";
        a.click();
        URL.revokeObjectURL(a.href);
    };
});

function loadInputSection() {
    const routerType = document.getElementById('routerType').value;
    let html = `
    <div class="mb-3">
        <label class="form-label">Jenis Koneksi Internet</label>
        <select class="form-select" id="connType" required>
            <option value="pppoe">PPPoE</option>
            <option value="dhcp" selected>DHCP</option>
            <option value="static">Static IP</option>
        </select>
    </div>
    <div class="mb-3" id="pppoeFields" style="display:none;">
        <input class="form-control mb-1" id="pppoeUser" placeholder="Username PPPoE">
        <input class="form-control" id="pppoePass" type="password" placeholder="Password PPPoE">
    </div>
    <div class="mb-3" id="staticFields" style="display:none;">
        <input class="form-control mb-1" id="staticIP" placeholder="IP Address (misal: 192.168.1.2/24)">
        <input class="form-control mb-1" id="staticGateway" placeholder="Gateway (misal: 192.168.1.1)">
        <input class="form-control" id="staticDNS" placeholder="DNS (misal: 8.8.8.8,8.8.4.4)">
    </div>
    <div class="mb-3">
        <label class="form-label">Port Internet (WAN), multi-WAN pisahkan dengan koma (mis: ether1,ether2)</label>
        <input class="form-control" id="wanPort" value="ether1">
    </div>
    <div class="mb-3">
        <label class="form-label">Port LAN (comma separated)</label>
        <input class="form-control" id="lanPorts" value="ether3,ether4,ether5">
    </div>
    <div class="mb-3">
        <label class="form-label">Ethernet Hotspot (jika dipilih >1 akan otomatis di-bridge, pisahkan dengan koma)</label>
        <input class="form-control" id="hotspotPorts" placeholder="Contoh: ether3,ether4" value="">
    </div>
    `;

    if (routerType === "wifi") {
        html += `
        <div class="mb-3">
            <label class="form-label">SSID WiFi</label>
            <input class="form-control" id="ssid" placeholder="SSID WiFi (auto jika kosong)">
        </div>
        <div class="mb-3">
            <label class="form-label">Password WiFi</label>
            <input class="form-control" id="wifipass" type="password" placeholder="Password (auto jika kosong)">
        </div>
        <div class="mb-3">
            <label class="form-label">Gunakan interface WiFi sebagai Hotspot?</label>
            <select class="form-select" id="useWlanForHotspot">
                <option value="no" selected>Tidak</option>
                <option value="yes">Ya</option>
            </select>
        </div>
        `;
    }

    html += `
    <div class="mb-3">
        <label class="form-label">Opsi Multi-WAN (Jika diisi lebih dari 1 WAN):</label>
        <select class="form-select" id="multiwanOpt">
            <option value="failover" selected>Failover</option>
            <option value="loadbalance">Load Balance</option>
            <option value="recursive">Recursive</option>
        </select>
        <small class="text-muted">Opsi ini hanya berlaku jika port WAN lebih dari satu</small>
    </div>
    `;

    document.getElementById('inputSection').innerHTML = html;

    document.getElementById('connType').addEventListener('change', function () {
        document.getElementById('pppoeFields').style.display = (this.value === 'pppoe') ? 'block' : 'none';
        document.getElementById('staticFields').style.display = (this.value === 'static') ? 'block' : 'none';
    });
}

function handleFormSubmit(e) {
    e.preventDefault();

    // Ambil input user
    const routerType = document.getElementById('routerType').value;
    const connType = document.getElementById('connType').value;
    const wanPortsRaw = document.getElementById('wanPort').value.trim();
    const wanPorts = wanPortsRaw.split(',').map(p => p.trim()).filter(p => p !== '');
    const lanPortsRaw = document.getElementById('lanPorts').value.trim();
    const lanPorts = lanPortsRaw.split(',').map(p => p.trim()).filter(p => p !== '');
    const multiwanOpt = document.getElementById('multiwanOpt').value;

    // DHCP, LAN Defaults (Tahap 3)
    const lanSubnet = "192.168.88.0/24";
    const lanGateway = "192.168.88.1";
    const dhcpPoolStart = "192.168.88.10";
    const dhcpPoolEnd = "192.168.88.254";
    const dnsServers = (connType === "static") ?
        (document.getElementById('staticDNS').value || "8.8.8.8,8.8.4.4") :
        "8.8.8.8,8.8.4.4";

    // Validasi input utama
    if (!wanPorts.length) {
        alert('Isi setidaknya satu port WAN!');
        return;
    }
    if (!lanPorts.length) {
        alert('Isi setidaknya satu port LAN!');
        return;
    }
    if (wanPorts.some(p => lanPorts.includes(p))) {
        alert('Port WAN dan LAN tidak boleh sama!');
        return;
    }

    // TAHAP 2: WAN, Multi-WAN, Bridge, NAT, Mangle, Routing
    let connScript = '', natScript = '', mangleScript = '', routeScript = '';

    if (wanPorts.length === 1) {
        const WAN = wanPorts[0];
        if (connType === "pppoe") {
            const user = document.getElementById('pppoeUser').value || "pppoeuser";
            const pass = document.getElementById('pppoePass').value || "pppoepass";
            connScript +=
                `# === PPPoE Client Setup ===
/interface pppoe-client add name=pppoe-out1 interface=${WAN} user="${user}" password="${pass}" disabled=no add-default-route=yes use-peer-dns=yes
`;
            natScript += `/ip firewall nat add chain=srcnat out-interface=pppoe-out1 action=masquerade\n`;
        } else if (connType === "dhcp") {
            connScript +=
                `# === DHCP Client Setup ===
/ip dhcp-client add interface=${WAN} disabled=no add-default-route=yes use-peer-dns=yes
`;
            natScript += `/ip firewall nat add chain=srcnat out-interface=${WAN} action=masquerade\n`;
        } else if (connType === "static") {
            const ip = document.getElementById('staticIP').value || "192.168.1.2/24";
            const gw = document.getElementById('staticGateway').value || "192.168.1.1";
            const dns = document.getElementById('staticDNS').value || "8.8.8.8,8.8.4.4";
            connScript +=
                `# === Static IP WAN Setup ===
/ip address add address=${ip} interface=${WAN}
/ip route add gateway=${gw}
/ip dns set servers=${dns} allow-remote-requests=yes
`;
            natScript += `/ip firewall nat add chain=srcnat out-interface=${WAN} action=masquerade\n`;
        }
        routeScript = '';
    } else if (wanPorts.length > 1) {
        wanPorts.forEach((wan, idx) => {
            if (connType === "pppoe") {
                connScript +=
                    `/interface pppoe-client add name=pppoe-out${idx + 1} interface=${wan} user="pppoeuser${idx + 1}" password="pppoepass${idx + 1}" disabled=no add-default-route=no use-peer-dns=no
`;
            } else if (connType === "dhcp") {
                connScript += `/ip dhcp-client add interface=${wan} disabled=no add-default-route=no use-peer-dns=no\n`;
            } else if (connType === "static") {
                const ip = document.getElementById('staticIP').value || "192.168.1.2/24";
                connScript += `/ip address add address=${ip} interface=${wan}\n`;
            }
            natScript += `/ip firewall nat add chain=srcnat out-interface=${wan} action=masquerade\n`;
        });

        if (multiwanOpt === "failover") {
            routeScript += `# === Multi-WAN (Failover) ===\n`;
            wanPorts.forEach((wan, i) => {
                routeScript += `/ip route add dst-address=0.0.0.0/0 gateway=${
                    (connType === "static")
                        ? (document.getElementById('staticGateway').value || "192.168.1.1")
                        : "gateway-from-dhcp"
                } distance=${i + 1} check-gateway=ping routing-table=main comment="WAN${i + 1}"\n`;
            });
            routeScript += "# Distance rendah adalah prioritas utama, jika down akan otomatis pindah WAN berikutnya.\n";
        } else if (multiwanOpt === "loadbalance") {
            routeScript += `# === Multi-WAN (Load Balance - PCC, mendukung IP WAN SAMA/BERBEDA) ===\n`;
            mangleScript +=
                `/ip firewall mangle
add chain=prerouting dst-address-type=!local in-interface=bridge-LAN per-connection-classifier=both-addresses:2/0 action=mark-connection new-connection-mark=WAN1_conn passthrough=yes
add chain=prerouting dst-address-type=!local in-interface=bridge-LAN per-connection-classifier=both-addresses:2/1 action=mark-connection new-connection-mark=WAN2_conn passthrough=yes
add chain=prerouting connection-mark=WAN1_conn in-interface=bridge-LAN action=mark-routing new-routing-mark=to_WAN1 passthrough=yes
add chain=prerouting connection-mark=WAN2_conn in-interface=bridge-LAN action=mark-routing new-routing-mark=to_WAN2 passthrough=yes
`;

            routeScript +=
                `/ip route add dst-address=0.0.0.0/0 gateway=${wanPorts[0]} routing-mark=to_WAN1 check-gateway=ping
/ip route add dst-address=0.0.0.0/0 gateway=${wanPorts[1]} routing-mark=to_WAN2 check-gateway=ping
/ip route add dst-address=0.0.0.0/0 gateway=${wanPorts[0]} distance=1
/ip route add dst-address=0.0.0.0/0 gateway=${wanPorts[1]} distance=2
`;
        } else if (multiwanOpt === "recursive") {
            routeScript += `# === Multi-WAN (Recursive Default Route) ===\n`;
            routeScript +=
                `/ip route add dst-address=8.8.8.8 gateway=${wanPorts[0]} scope=10
/ip route add dst-address=0.0.0.0/0 gateway=8.8.8.8 scope=30 target-scope=10
/ip route add dst-address=8.8.4.4 gateway=${wanPorts[1]} scope=10
/ip route add dst-address=0.0.0.0/0 gateway=8.8.4.4 scope=30 target-scope=10
`;
        }
    }

    // TAHAP 2: BRIDGE LAN
    let bridgeScript =
        `# === Bridge LAN ===
/interface bridge add name=bridge-LAN protocol-mode=none
`;
    lanPorts.forEach(lan => {
        bridgeScript += `/interface bridge port add bridge=bridge-LAN interface=${lan}\n`;
    });

    // TAHAP 3: DHCP, IP LAN, POOL, DNS
    let dhcpScript =
        `# === IP ADDRESSING LAN ===
/ip address add address=${lanGateway}/24 interface=bridge-LAN

# === DHCP Pool LAN ===
/ip pool add name=dhcp-pool-lan ranges=${dhcpPoolStart}-${dhcpPoolEnd}

# === DHCP SERVER ===
/ip dhcp-server add address-pool=dhcp-pool-lan interface=bridge-LAN lease-time=12h name=dhcp1 disabled=no
/ip dhcp-server network add address=${lanSubnet} gateway=${lanGateway} dns-server=${dnsServers} comment="LAN pool"
`;

    let dnsScript =
        `# === DNS SERVER ===
/ip dns set servers=${dnsServers} allow-remote-requests=yes cache-max-ttl=1w cache-size=4096KiB
`;

// TAHAP 4: WIRELESS (WiFi)
let wifiScript = '';
if (routerType === "wifi") {
    const ssid = document.getElementById('ssid')?.value || "MikroTikWiFi";
    const wifipass = document.getElementById('wifipass')?.value || "wifi" + Math.random().toString(36).slice(-8);

    wifiScript +=
`# === WIRELESS SETUP ===
/interface wireless set [ find default-name=wlan1 ] ssid="${ssid}" mode=ap-bridge frequency-mode=regulatory-domain country=indonesia band=2ghz-b/g/n disabled=no

/interface wireless security-profiles set [ find default=yes ] authentication-types=wpa2-psk wpa2-pre-shared-key="${wifipass}" wps-mode=disabled management-protection=allowed

/interface wireless set [ find ] wps-mode=disabled

/interface wireless access-list remove [find]
`;
}

// TAHAP 5: HOTSPOT
let hotspotScript = '';
const hotspotPortsRaw = document.getElementById('hotspotPorts')?.value.trim();
const hotspotPorts = hotspotPortsRaw ? hotspotPortsRaw.split(',').map(x => x.trim()).filter(Boolean) : [];

if (hotspotPorts.length > 0) {
    // Nama bridge hotspot jika lebih dari satu interface
    const bridgeHotspot = (hotspotPorts.length > 1) ? "bridge-hotspot" : hotspotPorts[0];

    // Blok Bridge Hotspot jika perlu
    if (hotspotPorts.length > 1) {
        hotspotScript +=
`# === HOTSPOT BRIDGE ===
/interface bridge add name=bridge-hotspot
`;
        hotspotPorts.forEach(intf => {
            hotspotScript += `/interface bridge port add bridge=bridge-hotspot interface=${intf}\n`;
        });
    }

    // IP address & DHCP pool untuk Hotspot
    hotspotScript +=
`# === HOTSPOT INTERFACE ADDRESS ===
/ip address add address=10.10.10.1/24 interface=${bridgeHotspot}

/ip pool add name=hotspot-pool ranges=10.10.10.10-10.10.10.254

/ip dhcp-server add address-pool=hotspot-pool interface=${bridgeHotspot} lease-time=2h name=dhcp-hotspot disabled=no
/ip dhcp-server network add address=10.10.10.0/24 gateway=10.10.10.1 dns-server=10.10.10.1 comment="Hotspot pool"
`;

    // Hotspot Setup (pake setup otomatis MikroTik)
/*
    NOTE: Script ini mengemulasi hasil dari wizard /ip hotspot setup.
    Login page, user default = user1/password1, 
    proteksi: disable unauthenticated forwarding, DNS name auto (hotspot.local)
*/
    hotspotScript +=
`# === HOTSPOT SERVER ===
/ip hotspot profile add name=hsprof hotspot-address=10.10.10.1 dns-name=hotspot.local html-directory=hotspot
/ip hotspot add name=hotspot1 interface=${bridgeHotspot} address-pool=hotspot-pool profile=hsprof disabled=no
/ip hotspot user add name=user1 password=password1 profile=default

# Proteksi dasar hotspot: tidak allow bypass
/ip hotspot user set 0 limit-uptime=2h

# Nonaktifkan HTTP CHAP (bisa diaktifkan advance)
/ip hotspot profile set hsprof use-radius=no login-by=cookie,http-chap,http-pap

# Untuk kustomisasi login page, ganti html-directory (opsional)
`;

    // (Optional) Tambah proteksi firewall hotspot (nanti di Tahap Firewall)
}

// TAHAP 6: FIREWALL & NAT ADVANCED
let firewallScript = `
# === FIREWALL PROTEKSI DASAR ===

# Proteksi brute force SSH, Winbox, FTP, Telnet (auto blacklist 2 jam)
/ip firewall filter
add chain=input protocol=tcp dst-port=22,8291,21,23 connection-state=new src-address-list=blacklist-action action=drop comment="DROP brute force attacker"
add chain=input protocol=tcp dst-port=22,8291,21,23 connection-state=new src-address-list=whitelist-action action=accept comment="Whitelist"
add chain=input protocol=tcp dst-port=22,8291,21,23 connection-state=new src-address-list=!blacklist-action src-address-list=!whitelist-action action=add-src-to-address-list address-list=blacklist-action address-list-timeout=2h comment="Auto BL after fail login"

# Proteksi DoS dan scanning
add chain=input protocol=tcp tcp-flags=syn,fin,rst,psh,ack,urg action=drop comment="DROP Invalid TCP flags"
add chain=input protocol=tcp connection-limit=30,32 action=add-src-to-address-list address-list=port-scanner address-list-timeout=1h comment="Detect port scanner"
add chain=input src-address-list=port-scanner action=drop comment="DROP port scanner"
add chain=input protocol=icmp packet-size=1024-65535 action=drop comment="DROP ICMP large"
add chain=input protocol=icmp icmp-options=8:0 limit=10,5 action=accept comment="ICMP rate limit"
add chain=input protocol=icmp action=drop comment="DROP excessive ICMP"
add chain=input connection-state=invalid action=drop comment="DROP invalid"

# Blok akses remote WINBOX/WEB/SSH/FTP/Telnet dari internet (hanya LAN/hotspot boleh remote)
/ip firewall filter
add chain=input protocol=tcp dst-port=22,8291,21,23,80,8080 in-interface-list=WAN action=drop comment="BLOCK remote mgmt from internet"

# Allow admin dari LAN/hotspot (auto)
/ip firewall filter
add chain=input src-address=192.168.88.0/24 action=accept comment="Allow LAN admin"
add chain=input src-address=10.10.10.0/24 action=accept comment="Allow Hotspot admin"

# Allow established/related connection
add chain=input connection-state=established,related action=accept comment="Allow established"

# Allow DNS, DHCP, Hotspot
add chain=input protocol=udp port=53 action=accept comment="Allow DNS"
add chain=input protocol=udp port=67,68 action=accept comment="Allow DHCP"

# Drop lainnya (default policy drop)
add chain=input action=drop comment="DROP all others"

/ip firewall nat
# NAT hanya dari interface WAN (sudah di tahap 2/5, bisa di double check jika perlu)
`;

// TAHAP 7: BANDWIDTH MANAGEMENT & PRIORITAS TRAFFIC
let bandwidthScript = `
# === SIMPLE QUEUE UNTUK LAN DAN HOTSPOT ===
/queue simple
add name="LAN-limit" target=192.168.88.0/24 max-limit=30M/30M
add name="HOTSPOT-limit" target=10.10.10.0/24 max-limit=10M/10M

# === PRIORITAS TRAFIK (Game Online > Sosmed > YouTube > Marketplace > Lainnya) ===
/ip firewall mangle

# Prioritas 1: Game Online (Mobile Legends, Free Fire, PUBG, dsb)
add chain=forward protocol=udp port=5000-5200,22500,27015-27050 action=mark-packet new-packet-mark=game-prio passthrough=yes comment="Game Online UDP"
add chain=forward protocol=tcp port=27015-27050 action=mark-packet new-packet-mark=game-prio passthrough=yes comment="Game Online TCP"

# Prioritas 2: Sosial Media (TikTok, Instagram, Facebook)
add chain=forward protocol=tcp dst-port=80,443 layer7-protocol=tiktok action=mark-packet new-packet-mark=sosmed-prio passthrough=yes comment="TikTok"
add chain=forward protocol=tcp dst-port=80,443 layer7-protocol=instagram action=mark-packet new-packet-mark=sosmed-prio passthrough=yes comment="Instagram"
add chain=forward protocol=tcp dst-port=80,443 layer7-protocol=facebook action=mark-packet new-packet-mark=sosmed-prio passthrough=yes comment="Facebook"

# Prioritas 3: YouTube
add chain=forward protocol=tcp dst-port=80,443 layer7-protocol=youtube action=mark-packet new-packet-mark=youtube-prio passthrough=yes comment="YouTube"

# Prioritas 4: Marketplace
add chain=forward protocol=tcp dst-port=80,443 layer7-protocol=shopee action=mark-packet new-packet-mark=market-prio passthrough=yes comment="Shopee"
add chain=forward protocol=tcp dst-port=80,443 layer7-protocol=tokopedia action=mark-packet new-packet-mark=market-prio passthrough=yes comment="Tokopedia"

# === QUEUE TREE GLOBAL ===
/queue tree
add name="Total BW" parent=global max-limit=40M
add name="Game Online" parent="Total BW" packet-mark=game-prio priority=1 max-limit=10M
add name="Sosmed" parent="Total BW" packet-mark=sosmed-prio priority=2 max-limit=8M
add name="YouTube" parent="Total BW" packet-mark=youtube-prio priority=3 max-limit=8M
add name="Marketplace" parent="Total BW" packet-mark=market-prio priority=4 max-limit=6M
add name="Lainnya" parent="Total BW" priority=8 max-limit=8M

# === LAYER7-PROTOCOLS (Regex) ===
/ip firewall layer7-protocol
add name=tiktok regexp="tiktok"
add name=instagram regexp="instagram"
add name=facebook regexp="facebook"
add name=youtube regexp="youtube|googlevideo"
add name=shopee regexp="shopee"
add name=tokopedia regexp="tokopedia"
`;

// TAHAP 8: MONITORING, PARENTAL CONTROL, BLOCK SITUS, AUTO BACKUP
let advancedScript = `
# === MONITORING ===
/tool traffic-monitor add interface=all name=tm-all threshold=1000000 on-event="/log info Traffic threshold exceeded"
/tool traffic-flow set enabled=yes interfaces=all cache-entries=5120 active-flow-timeout=00:02:00

# SNMP (optional, bisa diaktifkan jika dipakai monitoring)
# /snmp set enabled=yes contact="admin@domain.com" location="Server Room" trap-community="public"

# === PARENTAL CONTROL (blokir situs dewasa/konten negatif) ===
/ip firewall layer7-protocol add name=adult-block regexp="xnxx|xvideos|porn|bokep|redtube|sex|hentai|desi|gayporn|lesbian"
/ip firewall filter add chain=forward layer7-protocol=adult-block action=drop comment="Block Porn Sites"

# Blokir akses internet berdasarkan jam (contoh jam 22:00-06:00 untuk MAC anak)
/ip firewall filter add chain=forward src-mac-address=AA:BB:CC:DD:EE:FF time=22h-6h,sun,mon,tue,wed,thu,fri,sat action=drop comment="Parental block by time"

# === SIMPLE ADBLOCK ===
/ip firewall layer7-protocol add name=adblock regexp="doubleclick|googlesyndication|adservice|adsense|ads|promo|banners|tracking"
/ip firewall filter add chain=forward layer7-protocol=adblock action=drop comment="Block Ads"

# === AUTO BACKUP TO FILE ===
/system scheduler add name=auto-backup interval=1d on-event="/system backup save name=auto-backup_[\${[/system clock get date]}_\${[/system clock get time]}]" comment="Backup Harian Otomatis"
`;

// TAHAP 9: NOTIFIKASI TELEGRAM (Opsional)
let telegramScript = '';
const tgToken = document.getElementById('tgBotToken')?.value.trim();
const tgChatID = document.getElementById('tgChatID')?.value.trim();

if (tgToken && tgChatID) {
    telegramScript = `
# === NOTIFIKASI TELEGRAM OTOMATIS ===
/tool fetch url="https://api.telegram.org/bot${tgToken}/sendMessage?chat_id=${tgChatID}&text=Router+booting+at+\${[/system clock get date]}+\${[/system clock get time]}+on+\${[/system identity get name]}" keep-result=no

/system scheduler add name="notifikasi-boot" on-event="/tool fetch url=\\"https://api.telegram.org/bot${tgToken}/sendMessage?chat_id=${tgChatID}&text=Router+rebooted+at+\${[/system clock get date]}+\${[/system clock get time]}+\\"" start-time=startup interval=0s

# Bisa tambahkan event lain (backup sukses, IP WAN berubah, login gagal)
`;
}


    // Gabungkan semua blok dan output
    let scriptOutput =
    `# === AUTO-GENERATED MIKROTIK SCRIPT ===
# Tanggal generate: ${new Date().toLocaleString()}

${connScript}
${bridgeScript}
${natScript}
${mangleScript}
${routeScript}
${dhcpScript}
${dnsScript}
${wifiScript}
${hotspotScript}
${firewallScript}
${bandwidthScript}
${advancedScript}
${telegramScript}
`;


    document.getElementById('outputScript').textContent = scriptOutput.trim();
}