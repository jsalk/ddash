"""Network modules: Network, Connections, Interfaces."""
import time

import psutil

from backend.modules import registry


@registry.register("network", "Network", "fa-network-wired", "network")
def collect_network() -> dict:
    n1 = psutil.net_io_counters()
    time.sleep(0.1)
    n2 = psutil.net_io_counters()
    dt = 0.1
    return {
        "rx_rate": int((n2.bytes_recv - n1.bytes_recv) / dt),
        "tx_rate": int((n2.bytes_sent - n1.bytes_sent) / dt),
        "rx_total": n2.bytes_recv,
        "tx_total": n2.bytes_sent,
    }


@registry.register("connections", "Connections", "fa-plug", "network")
def collect_connections() -> dict:
    conns = []
    for c in psutil.net_connections(kind="inet"):
        try:
            conns.append({
                "proto": "TCP" if c.type == 1 else "UDP",
                "laddr": f"{c.laddr.ip}:{c.laddr.port}" if c.laddr else "--",
                "raddr": f"{c.raddr.ip}:{c.raddr.port}" if c.raddr else "--",
                "status": c.status or "--",
            })
        except Exception:
            pass
    established = [c for c in conns if c["status"] == "ESTABLISHED"]
    others = [c for c in conns if c["status"] != "ESTABLISHED"]
    return {"connections": (established + others)[:30]}


@registry.register("ifaces", "Interfaces", "fa-ethernet", "network")
def collect_ifaces() -> dict:
    addrs = psutil.net_if_addrs()
    stats = psutil.net_if_stats()
    ifaces = []
    for name, addr_list in addrs.items():
        ips = []
        for a in addr_list:
            if a.family.name in ("AF_INET", "AF_INET6"):
                ips.append(a.address)
        s = stats.get(name)
        ifaces.append({
            "name": name,
            "ips": ips,
            "up": s.isup if s else False,
            "speed": s.speed if s else 0,
        })
    return {"interfaces": ifaces}
