// Vendor "Avtobuslar" tab (BusTrackingTab.tsx) — record of which bus was sent to which tour.
// Admin-gated per vendor via User.busTrackingEnabled.
export const vendorBusTracking = {
  az: {
    vendorBusTracking: {
      tabLabel: 'Avtobuslar',
      header: {
        title: 'TURLARA GÖNDƏRİLƏN AVTOBUSLAR',
        subtitle: 'Hansı avtobusu hansı tura göndərdiyinizi, qiymətini və tarixini qeyd edin.',
      },
      addButton: 'Yeni qeyd əlavə et',
      form: {
        tourLabel: 'Tur',
        tourPlaceholder: '-- Tur seçin --',
        busNameLabel: 'Avtobus (nömrə / şirkət)',
        busNamePlaceholder: 'Məs: 10-AA-123 / Xəzər Turizm',
        priceLabel: 'Qiymət (AZN)',
        dateLabel: 'Tarix',
        saveButton: 'Yadda saxla',
        cancelButton: 'İmtina et',
      },
      table: {
        headers: {
          tour: 'Tur',
          bus: 'Avtobus',
          price: 'Qiymət',
          date: 'Tarix',
          actions: '',
        },
        editButton: 'Redaktə et',
        deleteButton: 'Sil',
        deleteConfirm: 'Bu avtobus qeydini silmək istədiyinizə əminsiniz?',
        empty: 'Hələ heç bir avtobus qeydi yoxdur.',
      },
      notifications: {
        addSuccess: 'Avtobus qeydi əlavə olundu.',
        updateSuccess: 'Avtobus qeydi yeniləndi.',
        deleteSuccess: 'Avtobus qeydi silindi.',
        error: 'Əməliyyat uğursuz oldu.',
        missingFields: 'Zəhmət olmasa bütün sahələri doldurun.',
      },
      disabled: {
        title: 'Avtobus izləmə aktiv deyil',
        description: 'Bu funksiya hesabınız üçün admin tərəfindən aktivləşdirilməyib.',
      },
    },
  },
  en: {
    vendorBusTracking: {
      tabLabel: 'Buses',
      header: {
        title: 'BUSES SENT TO TOURS',
        subtitle: 'Track which bus you sent to which tour, its price, and the date.',
      },
      addButton: 'Add new record',
      form: {
        tourLabel: 'Tour',
        tourPlaceholder: '-- Select a tour --',
        busNameLabel: 'Bus (plate / company)',
        busNamePlaceholder: 'e.g. 10-AA-123 / Khazar Tourism',
        priceLabel: 'Price (AZN)',
        dateLabel: 'Date',
        saveButton: 'Save',
        cancelButton: 'Cancel',
      },
      table: {
        headers: {
          tour: 'Tour',
          bus: 'Bus',
          price: 'Price',
          date: 'Date',
          actions: '',
        },
        editButton: 'Edit',
        deleteButton: 'Delete',
        deleteConfirm: 'Are you sure you want to delete this bus record?',
        empty: 'No bus records yet.',
      },
      notifications: {
        addSuccess: 'Bus record added.',
        updateSuccess: 'Bus record updated.',
        deleteSuccess: 'Bus record deleted.',
        error: 'Operation failed.',
        missingFields: 'Please fill in all fields.',
      },
      disabled: {
        title: 'Bus tracking is not enabled',
        description: 'This feature has not been enabled for your account by the admin.',
      },
    },
  },
  ru: {
    vendorBusTracking: {
      tabLabel: 'Автобусы',
      header: {
        title: 'АВТОБУСЫ, ОТПРАВЛЕННЫЕ НА ТУРЫ',
        subtitle: 'Отслеживайте, какой автобус на какой тур отправлен, его стоимость и дату.',
      },
      addButton: 'Добавить запись',
      form: {
        tourLabel: 'Тур',
        tourPlaceholder: '-- Выберите тур --',
        busNameLabel: 'Автобус (номер / компания)',
        busNamePlaceholder: 'Напр.: 10-AA-123 / Хазар Туризм',
        priceLabel: 'Цена (AZN)',
        dateLabel: 'Дата',
        saveButton: 'Сохранить',
        cancelButton: 'Отмена',
      },
      table: {
        headers: {
          tour: 'Тур',
          bus: 'Автобус',
          price: 'Цена',
          date: 'Дата',
          actions: '',
        },
        editButton: 'Редактировать',
        deleteButton: 'Удалить',
        deleteConfirm: 'Вы уверены, что хотите удалить эту запись об автобусе?',
        empty: 'Записей об автобусах пока нет.',
      },
      notifications: {
        addSuccess: 'Запись об автобусе добавлена.',
        updateSuccess: 'Запись об автобусе обновлена.',
        deleteSuccess: 'Запись об автобусе удалена.',
        error: 'Операция не удалась.',
        missingFields: 'Пожалуйста, заполните все поля.',
      },
      disabled: {
        title: 'Отслеживание автобусов не включено',
        description: 'Эта функция не включена администратором для вашего аккаунта.',
      },
    },
  },
};
