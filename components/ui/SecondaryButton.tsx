import React from 'react';

type SecondaryButtonProps = {
  children: React.ReactNode;
  onClick: () => void;
};

const SecondaryButton: React.FC<SecondaryButtonProps> = ({ children, onClick }) => {
  return <button onClick={onClick}>{children}</button>;
};

export default SecondaryButton;
