import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-neutral text-neutral-content p-4 mt-auto">
      <div className="container mx-auto text-center">
        <p>© {new Date().getFullYear()} BudgetMaster. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
