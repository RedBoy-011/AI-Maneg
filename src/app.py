"""
GapGPT Enterprise Infrastructure Manager - Core Flask Application
Enterprise-grade IT infrastructure management assistant with RBAC, SOCKS5 proxy, and AI automation.
"""

import os
import sys
import json
import logging
import threading
from functools import wraps
from typing import Dict, Any

from flask import (
    Flask, render_template, request, jsonify, session,
    redirect, url_for, send_from_directory
)
from werkzeug.security import check_password_hash, generate_password_hash

# Handle PyInstaller frozen environment asset paths
if getattr(sys, 'frozen', False):
    BASE_DIR = sys._MEIPASS
    EXECUTABLE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    EXECUTABLE_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))

CONFIG_PATH = os.path.join(EXECUTABLE_DIR, "AISystemManager_Config.json")
if not os.path.exists(CONFIG_PATH):
    # Fallback to current working directory or bundle dir
    CONFIG_PATH = os.path.join(BASE_DIR, "AISystemManager_Config.json")

TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

# Initialize Flask app
app = Flask(__name__, template_folder=TEMPLATES_DIR)
app.config["SECRET_KEY"] = "gapgpt-enterprise-infra-mgmt-sec-2026"
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [GapGPT] %(message)s"
)
logger = logging.getLogger("GapGPT_App")

# Lock for concurrent config file writes
config_lock = threading.Lock()

# Helper to read configuration
def load_config() -> Dict[str, Any]:
    with config_lock:
        if os.path.exists(CONFIG_PATH):
            try:
                with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error reading config: {e}")
        # Default config structure
        return {
            "server": {"host": "127.0.0.1", "port": 5000},
            "api_settings": {
                "gemini_api_key": "",
                "openrouter_api_key": "",
                "active_provider": "gemini",
                "active_model": "gemini-2.5-flash",
                "temperature": 0.4
            },
            "proxy_settings": {
                "enabled": false,
                "host": "127.0.0.1",
                "port": 10808,
                "username": "",
                "password": ""
            },
            "users": [
                {
                    "username": "admin",
                    "password_hash": generate_password_hash("admin1234"),
                    "role": "admin",
                    "display_name": "مدیر ارشد زیرساخت"
                },
                {
                    "username": "user",
                    "password_hash": generate_password_hash("user1234"),
                    "role": "user",
                    "display_name": "کارشناس شبکه"
                }
            ],
            "skills": {
                "docker_nginx": True,
                "network_tunnels": True,
                "active_directory_esxi": True,
                "n8n_automation": True
            }
        }

