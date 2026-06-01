const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());

// Helper to reliably read DB
const readDB = () => {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return { settings: {}, analyticsHistory: [] };
    }
};

// Helper to save to DB
const writeDB = (data) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
};

// GET Route: Fetch Analytics Data for Chart.js
app.get('/api/analytics', (req, res) => {
    const db = readDB();
    // Simulate real-world data streaming by appending slightly fluctuating data points
    let current = db.analyticsHistory[db.analyticsHistory.length - 1] || 100;
    const nextVal = current + (Math.floor(Math.random() * 11) - 5);
    db.analyticsHistory.push(nextVal);
    
    // Ensure array doesn't grow infinitely large (keep last 20 points)
    if (db.analyticsHistory.length > 20) {
        db.analyticsHistory.shift();
    }
    
    writeDB(db);
    res.json({ success: true, history: db.analyticsHistory });
});

// GET Route: Pull live dynamic metrics
app.get('/api/metrics', (req, res) => {
    res.json({
        networkUp: (98 + Math.random() * 1.9).toFixed(2),
        activeAlarms: Math.floor(Math.random() * 2) + 3,
        powerLoad: Math.floor(Math.random() * 15) + 65,
        trafficIndex: (Math.random() * 0.5 + 4.2).toFixed(1)
    });
});

// GET Route: Fetch remote settings
app.get('/api/settings', (req, res) => {
    const db = readDB();
    res.json(db.settings);
});

// POST Route: Securely save administration configuration to disk
app.post('/api/settings', (req, res) => {
    const db = readDB();
    db.settings = { ...db.settings, ...req.body };
    writeDB(db);
    res.json({ success: true, message: "Configuration successfully patched to root DB." });
});

app.listen(PORT, () => {
    console.log(`[City.OS Backend] Architecture initialization successful on http://localhost:${PORT}`);
});
