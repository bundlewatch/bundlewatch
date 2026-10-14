import { defineRouteMiddleware } from "@astrojs/starlight/route-data";

// The 404 page answers every missing path, so it has no URL of its own: no canonical URL, and no
// translations at /fr/404/ or /zh/404/ to point to.
export const onRequest = defineRouteMiddleware(({ locals }) => {
  const route = locals.starlightRoute;
  if (route.id !== "404") return;
  route.head = route.head.filter(
    ({ tag, attrs }) => !(tag === "link" && /^(canonical|alternate)$/.test(attrs?.rel)),
  );
});
