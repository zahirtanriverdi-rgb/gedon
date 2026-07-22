import { common } from './common';
import { app } from './app';
import { customerHome } from './customerHome';
import { customerMisc } from './customerMisc';
import { campSites } from './campSites';
import { tourDetailPage } from './tourDetailPage';
import { adminPortal } from './adminPortal';
import { vendorTourForms } from './vendorTourForms';
import { vendorBookings } from './vendorBookings';
import { vendorMisc } from './vendorMisc';
import { miscWidgets } from './miscWidgets';
import { emailVerification } from './emailVerification';
import { vendorCalculator } from './vendorCalculator';
import { vendorBusTracking } from './vendorBusTracking';
import { adminVendorTools } from './adminVendorTools';
import { inquiriesPanel } from './inquiriesPanel';

// Each namespace module exports { az: {...}, en: {...}, ru: {...} } with a single unique
// top-level key (its namespace) so merging never collides across files.
const namespaces = [
  common,
  app,
  customerHome,
  customerMisc,
  campSites,
  tourDetailPage,
  adminPortal,
  vendorTourForms,
  vendorBookings,
  vendorMisc,
  miscWidgets,
  emailVerification,
  vendorCalculator,
  vendorBusTracking,
  adminVendorTools,
  inquiriesPanel,
];

function merge(dicts: Array<{ az: Record<string, any>; en: Record<string, any>; ru: Record<string, any> }>) {
  const az: Record<string, any> = {};
  const en: Record<string, any> = {};
  const ru: Record<string, any> = {};
  
  for (const dict of dicts) {
    Object.assign(az, dict.az);
    Object.assign(en, dict.en);
    Object.assign(ru, dict.ru);
  }
  
  return { az, en, ru };
}

export const translations = merge(namespaces);