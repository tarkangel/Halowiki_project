export interface Character {
  id: string;
  name: string;
  fullName?: string;
  description: string;
  imageUrl?: string;
  species: string;
  affiliation: string;
  rank?: string;
  status?: 'Alive' | 'Deceased' | 'Unknown';
  appearances: string[];
  wikiUrl?: string;
}
