// Admin "Vendors" section — per-vendor calculator/bus-tracking on/off toggles, and the
// read-only cross-vendor bus records view (AdminVendorCalculator.tsx). Rate numbers themselves
// are self-service on the vendor side (see vendorCalculator.ts "rates" — CalculatorTab.tsx).
export const adminVendorTools = {
  az: {
    adminVendorTools: {
      section: {
        title: 'Bələdçi Kalkulyatoru və Avtobus İzləmə',
        description: 'Vendorlar üçün kalkulyator və avtobus izləmə funksiyalarını aktiv/deaktiv edin. Qiymətləri hər vendor öz panelindən özü tənzimləyir.',
      },
      vendorRow: {
        calculatorLabel: 'Kalkulyator',
        busTrackingLabel: 'Avtobuslar',
        enable: 'Aktiv et',
        disable: 'Deaktiv et',
        enabledBadge: 'Aktiv',
        disabledBadge: 'Deaktiv',
      },
      busRecords: {
        title: 'Avtobus Qeydləri',
        selectVendorLabel: 'Vendor seçin:',
        selectVendorPlaceholder: '-- Vendor seçin --',
        empty: 'Bu vendor üçün avtobus qeydi yoxdur.',
        headers: {
          tour: 'Tur',
          bus: 'Avtobus',
          price: 'Qiymət',
          date: 'Tarix',
        },
      },
      toggleSuccess: {
        calculatorEnabled: '{{name}} üçün kalkulyator aktiv edildi.',
        calculatorDisabled: '{{name}} üçün kalkulyator deaktiv edildi.',
        busTrackingEnabled: '{{name}} üçün avtobus izləmə aktiv edildi.',
        busTrackingDisabled: '{{name}} üçün avtobus izləmə deaktiv edildi.',
      },
    },
  },
  en: {
    adminVendorTools: {
      section: {
        title: 'Guide Calculator & Bus Tracking',
        description: 'Enable/disable the calculator and bus-tracking features per vendor. Vendors tune their own rates from their own panel.',
      },
      vendorRow: {
        calculatorLabel: 'Calculator',
        busTrackingLabel: 'Buses',
        enable: 'Enable',
        disable: 'Disable',
        enabledBadge: 'Enabled',
        disabledBadge: 'Disabled',
      },
      busRecords: {
        title: 'Bus Records',
        selectVendorLabel: 'Select vendor:',
        selectVendorPlaceholder: '-- Select a vendor --',
        empty: 'No bus records for this vendor.',
        headers: {
          tour: 'Tour',
          bus: 'Bus',
          price: 'Price',
          date: 'Date',
        },
      },
      toggleSuccess: {
        calculatorEnabled: 'Calculator enabled for {{name}}.',
        calculatorDisabled: 'Calculator disabled for {{name}}.',
        busTrackingEnabled: 'Bus tracking enabled for {{name}}.',
        busTrackingDisabled: 'Bus tracking disabled for {{name}}.',
      },
    },
  },
  ru: {
    adminVendorTools: {
      section: {
        title: 'Калькулятор гида и учёт автобусов',
        description: 'Включайте/выключайте калькулятор и учёт автобусов для каждого вендора. Тарифы вендоры настраивают сами в своей панели.',
      },
      vendorRow: {
        calculatorLabel: 'Калькулятор',
        busTrackingLabel: 'Автобусы',
        enable: 'Включить',
        disable: 'Выключить',
        enabledBadge: 'Включено',
        disabledBadge: 'Выключено',
      },
      busRecords: {
        title: 'Записи об автобусах',
        selectVendorLabel: 'Выберите вендора:',
        selectVendorPlaceholder: '-- Выберите вендора --',
        empty: 'Для этого вендора нет записей об автобусах.',
        headers: {
          tour: 'Тур',
          bus: 'Автобус',
          price: 'Цена',
          date: 'Дата',
        },
      },
      toggleSuccess: {
        calculatorEnabled: 'Калькулятор включён для {{name}}.',
        calculatorDisabled: 'Калькулятор выключен для {{name}}.',
        busTrackingEnabled: 'Учёт автобусов включён для {{name}}.',
        busTrackingDisabled: 'Учёт автобусов выключен для {{name}}.',
      },
    },
  },
};
