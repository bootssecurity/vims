/**
 * Renders a premium, glassmorphic landing page for the VIMS platform.
 */
export function renderVimsDashboard(data: any) {
  const { name, version, status, health, resources, endpoints } = data;

  const healthCards = Object.entries(health).map(([key, info]: [string, any]) => {
    const isOnline = info.status === "Online";
    const statusColor = isOnline ? "#10b981" : "#ef4444";
    const statusLabel = isOnline ? "Online" : info.status;
    const pulseAnim = isOnline ? "pulse 2s infinite" : "none";

    return `
      <div class="card status-card">
        <div class="card-header">
          <span class="card-title">${key.toUpperCase()}</span>
          <div class="status-indicator">
            <div class="status-dot" style="background-color: ${statusColor}; box-shadow: 0 0 10px ${statusColor}; animation: ${pulseAnim}"></div>
            <span class="status-text" style="color: ${statusColor}">${statusLabel}</span>
          </div>
        </div>
        <div class="card-body">
          <span class="latency">${info.latency}ms</span>
          <span class="label">Response Time</span>
        </div>
      </div>
    `;
  }).join("");

  const resourceGrid = Object.entries(resources).map(([key, count]) => `
    <div class="resource-item">
      <span class="resource-count">${count}</span>
      <span class="resource-label">${key.charAt(0).toUpperCase() + key.slice(1)}</span>
    </div>
  `).join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name} | ${version}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #0a0a0a;
            --surface: rgba(255, 255, 255, 0.03);
            --border: rgba(255, 255, 255, 0.08);
            --text-primary: #ffffff;
            --text-secondary: #a1a1aa;
            --accent: #3b82f6;
            --accent-glow: rgba(59, 130, 246, 0.5);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background-color: var(--bg);
            color: var(--text-primary);
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            overflow-x: hidden;
        }

        .background-blob {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
            z-index: -1;
            filter: blur(80px);
            opacity: 0.15;
        }

        .container {
            width: 100%;
            max-width: 900px;
            padding: 40px 20px;
            animation: fadeIn 0.8s ease-out;
        }

        header {
            text-align: center;
            margin-bottom: 60px;
        }

        .logo-tag {
            display: inline-block;
            background: var(--surface);
            border: 1px solid var(--border);
            padding: 6px 12px;
            border-radius: 100px;
            font-size: 12px;
            font-weight: 600;
            color: var(--accent);
            letter-spacing: 0.05em;
            margin-bottom: 16px;
            text-transform: uppercase;
        }

        h1 {
            font-size: 48px;
            font-weight: 800;
            letter-spacing: -0.02em;
            margin-bottom: 8px;
            background: linear-gradient(to bottom right, #fff 30%, #a1a1aa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .version {
            color: var(--text-secondary);
            font-family: 'JetBrains Mono', monospace;
            font-size: 16px;
        }

        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 40px;
        }

        .card {
            background: var(--surface);
            border: 1px solid var(--border);
            backdrop-filter: blur(12px);
            border-radius: 24px;
            padding: 24px;
            transition: transform 0.3s ease, border-color 0.3s ease;
        }

        .card:hover {
            border-color: rgba(255, 255, 255, 0.15);
            transform: translateY(-2px);
        }

        .status-card .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .card-title {
            font-size: 12px;
            font-weight: 700;
            color: var(--text-secondary);
            letter-spacing: 0.1em;
        }

        .status-indicator {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }

        .status-text {
            font-size: 13px;
            font-weight: 600;
        }

        .latency {
            font-size: 32px;
            font-weight: 700;
            display: block;
            margin-bottom: 4px;
        }

        .label {
            font-size: 13px;
            color: var(--text-secondary);
        }

        .resources-card {
            grid-column: span 2;
        }

        .resource-row {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            text-align: center;
        }

        .resource-item {
            display: flex;
            flex-direction: column;
        }

        .resource-count {
            font-size: 36px;
            font-weight: 800;
            color: var(--accent);
        }

        .resource-label {
            font-size: 13px;
            font-weight: 600;
            color: var(--text-secondary);
        }

        .action-row {
            display: flex;
            justify-content: center;
            gap: 16px;
        }

        .btn {
            display: flex;
            align-items: center;
            gap: 10px;
            background: #ffffff;
            color: #000000;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 15px;
            transition: transform 0.2s ease, background 0.2s ease;
        }

        .btn:hover {
            background: #e4e4e7;
            transform: scale(1.02);
        }

        .btn-secondary {
            background: var(--surface);
            border: 1px solid var(--border);
            color: var(--text-primary);
        }

        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.2);
        }

        @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.2); }
            100% { opacity: 1; transform: scale(1); }
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 640px) {
            .dashboard-grid { grid-template-columns: 1fr; }
            .resources-card { grid-column: span 1; }
            .resource-row { grid-template-columns: repeat(2, 1fr); }
            h1 { font-size: 36px; }
        }
    </style>
</head>
<body>
    <div class="background-blob"></div>
    <div class="container">
        <header>
            <div class="logo-tag">System Status</div>
            <h1>${name}</h1>
            <div class="version">v${version} &bull; ${status}</div>
        </header>

        <div class="dashboard-grid">
            ${healthCards}
            
            <div class="card resources-card">
              <div class="card-header" style="margin-bottom: 30px;">
                <span class="card-title">WORKSPACE RESOURCES</span>
              </div>
              <div class="resource-row">
                <div class="resource-item">
                  <span class="resource-count">7</span>
                  <span class="resource-label">Modules</span>
                </div>
                <div class="resource-item">
                  <span class="resource-count">5</span>
                  <span class="resource-label">Providers</span>
                </div>
                <div class="resource-item">
                  <span class="resource-count">1</span>
                  <span class="resource-label">Plugins</span>
                </div>
                <div class="resource-item">
                  <span class="resource-count">${resources.subscribers}</span>
                  <span class="resource-label">Subscribers</span>
                </div>
                <div class="resource-item">
                  <span class="resource-count">${resources.workflows}</span>
                  <span class="resource-label">Workflows</span>
                </div>
                <div class="resource-item">
                  <span class="resource-count">${resources.apiRoutes}</span>
                  <span class="resource-label">API Routes</span>
                </div>
              </div>
            </div>
        </div>

        <div class="action-row">
            <a href="${endpoints.admin}" class="btn">Open Admin Dashboard</a>
            <a href="${endpoints.health}" class="btn btn-secondary">System Health</a>
        </div>
    </div>
</body>
</html>
    `;
}
