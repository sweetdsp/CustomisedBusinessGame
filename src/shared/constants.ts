// Single source of truth for every game number. Amounts in rupees.
import type { PropertyDef, StateId } from './types.ts';

export const STATES: Record<StateId, { name: string; color: string }> = {
  TN: { name: 'Tamil Nadu', color: 'dark blue' },
  KL: { name: 'Kerala', color: 'dark green' },
  KA: { name: 'Karnataka', color: 'pink' },
  AP: { name: 'Andhra Pradesh', color: 'dark red' },
  TG: { name: 'Telangana', color: 'yellow' },
};

// Section 7 price table, verbatim.
export const PROPERTIES: PropertyDef[] = [
  { state: 'TN', name: 'Courtallam', price: 3200, mortgage: 1600, house: 1100, hotel: 2200, baseRent: 300, rent1: 900, rent2: 1500, rent3: 2100, rentHotel: 2800 },
  { state: 'TN', name: 'Mahabalipuram', price: 4200, mortgage: 2100, house: 1500, hotel: 3000, baseRent: 400, rent1: 1200, rent2: 2100, rent3: 3000, rentHotel: 4100 },
  { state: 'TN', name: 'Kanyakumari', price: 5200, mortgage: 2600, house: 1800, hotel: 3600, baseRent: 500, rent1: 1500, rent2: 2700, rent3: 3900, rentHotel: 5400 },
  { state: 'TN', name: 'Rameswaram', price: 6200, mortgage: 3100, house: 2200, hotel: 4400, baseRent: 600, rent1: 1800, rent2: 3400, rent3: 5100, rentHotel: 7200 },
  { state: 'TN', name: 'Ooty', price: 7200, mortgage: 3600, house: 2500, hotel: 5000, baseRent: 800, rent1: 2400, rent2: 4300, rent3: 6400, rentHotel: 8800 },
  { state: 'TN', name: 'Kodaikanal', price: 8000, mortgage: 4000, house: 2800, hotel: 5600, baseRent: 1000, rent1: 3000, rent2: 5200, rent3: 7600, rentHotel: 10500 },
  { state: 'KL', name: 'Wayanad', price: 3000, mortgage: 1500, house: 1000, hotel: 2000, baseRent: 200, rent1: 600, rent2: 1200, rent3: 1800, rentHotel: 2500 },
  { state: 'KL', name: 'Alleppey', price: 4000, mortgage: 2000, house: 1400, hotel: 2800, baseRent: 400, rent1: 1200, rent2: 2000, rent3: 2900, rentHotel: 3900 },
  { state: 'KL', name: 'Kumarakom', price: 5000, mortgage: 2500, house: 1800, hotel: 3600, baseRent: 500, rent1: 1500, rent2: 2700, rent3: 3900, rentHotel: 5400 },
  { state: 'KL', name: 'Varkala', price: 6000, mortgage: 3000, house: 2100, hotel: 4200, baseRent: 600, rent1: 1800, rent2: 3300, rent3: 4900, rentHotel: 6800 },
  { state: 'KL', name: 'Thekkady', price: 7000, mortgage: 3500, house: 2400, hotel: 4800, baseRent: 800, rent1: 2400, rent2: 4200, rent3: 6100, rentHotel: 8400 },
  { state: 'KL', name: 'Munnar', price: 8000, mortgage: 4000, house: 2800, hotel: 5600, baseRent: 1000, rent1: 3000, rent2: 5200, rent3: 7600, rentHotel: 10500 },
  { state: 'KA', name: 'Badami', price: 3200, mortgage: 1600, house: 1100, hotel: 2200, baseRent: 300, rent1: 900, rent2: 1500, rent3: 2100, rentHotel: 2800 },
  { state: 'KA', name: 'Chikmagalur', price: 4000, mortgage: 2000, house: 1400, hotel: 2800, baseRent: 400, rent1: 1200, rent2: 2000, rent3: 2900, rentHotel: 3900 },
  { state: 'KA', name: 'Udupi', price: 5000, mortgage: 2500, house: 1800, hotel: 3600, baseRent: 500, rent1: 1500, rent2: 2700, rent3: 3900, rentHotel: 5400 },
  { state: 'KA', name: 'Gokarna', price: 6000, mortgage: 3000, house: 2100, hotel: 4200, baseRent: 600, rent1: 1800, rent2: 3300, rent3: 4900, rentHotel: 6800 },
  { state: 'KA', name: 'Coorg', price: 7200, mortgage: 3600, house: 2500, hotel: 5000, baseRent: 800, rent1: 2400, rent2: 4300, rent3: 6400, rentHotel: 8800 },
  { state: 'KA', name: 'Hampi', price: 8000, mortgage: 4000, house: 2800, hotel: 5600, baseRent: 1000, rent1: 3000, rent2: 5200, rent3: 7600, rentHotel: 10500 },
  { state: 'AP', name: 'Nagarjuna Sagar', price: 3000, mortgage: 1500, house: 1000, hotel: 2000, baseRent: 200, rent1: 600, rent2: 1200, rent3: 1800, rentHotel: 2500 },
  { state: 'AP', name: 'Lepakshi', price: 4200, mortgage: 2100, house: 1500, hotel: 3000, baseRent: 400, rent1: 1200, rent2: 2100, rent3: 3000, rentHotel: 4100 },
  { state: 'AP', name: 'Puttaparthi', price: 5000, mortgage: 2500, house: 1800, hotel: 3600, baseRent: 500, rent1: 1500, rent2: 2700, rent3: 3900, rentHotel: 5400 },
  { state: 'AP', name: 'Srisailam', price: 6200, mortgage: 3100, house: 2200, hotel: 4400, baseRent: 600, rent1: 1800, rent2: 3400, rent3: 5100, rentHotel: 7200 },
  { state: 'AP', name: 'Araku', price: 7000, mortgage: 3500, house: 2400, hotel: 4800, baseRent: 800, rent1: 2400, rent2: 4200, rent3: 6100, rentHotel: 8400 },
  { state: 'AP', name: 'Tirupati', price: 8000, mortgage: 4000, house: 2800, hotel: 5600, baseRent: 1000, rent1: 3000, rent2: 5200, rent3: 7600, rentHotel: 10500 },
  { state: 'TG', name: 'Vemulawada', price: 3000, mortgage: 1500, house: 1000, hotel: 2000, baseRent: 200, rent1: 600, rent2: 1200, rent3: 1800, rentHotel: 2500 },
  { state: 'TG', name: 'Ramappa', price: 4000, mortgage: 2000, house: 1400, hotel: 2800, baseRent: 400, rent1: 1200, rent2: 2000, rent3: 2900, rentHotel: 3900 },
  { state: 'TG', name: 'Basar', price: 5200, mortgage: 2600, house: 1800, hotel: 3600, baseRent: 500, rent1: 1500, rent2: 2700, rent3: 3900, rentHotel: 5400 },
  { state: 'TG', name: 'Yadagirigutta', price: 6000, mortgage: 3000, house: 2100, hotel: 4200, baseRent: 600, rent1: 1800, rent2: 3300, rent3: 4900, rentHotel: 6800 },
  { state: 'TG', name: 'Warangal', price: 7200, mortgage: 3600, house: 2500, hotel: 5000, baseRent: 800, rent1: 2400, rent2: 4300, rent3: 6400, rentHotel: 8800 },
  { state: 'TG', name: 'Bhadrachalam', price: 8000, mortgage: 4000, house: 2800, hotel: 5600, baseRent: 1000, rent1: 3000, rent2: 5200, rent3: 7600, rentHotel: 10500 },
];

