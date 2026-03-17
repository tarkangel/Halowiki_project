export * from './weapon';
export * from './vehicle';
export * from './character';
export * from './race';
export * from './planet';
export * from './game';

export interface WikiPage {
  pageid: number;
  title: string;
  extract?: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
}

export interface ApiResponse<T> {
  data: T[] | null;
  loading: boolean;
  error: string | null;
}
