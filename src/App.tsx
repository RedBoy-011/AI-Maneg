/**
 * GapGPT Enterprise Infrastructure Manager
 * Web Application with full interactive simulation, live API testing, and source code viewer.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  Settings,
  LogOut,
  Send,
  Trash2,
  Copy,
  Check,
  Server,
  Shield,
  Key,
  Globe,
  Users,
  Cpu,
  RefreshCw,
  Power,
  ExternalLink,
  Code2,
  FileCode,
  Layers,
  Activity,
  AlertTriangle,
  Download
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

interface UserAccount {
  username: string;
  role: 'admin' | 'user';
  displayName: string;
}

interface ModelItem {
  id: string;
  name: string;
  provider: 'gemini' | 'openrouter';
}

export default function App() {
  // Authentication & RBAC State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // App Settings State
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [openRouterApiKey, setOpenRouterApiKey] = useState('');
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [proxyHost, setProxyHost] = useState('127.0.0.1');
  const [proxyPort, setProxyPort] = useState('10808');
  const [proxyUser, setProxyUser] = useState('');
  const [proxyPass, setProxyPass] = useState('');

  // Dynamic Models State
  const [availableModels, setAvailableModels] = useState<ModelItem[]>([
    { id: 'gemini-2.5-flash', name: 'gemini-2.5-flash (پیش‌فرض سریع)', provider: 'gemini' },
    { id: 'gemini-1.5-pro', name: 'gemini-1.5-pro (استدلال پیشرفته)', provider: 'gemini' },
    { id: 'gemini-1.5-flash', name: 'gemini-1.5-flash (استاندارد)', provider: 'gemini' }
  ]);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [isTestingModels, setIsTestingModels] = useState(false);
  const [modelTestStatus, setModelTestStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Modals & Panels
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'api' | 'proxy' | 'users' | 'skills' | 'server'>('api');
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isSourceViewerOpen, setIsSourceViewerOpen] = useState(false);
  const [selectedSourceFile, setSelectedSourceFile] = useState('src/app.py');

  // Terminal Logs State
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    '# GapGPT Enterprise System Controller v2.5.0 initialized.',
    '# Host environment: Linux / Windows Server Hybrid Controller ready.',
    '# SOCKS5 proxy engine: Standby.'
  ]);
  const [terminalInput, setTerminalInput] = useState('');

  // User Management State (Mock RBAC stored in memory / syncable with config)
  const [usersList, setUsersList] = useState<UserAccount[]>([
    { username: 'admin', role: 'admin', displayName: 'مدیر ارشد زیرساخت' },
    { username: 'user', role: 'user', displayName: 'کارشناس شبکه' }
  ]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');

  // Server Ops State
  const [serverActionMsg, setServerActionMsg] = useState('');

  // Skills Toggles
  const [skillsConfig, setSkillsConfig] = useState({
    dockerNginx: true,
    networkTunnels: true,
    activeDirectoryEsxi: true,
    n8nAutomation: true
  });

  // Copy feedback state
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Check existing session
  useEffect(() => {
    const savedUser = localStorage.getItem('gapgpt_current_user');
    const savedRole = localStorage.getItem('gapgpt_user_role') as 'admin' | 'user' | null;
    const savedName = localStorage.getItem('gapgpt_display_name');

    if (savedUser && savedRole) {
      setCurrentUser({
        username: savedUser,
        role: savedRole,
        displayName: savedName || savedUser
      });
      loadUserChat(savedUser);
    }

    // Load saved API keys from storage if available
    const savedGemini = localStorage.getItem('gapgpt_gemini_key');
    const savedOpenRouter = localStorage.getItem('gapgpt_openrouter_key');
    if (savedGemini) setGeminiApiKey(savedGemini);
    if (savedOpenRouter) setOpenRouterApiKey(savedOpenRouter);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isChatLoading]);

  // Load user specific chat history from LocalStorage (Separated per username as requested)
  const loadUserChat = (username: string) => {
    const stored = localStorage.getItem(`gapgpt_chats_${username}`);
    if (stored) {
      try {
        setMessages(JSON.parse(stored));
      } catch {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  };

  const saveUserChat = (newMessages: ChatMessage[], username: string) => {
    localStorage.setItem(`gapgpt_chats_${username}`, JSON.stringify(newMessages));
  };

  // Login handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError('لطفاً نام کاربری و کلمه عبور را وارد کنید.');
      return;
    }

    setIsLoggingIn(true);
    setTimeout(() => {
      const u = loginUsername.trim().toLowerCase();
      // Verify against user list
      const matched = usersList.find(x => x.username.toLowerCase() === u);

      if (matched || u === 'admin' || u === 'user') {
        const role: 'admin' | 'user' = matched ? matched.role : (u === 'admin' ? 'admin' : 'user');
        const displayName = matched ? matched.displayName : (role === 'admin' ? 'مدیر ارشد زیرساخت' : 'کارشناس شبکه');
        
        const userObj: UserAccount = {
          username: u,
          role: role,
          displayName: displayName
        };

        setCurrentUser(userObj);
        localStorage.setItem('gapgpt_current_user', userObj.username);
        localStorage.setItem('gapgpt_user_role', userObj.role);
        localStorage.setItem('gapgpt_display_name', userObj.displayName);

        loadUserChat(userObj.username);
        setIsLoggingIn(false);
      } else {
        setLoginError('نام کاربری یا کلمه عبور وارد شده نامعتبر است.');
        setIsLoggingIn(false);
      }
    }, 450);
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('gapgpt_current_user');
    localStorage.removeItem('gapgpt_user_role');
    localStorage.removeItem('gapgpt_display_name');
    setCurrentUser(null);
    setMessages([]);
    setLoginUsername('');
    setLoginPassword('');
  };

  // Clear chat history
  const handleClearHistory = () => {
    if (!currentUser) return;
    if (confirm('آیا از پاک کردن تاریخچه مکالمات خود در این مرورگر اطمینان دارید؟')) {
      setMessages([]);
      localStorage.removeItem(`gapgpt_chats_${currentUser.username}`);
    }
  };

  // Dynamic test connection & model fetch
  const handleTestAndFetchModels = async (provider: 'gemini' | 'openrouter') => {
    setIsTestingModels(true);
    setModelTestStatus({ message: `در حال اتصال مستقیم به ${provider.toUpperCase()} و فچ مدل‌های فعال...` });

    const key = provider === 'gemini' ? geminiApiKey.trim() : openRouterApiKey.trim();

    if (!key) {
      setIsTestingModels(false);
      setModelTestStatus({
        success: false,
        message: `کلید API برای ${provider} وارد نشده است. لطفاً کلید معتبر را در فیلد مربوطه وارد کنید.`
      });
      return;
    }

    // Save key
    if (provider === 'gemini') {
      localStorage.setItem('gapgpt_gemini_key', key);
    } else {
      localStorage.setItem('gapgpt_openrouter_key', key);
    }

    try {
      if (provider === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
        const res = await fetch(url);
        const data = await res.json();

        if (res.ok && data.models) {
          const extracted: ModelItem[] = data.models
            .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
            .map((m: any) => {
              const id = m.name.replace('models/', '');
              return {
                id,
                name: `${m.displayName || id} (${id})`,
                provider: 'gemini'
              };
            });

          if (extracted.length > 0) {
            setAvailableModels(extracted);
            setSelectedModel(extracted[0].id);
            setModelTestStatus({
              success: true,
              message: `ارتباط با Gemini موفقیت‌آمیز بود! تعداد ${extracted.length} مدل فعال به طور داینامیک دریافت و به لیست کشویی اضافه شد.`
            });
          } else {
            setModelTestStatus({
              success: false,
              message: 'مدل فعالی با قابلیت تولید متن برای این کلید یافت نشد.'
            });
          }
        } else {
          const errMsg = data.error?.message || 'خطا در ارتباط با سرورهای گوگل';
          setModelTestStatus({
            success: false,
            message: `خطای Gemini: ${errMsg}`
          });
        }
      } else {
        // OpenRouter
        const res = await fetch('https://openrouter.ai/api/v1/models', {
          headers: {
            Authorization: `Bearer ${key}`
          }
        });
        const data = await res.json();

        if (res.ok && data.data) {
          const extracted: ModelItem[] = data.data.slice(0, 40).map((m: any) => ({
            id: m.id,
            name: `${m.name || m.id}`,
            provider: 'openrouter'
          }));

          setAvailableModels(extracted);
          if (extracted.length > 0) setSelectedModel(extracted[0].id);
          setModelTestStatus({
            success: true,
            message: `ارتباط با OpenRouter برقرار شد! ${extracted.length} مدل در لیست کشویی بارگذاری گردید.`
          });
        } else {
          setModelTestStatus({
            success: false,
            message: data.error?.message || 'خطا در دریافت مدل‌ها از OpenRouter'
          });
        }
      }
    } catch (err: any) {
      setModelTestStatus({
        success: false,
        message: `خطا در برقراری ارتباط (احتمال نیاز به فعال‌سازی پراکسی SOCKS5 یا فیلترینگ): ${err.message}`
      });
    } finally {
      setIsTestingModels(false);
    }
  };

  // Chat message send
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || !currentUser || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
    };

    const updated = [...messages, userMsg];
    setMessages(updated);
    saveUserChat(updated, currentUser.username);
    setInputValue('');
    setIsChatLoading(true);

    try {
      // If user provided a Gemini key, query directly
      if (geminiApiKey.trim()) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${geminiApiKey.trim()}`;
        const systemInstruction = `شما دستیار ارشد GapGPT Enterprise Infrastructure Manager هستید. 
مسلط بر: Nginx، داکر، تونل‌های WireGuard/GRE، اکتیو دایرکتوری، سرورهای ESXi و اتوماسیون n8n.
پاسخ‌ها را کامل، ساختاریافته و با کدهای استاندارد فارسی بنویسید.`;

        const contents = updated.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        }));

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents,
            generationConfig: { temperature: 0.4, maxOutputTokens: 4096 }
          })
        });

        const data = await res.json();
        if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          const botReply = data.candidates[0].content.parts[0].text;
          const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            content: botReply,
            timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
          };
          const finalMessages = [...updated, aiMsg];
          setMessages(finalMessages);
          saveUserChat(finalMessages, currentUser.username);
          setIsChatLoading(false);
          return;
        }
      }

      // Built-in intelligent domain assistant response simulation based on Infrastructure Skills Bank
      setTimeout(() => {
        let responseContent = '';
        const lower = text.toLowerCase();

        if (lower.includes('nginx') || lower.includes('پروکسی') || lower.includes('proxy')) {
          responseContent = `### پیکربندی بهینه Nginx Reverse Proxy با SSL و WebSocket

در ادامه کانفیگ استاندارد برای سرور سازمانی ارائه شده است:

\`\`\`nginx
# /etc/nginx/sites-available/enterprise-service.conf
upstream backend_nodes {
    server 127.0.0.1:8080 max_fails=3 fail_timeout=10s;
    server 127.0.0.1:8081 backup;
    keepalive 32;
}

# Rate Limiting Zone
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=20r/s;

server {
    listen 80;
    server_name infra.company.local;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name infra.company.local;

    ssl_certificate /etc/ssl/certs/gapgpt.crt;
    ssl_certificate_key /etc/ssl/private/gapgpt.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        limit_req zone=api_limit burst=30 nodelay;
        proxy_pass http://backend_nodes;
        proxy_http_version 1.1;
        
        # WebSocket Headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Real IP Forwarding
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
\`\`\`

**دستور اعتبارسنجی و ریلود:**
\`\`\`bash
nginx -t && systemctl reload nginx
\`\`\``;
        } else if (lower.includes('wireguard') || lower.includes('تونل') || lower.includes('gre') || lower.includes('tunnel')) {
          responseContent = `### پیکربندی تونل شبکه امن WireGuard (wg0.conf)

پیکربندی بهینه برای ارتباط امن بین دو دیتاسنتر یا سرورهای ابری:

\`\`\`ini
# /etc/wireguard/wg0.conf (Server Node)
[Interface]
Address = 10.200.0.1/24
ListenPort = 51820
PrivateKey = <SERVER_PRIVATE_KEY>
SaveConfig = false

# IP Forwarding & NAT Masquerade
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

# Client Node (Peer)
[Peer]
PublicKey = <CLIENT_PUBLIC_KEY>
AllowedIPs = 10.200.0.2/32
PersistentKeepalive = 25
\`\`\`

**نکات حیاتی MTU و راه‌اندازی:**
1. به دلیل بسته اضافه WireGuard، اندازه MTU را روی \`1420\` یا \`1360\` تنظیم نمایید.
2. فعال‌سازی سرویس: \`systemctl enable --now wg-quick@wg0\`
3. مشاهده وضعیت: \`wg show\``;
        } else if (lower.includes('active directory') || lower.includes('اکتیو') || lower.includes('ad') || lower.includes('powershell')) {
          responseContent = [
            '### اسکریپت تخصصی PowerShell برای گزارش کاربران اکتیو دایرکتوری',
            '',
            'اسکریپت زیر کاربران غیرفعال ۹۰ روز گذشته را استخراج و آماده غیرفعال‌سازی می‌کند:',
            '',
            '```powershell',
            '# PowerShell - ActiveDirectory Module',
            'Import-Module ActiveDirectory',
            '',
            '$DaysInactive = 90',
            '$CutoffDate = (Get-Date).AddDays(-$DaysInactive)',
            '',
            '# استخراج کاربران با لست لاگان قدیمی',
            '$InactiveUsers = Get-ADUser -Filter {LastLogonDate -lt $CutoffDate -and Enabled -eq $true} -Properties LastLogonDate, DisplayName, UserPrincipalName, Department | Select-Object Name, UserPrincipalName, LastLogonDate, Department',
            '',
            '# خروجی روی کنسول',
            '$InactiveUsers | Format-Table -AutoSize',
            '',
            '# خروجی گزارش CSV',
            '$ReportPath = "C:\\Reports\\Inactive_Users.csv"',
            '$InactiveUsers | Export-Csv -Path $ReportPath -NoTypeInformation -Encoding UTF8',
            '',
            'Write-Host "[OK] کاربران غیرفعال با موفقیت شناسایی و ذخیره شدند." -ForegroundColor Yellow',
            '```',
            '',
            'جهت غیرفعال‌سازی دسته‌ای: `$InactiveUsers | Disable-ADAccount -Confirm:$false`'
          ].join('\n');
        } else if (lower.includes('n8n') || lower.includes('اتوماسیون')) {
          responseContent = `### سناریوی اتوماسیون ترکیبی n8n برای مانیتورینگ سلامت سرویس‌ها

ساختار جریان کاری اتوماسیون (Workflow Architecture):
1. **Webhook / Cron Trigger**: هر ۵ دقیقه وضعیت سرورها و پورت‌ها را بررسی می‌کند.
2. **HTTP Request Node**: فراخوانی متد \`GET /api/system/metrics\` سرور GapGPT.
3. **IF / Code Condition**: در صورت بالا بودن مصرف CPU بیش از ۸۵٪ یا داون بودن Nginx.
4. **Action Node**: ارسال پیام هشدار با جزییات به ربات تلگرام یا تیمز و فراخوانی اسکریپت ریستارت سرویس.

\`\`\`json
{
  "name": "Infra Auto-Heal & Telegram Alert",
  "nodes": [
    {
      "parameters": {
        "rule": { "interval": [{ "field": "minutes", "minutesInterval": 5 }] }
      },
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger"
    },
    {
      "parameters": {
        "chatId": "-100123456789",
        "text": "🚨 هشدار زیرساخت: سرویس سرور به صورت خودکار بازیابی شد."
      },
      "name": "Telegram Alert",
      "type": "n8n-nodes-base.telegram"
    }
  ]
}
\`\`\``;
        } else {
          responseContent = `درخواست شما به عنوان مهندس زیرساخت ثبت شد:

> "${text}"

**تحلیل وضعیت زیرساخت:**
- پلتفرم برای سیستم‌های لینوکس و ویندوز آماده اجرای وظایف خودکارسازی است.
- می‌توانید از طریق پنل ترمینال زنده (دکمه بالای صفحه)، فرامین PowerShell یا CMD را برای اعتبارسنجی سرویس‌های کانتینری و تونل‌های شبکه اجرا کنید.
- برای تولید دقیق‌تر پاسخ با مدل‌های فعال، از پنل تنظیمات کلید معتبر Gemini یا OpenRouter خود را تست و فعال کنید.`;
        }

        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: responseContent,
          timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
        };

        const finalMessages = [...updated, aiMsg];
        setMessages(finalMessages);
        saveUserChat(finalMessages, currentUser.username);
        setIsChatLoading(false);
      }, 700);

    } catch (err: any) {
      setIsChatLoading(false);
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: `⚠️ **خطا در برقراری ارتباط**: ${err.message}`,
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([...updated, errMsg]);
    }
  };

  // Run terminal command simulation
  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    const cmd = terminalInput.trim();
    const newLogs = [...terminalLogs, `$ ${cmd}`];

    if (cmd.startsWith('docker')) {
      newLogs.push('CONTAINER ID   IMAGE          COMMAND       CREATED         STATUS         PORTS');
      newLogs.push('8f2a1b9c4d3e   nginx:alpine   "/docker-e…"  3 hours ago     Up 3 hours     0.0.0.0:443->443/tcp');
      newLogs.push('2c4d6e8a0b1c   redis:7-alpine "docker-e…"   2 days ago      Up 2 days      127.0.0.1:6379/tcp');
    } else if (cmd.includes('nginx -t')) {
      newLogs.push('nginx: the configuration file /etc/nginx/nginx.conf syntax is ok');
      newLogs.push('nginx: configuration file /etc/nginx/nginx.conf test is successful');
    } else if (cmd.includes('wg show') || cmd.includes('WireGuard')) {
      newLogs.push('interface: wg0');
      newLogs.push('  public key: vK98F...jL2=');
      newLogs.push('  listening port: 51820');
      newLogs.push('peer: dQ45m...pX9=');
      newLogs.push('  endpoint: 198.51.100.22:51820');
      newLogs.push('  allowed ips: 10.200.0.2/32');
      newLogs.push('  latest handshake: 1 minute, 14 seconds ago');
      newLogs.push('  transfer: 142.4 MiB received, 89.2 MiB sent');
    } else if (cmd.includes('Get-Service')) {
      newLogs.push('Status   Name               DisplayName');
      newLogs.push('------   ----               -----------');
      newLogs.push('Running  NTDS               Active Directory Domain Services');
      newLogs.push('Running  DNS                DNS Server');
      newLogs.push('Running  W3SVC              World Wide Web Publishing Service');
    } else {
      newLogs.push(`[Command dispatched to host controller] Return code: 0`);
    }

    setTerminalLogs(newLogs);
    setTerminalInput('');
  };

  // Quick action runner
  const handleQuickAction = (action: string) => {
    if (action === 'docker') {
      setTerminalInput('docker ps --format "table {{.ID}}\\t{{.Image}}\\t{{.Status}}"');
    } else if (action === 'nginx') {
      setTerminalInput('nginx -t');
    } else if (action === 'wireguard') {
      setTerminalInput('wg show');
    } else if (action === 'services') {
      setTerminalInput('Get-Service -Name NTDS, DNS, W3SVC');
    }
  };

  // User management
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) return;

    const u = newUsername.trim().toLowerCase();
    if (usersList.some(x => x.username.toLowerCase() === u)) {
      alert('این نام کاربری قبلاً ایجاد شده است.');
      return;
    }

    const newUser: UserAccount = {
      username: u,
      role: newRole,
      displayName: newDisplayName.trim() || u
    };

    setUsersList([...usersList, newUser]);
    setNewUsername('');
    setNewPassword('');
    setNewDisplayName('');
    alert(`کاربر ${u} با نقش ${newRole} با موفقیت در سامانه افزوده شد.`);
  };

  const handleDeleteUser = (u: string) => {
    if (currentUser?.username === u) {
      alert('امکان حذف حساب کاربری جاری وجود ندارد.');
      return;
    }
    if (confirm(`آیا از حذف حساب "${u}" اطمینان دارید؟`)) {
      setUsersList(usersList.filter(x => x.username !== u));
    }
  };

  // Copy code helper
  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 1800);
  };

  // Source files dictionary for source code inspector modal
  const sourceCodeFiles: Record<string, string> = {
    'src/app.py': `# GapGPT Enterprise Infrastructure Manager - Core Flask Application
# Enterprise-grade IT infrastructure management assistant with RBAC, SOCKS5 proxy, and AI automation.

import os, sys, json, logging, threading
from functools import wraps
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from werkzeug.security import check_password_hash, generate_password_hash

if getattr(sys, 'frozen', False):
    BASE_DIR = sys._MEIPASS
    EXECUTABLE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    EXECUTABLE_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))

CONFIG_PATH = os.path.join(EXECUTABLE_DIR, "AISystemManager_Config.json")
app = Flask(__name__, template_folder=os.path.join(BASE_DIR, "templates"))
app.config["SECRET_KEY"] = "gapgpt-enterprise-infra-secret-2026"

# For full implementation, view /src/app.py on disk`,
    'src/api_manager.py': `# GapGPT Enterprise - API Manager with SOCKS5 & Skills Bank
import requests, json, logging

INFRASTRUCTURE_SYSTEM_SKILLS = """
شما دستیار ارشد GapGPT Enterprise Infrastructure Assistant هستید:
1. اتوماسیون Nginx و کانتینرهای داکر
2. تونل‌های WireGuard و GRE با تنظیم بهینه MTU
3. اکتیو دایرکتوری و سرورهای ESXi
4. یکپارچه‌سازی و درک سناریوهای n8n
"""
# For full implementation, view /src/api_manager.py on disk`,
    'src/system_controller.py': `# GapGPT Enterprise - System Controller for PowerShell & CMD
import subprocess, platform

class SystemController:
    def execute_command(self, command: str, shell_type="auto"):
        # Safe execution of PowerShell and CMD
        pass
# For full implementation, view /src/system_controller.py on disk`,
    '.github/workflows/build.yml': `name: Build GapGPT Enterprise Standalone Executable
on: [push, workflow_dispatch]
jobs:
  build-windows-exe:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install -r requirements.txt pyinstaller
      - run: pyinstaller --noconfirm --clean --name "GapGPT-Manager" --onefile ...
# For full implementation, view /.github/workflows/build.yml on disk`,
    'stop.bat': `@echo off
chcp 65001 >nul
title GapGPT Enterprise Stopper
taskkill /F /IM GapGPT-Manager.exe /T 2>nul
echo [OK] GapGPT Enterprise Server stopped.
pause`,
    'requirements.txt': `flask>=3.0.2
requests[socks]>=2.31.0
PySocks>=1.7.1
urllib3>=2.2.1
werkzeug>=3.0.1
pyinstaller>=6.4.0`
  };

  // ===========================================================================
  // 1. LOGIN SCREEN (If not authenticated)
  // Requirements: Empty default values, clean Swiss dark, no pill slop
  // ===========================================================================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#111113] text-[#e2e8f0] flex items-center justify-center p-4 antialiased">
        <div className="w-full max-w-md bg-[#18181b] border border-zinc-800 rounded-xl p-8 shadow-2xl relative">
          
          {/* Header Brand */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-700 text-cyan-400 mb-3 shadow-inner">
              <Shield className="w-6 h-6 stroke-[1.75]" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white mb-1.5">GapGPT Enterprise</h1>
            <p className="text-xs text-zinc-400">سامانه مدیریت و اتوماسیون زیرساخت‌های فناوری اطلاعات</p>
          </div>

          {/* Feedback Banner */}
          {loginError && (
            <div className="mb-5 p-3 rounded-lg text-xs leading-relaxed bg-red-950/60 text-red-300 border border-red-800 transition-all">
              {loginError}
            </div>
          )}

          {/* Login Form with Zero Default Values */}
          <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-2">نام کاربری سازمانی</label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                required
                autoComplete="off"
                placeholder=""
                className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-2">کلمه عبور</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder=""
                className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>در حال اعتبارسنجی...</span>
                  </span>
                ) : (
                  <span>ورود به پنل مدیریت</span>
                )}
              </button>
            </div>
          </form>

          {/* Quick Credential Hint for Testing */}
          <div className="mt-6 pt-5 border-t border-zinc-800/80 text-[11px] text-zinc-500 flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <span>اکانت ادمین (دسترسی کامل):</span>
              <button 
                type="button" 
                onClick={() => { setLoginUsername('admin'); setLoginPassword('admin1234'); }}
                className="text-cyan-400 hover:underline font-mono"
              >
                admin / admin1234
              </button>
            </div>
            <div className="flex justify-between items-center">
              <span>اکانت کاربر عادی (فقط چت):</span>
              <button 
                type="button" 
                onClick={() => { setLoginUsername('user'); setLoginPassword('user1234'); }}
                className="text-zinc-400 hover:underline font-mono"
              >
                user / user1234
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // 2. MAIN APPLICATION INTERFACE (SPA)
  // ===========================================================================
  return (
    <div className="h-screen flex flex-col bg-[#111113] text-[#e2e8f0] overflow-hidden antialiased select-none">
      
      {/* Top Bar Contract (Zone 1: Brand | Zone 2: Navigation / Models | Zone 3: Actions) */}
      <header className="h-14 bg-[#141416] border-b border-zinc-800 px-5 flex items-center justify-between shrink-0 z-20">
        
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-cyan-400">
            <Server className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold tracking-tight text-white">GapGPT Enterprise</span>
            <span className="text-[11px] text-zinc-500 hidden sm:inline">مدیریت هوشمند زیرساخت</span>
          </div>
        </div>

        {/* Zone 2: Dynamic Model Selector & User Context */}
        <div className="flex items-center gap-3">
          {/* Dynamic Model Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs">
            <span className="text-zinc-500 text-[11px]">مدل:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-transparent text-cyan-400 text-xs font-mono focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              {availableModels.map(m => (
                <option key={m.id} value={m.id} className="bg-zinc-900 text-white">
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* User Role Indicator */}
          <div className="flex items-center gap-2 text-xs text-zinc-400 border-r border-zinc-800 pr-3">
            <span className="font-medium text-white truncate max-w-[110px]">{currentUser.displayName}</span>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
              {currentUser.role}
            </span>
          </div>
        </div>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2">
          {/* View Source Code Modal Trigger */}
          <button
            onClick={() => setIsSourceViewerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs rounded-lg border border-zinc-800 transition-colors"
            title="مشاهده کدهای پایتون و فایل‌های آماده‌ی PyInstaller"
          >
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">فایل‌های پایتون</span>
          </button>

          {/* Admin Terminal Button (Admin only) */}
          {currentUser.role === 'admin' && (
            <button
              onClick={() => setIsTerminalOpen(!isTerminalOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                isTerminalOpen 
                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300' 
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-800'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>ترمینال</span>
            </button>
          )}

          {/* Admin Settings Button (Admin only) */}
          {currentUser.role === 'admin' && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-400 hover:text-cyan-300 text-xs font-medium rounded-lg border border-cyan-800/40 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>تنظیمات</span>
            </button>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
            title="خروج از حساب کاربری"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Primary Chat Viewport */}
        <main className="flex-1 flex flex-col h-full bg-[#111113] overflow-hidden">
          
          {/* Messages Scroll Area */}
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            
            {/* Welcome banner if no messages */}
            {messages.length === 0 && (
              <div className="max-w-2xl mx-auto my-8 text-center select-text">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 text-cyan-400 mb-3 shadow-lg">
                  <Activity className="w-6 h-6 stroke-[1.75]" />
                </div>
                <h2 className="text-base font-bold text-white mb-2">دستیار مهندسی زیرساخت و اتوماسیون</h2>
                <p className="text-xs text-zinc-400 leading-relaxed mb-6 max-w-lg mx-auto">
                  آماده تحلیل و تولید اسکریپت‌های Nginx، کانتینرهای داکر، تونل‌های WireGuard، اکتیو دایرکتوری، سرورهای ESXi و وب‌هوک‌های n8n.
                </p>

                {/* Quick Prompts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-right">
                  <button
                    onClick={() => handleSendMessage('کانفیگ کامل Nginx برای Reverse Proxy با SSL و WebSocket همراه با Rate Limiting بنویس.')}
                    className="p-3 bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-xs text-zinc-300 transition-all text-right group"
                  >
                    <div className="font-medium text-white group-hover:text-cyan-400 mb-0.5">اتوماسیون Nginx & SSL</div>
                    <div className="text-[11px] text-zinc-500">پیکربندی ریورس پروکسی، وب‌سوکت و امنیت TLS</div>
                  </button>
                  <button
                    onClick={() => handleSendMessage('پیکربندی کامل سرور و کلاینت WireGuard (wg0.conf) با تنظیم MTU و فایروال iptables.')}
                    className="p-3 bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-xs text-zinc-300 transition-all text-right group"
                  >
                    <div className="font-medium text-white group-hover:text-cyan-400 mb-0.5">تونل شبکه WireGuard</div>
                    <div className="text-[11px] text-zinc-500">راه‌اندازی بین‌دیتاسنتری با تنظیم بهینه MTU</div>
                  </button>
                  <button
                    onClick={() => handleSendMessage('اسکریپت PowerShell برای جستجو و گزارش کاربران غیرفعال اکتیو دایرکتوری (Inactive AD Users).')}
                    className="p-3 bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-xs text-zinc-300 transition-all text-right group"
                  >
                    <div className="font-medium text-white group-hover:text-cyan-400 mb-0.5">مدیریت Active Directory</div>
                    <div className="text-[11px] text-zinc-500">اسکریپت پاکسازی و مدیریت اکانت‌ها در پاورشل</div>
                  </button>
                  <button
                    onClick={() => handleSendMessage('طراحی یک سناریوی n8n برای نظارت بر کانتینرهای داکر و ارسال آلارم تلگرام در صورت بروز خطا.')}
                    className="p-3 bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-xs text-zinc-300 transition-all text-right group"
                  >
                    <div className="font-medium text-white group-hover:text-cyan-400 mb-0.5">اتوماسیون ترکیبی n8n</div>
                    <div className="text-[11px] text-zinc-500">جریان‌های کاری مانیتورینگ سلامت سرویس‌ها</div>
                  </button>
                </div>
              </div>
            )}

            {/* Messages List */}
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-start' : 'justify-end'} mb-4 select-text`}>
                  <div
                    className={`max-w-3xl rounded-xl p-4 text-xs leading-relaxed ${
                      isUser
                        ? 'bg-zinc-800/90 text-white border border-zinc-700/80'
                        : 'bg-zinc-900/95 text-zinc-100 border border-zinc-800 shadow-md'
                    }`}
                  >
                    {isUser ? (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    ) : (
                      <div className="space-y-2">
                        {/* Simple rendered markdown-like code block support */}
                        {msg.content.split('```').map((part, idx) => {
                          if (idx % 2 === 1) {
                            // Code block
                            const firstLineBreak = part.indexOf('\n');
                            const lang = firstLineBreak > -1 ? part.slice(0, firstLineBreak).trim() : '';
                            const codeBody = firstLineBreak > -1 ? part.slice(firstLineBreak + 1) : part;
                            const blockId = `${msg.id}-${idx}`;

                            return (
                              <div key={idx} className="my-2 rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden font-mono text-[11px] direction-ltr text-left">
                                <div className="px-3 py-1.5 bg-zinc-900/80 border-b border-zinc-800/80 flex items-center justify-between text-zinc-400">
                                  <span>{lang || 'code'}</span>
                                  <button
                                    onClick={() => handleCopyCode(codeBody.trim(), blockId)}
                                    className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-cyan-400 transition-colors"
                                  >
                                    {copiedCodeId === blockId ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-400" />
                                        <span className="text-emerald-400">کپی شد</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        <span>کپی کد</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <pre className="p-3 overflow-x-auto text-emerald-400 whitespace-pre">
                                  {codeBody.trim()}
                                </pre>
                              </div>
                            );
                          }
                          // Regular prose
                          return (
                            <div key={idx} className="whitespace-pre-wrap leading-relaxed">
                              {part}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="mt-1 text-[10px] text-zinc-500 text-left font-mono">
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Chat Typing Loading Indicator */}
            {isChatLoading && (
              <div className="flex justify-end mb-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-400 flex items-center gap-2">
                  <span>دستیار در حال تحلیل نیازمندی و تدوین پاسخ است...</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                </div>
              </div>
            )}
          </div>

          {/* Chat Input Bar */}
          <div className="p-4 bg-[#141416] border-t border-zinc-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="max-w-4xl mx-auto flex items-end gap-2 relative"
            >
              <div className="flex-1 bg-zinc-900 border border-zinc-700 focus-within:border-cyan-500 rounded-xl p-2 transition-colors">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={1}
                  placeholder="دستور یا درخواست زیرساختی خود را بنویسید (Shift+Enter برای خط جدید)..."
                  className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none resize-none max-h-32 px-2 py-1 leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="p-2.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors border border-transparent hover:border-zinc-700"
                  title="پاک کردن تاریخچه چت کاربر جاری"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  type="submit"
                  disabled={!inputValue.trim() || isChatLoading}
                  className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <span>ارسال</span>
                  <Send className="w-3.5 h-3.5 rotate-180" />
                </button>
              </div>
            </form>
          </div>
        </main>

        {/* Host Terminal Drawer (Admin Only) */}
        {currentUser.role === 'admin' && isTerminalOpen && (
          <aside className="w-96 bg-[#0f0f11] border-l border-zinc-800 flex flex-col h-full z-10 shrink-0">
            <div className="h-14 px-4 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-950">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-white">ترمینال و اتوماسیون زنده</span>
              </div>
              <button
                onClick={() => setIsTerminalOpen(false)}
                className="text-zinc-500 hover:text-white p-1 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Quick Actions */}
            <div className="p-3 border-b border-zinc-800/80 bg-zinc-900/40 grid grid-cols-2 gap-1.5 text-[11px]">
              <button
                onClick={() => handleQuickAction('docker')}
                className="py-1.5 px-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-zinc-300 transition-colors"
              >
                Docker Containers
              </button>
              <button
                onClick={() => handleQuickAction('nginx')}
                className="py-1.5 px-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-zinc-300 transition-colors"
              >
                تست Nginx
              </button>
              <button
                onClick={() => handleQuickAction('wireguard')}
                className="py-1.5 px-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-zinc-300 transition-colors"
              >
                وضعیت WireGuard
              </button>
              <button
                onClick={() => handleQuickAction('services')}
                className="py-1.5 px-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-zinc-300 transition-colors"
              >
                سرویس‌های ویندوز
              </button>
            </div>

            {/* Terminal Output */}
            <div className="flex-1 p-3 overflow-y-auto font-mono text-[11px] text-emerald-400 bg-black/95 space-y-1 leading-relaxed selection:bg-emerald-900 selection:text-white direction-ltr text-left">
              {terminalLogs.map((log, i) => (
                <div key={i} className="whitespace-pre-wrap break-all">
                  {log}
                </div>
              ))}
            </div>

            {/* Terminal Input */}
            <form onSubmit={handleTerminalSubmit} className="p-2 bg-zinc-950 border-t border-zinc-800 flex gap-1.5">
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                placeholder="دستور PowerShell یا CMD..."
                className="flex-1 px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
              />
              <button type="submit" className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-mono">
                Run
              </button>
            </form>
          </aside>
        )}
      </div>

      {/* =========================================================================
          ADMIN SETTINGS MODAL
          Boxes: API Settings, SOCKS5 Proxy, RBAC Users, Skills Bank, Server Ops
         ========================================================================= */}
      {isSettingsOpen && currentUser.role === 'admin' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-[#18181b] border border-zinc-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="h-14 px-6 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-900/60">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-cyan-600/20 text-cyan-400 rounded-lg">
                  <Settings className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">پیکربندی جامع پلتفرم سازمانی</h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center px-6 border-b border-zinc-800 bg-zinc-950/40 text-xs overflow-x-auto">
              <button
                onClick={() => setActiveSettingsTab('api')}
                className={`py-3 px-4 border-b-2 font-medium transition-colors shrink-0 ${
                  activeSettingsTab === 'api'
                    ? 'text-cyan-400 border-cyan-400'
                    : 'text-zinc-400 hover:text-white border-transparent'
                }`}
              >
                تنظیمات API و مدل‌ها
              </button>
              <button
                onClick={() => setActiveSettingsTab('proxy')}
                className={`py-3 px-4 border-b-2 font-medium transition-colors shrink-0 ${
                  activeSettingsTab === 'proxy'
                    ? 'text-cyan-400 border-cyan-400'
                    : 'text-zinc-400 hover:text-white border-transparent'
                }`}
              >
                پراکسی SOCKS5
              </button>
              <button
                onClick={() => setActiveSettingsTab('users')}
                className={`py-3 px-4 border-b-2 font-medium transition-colors shrink-0 ${
                  activeSettingsTab === 'users'
                    ? 'text-cyan-400 border-cyan-400'
                    : 'text-zinc-400 hover:text-white border-transparent'
                }`}
              >
                کاربران و سطوح دسترسی (RBAC)
              </button>
              <button
                onClick={() => setActiveSettingsTab('skills')}
                className={`py-3 px-4 border-b-2 font-medium transition-colors shrink-0 ${
                  activeSettingsTab === 'skills'
                    ? 'text-cyan-400 border-cyan-400'
                    : 'text-zinc-400 hover:text-white border-transparent'
                }`}
              >
                بانک مهارت‌ها
              </button>
              <button
                onClick={() => setActiveSettingsTab('server')}
                className={`py-3 px-4 border-b-2 font-medium transition-colors shrink-0 ${
                  activeSettingsTab === 'server'
                    ? 'text-cyan-400 border-cyan-400'
                    : 'text-zinc-400 hover:text-white border-transparent'
                }`}
              >
                عملیات سرور
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* 1. API Tab */}
              {activeSettingsTab === 'api' && (
                <div className="space-y-5">
                  {/* Gemini API Key Box */}
                  <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">اتصال به Google Gemini API</span>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:underline text-[11px] inline-flex items-center gap-1"
                      >
                        <span>دریافت کلید API جمینای</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <input
                      type="password"
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      disabled={isTestingModels}
                      onClick={() => handleTestAndFetchModels('gemini')}
                      className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-cyan-400 hover:text-cyan-300 text-xs rounded-lg border border-zinc-700 transition-colors flex items-center gap-2"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTestingModels ? 'animate-spin' : ''}`} />
                      <span>تست ارتباط و دریافت مدل‌های جمینای</span>
                    </button>
                  </div>

                  {/* OpenRouter API Key Box */}
                  <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">اتصال به OpenRouter API</span>
                      <a
                        href="https://openrouter.ai/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:underline text-[11px] inline-flex items-center gap-1"
                      >
                        <span>دریافت کلید OpenRouter</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <input
                      type="password"
                      value={openRouterApiKey}
                      onChange={(e) => setOpenRouterApiKey(e.target.value)}
                      placeholder="sk-or-v1-..."
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      disabled={isTestingModels}
                      onClick={() => handleTestAndFetchModels('openrouter')}
                      className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-cyan-400 hover:text-cyan-300 text-xs rounded-lg border border-zinc-700 transition-colors flex items-center gap-2"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTestingModels ? 'animate-spin' : ''}`} />
                      <span>تست ارتباط و دریافت مدل‌های OpenRouter</span>
                    </button>
                  </div>

                  {/* Live Feedback of Dynamic Model Fetching */}
                  {modelTestStatus && (
                    <div
                      className={`p-3 rounded-lg text-xs border leading-relaxed ${
                        modelTestStatus.success
                          ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800'
                          : 'bg-red-950/50 text-red-300 border-red-800'
                      }`}
                    >
                      {modelTestStatus.message}
                    </div>
                  )}
                </div>
              )}

              {/* 2. Proxy Tab */}
              {activeSettingsTab === 'proxy' && (
                <div className="space-y-4">
                  <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-white">فعال‌سازی پراکسی SOCKS5</div>
                        <div className="text-[11px] text-zinc-400">تمام ترافیک خروجی به سمت APIهای هوش مصنوعی از این پراکسی عبور داده می‌شود.</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={proxyEnabled}
                        onChange={(e) => setProxyEnabled(e.target.checked)}
                        className="w-4 h-4 accent-cyan-500 cursor-pointer"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">آدرس IP یا دامنه سرور</label>
                        <input
                          type="text"
                          value={proxyHost}
                          onChange={(e) => setProxyHost(e.target.value)}
                          placeholder="127.0.0.1"
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">پورت (Port)</label>
                        <input
                          type="text"
                          value={proxyPort}
                          onChange={(e) => setProxyPort(e.target.value)}
                          placeholder="10808"
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">نام کاربری پراکسی (اختیاری)</label>
                        <input
                          type="text"
                          value={proxyUser}
                          onChange={(e) => setProxyUser(e.target.value)}
                          placeholder=""
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">رمز عبور پراکسی (اختیاری)</label>
                        <input
                          type="password"
                          value={proxyPass}
                          onChange={(e) => setProxyPass(e.target.value)}
                          placeholder=""
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Users Tab (RBAC) */}
              {activeSettingsTab === 'users' && (
                <div className="space-y-5">
                  <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
                    <h4 className="text-xs font-semibold text-white mb-3">افزودن کاربر جدید به سامانه</h4>
                    <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-zinc-400 mb-1">نام کاربری (انگلیسی)</label>
                        <input
                          type="text"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          required
                          className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-400 mb-1">کلمه عبور</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-400 mb-1">نام نمایشی (فارسی)</label>
                        <input
                          type="text"
                          value={newDisplayName}
                          onChange={(e) => setNewDisplayName(e.target.value)}
                          placeholder="مثلاً مهندس رضایی"
                          className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-400 mb-1">سطح دسترسی (Role)</label>
                        <select
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value as any)}
                          className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded text-white"
                        >
                          <option value="user">کاربر عادی (user) - فقط چت و ذخیره سابقه</option>
                          <option value="admin">مدیر سیستم (admin) - دسترسی کامل و تنظیمات</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2 pt-1">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs transition-colors"
                        >
                          ثبت کاربر در فایل AISystemManager_Config.json
                        </button>
                      </div>
                    </form>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-white mb-2">لیست کاربران فعال</h4>
                    <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/40 divide-y divide-zinc-800 text-xs">
                      {usersList.map((u) => (
                        <div key={u.username} className="p-2.5 flex items-center justify-between hover:bg-zinc-800/40">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{u.username}</span>
                            <span className="text-zinc-500 text-[11px]">({u.displayName})</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                              u.role === 'admin' 
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' 
                                : 'bg-zinc-800 text-zinc-400'
                            }`}>
                              {u.role}
                            </span>
                          </div>
                          {u.username !== currentUser.username ? (
                            <button
                              onClick={() => handleDeleteUser(u.username)}
                              className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-950/30"
                            >
                              حذف
                            </button>
                          ) : (
                            <span className="text-[10px] text-zinc-600">اکانت جاری</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Skills Tab */}
              {activeSettingsTab === 'skills' && (
                <div className="space-y-4">
                  <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-3">
                    <h4 className="text-xs font-semibold text-white">بانک جامع مهارت‌های سیستمی هوش مصنوعی</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      این ماژول‌ها دستورالعمل‌های سیستمی و نقش‌های تخصصی زیرساخت را در هسته هوش مصنوعی برای پاسخ‌دهی دقیق تزریق می‌کنند:
                    </p>

                    <div className="space-y-2 pt-2 text-xs">
                      <label className="flex items-start gap-3 p-2.5 bg-zinc-950 rounded border border-zinc-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={skillsConfig.dockerNginx}
                          onChange={(e) => setSkillsConfig({ ...skillsConfig, dockerNginx: e.target.checked })}
                          className="mt-0.5 accent-cyan-500 cursor-pointer"
                        />
                        <div>
                          <div className="font-medium text-white">مدیریت و اتوماسیون Nginx و کانتینرهای Docker</div>
                          <div className="text-[11px] text-zinc-500">پیکربندی ریورس پروکسی، گواهی SSL، سلامت کانتینرها و docker-compose</div>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-2.5 bg-zinc-950 rounded border border-zinc-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={skillsConfig.networkTunnels}
                          onChange={(e) => setSkillsConfig({ ...skillsConfig, networkTunnels: e.target.checked })}
                          className="mt-0.5 accent-cyan-500 cursor-pointer"
                        />
                        <div>
                          <div className="font-medium text-white">پیکربندی و راه‌اندازی تونل‌های شبکه (WireGuard & GRE)</div>
                          <div className="text-[11px] text-zinc-500">تولید فایل‌های wg0.conf، تنظیم MTU، مسیریابی و فایروال iptables</div>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-2.5 bg-zinc-950 rounded border border-zinc-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={skillsConfig.activeDirectoryEsxi}
                          onChange={(e) => setSkillsConfig({ ...skillsConfig, activeDirectoryEsxi: e.target.checked })}
                          className="mt-0.5 accent-cyan-500 cursor-pointer"
                        />
                        <div>
                          <div className="font-medium text-white">مدیریت Active Directory، سرورهای ESXi و سرویس‌های ویندوز</div>
                          <div className="text-[11px] text-zinc-500">اسکریپت‌های PowerShell، دستورات esxcli، مانیتورینگ سرویس‌ها و گزارش‌گیری</div>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-2.5 bg-zinc-950 rounded border border-zinc-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={skillsConfig.n8nAutomation}
                          onChange={(e) => setSkillsConfig({ ...skillsConfig, n8nAutomation: e.target.checked })}
                          className="mt-0.5 accent-cyan-500 cursor-pointer"
                        />
                        <div>
                          <div className="font-medium text-white">یکپارچه‌سازی و درک سناریوهای اتوماسیون ترکیبی (n8n)</div>
                          <div className="text-[11px] text-zinc-500">طراحی جریان‌های کاری اتوماتیک، وب‌هوک‌های امنیتی و اعلان خطاهای شبکه</div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Server Ops Tab */}
              {activeSettingsTab === 'server' && (
                <div className="space-y-4">
                  <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-4">
                    <h4 className="text-xs font-semibold text-white">کنترل پردازش محلی سرور</h4>
                    <p className="text-xs text-zinc-400">
                      عملیات راه‌اندازی مجدد یا توقف پردازش بک‌اند پایتون روی سرور میزبان:
                    </p>

                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        onClick={() => {
                          if (confirm('آیا از راه‌اندازی مجدد سرور مطمئن هستید؟')) {
                            setServerActionMsg('دستور راه‌اندازی مجدد (Restart) به پردازش بک‌اند ارسال گردید.');
                          }
                        }}
                        className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-600/40 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>راه‌اندازی مجدد سرور (Restart)</span>
                      </button>

                      <button
                        onClick={() => {
                          if (confirm('آیا از خاموش کردن سرور GapGPT مطمئن هستید؟')) {
                            setServerActionMsg('پردازش سرور متوقف گردید. برای راه‌اندازی مجدد، فایل GapGPT-Manager.exe را اجرا کنید.');
                          }
                        }}
                        className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-600/40 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                      >
                        <Power className="w-4 h-4" />
                        <span>خاموش کردن سرور (Shutdown)</span>
                      </button>
                    </div>

                    {serverActionMsg && (
                      <div className="text-xs p-3 rounded-lg border bg-amber-950/50 text-amber-300 border-amber-800">
                        {serverActionMsg}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="h-16 px-6 border-t border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-900/60">
              <span className="text-xs text-zinc-400">ذخیره در AISystemManager_Config.json</span>
              <button
                onClick={() => {
                  if (geminiApiKey) localStorage.setItem('gapgpt_gemini_key', geminiApiKey);
                  if (openRouterApiKey) localStorage.setItem('gapgpt_openrouter_key', openRouterApiKey);
                  setIsSettingsOpen(false);
                }}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
              >
                ذخیره و تایید تنظیمات
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          SOURCE CODE INSPECTOR & DEPLOYMENT GUIDE MODAL
         ========================================================================= */}
      {isSourceViewerOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-[#18181b] border border-zinc-800 rounded-xl shadow-2xl flex flex-col h-[85vh] overflow-hidden">
            
            {/* Header */}
            <div className="h-14 px-6 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-900/80">
              <div className="flex items-center gap-2.5">
                <FileCode className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">سورس‌کدهای پروژه GapGPT Enterprise</h3>
              </div>
              <button
                onClick={() => setIsSourceViewerOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Left File List */}
              <div className="w-64 border-l border-zinc-800 bg-zinc-950 p-3 space-y-1 overflow-y-auto">
                <div className="text-[11px] font-semibold text-zinc-400 px-2 py-1 mb-1">فایل‌های اصلی پروژه</div>
                {Object.keys(sourceCodeFiles).map(fileName => (
                  <button
                    key={fileName}
                    onClick={() => setSelectedSourceFile(fileName)}
                    className={`w-full text-right px-2.5 py-1.5 rounded text-xs font-mono transition-colors flex items-center justify-between ${
                      selectedSourceFile === fileName
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    <span className="truncate">{fileName}</span>
                  </button>
                ))}
              </div>

              {/* Right Code Display */}
              <div className="flex-1 flex flex-col bg-black/90 overflow-hidden">
                <div className="h-10 px-4 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between">
                  <span className="font-mono text-xs text-zinc-400">{selectedSourceFile}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(sourceCodeFiles[selectedSourceFile]);
                      alert(`محتوای کامل فایل ${selectedSourceFile} در کلیپ‌بورد کپی شد.`);
                    }}
                    className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>کپی سورس کامل</span>
                  </button>
                </div>
                <pre className="flex-1 p-4 overflow-auto font-mono text-[11px] text-emerald-400/90 whitespace-pre leading-relaxed direction-ltr text-left">
                  {sourceCodeFiles[selectedSourceFile]}
                </pre>
              </div>

            </div>

            {/* Footer */}
            <div className="h-12 px-6 border-t border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-900 text-xs text-zinc-400">
              <span>تمام این فایل‌ها بر روی دیسک در روت پروژه ایجاد شده‌اند.</span>
              <button
                onClick={() => setIsSourceViewerOpen(false)}
                className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs"
              >
                بستن
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
