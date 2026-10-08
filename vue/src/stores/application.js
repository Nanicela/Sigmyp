import { defineStore } from 'pinia';

export const useApplicationStore = defineStore('application', {
  state: () => ({
    interfaceReady: false,
    migrationStage: 'compatibility'
  }),
  actions: {
    markReady() {
      this.interfaceReady = true;
    }
  }
});
