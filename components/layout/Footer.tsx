export default function Footer() {
  const appName = 'Budget Master';
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-neutral text-neutral-content p-4 mt-auto">
      <div className="container mx-auto text-center">
        <p className="text-sm">
          © {currentYear} {appName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
