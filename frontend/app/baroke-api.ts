export type BarokePlace = {
  id: string;
  name: string;
  cuisine: string;
  price: number;
  distance: number;
  studentDiscount: boolean;
  note: string;
  x: number;
  y: number;
  provenanceStatus: "seeded_demo" | "verified" | "student_submitted";
};

export const seededPlaces: BarokePlace[] = [
  { id: "slice", name: "Lexington Slice", cuisine: "Pizza", price: 6.5, distance: .2, studentDiscount: true, x: 47, y: 42, note: "2 slices + drink", provenanceStatus: "seeded_demo" },
  { id: "deli", name: "23rd Street Deli", cuisine: "Deli", price: 9.5, distance: .1, studentDiscount: true, x: 57, y: 57, note: "Egg sandwich + coffee", provenanceStatus: "seeded_demo" },
  { id: "falafel", name: "Gramercy Falafel", cuisine: "Mediterranean", price: 9, distance: .4, studentDiscount: false, x: 35, y: 64, note: "Falafel pita", provenanceStatus: "seeded_demo" },
  { id: "bento", name: "Madison Bento", cuisine: "Japanese", price: 12.5, distance: .3, studentDiscount: true, x: 44, y: 27, note: "Lunch bento", provenanceStatus: "seeded_demo" },
  { id: "taco", name: "Taco Bell Cantina", cuisine: "Fast food", price: 8.5, distance: .8, studentDiscount: false, x: 72, y: 29, note: "Value-menu meal", provenanceStatus: "seeded_demo" },
  { id: "curry", name: "Curry Hill Express", cuisine: "Indian", price: 11, distance: .9, studentDiscount: false, x: 76, y: 70, note: "Rice + curry special", provenanceStatus: "seeded_demo" },
];

type SearchResponse = {
  places: Array<{
    id: string;
    name: string;
    cuisine: string;
    typical_meal_price: string;
    distance_miles: string;
    student_discount: boolean;
    meal_note: string;
    map_position: { x: number; y: number };
    provenance_status: BarokePlace["provenanceStatus"];
  }>;
};

export async function loadBarokePlaces(signal: AbortSignal): Promise<BarokePlace[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BAROKE_API_URL?.replace(/\/$/, "");
  if (!baseUrl) return seededPlaces;
  const response = await fetch(`${baseUrl}/v1/student-food/places?max_price=50&max_distance=5`, { signal });
  if (!response.ok) throw new Error("Baroke search API unavailable");
  const payload = await response.json() as SearchResponse;
  return payload.places.map((place) => ({
    id: place.id,
    name: place.name,
    cuisine: place.cuisine,
    price: Number(place.typical_meal_price),
    distance: Number(place.distance_miles),
    studentDiscount: place.student_discount,
    note: place.meal_note,
    x: place.map_position.x,
    y: place.map_position.y,
    provenanceStatus: place.provenance_status,
  }));
}
