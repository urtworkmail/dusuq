import api from './client'

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login:          (data) => api.post('/auth/login/', data),
  register:       (data) => api.post('/auth/register/', data),
  logout:         (data) => api.post('/auth/logout/', data),
  refreshToken:   (data) => api.post('/auth/token/refresh/', data),
  me:             ()     => api.get('/auth/me/'),
  updateMe:       (data) => api.patch('/auth/me/', data),
  changePassword: (data) => api.post('/auth/me/change-password/', data),
  listUsers:      ()     => api.get('/auth/users/'),
  createUser:     (data) => api.post('/auth/users/', data),
  updateUser:     (id, data) => api.patch(`/auth/users/${id}/`, data),
  deactivateUser: (id)   => api.delete(`/auth/users/${id}/`),
  resetPassword:  (data) => api.post('/auth/users/reset-password/', data),
}

// ─── Tenants ──────────────────────────────────────────────────────────────────
export const tenantAPI = {
  getProfile:   ()     => api.get('/tenants/profile/'),
  updateProfile:(data) => api.patch('/tenants/profile/', data),
  getSmtp:      ()     => api.get('/tenants/smtp/'),
  saveSmtp:     (data) => api.put('/tenants/smtp/', data),
  testSmtp:     (data) => api.post('/tenants/smtp/test/', data),
  listSheds:    ()     => api.get('/tenants/sheds/'),
  createShed:   (data) => api.post('/tenants/sheds/', data),
  updateShed:   (id, data) => api.patch(`/tenants/sheds/${id}/`, data),
  deleteShed:   (id)   => api.delete(`/tenants/sheds/${id}/`),
  listGroups:   ()     => api.get('/tenants/groups/'),
  createGroup:  (data) => api.post('/tenants/groups/', data),
  updateGroup:  (id, data) => api.patch(`/tenants/groups/${id}/`, data),
  deleteGroup:  (id)   => api.delete(`/tenants/groups/${id}/`),
  listBreeds:   ()     => api.get('/tenants/breeds/'),
  createBreed:  (data) => api.post('/tenants/breeds/', data),
}

// ─── Animals ──────────────────────────────────────────────────────────────────
export const animalAPI = {
  list:    (params) => api.get('/animals/', { params }),
  get:     (id)     => api.get(`/animals/${id}/`),
  create:  (data)   => api.post('/animals/', data),
  update:  (id, data) => api.patch(`/animals/${id}/`, data),
  delete:  (id)     => api.delete(`/animals/${id}/`),
  summary: ()       => api.get('/animals/summary/'),
}

// ─── Reproduction ─────────────────────────────────────────────────────────────
export const reproAPI = {
  dashboard:   ()       => api.get('/reproduction/dashboard/'),
  techPerf:    (params) => api.get('/reproduction/technician-performance/', { params }),
  tasks:       (params) => api.get('/reproduction/expected-tasks/', { params }),

  listInseminations:  (params) => api.get('/reproduction/inseminations/', { params }),
  createInsemination: (data)   => api.post('/reproduction/inseminations/', data),
  updateInsemination: (id, data) => api.patch(`/reproduction/inseminations/${id}/`, data),
  deleteInsemination: (id)     => api.delete(`/reproduction/inseminations/${id}/`),

  listPregTests:  (params) => api.get('/reproduction/pregnancy-tests/', { params }),
  createPregTest: (data)   => api.post('/reproduction/pregnancy-tests/', data),

  listDryOffs:  (params) => api.get('/reproduction/dry-offs/', { params }),
  createDryOff: (data)   => api.post('/reproduction/dry-offs/', data),

  listCalvings:  (params) => api.get('/reproduction/calvings/', { params }),
  createCalving: (data)   => api.post('/reproduction/calvings/', data),

  listAbortions:  (params) => api.get('/reproduction/abortions/', { params }),
  createAbortion: (data)   => api.post('/reproduction/abortions/', data),
}

// ─── Health ───────────────────────────────────────────────────────────────────
export const healthAPI = {
  dashboard: () => api.get('/health-mgmt/dashboard/'),

  listTreatments:  (params) => api.get('/health-mgmt/treatments/', { params }),
  createTreatment: (data)   => api.post('/health-mgmt/treatments/', data),
  updateTreatment: (id, data) => api.patch(`/health-mgmt/treatments/${id}/`, data),
  deleteTreatment: (id)     => api.delete(`/health-mgmt/treatments/${id}/`),

  listVaccinations:  (params) => api.get('/health-mgmt/vaccinations/', { params }),
  createVaccination: (data)   => api.post('/health-mgmt/vaccinations/', data),
  updateVaccination: (id, data) => api.patch(`/health-mgmt/vaccinations/${id}/`, data),

  listDewormings:  (params) => api.get('/health-mgmt/dewormings/', { params }),
  createDeworming: (data)   => api.post('/health-mgmt/dewormings/', data),

  listDiseases:  (params) => api.get('/health-mgmt/diseases/', { params }),
  createDisease: (data)   => api.post('/health-mgmt/diseases/', data),
  updateDisease: (id, data) => api.patch(`/health-mgmt/diseases/${id}/`, data),
}

