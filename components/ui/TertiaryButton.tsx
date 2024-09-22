import React from 'react';

type TertiaryButtonProps = {
  children: React.ReactNode;
  onClick: () => void;
};

const TertiaryButton: React.FC<TertiaryButtonProps> = ({ children, onClick }) => {
  return <button onClick={onClick}>{children}</button>;
};

export default TertiaryButton;
