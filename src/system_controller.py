"""
GapGPT Enterprise Infrastructure Manager - System Controller
Executes system commands, PowerShell, CMD, and infrastructure automation safely.
"""

import sys
import os
import subprocess
import platform
import logging
from typing import Dict, Any, List, Optional

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("SystemController")

class SystemController:
    """Controller for running PowerShell, CMD, and automation scripts on host systems."""

    def __init__(self):
        self.is_windows = platform.system().lower() == "windows"
        self.is_linux = platform.system().lower() == "linux"

    def execute_command(self, command: str, shell_type: str = "auto", timeout: int = 45) -> Dict[str, Any]:
        """
        Executes a shell command safely.
        shell_type: 'powershell', 'cmd', 'bash', or 'auto'
        """
        if not command or not command.strip():
            return {"success": False, "error": "دستور خالی ارسال شده است."}

        command = command.strip()

        # Security blacklist for destructive accidental commands
        lower_cmd = command.lower()
        forbidden_patterns = [
            "rmdir /s /q c:\\", "format c:", "del /f /s /q c:\\windows",
            "rm -rf / --no-preserve-root", ":(){ :|:& };:"
        ]
        for pattern in forbidden_patterns:
            if pattern in lower_cmd:
                return {
                    "success": False,
                    "error": f"اجرای این دستور به دلیل مخاطرات امنیتی سیستمی مسدود شد: {pattern}"
                }

        try:
            if shell_type == "auto":
                if self.is_windows:
                    shell_type = "powershell" if any(k in command for k in ["Get-", "Set-", "Restart-", "$", "|", "Select-"]) else "cmd"
                else:
                    shell_type = "bash"

            args = []
            if shell_type == "powershell" and self.is_windows:
                args = ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command]
            elif shell_type == "cmd" and self.is_windows:
                args = ["cmd.exe", "/c", command]
            else:
                args = ["/bin/bash", "-c", command] if self.is_linux else [command]

            logger.info(f"Executing [{shell_type}]: {command}")

            process = subprocess.run(
                args if isinstance(args, list) and len(args) > 1 else command,
                shell=(not isinstance(args, list) or len(args) <= 1),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=False,
                timeout=timeout
            )

            # Handle different system encodings (UTF-8, Windows CP1256/CP437/CP850)
            def decode_output(raw_bytes: bytes) -> str:
                if not raw_bytes:
                    return ""
                for enc in ["utf-8", "cp1256", "cp850", "cp437", "latin1"]:
                    try:
                        return raw_bytes.decode(enc)
                    except (UnicodeDecodeError, LookupError):
                        continue
                return raw_bytes.decode("utf-8", errors="replace")

            stdout_text = decode_output(process.stdout).strip()
            stderr_text = decode_output(process.stderr).strip()

            return {
                "success": process.returncode == 0,
                "return_code": process.returncode,
                "stdout": stdout_text,
                "stderr": stderr_text,
                "shell_used": shell_type,
                "command": command
            }

        except subprocess.TimeoutExpired:
            logger.error(f"Command timed out after {timeout}s: {command}")
            return {
                "success": False,
                "error": f"زمان اجرای دستور پس از {timeout} ثانیه به پایان رسید (Timeout)."
            }
        except Exception as e:
            logger.error(f"Error executing command: {str(e)}")
            return {
                "success": False,
                "error": f"خطا در اجرای دستور: {str(e)}"
            }

    # Pre-configured automation recipes
    def get_docker_containers(self) -> Dict[str, Any]:
        """Queries Docker container status."""
        return self.execute_command("docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}'")

    def test_nginx_config(self) -> Dict[str, Any]:
        """Tests Nginx configuration syntax."""
        return self.execute_command("nginx -t")

    def reload_nginx(self) -> Dict[str, Any]:
        """Reloads Nginx daemon."""
        if self.is_windows:
            return self.execute_command("nginx -s reload", shell_type="cmd")
        return self.execute_command("systemctl reload nginx || nginx -s reload")

    def get_wireguard_status(self) -> Dict[str, Any]:
        """Checks WireGuard tunnel interfaces."""
        if self.is_windows:
            return self.execute_command("powershell Get-Service -Name '*WireGuard*'; wireguard.exe /dumplog", shell_type="powershell")
        return self.execute_command("wg show || ip link show type wireguard")

    def get_windows_services(self, filter_name: str = "") -> Dict[str, Any]:
        """Queries Windows Services via PowerShell."""
        if not self.is_windows:
            return self.execute_command(f"systemctl list-units --type=service --state=running | head -n 25")
        
        cmd = "Get-Service"
        if filter_name:
            cmd += f" -Name '*{filter_name}*'"
        cmd += " | Select-Object -Property Name, DisplayName, Status | Format-Table -AutoSize | Out-String -Width 4096"
        return self.execute_command(cmd, shell_type="powershell")

    def get_system_metrics(self) -> Dict[str, Any]:
        """Retrieves CPU, RAM, and Disk metrics."""
        metrics: Dict[str, Any] = {
            "os": platform.platform(),
            "python_version": platform.python_version(),
            "hostname": platform.node(),
            "platform": platform.system()
        }

        try:
            if self.is_windows:
                ps_script = """
                $os = Get-CimInstance Win32_OperatingSystem
                $freeMem = [math]::Round($os.FreePhysicalMemory / 1024, 2)
                $totalMem = [math]::Round($os.TotalVisibleMemorySize / 1024, 2)
                $usedMem = [math]::Round($totalMem - $freeMem, 2)
                $cpu = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
                $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
                $diskFree = [math]::Round($disk.FreeSpace / 1GB, 2)
                $diskTotal = [math]::Round($disk.Size / 1GB, 2)
                [PSCustomObject]@{
                    CPU = $cpu
                    MemUsedMB = $usedMem
                    MemTotalMB = $totalMem
                    DiskFreeGB = $diskFree
                    DiskTotalGB = $diskTotal
                } | ConvertTo-Json
                """
                res = self.execute_command(ps_script, shell_type="powershell")
                metrics["raw_stats"] = res.get("stdout", "")
            else:
                res = self.execute_command("uptime; free -m; df -h /")
                metrics["raw_stats"] = res.get("stdout", "")
        except Exception as e:
            metrics["error"] = str(e)

        return metrics
