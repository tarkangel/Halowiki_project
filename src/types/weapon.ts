export interface Weapon {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  faction: string; // UNSC, Covenant, Forerunner, Banished
  type: string; // Rifle, Pistol, Sniper, etc.
  damage?: string;
  range?: string;
  magazineSize?: number;
  appearances: string[]; // game titles
  wikiUrl?: string;
}
