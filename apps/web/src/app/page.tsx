import Image from "next/image";
import Link from "next/link";
import { NotificationDemo } from "@/components/demo/NotificationDemo";
import { LiveDataDemo } from "@/components/demo/LiveDataDemo";
import { QueryDebugger } from "@/components/debug/QueryDebugger";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header Section */}
      <div className="bg-gradient-to-b from-blue-50 to-white py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
              DriveFlow
            </h1>
            <p className="text-xl sm:text-2xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Complete Lesson Management System for Driving Schools
            </p>
            <div className="mt-8">
              <Link
                href="/lessons/book"
                className="inline-flex items-center px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
              >
                Book Your First Lesson →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Get Started</h2>
          <p className="text-lg text-gray-600">
            Choose how you'd like to manage your driving lessons
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mx-auto max-w-4xl">
          <Link href="/lessons" className="group">
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow group-hover:border-blue-300">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    ></path>
                  </svg>
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">
                  Lesson Management
                </h3>
              </div>
              <p className="text-gray-600 text-sm">
                View, book, and manage your driving lessons. Complete lesson
                dashboard with booking flow.
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
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    ></path>
                  </svg>
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">
                  Book Lesson
                </h3>
              </div>
              <p className="text-gray-600 text-sm">
                Start your driving journey! Multi-step booking form with
                instructor selection and scheduling.
              </p>
              <p className="text-green-600 text-sm mt-2 group-hover:text-green-700">
                Book Now →
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard/instructors/123ed673-79ac-41d6-81da-79de6829be4a/payouts"
            className="group"
          >
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow group-hover:border-purple-300">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v2a2 2 0 002 2z"
                    ></path>
                  </svg>
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">
                  Stripe Onboarding
                </h3>
              </div>
              <p className="text-gray-600 text-sm">
                Existing instructor payment setup feature. Demonstrates Stripe
                integration patterns.
              </p>
              <p className="text-purple-600 text-sm mt-2 group-hover:text-purple-700">
                View Demo →
              </p>
            </div>
          </Link>

          <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-gray-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                  ></path>
                </svg>
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">
                More Features
              </h3>
            </div>
            <p className="text-gray-600 text-sm">
              Additional features like role-based dashboards, real-time updates,
              and mobile app coming soon.
            </p>
            <p className="text-gray-500 text-sm mt-2">In Development...</p>
          </div>
        </div>

        {/* Demo Components */}
        <div className="mt-16 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <NotificationDemo />
            <LiveDataDemo />
          </div>

          {/* Debug Component */}
          <QueryDebugger />
        </div>

        {/* System Status */}
        <div className="mt-8">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-4">
              🚀 System Status
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center text-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                API Server: Running (http://localhost:3001)
              </div>
              <div className="flex items-center text-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                Web App: Running (http://localhost:3000)
              </div>
              <div className="flex items-center text-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                Lesson CRUD: ✅ Complete (Tasks 1-5)
              </div>
              <div className="flex items-center text-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                Frontend: ✅ Task 6.3 Complete (TanStack Query + Notifications)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8 flex-wrap items-center justify-center text-gray-600">
            <a
              className="flex items-center gap-2 hover:underline hover:underline-offset-4 transition-colors hover:text-gray-900"
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
              className="flex items-center gap-2 hover:underline hover:underline-offset-4 transition-colors hover:text-gray-900"
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
              className="flex items-center gap-2 hover:underline hover:underline-offset-4 transition-colors hover:text-gray-900"
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
          </div>
        </div>
      </footer>
    </div>
  );
}
