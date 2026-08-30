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
import signal
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


def banner(backend_port: int, frontend_port: int) -> None:
    print()
    print(colored("=" * 52, CYAN))
    print(colored("  DIH — Digital Twin Full Stack", BOLD + CYAN))
    print(colored("=" * 52, CYAN))
    print()
    print(f"  {colored('Frontend', GREEN)}     →  {colored(f'http://localhost:{frontend_port}', BOLD)}")
    print(f"  {colored('Backend API', GREEN)}  →  {colored(f'http://localhost:{backend_port}', BOLD)}")
    print(f"  {colored('WebSocket', GREEN)}    →  {colored(f'ws://localhost:{backend_port}/ws', BOLD)}")
    print(f"  {colored('What-If API', GREEN)}  →  {colored(f'POST http://localhost:{backend_port}/api/what-if', BOLD)}")
    print(f"  {colored('MQTT Broker', GREEN)}  →  {colored('localhost:1883', BOLD)}")
    print()
    print(colored("=" * 52, CYAN))
    print(f"  Press {colored('Ctrl+C', YELLOW)} to stop all services")
    print(colored("=" * 52, CYAN))
    print()


def start_service(name: str, cmd: list[str], cwd: Path | None = None, delay: float = 1.0):
    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"

    kwargs = dict(
        cwd=str(cwd or ROOT_DIR),
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    if sys.platform == "win32":
        kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        kwargs["preexec_fn"] = os.setsid

    print(f"  {colored('●', GREEN)} Starting {name}...")
    proc = subprocess.Popen(cmd, **kwargs)
    time.sleep(delay)

    if proc.poll() is not None:
        print(f"  {colored('✗', RED)} {name} exited immediately (code {proc.returncode})")
        return None

    return proc


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
    parser.add_argument("--speed", type=float, default=10.0, help="Sim publisher playback speed (default: 10)")
    parser.add_argument("--backend-port", type=int, default=8000, help="FastAPI backend port (default: 8000)")
    parser.add_argument("--frontend-port", type=int, default=5173, help="Vite dev server port (default: 5173)")
    args = parser.parse_args()

    py = sys.executable
    npm = "npm.cmd" if sys.platform == "win32" else "npm"

    services: list[tuple[str, subprocess.Popen]] = []

    print()
    print(colored("  Starting services...", DIM))
    print()

    procs = [
        ("MQTT Broker", [py, "-m", "integration.broker"], ROOT_DIR, 2.0),
        ("Sim Publisher", [py, "integration/sim_publisher.py", "--speed", str(args.speed)], ROOT_DIR, 1.0),
        ("ML Subscriber", [py, "-m", "integration.ml_subscriber"], ROOT_DIR, 1.0),
        ("FastAPI Backend", [py, "-m", "uvicorn", "backend.main:app",
                            "--host", "0.0.0.0", "--port", str(args.backend_port), "--reload"], ROOT_DIR, 1.5),
        ("Frontend Dev Server", [npm, "run", "dev", "--", "--port", str(args.frontend_port)], FRONTEND_DIR, 2.0),
    ]

    for name, cmd, cwd, delay in procs:
        proc = start_service(name, cmd, cwd, delay)
        if proc:
            services.append((name, proc))

    banner(args.backend_port, args.frontend_port)

    try:
        while True:
            for name, proc in services:
                if proc.poll() is not None:
                    print(f"  {colored('✗', RED)} {name} exited (code {proc.returncode})")
                    services = [(n, p) for n, p in services if p is not proc]
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
        print(colored("  All services stopped.\n", YELLOW))


if __name__ == "__main__":
    main()