def save_config(cfg: Dict[str, Any]) -> bool:
    with config_lock:
        try:
            with open(CONFIG_PATH, "w", encoding="utf-8") as f:
                json.dump(cfg, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            logger.error(f"Error saving config to {CONFIG_PATH}: {e}")
            return False

# Initialize managers
from api_manager import APIManager
from system_controller import SystemController

api_mgr = APIManager(load_config)
sys_controller = SystemController()

# ==============================================================================
# Authentication & RBAC Decorators
# ==============================================================================

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "username" not in session:
            if request.is_json:
                return jsonify({"success": False, "error": "احراز هویت نشده‌اید. لطفاً وارد شوید."}), 401
            return redirect(url_for("login_page"))
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "username" not in session:
            return jsonify({"success": False, "error": "احراز هویت نشده‌اید."}), 401
        if session.get("role") != "admin":
            return jsonify({"success": False, "error": "دسترسی غیرمجاز. این بخش ویژه مدیر سیستم (Admin) است."}), 403
        return f(*args, **kwargs)
    return decorated_function

# ==============================================================================
# UI Routes
# ==============================================================================

@app.route("/")
def index_page():
    if "username" not in session:
        return redirect(url_for("login_page"))
    return render_template(
        "index.html",
        username=session.get("username"),
        role=session.get("role", "user"),
        display_name=session.get("display_name", session.get("username"))
    )

@app.route("/login", methods=["GET", "POST"])
def login_page():
    if request.method == "POST":
        data = request.get_json(silent=True) or request.form
        username = (data.get("username") or "").strip()
        password = data.get("password") or ""

        if not username or not password:
            return jsonify({"success": False, "error": "نام کاربری و کلمه عبور را وارد نمایید."}), 400

        config = load_config()
        users = config.get("users", [])
        matched_user = next((u for u in users if u["username"].lower() == username.lower()), None)

        if not matched_user:
            return jsonify({"success": False, "error": "نام کاربری یا کلمه عبور اشتباه است."}), 401

        # Check password hash (or plaintext fallback if manually entered in config)
        pwd_hash = matched_user.get("password_hash", "")
        valid = False
        try:
            valid = check_password_hash(pwd_hash, password)
        except Exception:
            valid = (pwd_hash == password)

        if not valid:
            return jsonify({"success": False, "error": "نام کاربری یا کلمه عبور اشتباه است."}), 401

        # Set session
        session["username"] = matched_user["username"]
        session["role"] = matched_user.get("role", "user")
        session["display_name"] = matched_user.get("display_name", matched_user["username"])

        return jsonify({
            "success": True,
            "username": session["username"],
            "role": session["role"],
            "display_name": session["display_name"],
            "redirect": "/"
        })

    # GET request
    if "username" in session:
        return redirect(url_for("index_page"))
    return render_template("login.html")

@app.route("/logout", methods=["GET", "POST"])
def logout():
    session.clear()
    return redirect(url_for("login_page"))

# ==============================================================================
# API Endpoints
# ==============================================================================

@app.route("/api/me", methods=["GET"])
@login_required
def get_current_user():
    return jsonify({
        "success": True,
        "username": session.get("username"),
        "role": session.get("role"),
        "display_name": session.get("display_name")
    })

@app.route("/api/config", methods=["GET", "POST"])
@admin_required
def handle_config():
    config = load_config()

    if request.method == "GET":
        # Sanitize sensitive data before sending to admin UI
        safe_cfg = {
            "api_settings": {
                "gemini_api_key": config.get("api_settings", {}).get("gemini_api_key", ""),
                "openrouter_api_key": config.get("api_settings", {}).get("openrouter_api_key", ""),
                "active_provider": config.get("api_settings", {}).get("active_provider", "gemini"),
                "active_model": config.get("api_settings", {}).get("active_model", "gemini-2.5-flash"),
                "temperature": config.get("api_settings", {}).get("temperature", 0.4)
            },
            "proxy_settings": config.get("proxy_settings", {
                "enabled": False, "host": "127.0.0.1", "port": 10808, "username": "", "password": ""
            }),
            "skills": config.get("skills", {})
        }
        return jsonify({"success": True, "config": safe_cfg})

    # POST (Update configuration)
    data = request.get_json() or {}
    if "api_settings" in data:
        config.setdefault("api_settings", {}).update(data["api_settings"])
    if "proxy_settings" in data:
        config.setdefault("proxy_settings", {}).update(data["proxy_settings"])
    if "skills" in data:
        config.setdefault("skills", {}).update(data["skills"])

    if save_config(config):
        return jsonify({"success": True, "message": "تنظیمات با موفقیت در AISystemManager_Config.json ذخیره شد."})
    return jsonify({"success": False, "error": "خطا در نوشتن فایل تنظیمات."}), 500

@app.route("/api/models/test-and-fetch", methods=["POST"])
@login_required
def test_and_fetch_models():
    """
    Connects to Gemini or OpenRouter via GET, applies SOCKS5 proxy if active,
    and returns dynamic available models list.
    """
    data = request.get_json() or {}
    provider = data.get("provider", "gemini")
    api_key = data.get("api_key", "").strip()

    # If key is empty in request, fallback to saved config key
    if not api_key:
        cfg = load_config()
        if provider == "gemini":
            api_key = cfg.get("api_settings", {}).get("gemini_api_key", "")
        else:
            api_key = cfg.get("api_settings", {}).get("openrouter_api_key", "")

    result = api_mgr.test_and_fetch_models(provider, api_key)
    return jsonify(result)

@app.route("/api/chat", methods=["POST"])
@login_required
def chat_endpoint():
    """Processes chat completion requests with AI and System Skills."""
    data = request.get_json() or {}
    messages = data.get("messages", [])
    model = data.get("model", "").strip()
    provider = data.get("provider", "").strip()

    cfg = load_config()
    if not provider:
        provider = cfg.get("api_settings", {}).get("active_provider", "gemini")
    if not model:
        model = cfg.get("api_settings", {}).get("active_model", "gemini-2.5-flash")

    if not messages:
        return jsonify({"success": False, "error": "پیامی برای ارسال به هوش مصنوعی وجود ندارد."}), 400

    result = api_mgr.chat_completion(messages, model=model, provider=provider)
    return jsonify(result)

@app.route("/api/system/command", methods=["POST"])
@admin_required
def run_system_command():
    """Admin-only: Executes PowerShell or CMD commands."""
    data = request.get_json() or {}
    command = data.get("command", "")
    shell_type = data.get("shell_type", "auto")

    result = sys_controller.execute_command(command, shell_type=shell_type)
    return jsonify(result)

@app.route("/api/system/quick-action", methods=["POST"])
@admin_required
def run_quick_action():
    """Admin-only: runs preset infrastructure actions."""
    data = request.get_json() or {}
    action = data.get("action", "")

    if action == "docker_ps":
        return jsonify(sys_controller.get_docker_containers())
    elif action == "nginx_test":
        return jsonify(sys_controller.test_nginx_config())
    elif action == "nginx_reload":
        return jsonify(sys_controller.reload_nginx())
    elif action == "wireguard_status":
        return jsonify(sys_controller.get_wireguard_status())
    elif action == "windows_services":
        filter_str = data.get("filter", "")
        return jsonify(sys_controller.get_windows_services(filter_str))
    elif action == "system_metrics":
        return jsonify({"success": True, "metrics": sys_controller.get_system_metrics()})
    else:
        return jsonify({"success": False, "error": f"عملیات ناشناخته: {action}"}), 400

@app.route("/api/system/metrics", methods=["GET"])
@login_required
def get_system_metrics():
    """Returns host machine status."""
    metrics = sys_controller.get_system_metrics()
    return jsonify({"success": True, "metrics": metrics})

@app.route("/api/users", methods=["GET", "POST", "DELETE"])
@admin_required
def manage_users():
    """Admin-only: User management for RBAC."""
    cfg = load_config()
    users = cfg.setdefault("users", [])

    if request.method == "GET":
        # Return user list without password hashes
        safe_users = [
            {
                "username": u["username"],
                "role": u.get("role", "user"),
                "display_name": u.get("display_name", u["username"])
            }
            for u in users
        ]
        return jsonify({"success": True, "users": safe_users})

    elif request.method == "POST":
        data = request.get_json() or {}
        username = (data.get("username") or "").strip().lower()
        password = data.get("password") or ""
        role = data.get("role", "user")
        display_name = data.get("display_name", username)

        if not username or not password:
            return jsonify({"success": False, "error": "نام کاربری و کلمه عبور الزامی است."}), 400

        # Check existing
        if any(u["username"].lower() == username for u in users):
            return jsonify({"success": False, "error": "این نام کاربری قبلاً تعریف شده است."}), 400

        new_user = {
            "username": username,
            "password_hash": generate_password_hash(password),
            "role": role if role in ["admin", "user"] else "user",
            "display_name": display_name
        }
        users.append(new_user)
        save_config(cfg)
        return jsonify({"success": True, "message": f"کاربر {username} با سطح دسترسی {role} ایجاد شد."})

    elif request.method == "DELETE":
        data = request.get_json() or {}
        username = (data.get("username") or "").strip().lower()

        if username == session.get("username", "").lower():
            return jsonify({"success": False, "error": "امکان حذف حساب کاربری جاری وجود ندارد."}), 400

        initial_len = len(users)
        cfg["users"] = [u for u in users if u["username"].lower() != username]

        if len(cfg["users"]) == initial_len:
            return jsonify({"success": False, "error": "کاربر مورد نظر یافت نشد."}), 404

        save_config(cfg)
        return jsonify({"success": True, "message": f"کاربر {username} با موفقیت حذف گردید."})

@app.route("/api/server/action", methods=["POST"])
@admin_required
def server_lifecycle_action():
    """Admin-only: Restart or Shutdown server action."""
    data = request.get_json() or {}
    action = data.get("action", "")

    if action == "restart":
        logger.info("Server restart initiated by admin.")
        def delayed_restart():
            import time
            time.sleep(1)
            python = sys.executable
            os.execl(python, python, *sys.argv)
        threading.Thread(target=delayed_restart).start()
        return jsonify({"success": True, "message": "سرور در حال راه‌اندازی مجدد است..."})

    elif action == "shutdown":
        logger.info("Server shutdown initiated by admin.")
        def delayed_shutdown():
            import time
            time.sleep(1)
            os._exit(0)
        threading.Thread(target=delayed_shutdown).start()
        return jsonify({"success": True, "message": "سرور GapGPT در حال خاموش شدن است."})

    return jsonify({"success": False, "error": "عملیات نامعتبر."}), 400

# ==============================================================================
# Main Entry Point
# ==============================================================================

if __name__ == "__main__":
    config = load_config()
    server_cfg = config.get("server", {})
    host = server_cfg.get("host", "127.0.0.1")
    port = int(server_cfg.get("port", 5000))

    logger.info("==================================================================")
    logger.info(f"  GapGPT Enterprise Infrastructure Manager Started")
    logger.info(f"  Access Portal: http://{host}:{port}")
    logger.info("==================================================================")

    app.run(host=host, port=port, debug=False)
