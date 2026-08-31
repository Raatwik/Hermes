#!/usr/bin/env python3
"""
DIH — Digital Twin Full Stack Launcher
Cross-platform (Linux / macOS / Windows). Requires Python 3.9+.

Starts all five services, prints clickable localhost links, and tears
everything down on Ctrl+C.

Usage:
    python run/start.py
    python run/start.py --speed 50       # sim publisher playback speed
    python run/start.py --backend-port 9000
"""

import argparse
import os
import shutil
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT_DIR / "frontend"

RESET = "\033[0m"
BOLD = "\033[1m"
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
DIM = "\033[2m"


def colored(text: str, code: str) -> str:
    if not sys.stdout.isatty():
        return text
    return f"{code}{text}{RESET}"


def port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) == 0


def free_port(port: int, label: str) -> None:
    """Kill whatever is occupying a port so the new service can bind."""
    if not port_in_use(port):
        return
    print(f"  {colored('!', YELLOW)} Port {port} ({label}) is in use — freeing it...")
    if sys.platform == "win32":
        subprocess.run(
            f'for /f "tokens=5" %a in (\'netstat -aon ^| findstr :{port}\') do taskkill /PID %a /F',
            shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
    else:
        subprocess.run(
            ["fuser", "-k", f"{port}/tcp"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
    time.sleep(1)


def banner(backend_port: int, frontend_port: int) -> None:
    print()
    print(colored("=" * 56, CYAN))
    print(colored("   DIH — Digital Twin Full Stack", BOLD + CYAN))
    print(colored("=" * 56, CYAN))
    print()
    print(f"   {colored('Frontend', GREEN)}     →  {colored(f'http://localhost:{frontend_port}', BOLD)}")
    print(f"   {colored('Backend API', GREEN)}  →  {colored(f'http://localhost:{backend_port}', BOLD)}")
    print(f"   {colored('WebSocket', GREEN)}    →  {colored(f'ws://localhost:{backend_port}/ws', BOLD)}")
    print(f"   {colored('What-If API', GREEN)}  →  {colored(f'POST http://localhost:{backend_port}/api/what-if', BOLD)}")
    print(f"   {colored('MQTT Broker', GREEN)}  →  {colored('localhost:1883', BOLD)}")
    print()
    print(colored("=" * 56, CYAN))
    print(f"   Press {colored('Ctrl+C', YELLOW)} to stop all services")
    print(colored("=" * 56, CYAN))
    print()


def start_service(
    name: str,
    cmd: list[str],
    cwd: Path,
    delay: float = 1.0,
    log_path: Path | None = None,
):
    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"

    log_file = None
    if log_path:
        log_path.parent.mkdir(parents=True, exist_ok=True)
        log_file = open(log_path, "w")

    kwargs = dict(
        cwd=str(cwd),
        env=env,
        stdout=log_file or subprocess.DEVNULL,
        stderr=subprocess.STDOUT if log_file else subprocess.PIPE,
    )

    if sys.platform == "win32":
        kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        kwargs["preexec_fn"] = os.setsid

    print(f"  {colored('●', GREEN)} Starting {name}...")
    proc = subprocess.Popen(cmd, **kwargs)
    time.sleep(delay)

    if proc.poll() is not None:
        err = ""
        if proc.stderr:
            err = proc.stderr.read().decode(errors="replace").strip()
        if log_file:
            log_file.close()
            err = log_path.read_text(errors="replace").strip()[-500:]
        print(f"  {colored('✗', RED)} {name} exited (code {proc.returncode})")
        if err:
            for line in err.splitlines()[-5:]:
                print(f"      {colored(line, DIM)}")
        return None, log_file

    return proc, log_file


def kill_proc(proc: subprocess.Popen) -> None:
    if proc.poll() is not None:
        return
    try:
        if sys.platform == "win32":
            proc.terminate()
        else:
            os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
    except (OSError, ProcessLookupError):
        pass


def main():
    parser = argparse.ArgumentParser(description="Launch the full DIH stack")
    parser.add_argument("--speed", type=float, default=10.0,
                        help="Sim publisher playback speed (default: 10)")
    parser.add_argument("--data", type=str, default=None,
                        help="Path to flight data CSV or Parquet file for playback")
    parser.add_argument("--backend-port", type=int, default=8000,
                        help="FastAPI backend port (default: 8000)")
    parser.add_argument("--frontend-port", type=int, default=5173,
                        help="Vite dev server port (default: 5173)")
    parser.add_argument("--start-row", type=int, default=0,
                        help="Row to start playback from (skip earlier rows)")
    args = parser.parse_args()

    py = sys.executable
    npm = shutil.which("npm") or ("npm.cmd" if sys.platform == "win32" else "npm")

    log_dir = ROOT_DIR / "run" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)

    services: list[tuple[str, subprocess.Popen]] = []
    log_files: list = []

    print()
    print(colored("  Starting services...", DIM))
    print()

    # Install frontend dependencies if needed
    if not (FRONTEND_DIR / "node_modules").exists():
        print(f"  {colored('↓', CYAN)} Installing frontend dependencies (npm install)...")
        subprocess.run([npm, "install"], cwd=str(FRONTEND_DIR), check=True)
        print()

    # Free ports that may be held by leftover processes
    free_port(1883, "MQTT")
    free_port(args.backend_port, "Backend")
    free_port(args.frontend_port, "Frontend")

    service_defs = [
        ("MQTT Broker",
         [py, "-m", "integration.broker"],
         ROOT_DIR, 2.0),
        ("Sim Publisher",
         [py, "integration/sim_publisher.py", "--speed", str(args.speed)]
         + (["--data", str(Path(args.data).resolve())] if args.data else [])
         + (["--start-row", str(args.start_row)] if args.start_row > 0 else []),
         ROOT_DIR, 1.0),
        ("ML Subscriber",
         [py, "-m", "integration.ml_subscriber"],
         ROOT_DIR, 1.0),
        ("FastAPI Backend",
         [py, "-m", "uvicorn", "backend.main:app",
          "--host", "0.0.0.0", "--port", str(args.backend_port), "--reload"],
         ROOT_DIR, 1.5),
        ("Frontend Dev Server",
         [npm, "run", "dev", "--", "--port", str(args.frontend_port)],
         FRONTEND_DIR, 2.0),
    ]

    for name, cmd, cwd, delay in service_defs:
        slug = name.lower().replace(" ", "_")
        proc, lf = start_service(name, cmd, cwd, delay, log_dir / f"{slug}.log")
        if lf:
            log_files.append(lf)
        if proc:
            services.append((name, proc))

    banner(args.backend_port, args.frontend_port)
    print(f"   Logs: {colored(str(log_dir), DIM)}")
    print()

    try:
        while True:
            dead = []
            for name, proc in services:
                if proc.poll() is not None:
                    print(f"  {colored('✗', RED)} {name} exited (code {proc.returncode})")
                    dead.append(proc)
            if dead:
                services = [(n, p) for n, p in services if p not in dead]
            if not services:
                print(colored("\n  All services have exited.", RED))
                break
            time.sleep(2)
    except KeyboardInterrupt:
        pass
    finally:
        print()
        print(colored("  Shutting down...", YELLOW))
        for name, proc in reversed(services):
            print(f"  {colored('■', YELLOW)} Stopping {name}...")
            kill_proc(proc)
        for _, proc in services:
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
        for lf in log_files:
            try:
                lf.close()
            except Exception:
                pass
        print(colored("  All services stopped.\n", YELLOW))


if __name__ == "__main__":
    main()
