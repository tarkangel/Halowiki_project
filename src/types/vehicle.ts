export interface Vehicle {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  faction: string;
  type: string; // Ground, Air, Naval, Space
  crew?: number;
  armament?: string[];
  appearances: string[];
}
