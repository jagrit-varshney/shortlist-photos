export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { scanPhotos } = await import("./lib/scanner");
    await scanPhotos();
  }
}
