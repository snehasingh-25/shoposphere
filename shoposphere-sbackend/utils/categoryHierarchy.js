import prisma from "../prisma.js";

/**
 * Main categories have no parent. Subcategories must attach to a main category only (one level).
 */
export async function validateCategoryParent(categoryId, parentId) {
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

  const parent = await prisma.category.findUnique({
    where: { id: parsedParentId },
    select: { id: true, parentId: true, name: true },
  });

  if (!parent) {
    return { ok: false, error: "Parent category not found" };
  }

  if (parent.parentId != null) {
    return { ok: false, error: "Subcategories can only be created under a main category" };
  }

  if (categoryId) {
    let cursor = parsedParentId;
    while (cursor != null) {
      if (Number(cursor) === Number(categoryId)) {
        return { ok: false, error: "Invalid parent: would create a circular category hierarchy" };
      }
      const node = await prisma.category.findUnique({
        where: { id: cursor },
        select: { parentId: true },
      });
      if (!node) break;
      cursor = node.parentId;
    }

    const childCount = await prisma.category.count({
      where: { parentId: Number(categoryId) },
    });
    if (childCount > 0 && parsedParentId !== null) {
      return { ok: false, error: "Main categories with subcategories cannot become subcategories themselves" };
    }
  }

  return { ok: true, parentId: parsedParentId };
}

export async function assertSlugUniqueForCategory({ slug, parentId, excludeId }) {
  const trimmed = String(slug || "").trim();
  if (!trimmed) {
    return { ok: false, error: "Slug is required" };
  }

  const normalizedParentId = parentId == null ? null : Number(parentId);

  if (normalizedParentId == null) {
    const duplicateRoot = await prisma.category.findFirst({
      where: {
        slug: trimmed,
        parentId: null,
        ...(excludeId ? { id: { not: Number(excludeId) } } : {}),
      },
    });
    if (duplicateRoot) {
      return { ok: false, error: "A main category with this slug already exists" };
    }
    return { ok: true };
  }

  const duplicateSibling = await prisma.category.findFirst({
    where: {
      slug: trimmed,
      parentId: normalizedParentId,
      ...(excludeId ? { id: { not: Number(excludeId) } } : {}),
    },
  });
  if (duplicateSibling) {
    return { ok: false, error: "A subcategory with this slug already exists under the selected parent" };
  }

  return { ok: true };
}
