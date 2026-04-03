import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API } from "../api";

export default function Categories() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetch(`${API}/categories`)
      .then(res => res.json())
      .then(data => setCategories(data));
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 auto-rows-[170px] md:auto-rows-[210px] gap-3 sm:gap-4 my-6">
      {categories.map((cat, idx) => {
        const collectionNumber = String(idx + 1).padStart(2, "0");
        const layoutClass = [
          idx % 8 === 0 ? "col-span-2 md:col-span-6 row-span-2" : "",
          idx % 8 === 1 ? "col-span-1 md:col-span-3 row-span-2" : "",
          idx % 8 === 2 ? "col-span-1 md:col-span-3 row-span-2" : "",
          idx % 8 === 3 ? "col-span-2 md:col-span-6 row-span-1" : "",
          idx % 8 === 4 ? "col-span-2 md:col-span-4 row-span-1" : "",
          idx % 8 === 5 ? "col-span-2 md:col-span-2 row-span-1" : "",
          idx % 8 === 6 ? "col-span-1 md:col-span-2 row-span-2" : "",
          idx % 8 === 7 ? "col-span-1 md:col-span-4 row-span-2" : "",
        ].join(" ");

        return (
          <Link
            key={cat.id}
            to={`/category/${cat.slug}`}
            className={[
              "relative isolate overflow-hidden rounded-t-[38px] rounded-b-[28px] border border-[#dce3f0]/45 bg-[#eef1f8]",
              "shadow-[0_18px_50px_rgba(44,51,61,0.12)]",
              "transition-transform duration-300 hover:-translate-y-0.5",
              layoutClass,
            ].join(" ")}
          >
            {cat.imageUrl ? (
              <img src={cat.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-4 bg-[#d9deeb]">
                <img src="/logo.png" alt="" className="h-11 w-auto object-contain opacity-55" />
              </div>
            )}

            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/18 to-black/5" />

            <div className="absolute top-5 right-5 h-9 w-9 rounded-full bg-white/14 backdrop-blur-sm border border-white/30 text-white flex items-center justify-center">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M9 7h8v8" />
              </svg>
            </div>

            <div className="absolute inset-x-5 bottom-5 text-white">
              <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.35em] text-white/85 mb-1.5">
                {collectionNumber} / Collection
              </p>
              <p className="font-extrabold tracking-tight leading-[0.9] uppercase text-3xl sm:text-4xl">
                {cat.name}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
