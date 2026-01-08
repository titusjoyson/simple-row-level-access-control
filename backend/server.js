const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const authMiddleware = require('./middleware/auth.middleware');

// Controllers
const kpiController = require('./controllers/kpi.controller');
const accessController = require('./controllers/access.controller');
const contextController = require('./controllers/context.controller');
const adminController = require('./controllers/admin.controller');
const groupsController = require('./controllers/groups.controller');

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

// User Context (Identity + Permissions)
app.get('/api/me/context', contextController.getMyContext);

// KPI Routes
app.get('/api/kpis', kpiController.getKPIs);
app.get('/api/kpis/:id/data', kpiController.getKPIData);

// Access Management Routes
app.post('/api/access/request', accessController.requestAccess);
app.get('/api/access/pending', accessController.getPendingRequests);
app.post('/api/access/approve', accessController.approveRequest);

// Admin Dashboard Routes
app.get('/api/admin/users', adminController.getUsers);
app.get('/api/admin/users/:id', adminController.getUserDetails);
app.get('/api/admin/capabilities', adminController.getCapabilities);
app.post('/api/admin/users/:id/capabilities', adminController.updateUserCapability);
app.delete('/api/admin/users/:id/capabilities', adminController.resetUserCapability);

// Release 1.0 Features
app.post('/api/admin/users/:id/scopes', adminController.addScope);
app.delete('/api/admin/users/:id/scopes/:scopeId', adminController.removeScope);
app.get('/api/admin/audit/:userId', adminController.getAuditLogs);
app.get('/api/admin/dimensions', adminController.getDimensions);

// Enterprise Features (Groups)
app.get('/api/admin/groups', groupsController.getGroups);
app.post('/api/admin/groups', groupsController.createGroup);
app.get('/api/admin/groups/:id', groupsController.getGroupDetail);
app.post('/api/admin/groups/:id/members', groupsController.addMember);
app.delete('/api/admin/groups/:id/members/:userId', groupsController.removeMember);
// Group Scopes
app.post('/api/admin/groups/:id/scopes', groupsController.addScope);
app.delete('/api/admin/groups/:id/scopes/:scopeId', groupsController.removeScope);
// Group Capabilities
app.post('/api/admin/groups/:id/capabilities', groupsController.updateCapability);
app.delete('/api/admin/groups/:id/capabilities', groupsController.resetCapability);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
