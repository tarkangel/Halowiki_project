export interface Planet {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  system?: string;
  type?: string; // Terrestrial, Gas Giant, etc.
  significance?: string;
  appearances: string[];
}
