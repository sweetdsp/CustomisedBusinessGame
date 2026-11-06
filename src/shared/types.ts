export type StateId = 'TN' | 'KL' | 'KA' | 'AP' | 'TG';

export interface PropertyDef {
  state: StateId;
  name: string;
  price: number;
  mortgage: number;
  house: number;
  hotel: number;
  baseRent: number;
  rent1: number;
  rent2: number;
  rent3: number;
  rentHotel: number;
}
