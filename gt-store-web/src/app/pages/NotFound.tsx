import { Link } from "react-router";
import { Home as HomeIcon } from "lucide-react";

export function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-9xl text-gray-300 mb-4">404</h1>
        <h2 className="text-3xl mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-[#2874f0] text-white px-8 py-3 rounded-lg hover:bg-[#1c5ccc] transition"
        >
          <HomeIcon className="w-5 h-5" />
          Go to Homepage
        </Link>
      </div>
    </div>
  );
}
