"""
GapGPT Enterprise Infrastructure Manager - API Manager
Handles AI Model communication, dynamic model fetching, SOCKS5 proxies, and the Infrastructure Skills Bank.
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional
import requests

logger = logging.getLogger("APIManager")

# ==============================================================================
# Comprehensive Skills Bank (بانک جامع مهارتهای زیرساخت)
# ==============================================================================
INFRASTRUCTURE_SYSTEM_SKILLS = """
شما «GapGPT Enterprise Infrastructure Assistant» هستید؛ یک دستیار تخصصی، ارشد و مقتدر در زمینه مدیریت زیرساخت فناوری اطلاعات، مهندسی شبکه، مجازی‌سازی و دوآپس (DevOps).
شما به صورت بومی و عمیق به بانک جامع مهارتهای زیرساختی زیر مجهز هستید:

۱. مدیریت و اتوماسیون Nginx و کانتینرهای Docker:
   - تحلیل، کانفیگ، و عیب‌یابی Nginx (Reverse Proxy, Load Balancing, SSL/TLS Offloading, Upstream health checks, WebSocket proxying, Rate Limiting).
   - تحلیل `nginx -t` و بهینه‌سازی فایل‌های `nginx.conf` و `sites-available`.
   - مدیریت چرخه حیات Docker، فایل‌های `docker-compose.yml` چند سرویسی، شبکه‌های bridge/overlay، والیوم‌ها، کنترل مصرف منابع (CPU/Memory limits) و امنیت کانتینرها.

۲. پیکربندی و راه‌اندازی تونل‌های شبکه (WireGuard, GRE, IPsec, VXLAN):
   - تولید ساختار کلیدها و پیکربندی کامل `wg0.conf` در لینوکس و ویندوز، تنظیم Keepalive، بهینه‌سازی MTU (معمولاً 1420 یا 1360 در شبکه‌های دارای بسته‌بندی اضافه).
   - راه‌اندازی و دیباگ تونل‌های GRE لینوکسی از طریق `ip tunnel add` و روتینگ ترافیک بین دیتاسنترها.
   - پیکربندی فایروال (UFW, iptables, nftables, Windows Advanced Firewall) و فعال‌سازی IP Forwarding و NAT (Masquerade).

۳. مدیریت Active Directory، سرورهای ESXi و سرویس‌های ویندوزی:
   - دستورات تخصصی PowerShell برای Active Directory (مانند Get-ADUser, New-ADUser, Set-ADAccountPassword, Get-ADGroupMember, dsquery).
   - عیب‌یابی و کنترل سرویس‌های حیاتی ویندوز سرور (DNS, DHCP, W3SVC, Print Spooler, Event Viewer logs).
   - تعامل و مدیریت سرورهای VMware ESXi (دستورات esxcli، مدیریت vSwitch، Port Group، snapshot و ماشین‌های مجازی از طریق PowerCLI یا SSH).

۴. یکپارچه‌سازی و سناریوهای اتوماسیون ترکیبی (n8n, Webhooks, CI/CD):
   - طراحی و تولید جریان‌های کاری n8n (JSON workflows) برای مانیتورینگ خودکار سرورها، ارسال آلارم در تلگرام/دیسکورد/مایکروسافت تیمز، ریستارت خودکار سرویس‌ها هنگام داون شدن، و بکاپ‌گیری خودکار.
   - یکپارچه‌سازی وب‌هوک‌های امنیتی و فراخوانی APIهای سیستم.

