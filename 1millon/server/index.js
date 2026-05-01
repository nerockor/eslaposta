const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Database setup
const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to SQLite database');
        db.run(`CREATE TABLE IF NOT EXISTS ads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT NOT NULL,
            x INTEGER NOT NULL,
            y INTEGER NOT NULL,
            width INTEGER DEFAULT 10,
            height INTEGER DEFAULT 10,
            sector TEXT NOT NULL,
            image TEXT,
            name TEXT,
            phone TEXT,
            email TEXT,
            expiration_date TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        // Ensure new columns exist for old databases
        const columns = ['image', 'name', 'phone', 'email', 'expiration_date'];
        columns.forEach(col => {
            db.run(`ALTER TABLE ads ADD COLUMN ${col} TEXT`, (err) => {
                if (err) { /* column probably exists */ }
            });
        });
    }
});

// Canvas constraints
const CANVAS_SIZE = 3200;
const GRID_STEP = 10; // The base unit size (10x10)
const SECTOR_SIZE = Math.floor((CANVAS_SIZE / 3) / GRID_STEP) * GRID_STEP;

// Sector mapping to bounding boxes
const SECTORS = {
    'superior-izquierdo': { x: 0, y: 0 },
    'superior-centro': { x: SECTOR_SIZE, y: 0 },
    'superior-derecho': { x: SECTOR_SIZE * 2, y: 0 },
    'centro-izquierdo': { x: 0, y: SECTOR_SIZE },
    'centro': { x: SECTOR_SIZE, y: SECTOR_SIZE },
    'centro-derecho': { x: SECTOR_SIZE * 2, y: SECTOR_SIZE },
    'inferior-izquierdo': { x: 0, y: SECTOR_SIZE * 2 },
    'inferior-centro': { x: SECTOR_SIZE, y: SECTOR_SIZE * 2 },
    'inferior-derecho': { x: SECTOR_SIZE * 2, y: SECTOR_SIZE * 2 }
};

// API: Get all ads (Lightweight - No images)
app.get('/api/ads', (req, res) => {
    db.all("SELECT id, url, x, y, width, height, sector, name, expiration_date FROM ads", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// API: Get full data for specific ads (Lazy Loading)
app.post('/api/ads/batch', (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ error: 'IDs array required' });
    }

    const placeholders = ids.map(() => '?').join(',');
    db.all(`SELECT id, image FROM ads WHERE id IN (${placeholders})`, ids, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// API: Add new ad
app.post('/api/ads', (req, res) => {
    const { url, sector, image, name, phone, email, expiration_date, size } = req.body;

    if (!url || !sector || !SECTORS[sector]) {
        return res.status(400).json({ error: 'URL and valid sector are required' });
    }
    
    // Parse the requested block size based on UI combos
    const requestedSize = parseInt(size) || 10;
    if (![10, 20, 50].includes(requestedSize)) {
        return res.status(400).json({ error: 'Invalid block size requested' });
    }

    const bounds = SECTORS[sector];
    
    // Fetch existing ads in sector to build occupancy grid
    db.all("SELECT x, y, width, height FROM ads WHERE sector = ?", [sector], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Sector grid dimensions
        const gridCols = Math.floor(SECTOR_SIZE / GRID_STEP);
        const grid = Array.from({ length: gridCols }, () => Array(gridCols).fill(false));

        // Mark all occupied spaces perfectly mathematically mapped onto the virtual grid
        rows.forEach(ad => {
            const relX = ad.x - bounds.x;
            const relY = ad.y - bounds.y;
            
            const startCol = Math.round(relX / GRID_STEP);
            const startRow = Math.round(relY / GRID_STEP);
            
            const cellW = Math.round(ad.width / GRID_STEP);
            const cellH = Math.round(ad.height / GRID_STEP);
            
            for (let r = 0; r < cellH; r++) {
                for (let c = 0; c < cellW; c++) {
                    const gridR = startRow + r;
                    const gridC = startCol + c;
                    
                    if (gridR >= 0 && gridR < gridCols && gridC >= 0 && gridC < gridCols) {
                        grid[gridR][gridC] = true;
                    }
                }
            }
        });

        // Scan algorithm looking for first contiguous open subset 
        const cellsNeeded = requestedSize / GRID_STEP;
        let found = false;
        let bestCol = -1;
        let bestRow = -1;

        for (let r = 0; r <= gridCols - cellsNeeded; r++) {
            for (let c = 0; c <= gridCols - cellsNeeded; c++) {
                
                let isClear = true;
                for (let wr = 0; wr < cellsNeeded; wr++) {
                    for (let wc = 0; wc < cellsNeeded; wc++) {
                        if (grid[r + wr][c + wc]) {
                            isClear = false;
                            break;
                        }
                    }
                    if (!isClear) break;
                }

                if (isClear) {
                    bestCol = c;
                    bestRow = r;
                    found = true;
                    break;
                }
            }
            if (found) break;
        }

        if (!found) {
            return res.status(400).json({ error: 'Sector is full or lacks enough contiguous space to drop this block combo.' });
        }

        // Transform internal relative grid coordinates back to universal absolute map XY definitions
        const nextX = bounds.x + (bestCol * GRID_STEP);
        const nextY = bounds.y + (bestRow * GRID_STEP);

        const stmt = db.prepare("INSERT INTO ads (url, x, y, sector, width, height, image, name, phone, email, expiration_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        stmt.run(url, nextX, nextY, sector, requestedSize, requestedSize, image, name, phone, email, expiration_date, function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, x: nextX, y: nextY, width: requestedSize, height: requestedSize });
        });
        stmt.finalize();
    });
});

// Serve frontend in production (optional, for now we run separately)
// app.use(express.static(path.join(__dirname, '../client/dist')));

// API: Update ad
app.put('/api/ads/:id', (req, res) => {
    const { id } = req.params;
    const { url, image, name, phone, email, expiration_date } = req.body;
    
    db.run("UPDATE ads SET url = ?, image = ?, name = ?, phone = ?, email = ?, expiration_date = ? WHERE id = ?", 
        [url, image, name, phone, email, expiration_date, id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, changes: this.changes });
    });
});

// API: Delete ad
app.delete('/api/ads/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM ads WHERE id = ?", [id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, changes: this.changes });
    });
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
