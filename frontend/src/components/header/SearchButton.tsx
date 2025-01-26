import { Search } from 'lucide-react';
import { NavigateFunction } from 'react-router-dom';

import { Button } from '@/components/ui/button';

interface Props {
  navigate: NavigateFunction;
}

export default function SearchButton({ navigate }: Props) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => navigate('/search')}
      className="h-9 w-9"
      title="Search"
    >
      <Search className="h-5 w-5" />
    </Button>
  );
} 