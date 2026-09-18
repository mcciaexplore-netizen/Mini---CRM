export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <h1 className="text-6xl font-bold text-[#0176D3]">404</h1>
            <h2 className="mt-4 text-2xl font-semibold text-[#181818]">Page Not Found</h2>
            <p className="mt-2 text-[#444444]">The page you are looking for does not exist.</p>
            <a href="/" className="mt-6 inline-flex items-center px-4 py-2 rounded-md bg-[#0176D3] text-white text-sm font-medium hover:bg-[#032D60] transition-colors">
                Go to Dashboard
            </a>
        </div>
    )
}