// ─── Milk ─────────────────────────────────────────────────────────────────────
export const milkAPI = {
  dashboard:    ()       => api.get('/milk/dashboard/'),
  chiller:      (params) => api.get('/milk/chiller/', { params }),
  entrySheet:   (params) => api.get('/milk/records/entry-sheet/', { params }),
  bulkSave:     (data)   => api.post('/milk/records/bulk/', data),
  downloadTemplate: (params) => api.get('/milk/records/template/', { params, responseType: 'blob' }),
  importExcel:  (file)   => {
    const fd = new FormData(); fd.append('file', file)
    return api.post('/milk/records/import/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },

  listRecords:  (params) => api.get('/milk/records/', { params }),
  createRecord: (data)   => api.post('/milk/records/', data),
  updateRecord: (id, data) => api.patch(`/milk/records/${id}/`, data),
  deleteRecord: (id)     => api.delete(`/milk/records/${id}/`),

  listHeads:   ()     => api.get('/milk/consumption-heads/'),
  createHead:  (data) => api.post('/milk/consumption-heads/', data),
  updateHead:  (id, data) => api.patch(`/milk/consumption-heads/${id}/`, data),

  listConsumptions:  (params) => api.get('/milk/consumption/', { params }),
  createConsumption: (data)   => api.post('/milk/consumption/', data),

  listDispatches:  (params) => api.get('/milk/dispatch/', { params }),
  createDispatch:  (data)   => api.post('/milk/dispatch/', data),
  updateDispatch:  (id, data) => api.patch(`/milk/dispatch/${id}/`, data),
}

// ─── Accounts ─────────────────────────────────────────────────────────────────
export const accountsAPI = {
  dashboard:  ()       => api.get('/accounts/dashboard/'),
  trialBalance: (params) => api.get('/accounts/trial-balance/', { params }),
  pnl:        (params) => api.get('/accounts/profit-and-loss/', { params }),
  ledger:     (params) => api.get('/accounts/ledger/', { params }),

  listHeads:   ()     => api.get('/accounts/heads/'),
  createHead:  (data) => api.post('/accounts/heads/', data),
  updateHead:  (id, data) => api.patch(`/accounts/heads/${id}/`, data),

  listTransactions:  (params) => api.get('/accounts/transactions/', { params }),
  createTransaction: (data)   => api.post('/accounts/transactions/', data),
  updateTransaction: (id, data) => api.patch(`/accounts/transactions/${id}/`, data),
  deleteTransaction: (id)     => api.delete(`/accounts/transactions/${id}/`),

  listAssets:  ()     => api.get('/accounts/assets/'),
  createAsset: (data) => api.post('/accounts/assets/', data),
  updateAsset: (id, data) => api.patch(`/accounts/assets/${id}/`, data),
}

// ─── Inventory ────────────────────────────────────────────────────────────────
export const inventoryAPI = {
  dashboard: ()       => api.get('/inventory/dashboard/'),

  listProducts:  (params) => api.get('/inventory/products/', { params }),
  createProduct: (data)   => api.post('/inventory/products/', data),
  updateProduct: (id, data) => api.patch(`/inventory/products/${id}/`, data),

  listStockIns:  (params) => api.get('/inventory/stock-in/', { params }),
  createStockIn: (data)   => api.post('/inventory/stock-in/', data),

  listConsumptions:  (params) => api.get('/inventory/consumption/', { params }),
  createConsumption: (data)   => api.post('/inventory/consumption/', data),
}

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifAPI = {
  list:         (params) => api.get('/notifications/', { params }),
  unreadCount:  ()       => api.get('/notifications/unread-count/'),
  markAllRead:  ()       => api.post('/notifications/mark-read/'),
  markOneRead:  (id)     => api.post(`/notifications/${id}/mark-read/`),
}

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reportsAPI = {
  inseminations: (params) => api.get('/reports/inseminations/', { params }),
  calvings:      (params) => api.get('/reports/calvings/', { params }),
  abortions:     (params) => api.get('/reports/abortions/', { params }),
  treatments:    (params) => api.get('/reports/treatments/', { params }),
  vaccinations:  (params) => api.get('/reports/vaccinations/', { params }),
  milkDaywise:   (params) => api.get('/reports/milk/daywise/', { params }),
  milkAnimal:    (params) => api.get('/reports/milk/per-animal/', { params }),
  transactions:  (params) => api.get('/reports/transactions/', { params }),
  stock:         (params) => api.get('/reports/stock/', { params }),
  consumption:   (params) => api.get('/reports/consumption/', { params }),

  downloadExcel: (endpoint, params) =>
    api.get(endpoint, { params: { ...params, format: 'excel' }, responseType: 'blob' }),
}
