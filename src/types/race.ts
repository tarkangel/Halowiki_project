export interface Race {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  homeworld?: string;
  affiliation: string;
  biology?: string;
  notableMembers?: string[];
  appearances: string[];
}
