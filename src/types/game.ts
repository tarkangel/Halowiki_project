export interface Game {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  releaseDate?: string;
  developer?: string;
  publisher?: string;
  platforms?: string[];
}
