import prisma from "../prisma.js";

export async function validateAnimeCategoryParent(categoryId, parentId) {
  if (parentId == null || parentId === "" || parentId === "0" || parentId === 0) {
    return { ok: true, parentId: null };
  }

  const parsedParentId = Number(parentId);
  if (!Number.isFinite(parsedParentId) || parsedParentId <= 0) {
    return { ok: false, error: "Invalid parent category ID" };
  }

  if (categoryId && Number(categoryId) === parsedParentId) {
    return { ok: false, error: "A category cannot be its own parent" };
  }

  const parent = await prisma.animeCategory.findUnique({
    where: { id: parsedParentId },
    select: { id: true, parentId: true, name: true },
  });

  if (!parent) {
    return { ok: false, error: "Parent anime category not found" };
  }

  if (parent.parentId != null) {
    return { ok: false, error: "Subcategories can only be created under a main anime category" };
  }

  if (categoryId) {
    const childCount = await prisma.animeCategory.count({
      where: { parentId: Number(categoryId) },
    });
    if (childCount > 0 && parsedParentId !== null) {
      return {
        ok: false,
        error: "Main categories with subcategories cannot become subcategories themselves",
      };
    }
  }

  return { ok: true, parentId: parsedParentId };
}

export async function assertAnimeSlugUnique({ slug, parentId, excludeId }) {
  const trimmed = String(slug || "").trim();
  if (!trimmed) {
    return { ok: false, error: "Slug is required" };
  }

  const normalizedParentId = parentId == null ? null : Number(parentId);

  const duplicate = await prisma.animeCategory.findFirst({
    where: {
      slug: trimmed,
      parentId: normalizedParentId,
      ...(excludeId ? { id: { not: Number(excludeId) } } : {}),
    },
  });
  if (duplicate) {
    return { ok: false, error: "An anime category with this slug already exists under the selected parent" };
  }

  return { ok: true };
}