اصول پاسخ‌دهی شما:
- پاسخ‌ها دقیق، عملیاتی، بدون زیاده‌گویی و با تمرکز بر امنیت سازمان باشد.
- تمام کدهای اسکریپتی (PowerShell, Bash, YAML, Conf) را در بلوک‌های کد استاندارد با توضیحات فارسی شفاف ارائه دهید.
- قبل از هر دستور تخریبی یا پرخطر، هشدارهای لازم مربوط به پایداری سرویس را گوشزد کنید.
"""

class APIManager:
    """Manages external AI requests (Gemini, OpenRouter) and SOCKS5 proxy routing."""

    GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta"
    OPENROUTER_API_URL = "https://openrouter.ai/api/v1"

    def __init__(self, config_getter_func):
        self.get_config = config_getter_func

    def _get_requests_session(self) -> requests.Session:
        """Configures requests session with SOCKS5 proxy if enabled."""
        session = requests.Session()
        config = self.get_config()
        proxy_cfg = config.get("proxy_settings", {})

        if proxy_cfg.get("enabled", False):
            host = proxy_cfg.get("host", "127.0.0.1").strip()
            port = proxy_cfg.get("port", 10808)
            user = proxy_cfg.get("username", "").strip()
            password = proxy_cfg.get("password", "").strip()

            if user and password:
                proxy_url = f"socks5h://{user}:{password}@{host}:{port}"
            else:
                proxy_url = f"socks5h://{host}:{port}"

            session.proxies = {
                "http": proxy_url,
                "https": proxy_url
            }
            logger.info(f"SOCKS5 Proxy active: {host}:{port}")

        return session

    def test_and_fetch_models(self, provider: str, api_key: str) -> Dict[str, Any]:
        """
        Connects via GET to the respective API endpoint through proxy (if set)
        and extracts active models dynamically without hardcoding.
        """
        if not api_key or not api_key.strip():
            return {
                "success": False,
                "error": "کلید API وارد نشده است. لطفاً ابتدا کلید معتبر را در فیلد مربوطه وارد کنید."
            }

        api_key = api_key.strip()
        session = self._get_requests_session()

        try:
            if provider.lower() == "gemini":
                # Official Gemini List Models endpoint
                url = f"{self.GEMINI_API_URL}/models?key={api_key}"
                response = session.get(url, timeout=20)

                if response.status_code != 200:
                    try:
                        err_json = response.json()
                        msg = err_json.get("error", {}).get("message", response.text)
                    except Exception:
                        msg = response.text
                    return {
                        "success": False,
                        "error": f"خطا در ارتباط با Gemini (کد {response.status_code}): {msg}"
                    }

                data = response.json()
                raw_models = data.get("models", [])
                extracted = []

                for m in raw_models:
                    # Filter models capable of generating content
                    methods = m.get("supportedGenerationMethods", [])
                    name = m.get("name", "").replace("models/", "")
                    disp = m.get("displayName", name)
                    
                    if "generateContent" in methods:
                        # Prioritize popular and fast models
                        extracted.append({
                            "id": name,
                            "name": f"{disp} ({name})",
                            "description": m.get("description", ""),
                            "provider": "gemini"
                        })

                # Sort nicely
                extracted.sort(key=lambda x: ("gemini-2.5" in x["id"] or "gemini-1.5" in x["id"]), reverse=True)

                if not extracted:
                    return {
                        "success": False,
                        "error": "هیچ مدلی با قابلیت تولید محتوا یافت نشد."
                    }

                return {
                    "success": True,
                    "provider": "gemini",
                    "count": len(extracted),
                    "models": extracted,
                    "message": f"ارتباط با Google Gemini با موفقیت برقرار شد. {len(extracted)} مدل فعال دریافت گردید."
                }

            elif provider.lower() == "openrouter":
                url = f"{self.OPENROUTER_API_URL}/models"
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "HTTP-Referer": "https://gapgpt.enterprise.local",
                    "X-Title": "GapGPT Enterprise Infrastructure Manager"
                }
                response = session.get(url, headers=headers, timeout=25)

                if response.status_code != 200:
                    try:
                        err_json = response.json()
                        msg = err_json.get("error", {}).get("message", response.text)
                    except Exception:
                        msg = response.text
                    return {
                        "success": False,
                        "error": f"خطا در ارتباط با OpenRouter (کد {response.status_code}): {msg}"
                    }

                data = response.json()
                raw_models = data.get("data", [])
                extracted = []

                for m in raw_models:
                    model_id = m.get("id", "")
                    name = m.get("name", model_id)
                    context_len = m.get("context_length", 0)
                    extracted.append({
                        "id": model_id,
                        "name": f"{name} [{context_len // 1000}k ctx]",
                        "description": m.get("description", ""),
                        "provider": "openrouter"
                    })

                # Pick top 40 relevant models to avoid overwhelming the dropdown
                extracted = extracted[:45]

                return {
                    "success": True,
                    "provider": "openrouter",
                    "count": len(extracted),
                    "models": extracted,
                    "message": f"ارتباط با OpenRouter با موفقیت برقرار شد. {len(extracted)} مدل دریافت شد."
                }

            else:
                return {"success": False, "error": f"سرویس‌دهنده نامعتبر است: {provider}"}

        except requests.exceptions.ProxyError as pe:
            logger.error(f"Proxy connection failed: {pe}")
            return {
                "success": False,
                "error": f"خطای اتصال به پراکسی SOCKS5: سرور پراکسی در دسترس نیست یا اطلاعات پورت/آدرس اشتباه است. ({str(pe)})"
            }
        except requests.exceptions.ConnectTimeout:
            return {
                "success": False,
                "error": "زمان اتصال به پایان رسید (Connection Timeout). لطفا پراکسی یا اتصال اینترنت را بررسی کنید."
            }
        except Exception as e:
            logger.error(f"Error fetching models: {e}")
            return {
                "success": False,
                "error": f"خطا در برقراری ارتباط: {str(e)}"
            }

    def chat_completion(self, messages: List[Dict[str, str]], model: str, provider: str = "gemini") -> Dict[str, Any]:
        """
        Executes chat completion with Gemini or OpenRouter, incorporating the Infrastructure Skills Bank.
        """
        config = self.get_config()
        api_cfg = config.get("api_settings", {})
        session = self._get_requests_session()

        # Format System Skill injection
        system_instruction = INFRASTRUCTURE_SYSTEM_SKILLS

        try:
            if provider.lower() == "gemini":
                api_key = api_cfg.get("gemini_api_key", "").strip()
                if not api_key:
                    return {"success": False, "error": "کلید API جمینای تنظیم نشده است. لطفاً از پنل تنظیمات آن را وارد کنید."}

                url = f"{self.GEMINI_API_URL}/models/{model}:generateContent?key={api_key}"

                # Convert messages format to Gemini contents
                contents = []
                for msg in messages:
                    role = "user" if msg.get("role") in ["user", "system"] else "model"
                    contents.append({
                        "role": role,
                        "parts": [{"text": msg.get("content", "")}]
                    })

                payload = {
                    "systemInstruction": {
                        "parts": [{"text": system_instruction}]
                    },
                    "contents": contents,
                    "generationConfig": {
                        "temperature": float(api_cfg.get("temperature", 0.4)),
                        "maxOutputTokens": 4096
                    }
                }

                headers = {"Content-Type": "application/json"}
                response = session.post(url, headers=headers, json=payload, timeout=60)

                if response.status_code != 200:
                    try:
                        err_data = response.json()
                        err_msg = err_data.get("error", {}).get("message", response.text)
                    except Exception:
                        err_msg = response.text
                    return {"success": False, "error": f"خطای جمینای: {err_msg}"}

                resp_data = response.json()
                try:
                    candidates = resp_data.get("candidates", [])
                    if not candidates:
                        return {"success": False, "error": "پاسخی از مدل دریافت نشد."}
                    
                    text_parts = candidates[0].get("content", {}).get("parts", [])
                    reply_text = "".join(p.get("text", "") for p in text_parts)
                    return {"success": True, "reply": reply_text, "model": model}
                except Exception as ex:
                    return {"success": False, "error": f"خطا در پردازش پاسخ جمینای: {str(ex)}"}

            elif provider.lower() == "openrouter":
                api_key = api_cfg.get("openrouter_api_key", "").strip()
                if not api_key:
                    return {"success": False, "error": "کلید API اپن‌روتر تنظیم نشده است. لطفاً از پنل تنظیمات آن را وارد کنید."}

                url = f"{self.OPENROUTER_API_URL}/chat/completions"
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://gapgpt.enterprise.local",
                    "X-Title": "GapGPT Enterprise Infrastructure Manager"
                }

                # Prepend system instruction
                formatted_messages = [{"role": "system", "content": system_instruction}] + messages

                payload = {
                    "model": model,
                    "messages": formatted_messages,
                    "temperature": float(api_cfg.get("temperature", 0.4))
                }

                response = session.post(url, headers=headers, json=payload, timeout=65)

                if response.status_code != 200:
                    try:
                        err_data = response.json()
                        err_msg = err_data.get("error", {}).get("message", response.text)
                    except Exception:
                        err_msg = response.text
                    return {"success": False, "error": f"خطای اپن‌روتر: {err_msg}"}

                resp_data = response.json()
                choices = resp_data.get("choices", [])
                if not choices:
                    return {"success": False, "error": "هیچ انتخابی در پاسخ اپن‌روتر وجود ندارد."}

                reply_text = choices[0].get("message", {}).get("content", "")
                return {"success": True, "reply": reply_text, "model": model}

            else:
                return {"success": False, "error": f"سرویس‌دهنده نامعتبر: {provider}"}

        except requests.exceptions.ProxyError as pe:
            return {"success": False, "error": f"خطا در ارتباط با پراکسی SOCKS5: {str(pe)}"}
        except requests.exceptions.Timeout:
            return {"success": False, "error": "زمان انتظار برای پاسخ مدل به پایان رسید (Timeout)."}
        except Exception as e:
            return {"success": False, "error": f"خطا در دریافت پاسخ از هوش مصنوعی: {str(e)}"}
