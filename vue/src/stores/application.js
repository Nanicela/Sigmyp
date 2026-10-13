import { defineStore } from 'pinia';
import { moduleCatalog } from '../domain/module-catalog.js';

export const useApplicationStore = defineStore('application', {
  state: () => ({
    interfaceReady: false,
    migrationStage: 'compatibility',
    currentUser: null,
    activeCompanyId: null,
    effectiveRole: null,
    permissions: []
  }),
  getters: {
    modules: () => moduleCatalog,
    isPlatformAdmin: state => state.effectiveRole === 'platform',
    can: state => permission => state.effectiveRole === 'platform' || state.permissions.includes(permission)
  },
  actions: {
    markReady() {
      this.interfaceReady = true;
    },
    setSessionContext({ user = null, companyId = null, role = null, permissions = [] } = {}) {
      this.currentUser = user;
      this.activeCompanyId = companyId;
      this.effectiveRole = role;
      this.permissions = [...new Set(permissions)];
    },
    clearSessionContext() {
      this.setSessionContext();
    }
  }
});
