import JSON5 from "json5";

type Rating = {
  name: string;
  imdb_url?: string;
  rating: number;
  date: string;
};

function parseWatchedDate(value: string) {
  const parts = value.split("-").map(Number);

  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return new Date(value);
  }

  const [day, month, year] = parts;
  return new Date(year, month - 1, day);
}

function formatWatchedDate(value: string) {
  const date = parseWatchedDate(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function isRating(value: unknown): value is Rating {
  if (!value || typeof value !== "object") {
    return false;
  }

  const rating = value as Partial<Rating>;

  return (
    typeof rating.name === "string" &&
    rating.name.trim().length > 0 &&
    typeof rating.rating === "number" &&
    Number.isFinite(rating.rating) &&
    typeof rating.date === "string" &&
    rating.date.trim().length > 0
  );
}

function createMovie(movie: Rating, position: number) {
  const rowColor = position % 2 === 0 ? "bg-zinc-900" : "bg-zinc-950";

  const tr = document.createElement("tr");
  tr.classList.add("border-b", "border-zinc-800", "transition-colors", "hover:bg-zinc-800", rowColor);

  const tdMovie = document.createElement("td");
  tdMovie.classList.add("px-5", "py-4");

  if (movie.imdb_url) {
    const link = document.createElement("a");
    link.classList.add("text-white", "underline", "decoration-fuchsia-400", "underline-offset-4", "hover:text-fuchsia-200");
    link.href = movie.imdb_url;
    link.rel = "noreferrer";
    link.target = "_blank";
    link.textContent = movie.name;
    tdMovie.append(link);
  } else {
    tdMovie.textContent = movie.name;
  }

  const tdRating = document.createElement("td");
  tdRating.classList.add("px-5", "py-4", "text-center", "font-black", "text-fuchsia-300");
  tdRating.textContent = `${movie.rating}/10`;

  const tdDate = document.createElement("td");
  tdDate.classList.add("px-5", "py-4", "text-right", "text-zinc-300");
  tdDate.textContent = formatWatchedDate(movie.date);

  tr.append(tdMovie, tdRating, tdDate);

  return tr;
}

function showMessage(message: string, table: HTMLTableSectionElement) {
  const tr = document.createElement("tr");
  tr.classList.add("bg-zinc-900");

  const td = document.createElement("td");
  td.colSpan = 3;
  td.classList.add("px-5", "py-8", "text-center", "font-semibold", "text-zinc-300");
  td.textContent = message;

  tr.append(td);
  table.append(tr);
}

const table = document.getElementById("letable");
const lastUpdated = document.getElementById("last-updated");

if (!(table instanceof HTMLTableSectionElement)) {
  throw new Error("letable tbody not found");
}

if (!(lastUpdated instanceof HTMLSpanElement)) {
  throw new Error("last-updated span not found");
}

fetch("/ratings.json5")
  .then(function (response) {
    if (!response.ok) {
      throw new Error(`ratings request failed: ${response.status}`);
    }

    return response.text();
  })
  .then(function (contents) {
    const parsed = JSON5.parse(contents);

    if (!Array.isArray(parsed)) {
      throw new Error("ratings.json5 must contain an array");
    }

    return parsed.filter(isRating);
  })
  .then(function (ratings) {
    table.innerHTML = "";

    if (ratings.length === 0) {
      lastUpdated.textContent = "no entries";
      showMessage("no ratings yet", table);
      return;
    }

    const sortedRatings = ratings.sort(function (a, b) {
      return parseWatchedDate(b.date).getTime() - parseWatchedDate(a.date).getTime();
    });

    lastUpdated.textContent = formatWatchedDate(sortedRatings[0].date);

    sortedRatings.forEach(function (movie, index) {
      table.append(createMovie(movie, index));
    });
  })
  .catch(function () {
    table.innerHTML = "";
    lastUpdated.textContent = "unavailable";
    showMessage("could not load ratings.json5", table);
  });
