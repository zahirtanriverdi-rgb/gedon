// Vendor "Nəqliyyat" tab (BusTrackingTab.tsx) — record of which vehicle (bus, offroad, etc.)
// was sent to which tour. Admin-gated per vendor via User.busTrackingEnabled. The list is
// shared across all vendors (everyone reads everyone's records); only the adding vendor may
// edit/delete their own rows.
export const vendorBusTracking = {
  az: {
    vendorBusTracking: {
      tabLabel: 'Nəqliyyat',
      header: {
        title: 'TURLARA GÖNDƏRİLƏN NƏQLİYYAT VASİTƏLƏRİ',
        subtitle: 'Hansı avtobusu və ya digər nəqliyyat vasitəsini hansı tura göndərdiyinizi, qiymətini və tarixini qeyd edin.',
      },
      sharedNotice: 'Bura əlavə etdiyiniz avtobus və digər nəqliyyat vasitələrini bütün vendorlar görəcək. Yalnız özünüzün əlavə etdiyi qeydləri redaktə və ya silə bilərsiniz.',
      addButton: 'Yeni qeyd əlavə et',
      form: {
        tourLabel: 'Tur',
        tourPlaceholder: '-- Tur seçin --',
        plateNumberLabel: 'Nömrə',
        plateNumberPlaceholder: 'Məs: 10-AA-123',
        vehicleDescriptionLabel: 'Təsvir (istəyə bağlı)',
        vehicleDescriptionPlaceholder: 'Məs: Xəzər Turizm / Avtobus / Niva',
        priceLabel: 'Qiymət (AZN)',
        dateLabel: 'Tarix',
        saveButton: 'Yadda saxla',
        cancelButton: 'İmtina et',
      },
      table: {
        headers: {
          vendor: 'Vendor',
          tour: 'Tur',
          plateNumber: 'Nömrə',
          description: 'Təsvir',
          price: 'Qiymət',
          date: 'Tarix',
          actions: '',
        },
        editButton: 'Redaktə et',
        deleteButton: 'Sil',
        deleteConfirm: 'Bu qeydi silmək istədiyinizə əminsiniz?',
        empty: 'Hələ heç bir nəqliyyat qeydi yoxdur.',
      },
      notifications: {
        addSuccess: 'Qeyd əlavə olundu.',
        updateSuccess: 'Qeyd yeniləndi.',
        deleteSuccess: 'Qeyd silindi.',
        error: 'Əməliyyat uğursuz oldu.',
        missingFields: 'Zəhmət olmasa bütün məcburi sahələri doldurun (tur, nömrə, qiymət, tarix).',
      },
      disabled: {
        title: 'Nəqliyyat izləmə aktiv deyil',
        description: 'Bu funksiya hesabınız üçün admin tərəfindən aktivləşdirilməyib.',
      },
    },
  },
  en: {
    vendorBusTracking: {
      tabLabel: 'Transport',
      header: {
        title: 'TRANSPORT SENT TO TOURS',
        subtitle: 'Track which bus or other vehicle you sent to which tour, its price, and the date.',
      },
      sharedNotice: 'Buses and other vehicles you add here are visible to every vendor. You can only edit or delete the records you added yourself.',
      addButton: 'Add new record',
      form: {
        tourLabel: 'Tour',
        tourPlaceholder: '-- Select a tour --',
        plateNumberLabel: 'Plate number',
        plateNumberPlaceholder: 'e.g. 10-AA-123',
        vehicleDescriptionLabel: 'Description (optional)',
        vehicleDescriptionPlaceholder: 'e.g. Khazar Tourism / Bus / Niva',
        priceLabel: 'Price (AZN)',
        dateLabel: 'Date',
        saveButton: 'Save',
        cancelButton: 'Cancel',
      },
      table: {
        headers: {
          vendor: 'Vendor',
          tour: 'Tour',
          plateNumber: 'Plate number',
          description: 'Description',
          price: 'Price',
          date: 'Date',
          actions: '',
        },
        editButton: 'Edit',
        deleteButton: 'Delete',
        deleteConfirm: 'Are you sure you want to delete this record?',
        empty: 'No transport records yet.',
      },
      notifications: {
        addSuccess: 'Record added.',
        updateSuccess: 'Record updated.',
        deleteSuccess: 'Record deleted.',
        error: 'Operation failed.',
        missingFields: 'Please fill in all required fields (tour, plate number, price, date).',
      },
      disabled: {
        title: 'Transport tracking is not enabled',
        description: 'This feature has not been enabled for your account by the admin.',
      },
    },
  },
  ru: {
    vendorBusTracking: {
      tabLabel: 'Транспорт',
      header: {
        title: 'ТРАНСПОРТ, ОТПРАВЛЕННЫЙ НА ТУРЫ',
        subtitle: 'Отслеживайте, какой автобус или другое транспортное средство отправлено на какой тур, его стоимость и дату.',
      },
      sharedNotice: 'Автобусы и другие транспортные средства, добавленные здесь, видны всем вендорам. Редактировать или удалять можно только собственные записи.',
      addButton: 'Добавить запись',
      form: {
        tourLabel: 'Тур',
        tourPlaceholder: '-- Выберите тур --',
        plateNumberLabel: 'Гос. номер',
        plateNumberPlaceholder: 'Напр.: 10-AA-123',
        vehicleDescriptionLabel: 'Описание (необязательно)',
        vehicleDescriptionPlaceholder: 'Напр.: Хазар Туризм / Автобус / Нива',
        priceLabel: 'Цена (AZN)',
        dateLabel: 'Дата',
        saveButton: 'Сохранить',
        cancelButton: 'Отмена',
      },
      table: {
        headers: {
          vendor: 'Вендор',
          tour: 'Тур',
          plateNumber: 'Гос. номер',
          description: 'Описание',
          price: 'Цена',
          date: 'Дата',
          actions: '',
        },
        editButton: 'Редактировать',
        deleteButton: 'Удалить',
        deleteConfirm: 'Вы уверены, что хотите удалить эту запись?',
        empty: 'Записей о транспорте пока нет.',
      },
      notifications: {
        addSuccess: 'Запись добавлена.',
        updateSuccess: 'Запись обновлена.',
        deleteSuccess: 'Запись удалена.',
        error: 'Операция не удалась.',
        missingFields: 'Пожалуйста, заполните все обязательные поля (тур, номер, цена, дата).',
      },
      disabled: {
        title: 'Отслеживание транспорта не включено',
        description: 'Эта функция не включена администратором для вашего аккаунта.',
      },
    },
  },
};
