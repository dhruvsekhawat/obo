import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Better Mortgage Rates
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl">
          Connect borrowers with the best mortgage rates through our innovative lending platform
        </p>
      </div>

      <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-8 space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800 text-center mb-8">
          Choose Your Path
        </h2>

        <Link 
          href="/login"
          className="flex items-center justify-between w-full bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-all duration-200 group"
        >
          <div>
            <h3 className="text-lg font-semibold">Lender Sign In</h3>
            <p className="text-sm text-blue-100">Access your lender dashboard</p>
          </div>
          <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
        </Link>

        <div className="relative flex items-center gap-3 my-6">
          <div className="flex-grow h-px bg-gray-200"></div>
          <span className="text-gray-400 text-sm">or</span>
          <div className="flex-grow h-px bg-gray-200"></div>
        </div>

        <Link
          href="/borrower"
          className="flex items-center justify-between w-full bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition-all duration-200 group"
        >
          <div>
            <h3 className="text-lg font-semibold">Find Better Rates</h3>
            <p className="text-sm text-green-100">Upload your loan and get better offers</p>
          </div>
          <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
        </Link>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            New lender?{" "}
            <Link href="/register" className="text-blue-600 hover:text-blue-800 font-medium">
              Create an account
            </Link>
          </p>
        </div>
      </div>

      <footer className="mt-16 text-center text-gray-500 text-sm">
        <p>© 2024 Better Mortgage Rates. All rights reserved.</p>
      </footer>
    </div>
  );
}
