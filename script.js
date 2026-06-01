/* Full-Stack Dashboard JavaScript Interactions */

document.addEventListener('DOMContentLoaded', () => {

    const API_BASE_URL = 'http://localhost:3000/api';
    
    // 1. Live Datetime - Update only when minutes change to prevent fluttering
    const datetimeDisplay = document.querySelector('.datetime');
    let lastMinute = -1;
    function updateDateTime() {
        const now = new Date();
        if (now.getMinutes() !== lastMinute) {
            lastMinute = now.getMinutes();
            const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            if (datetimeDisplay) {
                datetimeDisplay.textContent = now.toLocaleDateString('en-US', options);
            }
        }
    }
    setInterval(updateDateTime, 1000);
    updateDateTime();
    
    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            const icon = themeToggle.querySelector('i');
            if (document.body.classList.contains('light-theme')) {
                icon.className = 'fas fa-sun';
            } else {
                icon.className = 'fas fa-moon';
            }
        });
    }
    
    // 2. Navigation Highlighting
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const link = item.getAttribute('href');
        if (link === currentPath) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // 3. Notifications interaction
    const bellIcon = document.querySelector('.fa-envelope');
    if (bellIcon) {
        bellIcon.addEventListener('click', () => {
            alert("Administrative System: Connected securely to backend cluster. No new messages.");
        });
    }

    // 4. API Fetching Logic
    async function fetchDashboardMetrics() {
        try {
            const resp = await fetch(`${API_BASE_URL}/metrics`);
            if(!resp.ok) throw new Error('API down');
            const data = await resp.json();
            
            // Updating Dashboard KPIs
            if(document.getElementById('dash-network-up')) {
                document.getElementById('dash-network-up').textContent = `${data.networkUp}%`;
            }
            if(document.getElementById('dash-active-num')) {
                document.getElementById('dash-active-num').textContent = data.activeAlarms;
            }
            
            // Updating Traffic if on traffic page
            if(document.getElementById('traffic-index')) {
                document.getElementById('traffic-index').textContent = `${data.trafficIndex} / 10`;
            }
        } catch(err) {
            console.warn("Failed to fetch backend metrics (Is Node server running on port 3000?). Defaulting to cached data.");
        }
    }

    // Interval fetchers depending on page - reduced frequency to avoid layout thrashing
    if (currentPath === "index.html" || currentPath === "" || currentPath === "traffic.html") {
        setInterval(fetchDashboardMetrics, 15000);
        fetchDashboardMetrics();
    }

    // 5. Advanced Data Visualization (Chart.js via Express API)
    if (currentPath === "analytics.html") {
        // Wait for Chart.js to be available
        function initChart() {
            const ctx = document.getElementById('analyticsChart');
            if (!ctx) return;
            
            if (typeof Chart === 'undefined') {
                console.warn('Chart.js not loaded yet, retrying...');
                setTimeout(initChart, 500);
                return;
            }

            const initialHistory = Array.from({ length: 20 }, () => 100);
            const fixedLabels = Array.from({ length: 20 }, (_, i) => `T-${20-i}s`);
            
            let myChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: fixedLabels,
                    datasets: [{
                        label: 'Real-time Server I/O Load',
                        data: initialHistory,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 3,
                        pointBackgroundColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 0 },
                    scales: {
                        y: { 
                            beginAtZero: false,
                            min: 60, 
                            max: 140, 
                            grid: { color: 'rgba(255,255,255,0.05)' }, 
                            ticks: { color: '#94a3b8' } 
                        },
                        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
                    },
                    plugins: { 
                        legend: { labels: { color: '#f8fafc', font: { family: 'Inter' } } }
                    }
                }
            });

            async function fetchChartData() {
                try {
                    const resp = await fetch(`${API_BASE_URL}/analytics`);
                    if (!resp.ok) throw new Error('API error');
                    const data = await resp.json();
                    if (data.success && Array.isArray(data.history)) {
                        const numericHistory = data.history.map(value => Number(value) || 0);
                        myChart.data.datasets[0].data = numericHistory;
                        myChart.update('none');
                    }
                } catch (err) {
                    console.warn("Chart DB fetch failed:", err.message);
                }
            }

            setInterval(fetchChartData, 3000);
            fetchChartData();
        }
        
        initChart();
    }

    // 6. Settings REST API Integration
    const settingsForm = document.getElementById('settings-form');
    if(settingsForm) {
        // Pre-fill form from database upon loading
        fetch(`${API_BASE_URL}/settings`)
            .then(r => r.json())
            .then(data => {
                if(data.adminEmail) settingsForm.querySelector('input[type="email"]').value = data.adminEmail;
                if(data.syncFrequency) settingsForm.querySelector('select').value = data.syncFrequency;
                if(data.storageQuota) settingsForm.querySelector('input[type="number"]').value = data.storageQuota;
            }).catch(e => console.warn("Could not load previous settings from backend."));

        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = settingsForm.querySelector('.btn');
            const originalText = btn.textContent;
            btn.textContent = "Writing to Database...";
            
            const payload = {
                adminEmail: settingsForm.querySelector('input[type="email"]').value,
                syncFrequency: settingsForm.querySelector('select').value,
                storageQuota: settingsForm.querySelector('input[type="number"]').value
            };

            try {
                const response = await fetch(`${API_BASE_URL}/settings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                const result = await response.json();
                if(result.success) {
                    btn.textContent = "Saved to Database!";
                    btn.style.backgroundColor = "var(--success-color)";
                }
            } catch (err) {
                btn.textContent = "Server Error (Needs Node.js)";
                btn.style.backgroundColor = "var(--danger-color)";
            }

            // Revert button text logically
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.backgroundColor = "var(--primary-color)";
            }, 3000);
        });
    }

});
