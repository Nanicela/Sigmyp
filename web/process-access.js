export const DYD_COMPANY_ID = '500123568';

export function isDydCompany(companyId = '') {
  return String(companyId).trim() === DYD_COMPANY_ID;
}
