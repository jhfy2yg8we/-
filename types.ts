export type IconTheme = 'FLEET' | 'BATTLE' | 'DIPLOMACY' | 'TRADE' | 'GIRAFFE' | 'MAP';

export interface Waypoint {
  name: string;
  lat: number;
  lng: number;
  type: 'START' | 'STOP' | 'TURN'; 
  trade?: string; 
  diplomacy?: string; 
  eventLabel?: string; 
  iconType: IconTheme; 
  imageUrl?: string; // Optional: Real historical image URL from Wikimedia
}

export interface Voyage {
  id: number;
  title: string;
  years: string;
  description: string;
  path: Waypoint[]; 
  color: string;
}

export interface ShipPosition {
  lat: number;
  lng: number;
  altitude: number;
  heading: number; 
}