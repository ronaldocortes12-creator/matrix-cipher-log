import { useEffect, useRef } from 'react';

interface InfiniteScrollTriggerProps {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  threshold?: number;
}

export const InfiniteScrollTrigger = ({ 
  onLoadMore, 
  hasMore, 
  isLoading,
  threshold = 100 
}: InfiniteScrollTriggerProps) => {
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: `${threshold}px` }
    );

    const currentTrigger = triggerRef.current;
    if (currentTrigger) {
      observer.observe(currentTrigger);
    }

    return () => {
      if (currentTrigger) {
        observer.unobserve(currentTrigger);
      }
    };
  }, [onLoadMore, hasMore, isLoading, threshold]);

  if (!hasMore) return null;

  return (
    <div ref={triggerRef} className="h-20 flex items-center justify-center">
      {isLoading && (
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      )}
    </div>
  );
};
