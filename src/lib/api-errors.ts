export function dataUnavailable(err: unknown) {
  console.error(err);
  return Response.json(
    { error: "Couldn't load stats from nflverse right now. Try again in a minute." },
    { status: 502 },
  );
}
