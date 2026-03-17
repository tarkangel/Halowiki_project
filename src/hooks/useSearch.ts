import { useState, useCallback } from 'react';

export function useSearch() {
  const [query, setQuery] = useState('');

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
  }, []);

  return { query, handleSearch };
}
