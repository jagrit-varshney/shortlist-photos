import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Gallery from "@/components/Gallery";

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ folderId?: string; folderName?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { folderId = "all", folderName = "All Photos" } = await searchParams;

  return <Gallery folderId={folderId} folderName={folderName} />;
}
