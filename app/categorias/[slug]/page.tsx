import { redirect } from "next/navigation";
import { getCategoryBySlug } from "../../lib/categories";

export default function CategoriaPage({
  params,
}: {
  params: { slug: string };
}) {
  const cat = getCategoryBySlug(params.slug);

  if (cat) {
    redirect(`/catalogo?categoria=${cat.slug}`);
  }

  redirect("/catalogo");
}
