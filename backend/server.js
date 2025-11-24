const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const authMiddleware = require('./middleware/auth.middleware');
const kpiController = require('./controllers/kpi.controller');
const accessController = require('./controllers/access.controller');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

// Public Route (Health Check)
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Protected Routes
app.use('/api', authMiddleware);

// KPI Routes
app.get('/api/kpis', kpiController.getKPIs);
app.get('/api/kpis/:id/data', kpiController.getKPIData);

// Access Management Routes
app.post('/api/access/request', accessController.requestAccess);
app.get('/api/access/pending', accessController.getPendingRequests);
app.post('/api/access/approve', accessController.approveRequest);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
