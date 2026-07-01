import { seedTours, seedTourSlots, seedUsers } from './src/data/toursData.ts';

const tours = seedTours;
const slots = seedTourSlots;
const users = seedUsers;

const currentSearchQuery = '';
const selectedCategory = 'all';
const selectedDifficulty = 'all';
const selectedRegion = 'all';
const maxPrice = 3000;
const selectedMonth = '';
const calendarDateStart = '';
const calendarDateEnd = '';

const getConvertedPriceInfo = (price, currency) => {
  return { azn: price };
};

const filteredTours = tours.filter((tour) => {
  const matchesSearch = tour.name.toLowerCase().includes(currentSearchQuery.toLowerCase()) || 
                        tour.region.toLowerCase().includes(currentSearchQuery.toLowerCase()) ||
                        tour.description.toLowerCase().includes(currentSearchQuery.toLowerCase());
  
  let matchesCategory = selectedCategory === 'all' || tour.category === selectedCategory;
  if (selectedCategory === 'active') {
     matchesCategory = tour.category === 'active' || tour.isActiveLife === true;
  }

  const matchesDifficulty = selectedDifficulty === 'all' || tour.difficulty === selectedDifficulty;
  const matchesRegion = selectedRegion === 'all' || tour.region === selectedRegion;

  const tourSlots = slots.filter(s => s.tourId === tour.id);
  let minSlotPriceAzn = 25;
  if (tourSlots.length > 0) {
    const minOriginalPrice = Math.min(...tourSlots.map(s => s.price));
    minSlotPriceAzn = getConvertedPriceInfo(minOriginalPrice, tour.priceCurrency).azn;
  }
  const matchesPrice = minSlotPriceAzn <= maxPrice;

  const isApproved = tour.isActive !== false;

  const vendor = users.find(u => u.id === tour.vendorId);
  let subscriptionValid = true;
  if (vendor && vendor.subscriptionValidUntil) {
    const validUntil = new Date(vendor.subscriptionValidUntil).getTime();
    if (Date.now() > validUntil + 3 * 24 * 60 * 60 * 1000) {
      subscriptionValid = false;
    }
  }

  const matchesMonth = !selectedMonth || tourSlots.some(s => s.startDate.startsWith(selectedMonth));

  let matchesCalendar = true;
  if (calendarDateStart && calendarDateEnd) {
    matchesCalendar = tourSlots.some(s => s.startDate >= calendarDateStart && s.startDate <= calendarDateEnd);
  } else if (calendarDateStart) {
    matchesCalendar = tourSlots.some(s => s.startDate === calendarDateStart);
  }

  console.log(`Tour ${tour.id}: search=${matchesSearch}, cat=${matchesCategory}, diff=${matchesDifficulty}, reg=${matchesRegion}, price=${matchesPrice}, appr=${isApproved}, sub=${subscriptionValid}, month=${matchesMonth}, cal=${matchesCalendar}`);

  return matchesSearch && matchesCategory && matchesDifficulty && matchesRegion && matchesPrice && isApproved && subscriptionValid && matchesMonth && matchesCalendar;
});

console.log("Filtered length: ", filteredTours.length);
