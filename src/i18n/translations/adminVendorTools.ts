// Admin "Vendors" section — per-vendor calculator/transport-tracking on/off toggles, and the
// read-only cross-vendor transport records view (AdminVendorCalculator.tsx). Rate numbers
// themselves are self-service on the vendor side (see vendorCalculator.ts "rates" — CalculatorTab.tsx).
export const adminVendorTools = {
  az: {
    adminVendorTools: {
      section: {
        title: 'Bələdçi Kalkulyatoru və Nəqliyyat İzləmə',
        description: 'Vendorlar üçün kalkulyator və nəqliyyat izləmə funksiyalarını aktiv/deaktiv edin. Qiymətləri hər vendor öz panelindən özü tənzimləyir.',
      },
      vendorRow: {
        calculatorLabel: 'Kalkulyator',
        busTrackingLabel: 'Nəqliyyat',
        enable: 'Aktiv et',
        disable: 'Deaktiv et',
        enabledBadge: 'Aktiv',
        disabledBadge: 'Deaktiv',
      },
      busRecords: {
        title: 'Nəqliyyat Qeydləri',
        selectVendorLabel: 'Vendor seçin:',
        selectVendorPlaceholder: '-- Vendor seçin --',
        empty: 'Bu vendor üçün nəqliyyat qeydi yoxdur.',
        headers: {
          tour: 'Tur',
          contactPhone: 'Əlaqə nömrəsi',
          description: 'Təsvir',
          price: 'Qiymət',
          date: 'Tarix',
        },
      },
      toggleSuccess: {
        calculatorEnabled: '{{name}} üçün kalkulyator aktiv edildi.',
        calculatorDisabled: '{{name}} üçün kalkulyator deaktiv edildi.',
        busTrackingEnabled: '{{name}} üçün nəqliyyat izləmə aktiv edildi.',
        busTrackingDisabled: '{{name}} üçün nəqliyyat izləmə deaktiv edildi.',
      },
    },
  },
  en: {
    adminVendorTools: {
      section: {
        title: 'Guide Calculator & Transport Tracking',
        description: 'Enable/disable the calculator and transport-tracking features per vendor. Vendors tune their own rates from their own panel.',
      },
      vendorRow: {
        calculatorLabel: 'Calculator',
        busTrackingLabel: 'Transport',
        enable: 'Enable',
        disable: 'Disable',
        enabledBadge: 'Enabled',
        disabledBadge: 'Disabled',
      },
      busRecords: {
        title: 'Transport Records',
        selectVendorLabel: 'Select vendor:',
        selectVendorPlaceholder: '-- Select a vendor --',
        empty: 'No transport records for this vendor.',
        headers: {
          tour: 'Tour',
          contactPhone: 'Contact phone',
          description: 'Description',
          price: 'Price',
          date: 'Date',
        },
      },
      toggleSuccess: {
        calculatorEnabled: 'Calculator enabled for {{name}}.',
        calculatorDisabled: 'Calculator disabled for {{name}}.',
        busTrackingEnabled: 'Transport tracking enabled for {{name}}.',
        busTrackingDisabled: 'Transport tracking disabled for {{name}}.',
      },
    },
  },
  ru: {
    adminVendorTools: {
      section: {
        title: 'Калькулятор гида и учёт транспорта',
        description: 'Включайте/выключайте калькулятор и учёт транспорта для каждого вендора. Тарифы вендоры настраивают сами в своей панели.',
      },
      vendorRow: {
        calculatorLabel: 'Калькулятор',
        busTrackingLabel: 'Транспорт',
        enable: 'Включить',
        disable: 'Выключить',
        enabledBadge: 'Включено',
        disabledBadge: 'Выключено',
      },
      busRecords: {
        title: 'Записи о транспорте',
        selectVendorLabel: 'Выберите вендора:',
        selectVendorPlaceholder: '-- Выберите вендора --',
        empty: 'Для этого вендора нет записей о транспорте.',
        headers: {
          tour: 'Тур',
          contactPhone: 'Контактный телефон',
          description: 'Описание',
          price: 'Цена',
          date: 'Дата',
        },
      },
      toggleSuccess: {
        calculatorEnabled: 'Калькулятор включён для {{name}}.',
        calculatorDisabled: 'Калькулятор выключен для {{name}}.',
        busTrackingEnabled: 'Учёт транспорта включён для {{name}}.',
        busTrackingDisabled: 'Учёт транспорта выключен для {{name}}.',
      },
    },
  },
};
