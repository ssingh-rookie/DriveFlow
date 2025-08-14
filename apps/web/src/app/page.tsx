import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <div className="text-center sm:text-left">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">DriveFlow</h1>
          <p className="text-xl text-gray-600 mb-6">Complete Lesson Management System</p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-4xl">
          <Link href="/lessons" className="group">
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow group-hover:border-blue-300">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">Lesson Management</h3>
              </div>
              <p className="text-gray-600 text-sm">
                View, book, and manage your driving lessons. Complete lesson dashboard with booking flow.
              </p>
              <p className="text-blue-600 text-sm mt-2 group-hover:text-blue-700">
                View Dashboard →
              </p>
            </div>
          </Link>

          <Link href="/lessons/book" className="group">
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow group-hover:border-green-300">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">Book Lesson</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Start your driving journey! Multi-step booking form with instructor selection and scheduling.
              </p>
              <p className="text-green-600 text-sm mt-2 group-hover:text-green-700">
                Book Now →
              </p>
            </div>
          </Link>

          <Link href="/dashboard/instructors/123ed673-79ac-41d6-81da-79de6829be4a/payouts" className="group">
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow group-hover:border-purple-300">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v2a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">Stripe Onboarding</h3>
              </div>
              <p className="text-gray-600 text-sm">
                Existing instructor payment setup feature. Demonstrates Stripe integration patterns.
              </p>
              <p className="text-purple-600 text-sm mt-2 group-hover:text-purple-700">
                View Demo →
              </p>
            </div>
          </Link>

          <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-gray-100 rounded-lg">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"></path>
                </svg>
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">More Features</h3>
            </div>
            <p className="text-gray-600 text-sm">
              Additional features like role-based dashboards, real-time updates, and mobile app coming soon.
            </p>
            <p className="text-gray-500 text-sm mt-2">
              In Development...
            </p>
          </div>
        </div>

        {/* System Status */}
        <div className="w-full max-w-4xl mt-8">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-sm font-semibold text-green-900 mb-2">🚀 System Status</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center text-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                API Server: Running (http://localhost:3001)
              </div>
              <div className="flex items-center text-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Web App: Running (http://localhost:3000)
              </div>
              <div className="flex items-center text-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Lesson CRUD: ✅ Complete (Tasks 1-5)
              </div>
              <div className="flex items-center text-blue-800">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                Frontend: 🔄 Task 6.1 Complete
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