export const CONSTANTS = {
  // Board and seats
  TILE_COUNT: 42,
  MIN_SEATS: 2,
  MAX_SEATS: 4,
  // Dice (section 8)
  DICE_MIN_FACE: 0,
  DICE_MAX_FACE: 8,
  DICE_COUNT: 2,
  DOUBLES_TO_JAIL: 3,
  // Setup options (section 4, 33)
  STARTING_CASH_OPTIONS: [200000, 300000],
  LAP_SALARY: { 200000: 2000, 300000: 3000 } as Record<number, number>,
  GAME_MINUTES_START: 30,
  GAME_MINUTES_STEP: 15,
  // Jail and tiles (section 33, 25)
  JAIL_FINE: 2000,
  JAIL_MAX_TURNS: 3,
  INCOME_TAX: 2000,
  LUXURY_TAX_PER_PLACE: 100,
  LUXURY_TAX_PER_MORTGAGED_PLACE: 50,
  LUXURY_TAX_PER_HOUSE: 150,
  LUXURY_TAX_PER_HOTEL: 400,
  TOURIST_TAX_PER_PLACE: 200,
  TOURIST_TAX_MAX: 3000,
  LUCKY_DRAW_BONUS: 1500,
  // Buildings (section 10, 27, 33)
  MAX_HOUSES: 3,
  BUILDING_BUYBACK_PERCENT: 50,
  UNMORTGAGE_FEE_PERCENT: 10,
  UNMORTGAGE_ROUND_TO: 100,
  DOUBLED_RENT_MIN_PLACES: 3,
  // Auction (section 26, 33), seconds
  AUCTION_START_BID: 100,
  AUCTION_BID_STEPS: [100, 500],
  AUCTION_SECONDS: 10,
  AUCTION_RESET_SECONDS: 3,
  // Trade (section 30, 33)
  TRADE_ANSWER_SECONDS: 10,
  TRADES_PER_TURN: 3,
  // Turn timer (section 28, 33), seconds
  TURN_ROLL_SECONDS: 10,
  TURN_FINISH_SECONDS: 10,
  TIMEOUTS_BEFORE_DROPPED: 3,
  // Debts and reconnect (section 29, 17, 33)
  DEBT_GRACE_SECONDS: 30,
  RECONNECT_ROUNDS: 3,
  // Computer (section 33), seconds
  COMPUTER_PAUSE_MIN: 1,
  COMPUTER_PAUSE_MAX: 2,
  // Cleanup (section 35)
  CLEANUP_HOURS: 24,
} as const;
