import { useEffect, useState } from 'react';

import { ArrowUpIcon } from '@heroicons/react/24/solid';

export default function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.pageYOffset > 300);
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-5 right-5 bg-teal-600 text-white p-2 rounded-full shadow-lg hover:bg-teal-700 transition-colors duration-300"
      aria-label="Back to top"
    >
      <ArrowUpIcon className="h-6 w-6" />
    </button>
  );
}
