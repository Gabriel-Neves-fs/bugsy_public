export default function Loading() {
  return (
    <main className="min-h-screen bg-white text-[#16151a]">
      <header className="border-b border-[#16151a]/10 bg-white">
        <div className="mx-auto flex min-h-18 w-full max-w-6xl items-center px-5">
          <div className="h-11 w-36 animate-pulse rounded-lg bg-[#16151a]/8" />
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-7">
        <div className="h-24 animate-pulse rounded-lg bg-[#16151a]/6" />
        <div className="overflow-hidden rounded-lg border border-[#16151a]/10">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="grid min-h-20 animate-pulse grid-cols-1 items-center gap-4 border-b border-[#16151a]/10 px-4 py-4 last:border-b-0 md:grid-cols-[1fr_120px_130px_190px] md:py-0"
            >
              <div className="h-4 w-2/3 rounded bg-[#16151a]/8" />
              <div className="h-4 w-14 rounded bg-[#16151a]/8" />
              <div className="h-4 w-20 rounded bg-[#16151a]/8" />
              <div className="ml-auto h-9 w-36 rounded bg-[#16151a]/8" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
